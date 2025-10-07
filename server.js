// server.js (Archivo completo y actualizado)

const express = require('express');
const bcrypt = require('bcrypt'); // <-- AÑADE ESTA LÍNEA
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json()); // <-- AÑADE ESTA LÍNEA (después de const app = express())

// Middleware de logging para debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  }
});

const PORT = process.env.PORT || 3000;

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Probar la conexión a la base de datos
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.stack);
  } else {
    console.log('✅ Conexión exitosa a la base de datos:', res.rows[0]);
    // Inicializar tablas después de conectar
    initializeDatabase();
  }
});

// Función para inicializar las tablas de la base de datos
async function initializeDatabase() {
  try {
    // LÍNEA AÑADIDA PARA FORZAR LA RECREACIÓN:
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');

    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        credits DECIMAL(10,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        avatar_url TEXT,
        country VARCHAR(10),
        whatsapp VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de salas/mesas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) UNIQUE NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        state VARCHAR(50) DEFAULT 'waiting',
        settings JSONB DEFAULT '{}',
        pot DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de comisiones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commission_log (
        id SERIAL PRIMARY KEY,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'COP',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de historial de chat del lobby
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lobby_chat (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) UNIQUE NOT NULL,
        sender VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tablas de la base de datos REGENERADAS correctamente');
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
  }
}

// Funciones para interactuar con la base de datos

// Función para obtener un usuario por su nombre de usuario
async function getUserByUsername(username) {
  try {
    // La consulta ahora busca por 'username', que sí existe en tu tabla.
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length > 0) {
      // Usuario existe, lo retornamos
      return {
        credits: parseFloat(result.rows[0].credits),
        currency: result.rows[0].currency,
        avatar_url: result.rows[0].avatar_url
      };
    } else {
      // Si el usuario no se encuentra, lanzamos un error en lugar de crearlo aquí.
      throw new Error(`Usuario '${username}' no encontrado en la base de datos.`);
    }
  } catch (error) {
    console.error('Error obteniendo usuario por nombre:', error);
    // Devolvemos null para indicar que la operación falló.
    return null;
  }
}

// Función para obtener todos los usuarios
async function getAllUsersFromDB() {
  try {
    const result = await pool.query('SELECT username, credits, currency FROM users ORDER BY username ASC');
    return result.rows.map(row => ({
      id: 'user_' + row.username.toLowerCase(),
      username: row.username,
      credits: parseFloat(row.credits),
      currency: row.currency
    }));
  } catch (error) {
    console.error('Error obteniendo todos los usuarios de la BD:', error);
    return [];
  }
}

// Función para actualizar créditos de un usuario (ignora mayúsculas)
async function updateUserCredits(userId, credits, currency) {
  try {
    // Extraer el username del userId (formato: user_username), que ya viene en minúsculas.
    const username = userId.replace(/^user_/, '');
    // Usamos LOWER(username) para asegurar que encontramos al usuario correcto.
    await pool.query(
      'UPDATE users SET credits = $1, currency = $2 WHERE LOWER(username) = $3',
      [credits, currency, username]
    );
    console.log(`✅ Créditos actualizados para usuario ${userId}: ${credits} ${currency}`);
  } catch (error) {
    console.error('Error actualizando créditos:', error);
  }
}

// Función para eliminar un usuario de la base de datos (ignora mayúsculas)
async function deleteUserFromDB(username) {
  try {
    // Usamos LOWER(username) para asegurar la coincidencia sin importar mayúsculas/minúsculas.
    // El username que llega ya está en minúsculas, así que la comparación es segura.
    const result = await pool.query('DELETE FROM users WHERE LOWER(username) = $1', [username]);
    console.log(`✅ Usuario '${username}' eliminado de la base de datos. Filas afectadas: ${result.rowCount}`);
    return result.rowCount > 0;
  } catch (error) {
    console.error(`❌ Error eliminando al usuario '${username}' de la BD:`, error);
    return false;
  }
}

// Función para guardar comisión
async function saveCommission(amount, currency = 'COP') {
  try {
    await pool.query(
      'INSERT INTO commission_log (amount, currency) VALUES ($1, $2)',
      [amount, currency]
    );
    console.log(`✅ Comisión guardada: ${amount} ${currency}`);
  } catch (error) {
    console.error('Error guardando comisión:', error);
  }
}

// Función para guardar mensaje del lobby
async function saveLobbyMessage(messageId, sender, message) {
  try {
    await pool.query(
      'INSERT INTO lobby_chat (message_id, sender, message) VALUES ($1, $2, $3)',
      [messageId, sender, message]
    );
  } catch (error) {
    console.error('Error guardando mensaje del lobby:', error);
  }
}

// Función para obtener historial del chat del lobby
async function getLobbyChatHistory() {
  try {
    const result = await pool.query(
      'SELECT message_id, sender, message, timestamp FROM lobby_chat ORDER BY timestamp DESC LIMIT 50'
    );
    return result.rows.map(row => ({
      id: row.message_id,
      from: row.sender,
      text: row.message,
      ts: new Date(row.timestamp).getTime()
    }));
  } catch (error) {
    console.error('Error obteniendo historial del lobby:', error);
    return [];
  }
}

function handleHostLeaving(room, leavingPlayerId, io) {
    if (room && room.hostId === leavingPlayerId) {
        // El anfitrión se va; buscamos un nuevo anfitrión entre los jugadores sentados.
        const newHost = room.seats.find(s => s && s.playerId !== leavingPlayerId);

        if (newHost) {
            room.hostId = newHost.playerId;
            console.log(`Anfitrión ${leavingPlayerId} ha salido. Nuevo anfitrión: ${newHost.playerName}.`);

            // Notificamos a todos en la sala del cambio para actualizar la UI.
            io.to(room.roomId).emit('newHostAssigned', {
                hostName: newHost.playerName,
                hostId: newHost.playerId
            });

            // --- INICIO DE LA MODIFICACIÓN ---
            // Si el cambio de anfitrión ocurre durante la fase de revancha,
            // el servidor recalcula y envía proactivamente el estado actualizado a todos.
            if (room.state === 'post-game') {
                const readyPlayerIds = new Set();
                room.rematchRequests.forEach(id => readyPlayerIds.add(id));
                room.seats.forEach(seat => {
                    if (seat && seat.status === 'waiting') {
                        readyPlayerIds.add(seat.playerId);
                    }
                });

                const playersReadyNames = Array.from(readyPlayerIds).map(id => {
                    const seat = room.seats.find(s => s && s.playerId === id);
                    return seat ? seat.playerName : null;
                }).filter(Boolean);

                const totalPlayersReady = readyPlayerIds.size;

                // Emitimos la actualización con el ID del nuevo anfitrión.
                io.to(room.roomId).emit('rematchUpdate', {
                    playersReady: playersReadyNames,
                    canStart: totalPlayersReady >= 2,
                    hostId: room.hostId // El ID del nuevo anfitrión.
                });
                console.log(`[Re-Host] Actualización de revancha enviada. Nuevo anfitrión: ${room.hostId}`);
            }
            // --- FIN DE LA MODIFICACIÓN ---
        }
    }
}

function checkAndCleanRoom(roomId, io) {
    const room = rooms[roomId];
    if (!room) {
        // Si la sala ya no existe, aun así notificamos a todos para que actualicen su lista.
        broadcastRoomListUpdate(io);
        return;
    }

    const playersInSeats = room.seats.filter(s => s !== null).length;

    // UNA SALA ESTÁ VACÍA SI NO HAY NADIE EN LOS ASIENTOS.
    if (playersInSeats === 0) {
        console.log(`Mesa ${roomId} está completamente vacía. Eliminando...`);
        delete rooms[roomId];
    }

    // Se emite la actualización SIEMPRE que un jugador sale,
    // para que el contador (ej: 3/4 -> 2/4) se actualice en tiempo real.
    broadcastRoomListUpdate(io);
}

// ▼▼▼ AÑADE ESTA FUNCIÓN COMPLETA AL INICIO DE TU ARCHIVO ▼▼▼
function getSanitizedRoomForClient(room) {
    if (!room) return null;

    // Calculamos los contadores de cartas aquí, una sola vez.
    const playerHandCounts = {};
    if (room.seats) {
        room.seats.forEach(seat => {
            if (seat && room.playerHands[seat.playerId]) {
                playerHandCounts[seat.playerId] = room.playerHands[seat.playerId].length;
            }
        });
    }

    // Creamos un objeto "limpio" solo con la información pública y necesaria.
    const sanitizedRoom = {
        roomId: room.roomId,
        hostId: room.hostId,
        settings: room.settings,
        seats: room.seats,
        state: room.state,
        discardPile: room.discardPile,
        melds: room.melds,
        spectators: room.spectators || [],
        playerHandCounts: playerHandCounts, // <<-- Dato seguro para compartir
        currentPlayerId: room.currentPlayerId
    };
    
    // NUNCA enviamos 'deck' o 'playerHands'.
    return sanitizedRoom;
}
// ▲▲▲ FIN DE LA NUEVA FUNCIÓN ▲▲▲

// ▼▼▼ AÑADE ESTA FUNCIÓN COMPLETA AQUÍ ▼▼▼
function generateRoomId() {
  // Crea un ID aleatorio y único para cada mesa, ej: 'room-a1b2c3d4'
  return `room-${Math.random().toString(36).slice(2, 10)}`;
}
// ▲▲▲ FIN DEL CÓDIGO A AÑADIR ▲▲▲

let rooms = {}; // Estado de las mesas se mantiene en memoria

// ▼▼▼ AÑADE ESTAS LÍNEAS AL INICIO, JUNTO A TUS OTRAS VARIABLES GLOBALES ▼▼▼
let lobbyChatHistory = [];
const LOBBY_CHAT_HISTORY_LIMIT = 50; // Guardaremos los últimos 50 mensajes
// ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲

// ▼▼▼ AÑADE ESTAS LÍNEAS ▼▼▼
let users = {}; // Reemplazará a userCredits para guardar más datos
let exchangeRates = {
    'EUR': { 'USD': 1.0, 'COP': 4500 },
    'USD': { 'EUR': 1.0, 'COP': 4500 },
    'COP': { 'EUR': 1 / 4500, 'USD': 1 / 4500 }
};
// ▲▲▲ FIN DEL CÓDIGO A AÑADIR ▲▲▲

let commissionLog = []; // <--- REEMPLAZA totalCommission por esto

// ▼▼▼ AÑADE ESTA FUNCIÓN COMPLETA ▼▼▼
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    // Si la tasa directa existe, la usamos.
    if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
        return amount * rates[fromCurrency][toCurrency];
    }
    // Si no, intentamos la inversa (ej. de COP a EUR)
    if (rates[toCurrency] && rates[toCurrency][fromCurrency]) {
         return amount / rates[toCurrency][fromCurrency];
    }
    // Fallback si no hay tasa (no debería pasar con tu configuración)
    return amount; 
}
// ▲▲▲ FIN DE LA NUEVA FUNCIÓN ▲▲▲

// ▼▼▼ AÑADE ESTA NUEVA FUNCIÓN JUSTO AQUÍ ▼▼▼
function broadcastRoomListUpdate(io) {
    io.emit('updateRoomList', Object.values(rooms));
    console.log('[Broadcast] Se ha actualizado la lista de mesas para todos los clientes.');
}
// ▲▲▲ FIN DE LA NUEVA FUNCIÓN ▲▲▲

// --- INICIO: SECCIÓN DE ADMINISTRACIÓN ---

// Middleware de autenticación simple para el panel de admin
const adminAuth = (req, res, next) => {
    // Define aquí tu usuario y contraseña. ¡Cámbialos por algo seguro!
    const ADMIN_USER = "angelohh18";
    const ADMIN_PASS = "ANGELO51"; // <-- CAMBIA ESTA CONTRASEÑA

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === ADMIN_USER && password === ADMIN_PASS) {
        // Si las credenciales son correctas, permite el acceso.
        return next();
    }

    // Si no, pide las credenciales.
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Autenticación requerida.');
};

// --- DEFINICIÓN DE RUTAS DE LA APLICACIÓN ---

// 1. Middleware para parsear JSON (debe ir ANTES de las rutas que lo usan)
// Ya está definido arriba en la línea 11

// 2. Rutas de la API (deben ir PRIMERO)

// RUTA DE REGISTRO
app.post('/register', async (req, res) => {
    const { name, country, whatsapp, password, avatar, currency } = req.body;

    if (!name || !password || !currency) {
        return res.status(400).json({ success: false, message: 'Nombre, contraseña y moneda son obligatorios.' });
    }

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [name.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Este nombre de usuario ya está en uso.' });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await pool.query(
            'INSERT INTO users (username, password_hash, country, whatsapp, avatar_url, currency, credits) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [name.toLowerCase(), passwordHash, country, whatsapp, avatar, currency, 0.00]
        );

        res.status(201).json({ success: true, message: 'Usuario registrado exitosamente.' });

    } catch (error) {
        console.error('Error en el registro:', error);
        console.error('Detalles del error:', error.message);
        console.error('Stack trace:', error.stack);
        // MODIFICACIÓN: Enviamos el error completo al cliente para depuración
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor: ' + error.message, // Añadimos el mensaje de error
            error: error.stack // Añadimos el stack completo
        });
    }
});

// RUTA DE LOGIN
app.get('/login', (req, res) => {
    res.status(405).json({ success: false, message: 'Método no permitido. Use POST.' });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Por favor, ingresa nombre y contraseña.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado. Debes registrarte primero.' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            res.status(200).json({
                success: true,
                message: 'Inicio de sesión exitoso.',
                user: {
                    name: user.username,
                    avatar: user.avatar_url,
                    credits: parseFloat(user.credits),
                    currency: user.currency
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// RUTA DE ADMIN
app.get('/admin', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// RUTA DE TEST DE BASE DE DATOS
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({
      status: 'success',
      message: 'Conexión a la base de datos exitosa',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error conectando a la base de datos',
      error: error.message
    });
  }
});

function buildDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const values = [
    { v: "A", p: 10 }, { v: "2", p: 2 }, { v: "3", p: 3 }, { v: "4", p: 4 }, 
    { v: "5", p: 5 }, { v: "6", p: 6 }, { v: "7", p: 7 }, { v: "8", p: 8 }, 
    { v: "9", p: 9 }, { v: "10", p: 10 }, { v: "J", p: 10 }, { v: "Q", p: 10 }, 
    { v: "K", p: 10 }
  ];
  let deck = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of suits) {
      for (const val of values) {
        deck.push({ 
          suit: suit, 
          value: val.v, 
          points: val.p, 
          id: `${val.v}-${suit}-${copy}`
        });
      }
    }
  }
  return deck;
}

function getCardColor(card) {
    if (!card) return null;
    if (card.suit === 'hearts' || card.suit === 'diamonds') return 'red';
    return 'black';
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function resetTurnState(room) {
    if (room) {
        room.turnMelds = [];
        room.turnPoints = 0;
        room.hasDrawn = false;
        room.drewFromDiscard = null;
        room.discardCardRequirementMet = false; // <-- AÑADE ESTA LÍNEA
    }
}

function resetRoomForNewGame(room) {
    if (!room) return;

    room.state = 'playing';
    room.melds = [];
    room.deck = [];
    room.discardPile = [];
    room.turnMelds = [];
    room.turnPoints = 0;
    room.hasDrawn = false;
    room.drewFromDiscard = null;
    room.firstMeldCompletedByAnyone = false;
    
    // ▼▼▼ ELIMINA ESTE BLOQUE 'forEach' COMPLETO ▼▼▼
    /*
    room.seats.forEach(seat => {
        if (seat) {
            seat.active = true;
            seat.doneFirstMeld = false;
            delete seat.status; // <-- AÑADE ESTA LÍNEA
        }
    });
    */
    console.log(`Sala ${room.roomId} reseteada para una nueva partida.`);
}

function isValidRun(cards) {
    if (!cards || cards.length < 3) return false;

    // Regla 1: Todas las cartas deben ser del mismo palo.
    const firstSuit = cards[0].suit;
    if (!cards.every(c => c.suit === firstSuit)) return false;

    // Regla 2: No puede haber valores de carta duplicados.
    if (new Set(cards.map(c => c.value)).size !== cards.length) return false;

    // --- INICIO DE LA LÓGICA ESTRICTA (VALIDA EL ORDEN) ---
    const order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    
    // 3. Verificamos la secuencia par por par, tal como vienen las cartas.
    for (let i = 0; i < cards.length - 1; i++) {
        const currentRank = order.indexOf(cards[i].value);
        const nextRank = order.indexOf(cards[i+1].value);

        // Comprueba si es una secuencia normal (ej: 7 -> 8)
        const isStandardSequence = nextRank === currentRank + 1;
        
        // Comprueba el caso especial de la secuencia que pasa de Rey a As (ej: Q -> K -> A)
        const isKingToAce = currentRank === 12 && nextRank === 0;

        // Si no se cumple ninguna de las dos condiciones, el orden es incorrecto.
        if (!isStandardSequence && !isKingToAce) {
            return false; // ¡FALTA! El orden es incorrecto.
        }
    }

    // Si el bucle termina, la escalera es válida y está en el orden correcto.
    return true;
    // --- FIN DE LA LÓGICA ESTRICTA ---
}

function sortCardsForRun(cards) {
  if (!cards || cards.length === 0) return cards;
  
  const order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  
  // Determinar si el As es alto o bajo basándose en las otras cartas
  const nonAceCards = cards.filter(c => c.value !== 'A');
  const hasKing = nonAceCards.some(c => c.value === 'K');
  const hasTwo = nonAceCards.some(c => c.value === '2');
  
  let aceIsHigh = false;
  if (hasKing && !hasTwo) {
    aceIsHigh = true;
  }
  
  return cards.sort((a, b) => {
    let rankA = order.indexOf(a.value) + 1;
    let rankB = order.indexOf(b.value) + 1;
    
    if (a.value === 'A') rankA = aceIsHigh ? 14 : 1;
    if (b.value === 'A') rankB = aceIsHigh ? 14 : 1;
    
    return rankA - rankB;
  });
}

function validateMeld(cards) {
    if (!cards || cards.length < 3) return false;
    
    // VALIDACIÓN ESTRICTA SIN REORDENAMIENTO:
    // Las funciones de validación reciben las cartas tal como el jugador las envió.
    // No se aplica ninguna función sort() aquí.

    if (isValidSet(cards)) return 'grupo';
    if (isValidRun(cards)) return 'escalera';
    
    return false; // Si ninguna validación pasa, la jugada es inválida.
}
function isValidSet(cards) {
    if (!cards || (cards.length !== 3 && cards.length !== 4)) {
        return false;
    }

    const firstValue = cards[0].value;
    // 1. Todas las cartas deben tener el mismo valor.
    if (!cards.every(c => c.value === firstValue)) {
        return false;
    }

    // 2. Los palos DEBEN ser únicos.
    const suits = cards.map(c => c.suit);
    if (new Set(suits).size !== cards.length) {
        return false; // FALTA: Palos repetidos.
    }
    
    // 3. (NUEVO) No puede haber dos cartas del mismo color seguidas.
    // Esta regla se deriva de la de palos únicos, pero la hacemos explícita para robustez.
    // Esta validación NO reordena las cartas.
    for (let i = 1; i < cards.length; i++) {
        if (getCardColor(cards[i]) === getCardColor(cards[i-1])) {
             return false; // FALTA: Dos colores iguales consecutivos.
        }
    }

    return true; // Si todo pasa, el grupo es válido.
}
function calculateMeldPoints(cards, type) {
        let pts = 0;
        if (type === 'escalera') {
            const hasKing = cards.some(x => x.value === 'K');
            const hasTwo = cards.some(x => x.value === '2');
            const aceIsHigh = hasKing && !hasTwo; 
            for (let c of cards) {
                if (c.value === 'A') {
                    pts += aceIsHigh ? 10 : 1;
                } else {
                    pts += c.points;
                }
            }
        } else { 
            for (let c of cards) {
                pts += c.points; 
            }
        }
        return pts;
    }

function canBeAddedToServerMeld(card, meld) {
  if (!meld || !card) return false;

  if (meld.type === 'grupo') {
    const testCards = [...meld.cards, card];
    const values = testCards.map(c => c.value);
    const suits = testCards.map(c => c.suit);
    if (new Set(values).size !== 1) return false;
    if (new Set(suits).size !== testCards.length) return false;
    // Para grupos, la posición no importa, así que solo retornamos 'true' si es válido.
    return testCards.length <= 4 ? 'append' : false;
  } 
  
  if (meld.type === 'escalera') {
    // --- INICIO DE LA CORRECCIÓN ---

    // Regla 1: La carta debe ser del mismo palo.
    if (card.suit !== meld.cards[0].suit) {
        return false;
    }

    // Regla 2: La carta no puede ser un duplicado de una ya existente.
    if (meld.cards.some(c => c.value === card.value)) {
        return false;
    }

    // VALIDACIÓN CLAVE: Si una escalera ya contiene un Rey y un As, es una secuencia
    // "cerrada" (ej. Q-K-A) y no se le puede añadir nada más.
    const hasKing = meld.cards.some(c => c.value === 'K');
    const hasAce = meld.cards.some(c => c.value === 'A');
    if (hasKing && hasAce && card.value === '2') {
        return false; // ¡BLOQUEA EL AÑADIDO DE UN '2' A 'Q-K-A'!
    }

    const order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    
    // La escalera en la mesa ('meld.cards') ya está ordenada.
    const firstCard = meld.cards[0];
    const lastCard = meld.cards[meld.cards.length - 1];

    const cardRank = order.indexOf(card.value);
    const firstCardRank = order.indexOf(firstCard.value);
    const lastCardRank = order.indexOf(lastCard.value);

    // Comprobar si se puede añadir al final (append)
    if (cardRank === lastCardRank + 1) {
        return 'append';
    }
    // Caso especial: Añadir As al final de una escalera que termina en K
    if (lastCard.value === 'K' && card.value === 'A') {
        return 'append';
    }

    // Comprobar si se puede añadir al principio (prepend)
    if (cardRank === firstCardRank - 1) {
        return 'prepend';
    }
    // Caso especial: Añadir As al principio de una escalera que empieza en 2
    if (firstCard.value === '2' && card.value === 'A') {
        return 'prepend';
    }
    // --- FIN DE LA CORRECCIÓN ---
  }

  return false; // Si ninguna condición se cumple, no se puede añadir.
}

// ▼▼▼ REEMPLAZA LA FUNCIÓN endGameAndCalculateScores ENTERA CON ESTA VERSIÓN ▼▼▼
async function endGameAndCalculateScores(room, winnerSeat, io, abandonmentInfo = null) {

    // ▼▼▼ AÑADE ESTE BLOQUE COMPLETO AQUÍ ▼▼▼
    // ▼▼▼ REEMPLAZA EL BLOQUE DE 'isPractice' ENTERO CON ESTE ▼▼▼
    // ▼▼▼ REEMPLAZA EL BLOQUE 'isPractice' ENTERO CON ESTE ▼▼▼
    if (room.isPractice) {
        const humanPlayer = room.seats.find(s => s && !s.isBot);
        if (!humanPlayer) return; // Si no hay humano, no hacemos nada

        // ▼▼▼ REEMPLAZA ESTE BLOQUE 'if/else' CON EL NUEVO ▼▼▼
        if (winnerSeat.isBot) {
            // Si gana un bot, ahora enviamos un evento CON el nombre del ganador.
            console.log(`[Práctica] Un bot ha ganado. Notificando al jugador.`);
            io.to(humanPlayer.playerId).emit('practiceGameBotWin', { winnerName: winnerSeat.playerName });
        } else {
            // Si gana el humano, el evento se mantiene igual.
            console.log(`[Práctica] El jugador humano ha ganado. Enviando señal de victoria.`);
            io.to(humanPlayer.playerId).emit('practiceGameHumanWin');
        }
        // ▲▲▲ FIN DEL BLOQUE DE REEMPLAZO ▲▲▲
        // Detenemos la ejecución para no aplicar la lógica de mesas reales.
        return;
    }
    // ▲▲▲ FIN DEL BLOQUE DE REEMPLAZO ▲▲▲

    if (!room || !winnerSeat || room.state !== 'playing') return;

    // (Esta parte que procesa multas por no bajar no cambia y es correcta)
    if (room.initialSeats) {
        for (const seat of room.initialSeats) {
            if (!seat || seat.playerId === winnerSeat.playerId) continue;
            const finalSeatState = room.seats.find(s => s && s.playerId === seat.playerId);
            if (finalSeatState && finalSeatState.active && !finalSeatState.doneFirstMeld) {
                const penalty = room.settings.penalty || 0;
                const playerInfo = users[finalSeatState.userId];
                if (penalty > 0 && playerInfo) {
                    const penaltyInPlayerCurrency = convertCurrency(penalty, room.settings.betCurrency, playerInfo.currency, exchangeRates);
                    playerInfo.credits -= penaltyInPlayerCurrency;
                    room.pot = (room.pot || 0) + penalty;
                    console.log(`Jugador ${finalSeatState.playerName} paga multa de ${penalty} por no bajar. Nuevo bote: ${room.pot}`);
                    
                    // Actualizar en la base de datos
                    try {
                        await updateUserCredits(finalSeatState.userId, playerInfo.credits, playerInfo.currency);
                    } catch (error) {
                        console.error('Error actualizando créditos en BD:', error);
                    }
                    
                    io.to(finalSeatState.playerId).emit('userStateUpdated', playerInfo);
                    io.to(room.roomId).emit('potUpdated', { newPotValue: room.pot, isPenalty: true });
                }
            }
        }
    }

    console.log(`Partida finalizada. Ganador: ${winnerSeat.playerName}. Bote final (tras multas): ${room.pot}`);
    room.state = 'post-game';
    room.lastWinnerId = winnerSeat.playerId;
    room.hostId = winnerSeat.playerId;

    const totalPot = room.pot || 0;
    const commissionInRoomCurrency = totalPot * 0.10; // Comisión en la moneda de la mesa (EUR, USD, etc.)
    const netWinnings = totalPot - commissionInRoomCurrency; // Las ganancias netas para el jugador siguen en la moneda de la mesa.

    // Convertimos la comisión a COP para el registro del admin
    const commissionInCOP = convertCurrency(commissionInRoomCurrency, room.settings.betCurrency, 'COP', exchangeRates);

    // Guardamos en el log el valor YA CONVERTIDO a COP.
    commissionLog.push({ amount: commissionInCOP, timestamp: Date.now() }); // Añade el registro al historial
    io.to('admin-room').emit('admin:commissionData', commissionLog); // Notifica al admin con el historial completo

    const winnerInfo = users[winnerSeat.userId];
    if (winnerInfo) {
        const winningsInWinnerCurrency = convertCurrency(netWinnings, room.settings.betCurrency, winnerInfo.currency, exchangeRates);
        winnerInfo.credits += winningsInWinnerCurrency;
        
        // Actualizar en la base de datos
        try {
            await updateUserCredits(winnerSeat.userId, winnerInfo.credits, winnerInfo.currency);
        } catch (error) {
            console.error('Error actualizando créditos del ganador en BD:', error);
        }
        
        io.to(winnerSeat.playerId).emit('userStateUpdated', winnerInfo);
    }

    let losersInfo = [];
    const bet = room.settings.bet || 0;
    const penalty = room.settings.penalty || 0;

    if (room.initialSeats) {
        room.initialSeats.forEach(seat => {
            // Asegurarse de que el asiento exista y no sea el del ganador
            if (!seat || seat.playerId === winnerSeat.playerId) return;

        const finalSeatState = room.seats.find(s => s && s.playerId === seat.playerId);
        let statusText = '';
        let amountPaid = 0;

        // Empezamos con el caso por defecto: el jugador perdió pagando solo la apuesta.
        let baseText = 'Pagó apuesta';
        let reasonText = '';
        amountPaid = bet;
        let color = '#ffff00'; // Amarillo para una pérdida normal

        // Ahora, verificamos si se debe aplicar una multa, lo que sobreescribe el estado por defecto.
        if (!finalSeatState) {
            reasonText = 'por abandonar';
        } else if (finalSeatState.active === false) {
            reasonText = 'por falta';
        } else if (!finalSeatState.doneFirstMeld) {
            reasonText = 'por no bajar';
        }

        // Si hay un motivo de multa, actualizamos el texto y el monto.
        if (reasonText) {
            baseText = 'Pagó apuesta y multa';
            amountPaid = bet + penalty;
            color = '#ff4444'; // Rojo para indicar una penalización
        }

        // Construimos el texto final y lo añadimos a la lista.
        statusText = `<span style="color:${color};">${baseText} ${reasonText}</span>`.trim();
        losersInfo.push(`<p>${seat.playerName} | ${statusText} = ${amountPaid.toFixed(2)}</p>`);
        });
    }

    // --- CORRECCIÓN CLAVE ---
    // Construimos UN SOLO HTML universal para todos los jugadores.
    // La línea "GANANCIA" ahora es clara para todos.
    let winningsSummary = `<div style="border-top: 1px solid #c5a56a; margin-top: 15px; padding-top: 10px; text-align: left;">
                            <p><strong>Bote Total Recaudado:</strong> ${totalPot.toFixed(2)}</p>
                            <p><strong>Comisión Admin (10%):</strong> -${commissionInRoomCurrency.toFixed(2)}</p>
                            <p style="color: #6bff6b; font-size: 1.2rem;"><strong>GANANCIA: ${netWinnings.toFixed(2)}</strong></p>
                           </div>`;

    const scoresHTML = `<div style="text-align: left;"><p style="color:#c5a56a; font-weight:bold;">Detalle:</p>${losersInfo.join('')}</div>` + winningsSummary;

    const finalSanitizedState = getSanitizedRoomForClient(room);

    // Enviamos el mismo evento con el mismo HTML a TODOS en la sala.
    io.to(room.roomId).emit('gameEnd', {
        winnerName: winnerSeat.playerName,
        scoresHTML: scoresHTML,
        finalRoomState: finalSanitizedState,
        abandonment: abandonmentInfo,
        winnerId: winnerSeat.playerId,
        potData: {
            pot: totalPot,
            commission: commissionInRoomCurrency,
            winnings: netWinnings,
            currency: room.settings.betCurrency
        }
    });
    // --- FIN DE LA CORRECCIÓN ---

    room.rematchRequests.clear();
    broadcastRoomListUpdate(io);
}
// ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

async function checkVictoryCondition(room, roomId, io) {
  if (!room || room.state !== 'playing') return false;
  const winnerSeat = room.seats.find(s => s && s.active !== false && room.playerHands[s.playerId]?.length === 0);
  
  if (winnerSeat) {
    console.log(`¡VICTORIA! ${winnerSeat.playerName} se ha quedado sin cartas y gana la partida.`);
    await endGameAndCalculateScores(room, winnerSeat, io);
    return true;
  }
  return false;
}

async function handlePlayerElimination(room, faultingPlayerId, faultReason, io) {
    if (!room) return;
    const roomId = room.roomId;

    const playerSeat = room.seats.find(s => s && s.playerId === faultingPlayerId);

    // ▼▼▼ REEMPLAZA EL BLOQUE 'isPractice' ENTERO CON ESTE ▼▼▼
    if (room.isPractice) {
        console.log(`[Práctica] Falta cometida por ${playerSeat.playerName}.`);
        // Busca al jugador humano para enviarle solo a él la notificación.
        const humanPlayer = room.seats.find(s => s && !s.isBot);

        if (humanPlayer) {
            // 1. Notifica al humano para que vea el modal de la falta cometida.
            io.to(humanPlayer.playerId).emit('playerEliminated', {
                playerId: faultingPlayerId,
                playerName: playerSeat.playerName,
                reason: faultReason,
            });
            // 2. Envía la señal para que, después de cerrar el modal de falta, aparezca el de reinicio.
            io.to(humanPlayer.playerId).emit('practiceGameFaultEnd');
        }
        // 3. Detiene la ejecución para no aplicar lógica de mesas reales.
        return; 
    }
    // ▲▲▲ FIN DEL BLOQUE DE REEMPLAZO ▲▲▲
    if (playerSeat && playerSeat.active) {
        // ▼▼▼ AÑADE ESTE BLOQUE ▼▼▼
        const penalty = room.settings.penalty || 0;
        const playerInfo = users[playerSeat.userId];
        if (penalty > 0 && playerInfo) {
            const penaltyInPlayerCurrency = convertCurrency(penalty, room.settings.betCurrency, playerInfo.currency, exchangeRates);
            playerInfo.credits -= penaltyInPlayerCurrency;
            room.pot = (room.pot || 0) + penalty;
            console.log(`Jugador ${playerSeat.playerName} paga multa de ${penalty}. Nuevo bote: ${room.pot}`);

            io.to(faultingPlayerId).emit('userStateUpdated', playerInfo);
            io.to(roomId).emit('potUpdated', { newPotValue: room.pot, isPenalty: true });
        }
        // ▲▲▲ FIN DEL BLOQUE AÑADIDO ▲▲▲
        // --- INICIO: LÓGICA PARA GESTIONAR CARTAS DEL JUGADOR ELIMINADO ---

        // 1. Recoger las cartas del jugador (mano y bajadas del turno).
        const playerHand = room.playerHands[faultingPlayerId] || [];
        const turnMeldCards = room.turnMelds.flatMap(meld => meld.cards);
        const cardsToDiscard = [...playerHand, ...turnMeldCards];

        if (cardsToDiscard.length > 0) {
            // 2. Preservar la carta superior actual del descarte.
            const topCard = room.discardPile.pop();

            // 3. Añadir las cartas del jugador al fondo del descarte y barajarlas.
            shuffle(cardsToDiscard);
            room.discardPile.unshift(...cardsToDiscard);

            // 4. Devolver la carta superior a su sitio.
            if (topCard) {
                room.discardPile.push(topCard);
            }
        }

        // 5. Limpiar la mano del jugador y las bajadas temporales del turno.
        room.playerHands[faultingPlayerId] = [];
        resetTurnState(room); // Esta función resetea turnMelds, turnPoints, etc.

        // --- FIN DE LA LÓGICA AÑADIDA ---

        playerSeat.active = false;
        io.to(roomId).emit('playerEliminated', {
            playerId: faultingPlayerId,
            playerName: playerSeat.playerName,
            reason: faultReason,
        });
    }

    const activePlayers = room.seats.filter(s => s && s.active !== false);

    if (activePlayers.length <= 1) {
        const winnerSeat = activePlayers[0];
        if (winnerSeat) {
            await endGameAndCalculateScores(room, winnerSeat, io);
        }
        return; // Detiene la ejecución para no pasar el turno
    }
    
    // Si el juego continúa y era el turno del jugador eliminado, avanzamos el turno.
    if (room.currentPlayerId === faultingPlayerId) {
        resetTurnState(room); // Reseteamos contadores de turno

        const seatedPlayers = room.seats.filter(s => s !== null);
        const currentPlayerIndex = seatedPlayers.findIndex(p => p.playerId === faultingPlayerId);
        
        let nextPlayerIndex = (currentPlayerIndex + 1) % seatedPlayers.length;
        let attempts = 0;
        while (!seatedPlayers[nextPlayerIndex] || seatedPlayers[nextPlayerIndex].active === false) {
             nextPlayerIndex = (nextPlayerIndex + 1) % seatedPlayers.length;
             if (++attempts > seatedPlayers.length) { // Evitar bucle infinito
                 console.log("Error: No se encontró un siguiente jugador activo.");
                 return;
             }
        }
        
        const nextPlayer = seatedPlayers[nextPlayerIndex];
        room.currentPlayerId = nextPlayer.playerId;

        const playerHandCounts = {};
        seatedPlayers.forEach(p => { playerHandCounts[p.playerId] = room.playerHands[p.playerId]?.length || 0; });

        io.to(roomId).emit('turnChanged', {
            discardedCard: null,
            discardingPlayerId: faultingPlayerId,
            newDiscardPile: room.discardPile,
            nextPlayerId: room.currentPlayerId,
            playerHandCounts: playerHandCounts,
            newMelds: room.melds
        });
    }
}

function getCombinations(arr, size) {
  if (size > arr.length) return [];
  if (size === 0) return [[]];
  if (size === 1) return arr.map(x => [x]);
  const res = [];
  arr.forEach((head, i) => {
    getCombinations(arr.slice(i + 1), size - 1).forEach(t => res.push([head, ...t]));
  });
  return res;
}

function findAndValidateAllMelds(cards) {
    let remainingCards = [...cards];
    const validatedMelds = [];
    let changed = true;

    // Usamos un bucle para encontrar combinaciones repetidamente
    while (changed) {
        changed = false;
        let bestCombo = null;
        let bestType = null;

        // Buscamos desde la combinación más grande posible hacia abajo
        for (let size = Math.min(7, remainingCards.length); size >= 3; size--) {
            for (const combo of getCombinations(remainingCards, size)) {
                const type = validateMeld(combo);
                if (type) {
                    bestCombo = combo;
                    bestType = type;
                    break; // Encontramos una combinación válida, la procesamos
                }
            }
            if (bestCombo) break;
        }

        if (bestCombo) {
            const points = calculateMeldPoints(bestCombo, bestType);
            validatedMelds.push({ cards: bestCombo, type: bestType, points: points });

            // Eliminamos las cartas usadas de la lista para la siguiente iteración
            const comboIds = new Set(bestCombo.map(c => c.id));
            remainingCards = remainingCards.filter(c => !comboIds.has(c.id));
            changed = true; // Como encontramos algo, volvemos a buscar
        }
    }

    // El resultado es válido solo si TODAS las cartas seleccionadas se usaron en combinaciones
    const allCardsAreUsed = remainingCards.length === 0;

    return {
        isValid: allCardsAreUsed && validatedMelds.length > 0,
        melds: validatedMelds,
        totalPoints: validatedMelds.reduce((sum, meld) => sum + meld.points, 0)
    };
}

// ▼▼▼ REEMPLAZA ESTAS DOS FUNCIONES EN SERVER.JS ▼▼▼

function findOptimalMelds(hand) {
  let availableCards = [...hand];
  let foundMelds = [];
  let changed = true;
  while (changed) {
    changed = false;
    let bestMeld = null;
    const allPossibleMelds = [];
    // Limita la búsqueda a combinaciones de hasta 7 cartas por rendimiento
    for (let size = Math.min(7, availableCards.length); size >= 3; size--) {
      for (const combo of getCombinations(availableCards, size)) {
        const type = validateMeld(combo); // Usa la función de validación del servidor
        if (type) {
          // Reordenar la escalera si es necesario para el cálculo de puntos y la consistencia
          let finalComboCards = [...combo];
          if (type === 'escalera') {
              const order=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
              const hasAce=finalComboCards.some(c=>c.value==='A'), hasKing=finalComboCards.some(c=>c.value==='K');
              finalComboCards.sort((a,b)=>{
                  let rankA=order.indexOf(a.value), rankB=order.indexOf(b.value);
                  if(hasAce&&hasKing){
                      if(a.value==='A') rankA=13; // Tratar As como el más alto si hay Rey
                      if(b.value==='A') rankB=13;
                  }
                  return rankA-rankB;
              });
          }
          const points = calculateMeldPoints(finalComboCards, type);
          const score = finalComboCards.length * 100 + points;
          allPossibleMelds.push({ cards: finalComboCards, type, points, score });
        }
      }
    }
    if (allPossibleMelds.length > 0) {
      bestMeld = allPossibleMelds.sort((a, b) => b.score - a.score)[0];
      foundMelds.push(bestMeld);
      const bestMeldCardIds = new Set(bestMeld.cards.map(c => c.id));
      availableCards = availableCards.filter(card => !bestMeldCardIds.has(card.id));
      changed = true;
    }
  }
  return foundMelds;
}

function findWorstCardToDiscard(hand, allMeldsOnTable) {
  if (hand.length === 0) return null;
  const rankOrder = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const getRank = (c) => rankOrder.indexOf(c.value);

  const scores = hand.map(card => {
    let score = card.points; // Puntuación base
    // Penalización masiva si la carta se puede añadir a un juego existente
    for(const meld of allMeldsOnTable) {
        if(canBeAddedToServerMeld(card, meld)) {
            score -= 1000;
        }
    }
    // Bonificaciones por sinergia con otras cartas en la mano
    for (const otherCard of hand) {
        if (card.id === otherCard.id) continue;
        if (card.value === otherCard.value) score -= 15; // Potencial trío
        if (card.suit === otherCard.suit) {
            const rankDiff = Math.abs(getRank(card) - getRank(otherCard));
            if (rankDiff === 1) score -= 10; // Potencial escalera
            else if (rankDiff === 2) score -= 5;
        }
    }
    return { card, score };
  });
  // Devuelve la carta con la puntuación más alta (la menos útil)
  scores.sort((a, b) => b.score - a.score);
  return scores[0].card;
}

// ▼▼▼ REEMPLAZA LA FUNCIÓN botPlay ENTERA EN SERVER.JS CON ESTA VERSIÓN ▼▼▼
async function botPlay(room, botPlayerId, io) {
    const botSeat = room.seats.find(s => s.playerId === botPlayerId);
    if (!botSeat || !botSeat.active) return;

    const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await pause(1500); // Pausa para simular que piensa

    let botHand = room.playerHands[botPlayerId];
    let source = 'deck';
    let cardDrawn = null;
    let drewFromDiscardPile = false;

    // 1. --- LÓGICA DE ROBO (INTELIGENTE) ---
    const topDiscard = room.discardPile.length > 0 ? room.discardPile[room.discardPile.length - 1] : null;
    if (topDiscard) {
        const canAddToExisting = botSeat.doneFirstMeld && room.melds.some(m => canBeAddedToServerMeld(topDiscard, m));
        const potentialHand = [...botHand, topDiscard];
        const potentialNewMelds = findOptimalMelds(potentialHand);
        const meldsUsingDiscardCard = potentialNewMelds.filter(m => m.cards.some(c => c.id === topDiscard.id));
        let canFormAndMeldNewSet = false;
        if (meldsUsingDiscardCard.length > 0) {
            if (botSeat.doneFirstMeld) {
                canFormAndMeldNewSet = true;
            } else {
                const totalPoints = potentialNewMelds.reduce((sum, meld) => sum + meld.points, 0);
                if (totalPoints >= 51) canFormAndMeldNewSet = true;
            }
        }
        if (canAddToExisting || canFormAndMeldNewSet) {
            cardDrawn = room.discardPile.pop();
            botHand.push(cardDrawn);
            drewFromDiscardPile = true;
            source = 'discard';
        }
    }

    if (!drewFromDiscardPile) {
        if (room.deck.length === 0) {
            if (room.discardPile.length > 1) {
                const topCard = room.discardPile.pop();
                room.deck = room.discardPile;
                shuffle(room.deck);
                room.discardPile = [topCard];
                io.to(room.roomId).emit('deckShuffled');
            } else {
                console.log(`Bot ${botSeat.playerName} no puede robar, no hay cartas.`);
                // Si no puede robar, debe pasar el turno (esto es un caso raro)
                // Aquí podrías implementar la lógica para terminar el juego si no hay más movimientos.
                // Por ahora, simplemente avanzaremos el turno.
                return advanceTurnAfterAction(room, botPlayerId, null, io);
            }
        }
        cardDrawn = room.deck.shift();
        botHand.push(cardDrawn);
    }

    io.to(room.roomId).emit('playerDrewCard', { playerId: botPlayerId, source: source, card: source === 'discard' ? cardDrawn : null });
    io.to(room.roomId).emit('handCountsUpdate', { playerHandCounts: getSanitizedRoomForClient(room).playerHandCounts });

    await pause(1500);

    // 2. --- LÓGICA PARA AÑADIR A JUEGOS EXISTENTES ---
    if (botSeat.doneFirstMeld) {
        let cardWasAdded = true;
        while (cardWasAdded) {
            cardWasAdded = false;
            let cardToAdd = null, targetMeldIndex = -1, cardHandIndex = -1;
            for (let i = 0; i < botHand.length; i++) {
                for (let j = 0; j < room.melds.length; j++) {
                    if (canBeAddedToServerMeld(botHand[i], room.melds[j])) {
                        cardToAdd = botHand[i];
                        targetMeldIndex = j;
                        cardHandIndex = i;
                        break;
                    }
                }
                if (cardToAdd) break;
            }
            if (cardToAdd) {
                io.to(room.roomId).emit('animateCardAdd', { melderId: botPlayerId, card: cardToAdd, targetMeldIndex: targetMeldIndex });
                const addPosition = canBeAddedToServerMeld(cardToAdd, room.melds[targetMeldIndex]);
                if (addPosition === 'prepend') room.melds[targetMeldIndex].cards.unshift(cardToAdd);
                else room.melds[targetMeldIndex].cards.push(cardToAdd);
                botHand.splice(cardHandIndex, 1);
                io.to(room.roomId).emit('meldUpdate', { newMelds: room.melds, turnMelds: [], playerHandCounts: getSanitizedRoomForClient(room).playerHandCounts, highlight: { cardId: cardToAdd.id, meldIndex: targetMeldIndex } });
                cardWasAdded = true;
                if (await checkVictoryCondition(room, room.roomId, io)) return;
                await pause(1500);
            }
        }
    }

    // 3. --- LÓGICA PARA BAJAR NUEVOS JUEGOS ---
    const meldsToPlay = findOptimalMelds(botHand);
    if (meldsToPlay.length > 0) {
        const totalPoints = meldsToPlay.reduce((sum, meld) => sum + meld.points, 0);
        if (botSeat.doneFirstMeld || totalPoints >= 51) {
            for (const meld of meldsToPlay) {
                io.to(room.roomId).emit('animateNewMeld', { melderId: botPlayerId, cards: meld.cards });
                room.melds.push({ cards: meld.cards, type: meld.type, points: meld.points, melderId: botPlayerId });
                const meldedCardIds = new Set(meld.cards.map(c => c.id));
                botHand = botHand.filter(card => !meldedCardIds.has(card.id));
                room.playerHands[botPlayerId] = botHand;
            }
            botSeat.doneFirstMeld = true;
            io.to(room.roomId).emit('meldUpdate', { newMelds: room.melds, turnMelds: [], playerHandCounts: getSanitizedRoomForClient(room).playerHandCounts });
            if (checkVictoryCondition(room, room.roomId, io)) return;
            await pause(1500);
        }
    }

    // 4. --- LÓGICA DE DESCARTE (INTELIGENTE) ---
    if (botHand.length > 0) {
        const cardToDiscard = findWorstCardToDiscard(botHand, room.melds);

        // ▼▼▼ AÑADE ESTE BLOQUE DE VALIDACIÓN COMPLETO AQUÍ ▼▼▼
        // VALIDACIÓN DE FALTA: Comprobamos si el descarte del bot es ilegal.
        if (cardToDiscard) {
            for (const meld of room.melds) {
                if (canBeAddedToServerMeld(cardToDiscard, meld)) {
                    const reason = `Descarte ilegal del bot. La carta ${cardToDiscard.value}${getSuitIcon(cardToDiscard.suit)} se podía añadir a un juego en mesa.`;
                    console.log(`FALTA GRAVE BOT: ${botSeat.playerName} - ${reason}`);
                    // Si es ilegal, eliminamos al bot y detenemos su turno.
                    return handlePlayerElimination(room, botPlayerId, reason, io);
                }
            }
        }
        // ▲▲▲ FIN DEL BLOQUE DE VALIDACIÓN ▲▲▲

        if (cardToDiscard) {
            const cardIndex = botHand.findIndex(c => c.id === cardToDiscard.id);
            if (cardIndex !== -1) {
                const [discardedCard] = botHand.splice(cardIndex, 1);
                room.discardPile.push(discardedCard);
                advanceTurnAfterAction(room, botPlayerId, discardedCard, io);
            }
        } else { // Fallback por si algo falla
            const [discardedCard] = botHand.splice(0, 1);
            room.discardPile.push(discardedCard);
            advanceTurnAfterAction(room, botPlayerId, discardedCard, io);
        }
    }
}

function advanceTurnAfterAction(room, discardingPlayerId, discardedCard, io) {
    if (checkVictoryCondition(room, room.roomId, io)) return;

    resetTurnState(room);
    const seatedPlayers = room.seats.filter(s => s !== null);
    const currentPlayerIndex = seatedPlayers.findIndex(p => p.playerId === discardingPlayerId);
    let nextPlayerIndex = (currentPlayerIndex + 1) % seatedPlayers.length;
    let attempts = 0;
    while (!seatedPlayers[nextPlayerIndex] || seatedPlayers[nextPlayerIndex].active === false) {
        nextPlayerIndex = (nextPlayerIndex + 1) % seatedPlayers.length;
        if (++attempts > seatedPlayers.length * 2) {
            console.log("Error: No se pudo encontrar un siguiente jugador activo.");
            return;
        }
    }
    const nextPlayer = seatedPlayers[nextPlayerIndex];
    room.currentPlayerId = nextPlayer.playerId;

    io.to(room.roomId).emit('turnChanged', {
        discardedCard: discardedCard,
        discardingPlayerId: discardingPlayerId,
        newDiscardPile: room.discardPile,
        nextPlayerId: room.currentPlayerId,
        playerHandCounts: getSanitizedRoomForClient(room).playerHandCounts,
        newMelds: room.melds
    });

    // Si el siguiente jugador es un bot, se vuelve a llamar a la función botPlay
    const nextPlayerSeat = room.seats.find(s => s && s.playerId === room.currentPlayerId);
    if (nextPlayerSeat && nextPlayerSeat.isBot) {
        setTimeout(() => botPlay(room, room.currentPlayerId, io), 1000);
    }
}

// Configuración de archivos estáticos ya definida arriba

// ▼▼▼ AÑADE ESTA FUNCIÓN COMPLETA ▼▼▼
// ▼▼▼ REEMPLAZA LA FUNCIÓN handlePlayerDeparture ENTERA CON ESTA VERSIÓN ▼▼▼
async function handlePlayerDeparture(roomId, leavingPlayerId, io) {
    const room = rooms[roomId];

    // ▼▼▼ AÑADE ESTE BLOQUE COMPLETO AQUÍ ▼▼▼
    if (room && room.isPractice) {
        console.log(`[Práctica] El jugador humano ha salido. Eliminando la mesa de práctica ${roomId}.`);
        delete rooms[roomId]; // Elimina la sala del servidor
        broadcastRoomListUpdate(io); // Notifica a todos para que desaparezca del lobby
        return; // Detiene la ejecución para no aplicar lógica de mesas reales
    }
    // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲

    if (!room) return;

    console.log(`Gestionando salida del jugador ${leavingPlayerId} de la sala ${roomId}.`);

    if (room.spectators) {
        room.spectators = room.spectators.filter(s => s.id !== leavingPlayerId);
    }

    const seatIndex = room.seats.findIndex(s => s && s.playerId === leavingPlayerId);
    if (seatIndex === -1) {
        io.to(roomId).emit('spectatorListUpdated', { spectators: room.spectators });
        checkAndCleanRoom(roomId, io);
        return;
    }
    
    const leavingPlayerSeat = { ...room.seats[seatIndex] };
    const playerName = leavingPlayerSeat.playerName;

    room.seats[seatIndex] = null;

    if (room.state === 'playing') {
        // VALIDACIÓN CLAVE: Solo aplicamos lógica de abandono si el jugador estaba ACTIVO.
        if (leavingPlayerSeat.status !== 'waiting') {
            // --- JUGADOR ACTIVO: Se aplica multa y se gestiona el turno ---
            console.log(`Jugador activo ${playerName} ha abandonado. Se aplica multa.`);

            const reason = `${playerName} ha abandonado la partida.`;
            io.to(roomId).emit('playerEliminated', {
                playerId: leavingPlayerId,
                playerName: playerName,
                reason: reason
            });

            if (leavingPlayerSeat && leavingPlayerSeat.userId) {
                const penalty = room.settings.penalty || 0;
                const playerInfo = users[leavingPlayerSeat.userId];
                if (penalty > 0 && playerInfo) {
                    const penaltyInPlayerCurrency = convertCurrency(penalty, room.settings.betCurrency, playerInfo.currency, exchangeRates);
                    playerInfo.credits -= penaltyInPlayerCurrency;
                    room.pot = (room.pot || 0) + penalty;
                    io.to(leavingPlayerId).emit('userStateUpdated', playerInfo);
                    io.to(room.roomId).emit('potUpdated', { newPotValue: room.pot, isPenalty: true });
                }
            }

            const activePlayers = room.seats.filter(s => s && s.active !== false);
            if (activePlayers.length === 1) {
                await endGameAndCalculateScores(room, activePlayers[0], io, { name: playerName });
                return;
            } else if (activePlayers.length > 1) {
                if (room.currentPlayerId === leavingPlayerId) {
                    resetTurnState(room);
                    let oldPlayerIndex = -1;
                    if (room.initialSeats) {
                        oldPlayerIndex = room.initialSeats.findIndex(s => s && s.playerId === leavingPlayerId);
                    }
                    let nextPlayerIndex = oldPlayerIndex !== -1 ? oldPlayerIndex : 0;
                    let attempts = 0;
                    let nextPlayer = null;
                    while (!nextPlayer && attempts < room.seats.length * 2) {
                        nextPlayerIndex = (nextPlayerIndex + 1) % room.seats.length;
                        const potentialNextPlayerSeat = room.seats[nextPlayerIndex];
                        if (potentialNextPlayerSeat && potentialNextPlayerSeat.active) {
                            nextPlayer = potentialNextPlayerSeat;
                        }
                        attempts++;
                    }
                    if (nextPlayer) {
                        room.currentPlayerId = nextPlayer.playerId;
                        io.to(roomId).emit('turnChanged', {
                            discardedCard: null,
                            discardingPlayerId: leavingPlayerId,
                            newDiscardPile: room.discardPile,
                            nextPlayerId: room.currentPlayerId,
                            playerHandCounts: getSanitizedRoomForClient(room).playerHandCounts,
                            newMelds: room.melds
                        });
                    }
                }
            }
        } else {
            // --- JUGADOR EN ESPERA: No hay multa, solo se notifica ---
            console.log(`Jugador ${playerName} ha salido mientras esperaba. No se aplica multa.`);
            io.to(roomId).emit('playerAbandoned', {
                message: `${playerName} ha abandonado la mesa antes de empezar la partida.`
            });
        }
    }
    
    handleHostLeaving(room, leavingPlayerId, io);
    io.to(roomId).emit('playerLeft', getSanitizedRoomForClient(room));
    checkAndCleanRoom(roomId, io);
}
// ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
// ▲▲▲ FIN DE LA NUEVA FUNCIÓN ▲▲▲

// ▼▼▼ AÑADE LA NUEVA FUNCIÓN COMPLETA AQUÍ ▼▼▼
function createAndStartPracticeGame(socket, username, io) {
    const roomId = `practice-${socket.id}`;
    const botAvatars = [ 'https://i.pravatar.cc/150?img=52', 'https://i.pravatar.cc/150?img=51', 'https://i.pravatar.cc/150?img=50' ];

    const newRoom = {
      roomId: roomId,
      hostId: socket.id,
      settings: { username: "Práctica", bet: 0, penalty: 0 },
      state: 'playing',
      isPractice: true,
      seats: [
        { playerId: socket.id, playerName: username, avatar: '', active: true, doneFirstMeld: false, isBot: false },
        { playerId: 'bot_1', playerName: 'Bot 1', avatar: botAvatars[0], active: true, doneFirstMeld: false, isBot: true },
        { playerId: 'bot_2', playerName: 'Bot 2', avatar: botAvatars[1], active: true, doneFirstMeld: false, isBot: true },
        { playerId: 'bot_3', playerName: 'Bot 3', avatar: botAvatars[2], active: true, doneFirstMeld: false, isBot: true }
      ],
      deck: [], discardPile: [], playerHands: {}, melds: [], turnMelds: [], turnPoints: 0, hasDrawn: false, drewFromDiscard: null, firstMeldCompletedByAnyone: false, rematchRequests: new Set()
    };

    const deck = buildDeck();
    shuffle(deck);
    newRoom.seats.forEach(seat => {
        if (seat) newRoom.playerHands[seat.playerId] = deck.splice(0, 14);
    });

    const startingPlayerId = newRoom.seats[0].playerId;
    newRoom.playerHands[startingPlayerId].push(deck.shift());
    newRoom.hasDrawn = true;

    newRoom.discardPile.push(deck.shift());
    newRoom.deck = deck;
    newRoom.currentPlayerId = startingPlayerId;

    rooms[roomId] = newRoom;
    socket.join(roomId);
    socket.currentRoomId = roomId; // Aseguramos que la sala actual se actualice

    const playerHandCounts = {};
    newRoom.seats.forEach(p => { 
        if(p) playerHandCounts[p.playerId] = newRoom.playerHands[p.playerId].length; 
    });

    io.to(socket.id).emit('gameStarted', {
        hand: newRoom.playerHands[socket.id],
        discardPile: newRoom.discardPile,
        seats: newRoom.seats,
        currentPlayerId: newRoom.currentPlayerId,
        playerHandCounts: playerHandCounts,
        melds: newRoom.melds,
        isPractice: true
    });
}
// ▲▲▲ FIN DE LA NUEVA FUNCIÓN ▲▲▲

// --- FIN: SECCIÓN DE ADMINISTRACIÓN ---

// 3. Middleware para servir archivos estáticos (CSS, JS del cliente, imágenes)
app.use(express.static(path.join(__dirname)));

// 4. Ruta "catch-all" (debe ir AL FINAL de todas las rutas)
// Para cualquier otra petición GET, sirve la aplicación principal (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- MANEJO DE SOCKETS ---
io.on('connection', (socket) => {
  console.log('✅ Un jugador se ha conectado:', socket.id);
  console.log('ESTADO ACTUAL DE LAS MESAS EN EL SERVIDOR:', rooms);

  // ▼▼▼ AÑADE ESTA LÍNEA AQUÍ ▼▼▼
  socket.emit('lobbyChatHistory', lobbyChatHistory); // Envía el historial al nuevo cliente

  socket.emit('updateRoomList', Object.values(rooms));

    // --- INICIO: LÓGICA PARA EL PANEL DE ADMIN ---

    // Escucha la petición del panel de admin para obtener la lista de usuarios
    socket.on('admin:requestUserList', async () => { // <-- Se añade 'async'
        socket.join('admin-room');
        console.log(`Socket ${socket.id} se ha unido a la sala de administradores.`);

        socket.emit('admin:commissionData', commissionLog);

        // AHORA LEE DIRECTAMENTE DE LA BASE DE DATOS
        const allUsers = await getAllUsersFromDB();
        
        if (allUsers.length > 0) {
            io.to('admin-room').emit('admin:userList', allUsers);
        } else {
            io.to('admin-room').emit('admin:userList', []);
        }
    });

    // Escucha la orden del admin para actualizar los créditos de un usuario
    socket.on('admin:updateCredits', async ({ userId, newCredits, newCurrency }) => {
        const credits = parseFloat(newCredits);
        const userExistsInMemory = users[userId]; // Comprobamos si el usuario está activo

        if (!isNaN(credits) && ['EUR', 'USD', 'COP'].includes(newCurrency)) {
            console.log(`[Admin] Actualizando datos para ${userId}.`);
            
            // Actualizamos la base de datos primero
            await updateUserCredits(userId, credits, newCurrency);

            // Si el usuario está conectado, actualizamos su estado en memoria y le notificamos
            if (userExistsInMemory) {
                users[userId].credits = credits;
                users[userId].currency = newCurrency;

                for (const [id, socketInstance] of io.of("/").sockets) {
                    if (socketInstance.userId === userId) {
                        socketInstance.emit('userStateUpdated', users[userId]);
                        break; 
                    }
                }
            }

            // Reenviamos la lista completa y actualizada desde la base de datos al admin
            const allUsers = await getAllUsersFromDB();
            io.to('admin-room').emit('admin:userList', allUsers);
        }
    });

    // Escucha la orden del admin para eliminar un usuario
    socket.on('admin:deleteUser', async ({ userId }) => {
        const username = userId.replace(/^user_/, ''); // Extraemos el username del id
        console.log(`[Admin] Petición para eliminar al usuario: ${username} (ID: ${userId})`);

        // 1. Eliminar de la base de datos
        const deletedFromDB = await deleteUserFromDB(username);

        if (deletedFromDB) {
            // 2. Eliminar del objeto en memoria (si existe)
            if (users[userId]) {
                delete users[userId];
            }

            // 3. Obtener la lista actualizada y notificar a todos los admins
            const allUsers = await getAllUsersFromDB();
            io.to('admin-room').emit('admin:userList', allUsers);
            console.log(`[Admin] Lista de usuarios actualizada enviada tras eliminación.`);
        } else {
            console.log(`[Admin] No se pudo eliminar al usuario ${username}, puede que ya no exista.`);
            // Opcional: notificar al admin de un posible error
            const allUsers = await getAllUsersFromDB();
            io.to('admin-room').emit('admin:userList', allUsers);
        }
    });

    // ▼▼▼ AÑADE ESTE LISTENER ▼▼▼
    socket.on('requestInitialData', () => {
        socket.emit('exchangeRatesUpdate', exchangeRates);
    });
    // ▲▲▲ FIN DEL LISTENER ▲▲▲

    // Escucha cuando un usuario inicia sesión en el lobby
    socket.on('userLoggedIn', async ({ username, currency }) => {
        if (!username || !currency) return;

        // ----- CORRECCIÓN #1: La misma errata estaba aquí -----
        const userId = 'user_' + username.toLowerCase();
        socket.userId = userId;

        try {
            // ▼▼▼ REEMPLAZA ESTA LÍNEA ▼▼▼
            const userData = await getUserByUsername(username); // Corregido para usar la nueva función

            // Si la función falla, userData será null
            if (!userData) {
                // Manejar el caso en que el usuario logueado no existe en la BD (esto no debería pasar)
                console.error(`Error crítico: el usuario '${username}' pasó el login pero no se encontró en la BD.`);
                // Desconectar al usuario o manejar el error como prefieras
                return;
            }
            
            if (userData.currency !== currency) {
                await updateUserCredits(userId, userData.credits, currency);
                userData.currency = currency;
            }
            
            users[userId] = userData;
            
            console.log(`[Lobby Login] Usuario ${userId} cargado desde BD: ${userData.credits} ${userData.currency}`);

            socket.emit('userStateUpdated', users[userId]);
        } catch (error) {
            console.error('Error cargando usuario desde BD:', error);
            users[userId] = {
                credits: 0,
                currency: currency
            };
            socket.emit('userStateUpdated', users[userId]);
        }

        // ----- CORRECCIÓN #2: Usar la misma fuente de datos que el resto de funciones -----
        // En lugar de construir la lista desde la memoria, la pedimos a la base de datos
        // para asegurar que siempre sea correcta y consistente.
        const allUsers = await getAllUsersFromDB();
        io.to('admin-room').emit('admin:userList', allUsers);
    });

    // server.js -> Añade este bloque dentro de io.on('connection', ...)
    socket.on('admin:resetCommissions', () => {
        console.log(`[Admin] Se han reiniciado las ganancias acumuladas.`);
        commissionLog = []; // Vaciamos el array del historial
        
        // Notificamos a todos los paneles de admin que los datos han sido reseteados
        io.to('admin-room').emit('admin:commissionData', commissionLog);
    });

    // ▼▼▼ AÑADE ESTOS DOS LISTENERS ▼▼▼
    socket.on('admin:requestRates', () => {
        socket.emit('admin:exchangeRates', exchangeRates);
    });

    socket.on('admin:updateRates', (newRates) => {
        console.log('[Admin] Actualizando tasas de cambio:', newRates);
        // Actualizamos nuestro objeto en memoria
        exchangeRates.EUR.COP = newRates.EUR_COP || 4500;
        exchangeRates.USD.COP = newRates.USD_COP || 4500;
        // Recalculamos las inversas
        exchangeRates.COP.EUR = 1 / exchangeRates.EUR.COP;
        exchangeRates.COP.USD = 1 / exchangeRates.USD.COP;

        // Notificamos a TODOS los clientes (jugadores y admins) de las nuevas tasas
        io.emit('exchangeRatesUpdate', exchangeRates);
    });
    // ▲▲▲ FIN DE LOS LISTENERS ▲▲▲

    // --- FIN: LÓGICA PARA EL PANEL DE ADMIN ---

  socket.on('createRoom', (settings) => {
    const roomId = generateRoomId();

    // --- INICIO DE LA CORRECCIÓN ---
    // Se genera el userId en el servidor para consistencia, igual que al unirse.
    const userId = 'user_' + settings.username.toLowerCase();
    console.log(`[Servidor] Asignando userId al creador '${settings.username}': ${userId}`);
    // --- FIN DE LA CORRECCIÓN ---

    socket.userId = userId;

    const playerInfo = users[userId];
    const roomBet = settings.bet;
    const roomPenalty = settings.penalty;
    const roomCurrency = settings.betCurrency;

    // Calculamos el coste TOTAL (apuesta + multa) en la moneda de la mesa.
    const totalRequirementInRoomCurrency = roomBet + roomPenalty;

    // Convertimos el coste TOTAL a la moneda del jugador.
    const requiredAmountInPlayerCurrency = convertCurrency(totalRequirementInRoomCurrency, roomCurrency, playerInfo.currency, exchangeRates);

    if (!playerInfo || playerInfo.credits < requiredAmountInPlayerCurrency) {
        const friendlyRequired = requiredAmountInPlayerCurrency.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const friendlyBet = roomBet.toLocaleString('es-ES');
        const friendlyPenalty = roomPenalty.toLocaleString('es-ES');

        return socket.emit('joinError', `Créditos insuficientes. Crear esta mesa de ${friendlyBet} ${roomCurrency} (+${friendlyPenalty} de multa) requiere aprox. ${friendlyRequired} ${playerInfo.currency}.`);
    }

    const newRoom = {
      roomId: roomId,
      hostId: socket.id,
      settings: settings,
      players: [{ id: socket.id, name: settings.username }],
      seats: [
        { 
          playerId: socket.id, 
          playerName: settings.username, 
          avatar: settings.userAvatar, 
          active: true, 
          doneFirstMeld: false,
          userId: userId // Se usa el ID generado por el servidor
        },
        null, null, null
      ],
      state: 'waiting',
      deck: [],
      discardPile: [],
      playerHands: {},
      melds: [],
      turnMelds: [],
      turnPoints: 0,
      hasDrawn: false,
      drewFromDiscard: null,
      firstMeldCompletedByAnyone: false,
      rematchRequests: new Set(),
      chatHistory: [{ sender: 'Sistema', message: `Mesa de ${settings.username} creada. ¡Buena suerte!` }]
    };
    rooms[roomId] = newRoom;
    socket.join(roomId);
    
    socket.currentRoomId = roomId;
    
    socket.emit('roomCreatedSuccessfully', newRoom);
    socket.emit('chatHistory', newRoom.chatHistory);
    broadcastRoomListUpdate(io);
    console.log(`Mesa creada: ${roomId} por ${settings.username}`);
  });

  socket.on('requestPracticeGame', (username) => {
    // ▼▼▼ REEMPLAZA EL CONTENIDO CON ESTA LÍNEA ▼▼▼
    createAndStartPracticeGame(socket, username, io);
  });

    socket.on('joinRoom', ({ roomId, user }) => {
        const room = rooms[roomId];
        if (!room) {
            return socket.emit('joinError', 'La mesa no existe.');
        }

        // SOLUCIÓN DEFINITIVA: El servidor maneja completamente los IDs
        const userId = 'user_' + user.username.toLowerCase();
        console.log(`[Servidor] Gestionando entrada de '${user.username}' con ID: ${userId}`);
        
        socket.userId = userId; // Guardamos el userId en el socket para futuro uso

        // El usuario ya debe existir en users desde userLoggedIn

        // --- LÓGICA ANTI-ROBO DE IDENTIDAD: LIMPIEZA AGRESIVA ---
        // 1. Limpiamos CUALQUIER asiento que tenga el mismo userId
        for (let i = 0; i < room.seats.length; i++) {
            if (room.seats[i] && room.seats[i].userId === userId) {
                console.log(`[ANTI-ROBO] Eliminando asiento [${i}] del usuario '${user.username}' para prevenir robo de identidad.`);
                room.seats[i] = null;
            }
        }
        
        // 2. Limpiamos también por playerName para casos extremos
        for (let i = 0; i < room.seats.length; i++) {
            if (room.seats[i] && room.seats[i].playerName === user.username) {
                console.log(`[ANTI-ROBO] Eliminando asiento [${i}] por nombre duplicado '${user.username}'.`);
                room.seats[i] = null;
            }
        }
        // --- FIN DE LA LÓGICA ANTI-ROBO ---

        // 3. VALIDACIÓN MEJORADA: Solo prevenir entrada si hay 4 jugadores activos
        if (room.state === 'playing') {
            const activePlayers = room.seats.filter(s => s && s.active !== false).length;
            if (activePlayers >= 4) {
                console.log(`[ANTI-ROBO] Bloqueando entrada de '${user.username}' - Mesa llena con ${activePlayers} jugadores activos.`);
                return socket.emit('joinError', 'La mesa está llena. Espera a que termine la partida.');
            }
        }

    if (room.kickedPlayers && room.kickedPlayers.has(socket.id)) {
        return socket.emit('joinError', 'No puedes unirte a esta mesa porque has sido expulsado.');
    }

    const emptySeatIndex = room.seats.findIndex(seat => seat === null);

    if (emptySeatIndex === -1) {
        return socket.emit('joinError', 'La mesa está llena.');
    }

    if (!room.players) room.players = [];
    room.players.push({ id: socket.id, name: user.username });

    const isWaitingForNextGame = room.state === 'playing' || room.state === 'post-game';

    const roomBet = room.settings.bet;
    const roomPenalty = room.settings.penalty || 0;
    const roomCurrency = room.settings.betCurrency;
    const playerInfo = users[userId];

    // Calculamos el requisito total (apuesta + multa) en la moneda de la mesa
    const totalRequirementInRoomCurrency = roomBet + roomPenalty;

    // Convertimos ese requisito total a la moneda del jugador
    const requiredAmountInPlayerCurrency = convertCurrency(totalRequirementInRoomCurrency, roomCurrency, playerInfo.currency, exchangeRates);

    if (!playerInfo || playerInfo.credits < requiredAmountInPlayerCurrency) {
        const friendlyBet = convertCurrency(roomBet, roomCurrency, playerInfo.currency, exchangeRates);
        const friendlyPenalty = convertCurrency(roomPenalty, roomCurrency, playerInfo.currency, exchangeRates);
        return socket.emit('joinError', `Créditos insuficientes. Necesitas ${requiredAmountInPlayerCurrency.toFixed(2)} ${playerInfo.currency} para cubrir la apuesta (${friendlyBet.toFixed(2)}) y la posible multa (${friendlyPenalty.toFixed(2)}).`);
    }

    room.seats[emptySeatIndex] = {
        playerId: socket.id,
        playerName: user.username,
        avatar: user.userAvatar,
        active: !isWaitingForNextGame,
        doneFirstMeld: false,
        status: isWaitingForNextGame ? 'waiting' : undefined,
        userId: userId // Usamos el userId generado por el servidor
    };

    // ▼▼▼ AÑADE ESTE BLOQUE COMPLETO AQUÍ ▼▼▼
    // Si un jugador se une durante la fase de revancha, actualizamos el estado para todos.
    if (room.state === 'post-game') {
        console.log(`Un nuevo jugador (${user.username}) se ha unido durante la revancha. Actualizando estado...`);

        // Recalculamos quiénes están listos (incluyendo al nuevo jugador que tiene status: 'waiting')
        const readyPlayerIds = new Set();
        room.rematchRequests.forEach(id => readyPlayerIds.add(id));
        room.seats.forEach(seat => {
            if (seat && seat.status === 'waiting') {
                readyPlayerIds.add(seat.playerId);
            }
        });
        const playersReadyNames = Array.from(readyPlayerIds).map(id => {
            const seat = room.seats.find(s => s && s.playerId === id);
            return seat ? seat.playerName : null;
        }).filter(Boolean);
        const totalPlayersReady = readyPlayerIds.size;

        // Notificamos a todos en la sala para que la UI se actualice instantáneamente.
        io.to(roomId).emit('rematchUpdate', {
            playersReady: playersReadyNames,
            canStart: totalPlayersReady >= 2,
            hostId: room.hostId
        });
    }
    // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲

    socket.join(roomId);
    
    // ▼▼▼ AÑADE ESTA LÍNEA AQUÍ ▼▼▼
    socket.currentRoomId = roomId; // Guardamos en la conexión la sala actual del jugador.

    if (isWaitingForNextGame) {
        socket.emit('joinedAsSpectator', getSanitizedRoomForClient(room));
    } else {
        socket.emit('joinedRoomSuccessfully', getSanitizedRoomForClient(room));
    }

    socket.emit('chatHistory', room.chatHistory);
    io.to(roomId).emit('playerJoined', getSanitizedRoomForClient(room));
    broadcastRoomListUpdate(io);

    console.log(`Jugador ${user.username} (ID: ${userId}) se sentó en la mesa ${roomId}.`);
  });


  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
        console.log(`Iniciando juego en la mesa ${roomId}`);
        room.state = 'playing';
        if (!room.chatHistory) room.chatHistory = [];
        room.chatHistory.push({ sender: 'Sistema', message: 'Ha comenzado una nueva partida.' });
        room.initialSeats = JSON.parse(JSON.stringify(room.seats.filter(s => s !== null))); // Guardamos quiénes empezaron
        room.melds = [];
        room.pot = 0; // <<-- AÑADE ESTA LÍNEA para inicializar el bote
        
        room.seats.forEach(seat => {
            if (seat) {
                seat.active = true;
                seat.doneFirstMeld = false;

                const playerInfo = users[seat.userId];
                if (playerInfo) {
                    const roomBet = room.settings.bet;
                    const roomCurrency = room.settings.betCurrency;

                    // Convertir la apuesta a la moneda del jugador para descontarla
                    const betInPlayerCurrency = convertCurrency(roomBet, roomCurrency, playerInfo.currency, exchangeRates);

                    playerInfo.credits -= betInPlayerCurrency;

                    // El bote siempre se mantiene en la moneda de la mesa
                    room.pot += roomBet;

                    io.to(seat.playerId).emit('userStateUpdated', playerInfo);
                }
            }
        });
        
        const newDeck = buildDeck();
        shuffle(newDeck);
        
        const seatedPlayers = room.seats.filter(s => s !== null);
        seatedPlayers.forEach(player => {
            room.playerHands[player.playerId] = newDeck.splice(0, 14);
        });

        const startingPlayerId = seatedPlayers[0].playerId;
        room.playerHands[startingPlayerId].push(newDeck.shift());
        
        // --- LÍNEA A AÑADIR ---
        room.hasDrawn = true; // El primer jugador ya "robó" su carta inicial.
        // --- FIN DE LA CORRECCIÓN ---

        room.discardPile = [newDeck.shift()];
        room.deck = newDeck;
        room.currentPlayerId = startingPlayerId;

        const playerHandCounts = {};
        seatedPlayers.forEach(player => {
            playerHandCounts[player.playerId] = room.playerHands[player.playerId].length;
        });

        // ▼▼▼ AÑADE ESTE BLOQUE AQUÍ ▼▼▼
        // Notifica a TODOS en la sala (jugadores y espectadores) que reseteen su chat y lista de espectadores.
        io.to(roomId).emit('resetForNewGame', { 
            spectators: room.spectators || [] // Envía la lista de espectadores actualizada
        });
        // ▲▲▲ FIN DEL BLOQUE AÑADIDO ▲▲▲

        seatedPlayers.forEach(player => {
            io.to(player.playerId).emit('gameStarted', {
                hand: room.playerHands[player.playerId],
                discardPile: room.discardPile,
                seats: room.seats,
                currentPlayerId: room.currentPlayerId,
                playerHandCounts: playerHandCounts,
                melds: room.melds // <-- AÑADE ESTA LÍNEA
            });
        });
        
        console.log(`Partida iniciada en ${roomId}. Bote inicial: ${room.pot}.`);
        // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
        io.to(roomId).emit('potUpdated', { newPotValue: room.pot, isPenalty: false });
        // ▲▲▲ FIN DE LA LÍNEA A AÑADIR ▲▲▲
        broadcastRoomListUpdate(io);
    }
  });

  socket.on('meldAction', async (data) => {
    // AÑADE ESTA LÍNEA AL INICIO DE LA FUNCIÓN
    let highlightInfo = null;
    const { roomId, cardIds, targetMeldIndex } = data;
    const room = rooms[roomId];
    const playerSeat = room.seats.find(s => s && s.playerId === socket.id);

    if (!room || !playerSeat || room.currentPlayerId !== socket.id) {
        return console.log('Acción de meld inválida: fuera de turno o jugador no encontrado.');
    }

    // V --- AÑADE ESTA VALIDACIÓN AQUÍ --- V
    if (!room.hasDrawn) {
        const reason = 'Intentó bajar una combinación sin haber robado una carta primero.';
        console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
        return handlePlayerElimination(room, socket.id, reason, io);
    }
    // ^ --- FIN DE LA VALIDACIÓN --- ^

    const playerHand = room.playerHands[socket.id];
    const cards = cardIds.map(id => playerHand.find(c => c.id === id)).filter(Boolean);

    if (cards.length !== cardIds.length) {
        return console.log('Falta: El jugador intentó bajar cartas que no tiene.');
    }

    // --- LÓGICA PARA AÑADIR A UN MELD EXISTENTE (PERMANENTE) ---
    if (typeof targetMeldIndex !== 'undefined') {
        if (cards.length !== 1) {
            return io.to(socket.id).emit('fault', { reason: 'Solo puedes añadir una carta a la vez.' });
        }
        if (!playerSeat.doneFirstMeld && room.turnPoints < 51) {
            const reason = 'Intentó añadir una carta a un juego existente sin haber cumplido el requisito de 51 puntos en su bajada inicial.';
            console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
            return handlePlayerElimination(room, socket.id, reason, io);
        }

        // Notificar a todos para animar la adición de la carta
        io.to(roomId).emit('animateCardAdd', {
            melderId: socket.id,
            card: cards[0],
            targetMeldIndex: targetMeldIndex
        });

        const targetMeld = room.melds[targetMeldIndex];
        
        // --- INICIO DE LA CORRECCIÓN ---
        // Usamos la nueva función inteligente para saber dónde va la carta.
        const addPosition = targetMeld ? canBeAddedToServerMeld(cards[0], targetMeld) : false;

        if (addPosition === 'prepend') {
            // 'prepend' significa que la añadimos al PRINCIPIO del array.
            targetMeld.cards.unshift(cards[0]);
        } else if (addPosition === 'append') {
            // 'append' significa que la añadimos al FINAL del array.
            targetMeld.cards.push(cards[0]);
        } else {
            // Si la función devuelve 'false', la jugada es inválida.
            return io.to(socket.id).emit('fault', { reason: 'La carta no es válida para esa combinación.' });
        }
        // YA NO SE REORDENA NADA. La carta ya está en su sitio correcto.
        // --- FIN DE LA CORRECCIÓN ---

        // Guardamos la información de la carta a resaltar para enviarla más tarde.
        highlightInfo = {
            cardId: cards[0].id,
            meldIndex: targetMeldIndex
        };

    }
    // --- LÓGICA PARA BAJAR UNA NUEVA COMBINACIÓN (TEMPORAL) ---
    else {
        // REGLA: Si el jugador robó del descarte y aún no ha cumplido el requisito de usar la carta...
        if (room.drewFromDiscard && room.discardCardRequirementMet === false) {
            // ...entonces esta combinación DEBE contener la carta robada.
            const cardIsPresentInMeld = cards.some(c => c.id === room.drewFromDiscard.id);

            if (!cardIsPresentInMeld) {
                // Si no la contiene, es una falta grave.
                const reason = 'Robó del descarte y no usó la carta en su primera combinación.';
                console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
                return handlePlayerElimination(room, socket.id, reason, io);
            } else {
                // Si la contiene, el requisito ya se ha cumplido para el resto del turno.
                console.log(`Jugador ${socket.id} ha cumplido el requisito de la carta de descarte.`);
                room.discardCardRequirementMet = true;
            }
        }

        // Notificar a todos para animar la nueva combinación
        io.to(roomId).emit('animateNewMeld', {
            melderId: socket.id,
            cards: cards
        });

        const meldType = validateMeld(cards);
        if (!meldType) {
            const reason = 'Intento de bajar una combinación de cartas inválida.';
            console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
            return handlePlayerElimination(room, socket.id, reason, io);
        }

        const meldPoints = calculateMeldPoints(cards, meldType);

        // Añadimos la combinación y los puntos al estado temporal del turno
        room.turnMelds.push({
            cards: cards,
            type: meldType,
            points: meldPoints,
            melderId: socket.id
        });
        room.turnPoints += meldPoints;
    }

    // --- LÓGICA COMÚN: ACTUALIZAR MANO Y NOTIFICAR ---
    const meldedCardIds = new Set(cardIds);
    room.playerHands[socket.id] = playerHand.filter(card => !meldedCardIds.has(card.id));

    const playerHandCounts = {};
    room.seats.filter(s => s).forEach(p => {
        playerHandCounts[p.playerId] = room.playerHands[p.playerId]?.length || 0;
    });
    
    // Notificamos a todos, enviando tanto las combinaciones permanentes como las temporales
    io.to(roomId).emit('meldUpdate', {
        newMelds: room.melds,
        turnMelds: room.turnMelds,
        playerHandCounts: playerHandCounts,
        highlight: highlightInfo // <--- LÍNEA AÑADIDA
    });

    socket.emit('meldSuccess', { meldedCardIds: cardIds });
    await checkVictoryCondition(room, roomId, io);
  });

socket.on('accionDescartar', async (data) => {
    console.log(`[DEBUG] accionDescartar recibida de ${socket.id}:`, data);
    const { roomId, card } = data;
    const room = rooms[roomId];
    
    console.log(`[DEBUG] Room encontrada:`, !!room);
    console.log(`[DEBUG] Current player: ${room?.currentPlayerId}, Socket ID: ${socket.id}`);
    
    if (!room || room.currentPlayerId !== socket.id) {
        console.log(`[DEBUG] Salida temprana: room=${!!room}, currentPlayer=${room?.currentPlayerId}, socket=${socket.id}`);
        return;
    }

    const playerSeat = room.seats.find(s => s && s.playerId === socket.id);
    console.log(`[DEBUG] Player seat encontrado:`, !!playerSeat);
    if (!playerSeat) return;

    const playerHand = room.playerHands[socket.id];
    console.log(`[DEBUG] Player hand length:`, playerHand?.length);
    console.log(`[DEBUG] Card to discard:`, card);

    // << --- INICIO DE LA NUEVA CORRECCIÓN --- >>
    // REGLA CRÍTICA: Si el jugador robó del MAZO y ha bajado combinaciones en este turno, está obligado a ganar.
    if (!room.drewFromDiscard && room.turnMelds.length > 0) {
        // Si después de bajar, su mano no queda vacía (es decir, no ha ganado), es una falta.
        // Se comprueba `playerHand.length > 1` porque la carta a descartar aún está en la mano.
        if (playerHand.length > 1) {
            const reason = 'Robó del mazo, bajó un juego y no ganó en el mismo turno.';
            console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
            return handlePlayerElimination(room, socket.id, reason, io);
        }
    }
    // << --- FIN DE LA NUEVA CORRECCIÓN --- >>

    // REGLA 1 (CORREGIDA): El jugador debe haber robado, A MENOS QUE SEA SU PRIMER TURNO.
    // El primer turno se identifica por: tiene 15 cartas O ya se marcó hasDrawn al iniciar el juego
    const isFirstTurn = playerHand.length === 15 || (room.hasDrawn && room.turnMelds.length === 0 && !room.drewFromDiscard);
    if (!room.hasDrawn && !isFirstTurn) {
        const reason = 'Intentó descartar una carta sin haber robado primero.';
        console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
        return handlePlayerElimination(room, socket.id, reason, io);
    }

    // REGLA 2: Si robó del descarte, es OBLIGATORIO bajar al menos una combinación.
    if (room.drewFromDiscard) {
        // La validación de que usó la carta robada ya está en 'meldAction'.
        // Aquí solo nos aseguramos de que no pueda robar y descartar directamente sin bajar.
        if (room.turnMelds.length === 0) {
            const reason = 'Robó del descarte y no bajó ninguna combinación.';
            console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
            return handlePlayerElimination(room, socket.id, reason, io);
        }
    }

    // ▼▼▼ REEMPLAZA EL BLOQUE DE LA REGLA 3 CON ESTE CÓDIGO ▼▼▼

    // REGLA 3: Descarte ilegal (CORREGIDA Y MEJORADA).
    const isWinningDiscard = playerHand.length === 1;

    // La validación solo se activa si NO es el descarte para ganar.
    if (!isWinningDiscard) {
        // Se comprueba contra TODAS las combinaciones en la mesa (las permanentes y las de este turno).
        const allCurrentMelds = [...room.melds, ...room.turnMelds];

        if (allCurrentMelds.length > 0) {
            for (const meld of allCurrentMelds) {
                if (canBeAddedToServerMeld(card, meld)) {
                    // Si la carta se puede añadir, es una falta grave.
                    const reason = `Descarte ilegal. La carta ${card.value}${getSuitIcon(card.suit)} podía ser añadida a un juego ya bajado en la mesa.`;
                    console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
                    return handlePlayerElimination(room, socket.id, reason, io);
                }
            }
        }
    }
    // ▲▲▲ FIN DEL CÓDIGO DE REEMPLAZO ▲▲▲

    // REGLA 4: Validar 51 puntos (ESTRICTO - CAUSA ELIMINACIÓN).
    // Solo aplica si el jugador ha bajado combinaciones en este turno
    if (!playerSeat.doneFirstMeld && room.turnMelds.length > 0) {
        if (room.turnPoints < 51) {
            // ¡FALTA GRAVE! El jugador intentó descartar sin haber bajado los 51 puntos requeridos.
            const reason = `No cumplió con los 51 puntos requeridos en su primera bajada (solo bajó ${room.turnPoints}).`;
            console.log(`FALTA GRAVE: Jugador ${socket.id} - ${reason}`);
            return handlePlayerElimination(room, socket.id, reason, io);
        } else {
            // Si los puntos son 51 o más, la jugada es válida.
            playerSeat.doneFirstMeld = true;
            room.firstMeldCompletedByAnyone = true;
        }
    }

    // --- SI TODAS LAS REGLAS PASAN, LA JUGADA ES VÁLIDA ---
    console.log(`[DEBUG] Todas las validaciones pasaron, procesando descarte...`);
    const cardIndex = playerHand.findIndex(c => c.id === card.id);
    console.log(`[DEBUG] Card index found:`, cardIndex);
    if (cardIndex === -1) {
        console.log(`[DEBUG] Carta no encontrada en la mano del jugador`);
        return socket.emit('fault', { reason: 'Error de sincronización, la carta no está en tu mano.' });
    }

    // 1. Procesar la jugada.
    console.log(`[DEBUG] Eliminando carta de la mano...`);
    playerHand.splice(cardIndex, 1);
    console.log(`[DEBUG] Agregando carta al descarte...`);
    room.discardPile.push(card);
    console.log(`[DEBUG] Descartar procesado exitosamente`);
    if (room.turnMelds.length > 0) {
        room.melds.push(...room.turnMelds);
    }

    // 2. Comprobar victoria.
    console.log(`[DEBUG] Comprobando condición de victoria...`);
    if (await checkVictoryCondition(room, roomId, io)) {
        console.log(`[DEBUG] Juego terminado por victoria`);
        return;
    }

    // 3. Resetear y cambiar turno.
    console.log(`[DEBUG] Reseteando estado del turno...`);
    resetTurnState(room);
    const seatedPlayers = room.seats.filter(s => s !== null);
    const currentPlayerIndex = seatedPlayers.findIndex(p => p.playerId === socket.id);
    let nextPlayerIndex = (currentPlayerIndex + 1) % seatedPlayers.length;
    console.log(`[DEBUG] Current player index: ${currentPlayerIndex}, Next player index: ${nextPlayerIndex}`);
    while (!seatedPlayers[nextPlayerIndex] || seatedPlayers[nextPlayerIndex].active === false) {
        nextPlayerIndex = (nextPlayerIndex + 1) % seatedPlayers.length;
    }
    room.currentPlayerId = seatedPlayers[nextPlayerIndex].playerId;
    console.log(`[DEBUG] Nuevo current player: ${room.currentPlayerId}`);

    // 4. Notificar a TODOS.
    const playerHandCounts = {};
    seatedPlayers.forEach(p => { playerHandCounts[p.playerId] = room.playerHands[p.playerId]?.length || 0; });

    console.log(`[DEBUG] Enviando turnChanged a todos los jugadores...`);
    io.to(roomId).emit('turnChanged', {
        discardedCard: card,
        discardingPlayerId: socket.id,
        newDiscardPile: room.discardPile,
        nextPlayerId: room.currentPlayerId,
        playerHandCounts: playerHandCounts,
        newMelds: room.melds
    });
    console.log(`[DEBUG] turnChanged enviado exitosamente`);

    // 5. Activar bot si es su turno.
    const nextPlayerSeat = room.seats.find(s => s && s.playerId === room.currentPlayerId);
    if (nextPlayerSeat && nextPlayerSeat.isBot) {
        setTimeout(() => botPlay(room, room.currentPlayerId, io), 1000);
    }
});

// Pequeña corrección en getSuitIcon para que funcione en el servidor
function getSuitIcon(s) { if(s==='hearts')return'♥'; if(s==='diamonds')return'♦'; if(s==='clubs')return'♣'; if(s==='spades')return'♠'; return ''; }

  socket.on('drawFromDeck', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.currentPlayerId !== socket.id) {
        return;
    }

    // --- INICIO DE LA NUEVA VALIDACIÓN ---
    if (room.hasDrawn) {
        const reason = 'Intento de robar más de una vez en el mismo turno.';
        console.log(`FALTA: Jugador ${socket.id} - ${reason}`);
        return handlePlayerElimination(room, socket.id, reason, io);
    }
    // --- FIN DE LA NUEVA VALIDACIÓN ---

    if (room.deck.length === 0) {
        if (room.discardPile.length > 1) {
            const topCard = room.discardPile.pop();
            room.deck = room.discardPile;
            shuffle(room.deck);
            room.discardPile = [topCard];

            // ▼▼▼ AÑADE ESTA LÍNEA AQUÍ ▼▼▼
            io.to(roomId).emit('deckShuffled'); // Notifica a todos que se ha barajado el mazo.
            
        } else {
            socket.emit('fault', { reason: 'No hay cartas disponibles para robar.' });
            return;
        }
    }
    
    const cardDrawn = room.deck.shift();
    room.playerHands[socket.id].push(cardDrawn);

    const playerHandCounts = {};
    const seatedPlayers = room.seats.filter(s => s !== null);
    seatedPlayers.forEach(player => {
        const hand = room.playerHands[player.playerId];
        playerHandCounts[player.playerId] = hand ? hand.length : 0;
    });

    room.hasDrawn = true;
    
    // Notificar a todos en la sala sobre el robo
    io.to(roomId).emit('playerDrewCard', {
        playerId: socket.id,
        source: 'deck',
        playerHandCounts: playerHandCounts // Enviamos los conteos actualizados
    });
    
    socket.emit('cardDrawn', { 
        card: cardDrawn,
        newDeckSize: room.deck.length,
        newDiscardPile: room.discardPile 
    });

    io.to(roomId).emit('handCountsUpdate', {
        playerHandCounts: playerHandCounts
    });
  });

  // AÑADE este nuevo listener para el robo del descarte
  socket.on('drawFromDiscard', (roomId) => {
      const room = rooms[roomId];
      if (!room || room.currentPlayerId !== socket.id) {
          return;
      }
      if (room.hasDrawn) {
          const reason = 'Intento de robar más de una vez en el mismo turno.';
          return handlePlayerElimination(room, socket.id, reason, io);
      }
      if (room.discardPile.length === 0) {
          return;
      }

      const cardDrawn = room.discardPile.pop();
      room.playerHands[socket.id].push(cardDrawn);

      const playerHandCounts = {};
      room.seats.filter(s => s !== null).forEach(p => {
          playerHandCounts[p.playerId] = room.playerHands[p.playerId]?.length || 0;
      });

      room.hasDrawn = true;
      room.drewFromDiscard = cardDrawn;
      
      // Notificar a todos en la sala sobre el robo del descarte
      io.to(roomId).emit('playerDrewCard', {
          playerId: socket.id,
          source: 'discard',
          card: cardDrawn, // Enviamos la carta para que se vea la animación correcta
          newDiscardPile: room.discardPile, // Enviamos el nuevo estado del descarte
          playerHandCounts: playerHandCounts // Enviamos los conteos actualizados
      });
      
      // --- INICIO DE LA CORRECCIÓN ---
      // Activamos la bandera que obliga a usar esta carta.
      room.discardCardRequirementMet = false; 
      // --- FIN DE LA CORRECCIÓN ---
      
      socket.emit('discardCardDrawn', { 
          card: cardDrawn,
          newDiscardPile: room.discardPile 
      });

      io.to(roomId).emit('handCountsUpdate', {
          playerHandCounts: playerHandCounts
      });
  });

  socket.on('playerFault', ({ roomId, faultReason }) => {
    const room = rooms[roomId];
    if (room) {
        handlePlayerElimination(room, socket.id, faultReason, io);
    }
  });

  socket.on('sendGameChat', (data) => {
    const { roomId, message, sender } = data;
    const room = rooms[roomId];
    if (room) {
        const chatMessage = { sender, message };
        // 1. Guardamos el mensaje en el historial de la sala
        if (!room.chatHistory) room.chatHistory = [];
        room.chatHistory.push(chatMessage);
        // 2. Lo enviamos a todos en la sala como antes
        io.to(roomId).emit('gameChat', chatMessage);
    }
  });

  // ▼▼▼ AÑADE ESTE LISTENER COMPLETO DENTRO DE io.on('connection',...) ▼▼▼
  socket.on('sendLobbyChat', (data) => {
      if (!data || !data.text || !data.sender) return; // Validación básica

      // Creamos el objeto del mensaje en el servidor para consistencia
      const newMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          from: data.sender,
          text: data.text,
          ts: Date.now()
      };

      // Lo guardamos en el historial
      lobbyChatHistory.push(newMessage);
      if (lobbyChatHistory.length > LOBBY_CHAT_HISTORY_LIMIT) {
          lobbyChatHistory.shift(); // Eliminamos el mensaje más antiguo si superamos el límite
      }

      // Lo retransmitimos a TODOS los clientes conectados
      io.emit('lobbyChatUpdate', newMessage);
  });
  // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

  // ▼▼▼ REEMPLAZA TU LISTENER socket.on('disconnect', ...) ENTERO CON ESTE NUEVO CÓDIGO ▼▼▼
  socket.on('disconnect', () => {
    console.log('❌ Un jugador se ha desconectado:', socket.id);
    const roomId = socket.currentRoomId; // Obtenemos la sala de forma instantánea.

    if (roomId && rooms[roomId]) {
        // Si el jugador estaba en una sala válida, procesamos su salida.
        console.log(`El jugador ${socket.id} estaba en la mesa ${roomId}. Aplicando lógica de salida...`);
        handlePlayerDeparture(roomId, socket.id, io);
    }
  });
  // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

  socket.on('requestRematch', (data) => {
    const { roomId } = data;
    const room = rooms[roomId];
    if (!room) return;

    const playerSeat = room.seats.find(s => s && s.playerId === socket.id);
    if (!playerSeat || !playerSeat.userId) return;

    const playerInfo = users[playerSeat.userId];
    if (!playerInfo) return;

    // 1. El servidor calcula el requisito real.
    const requirementInRoomCurrency = (room.settings.bet || 0) + (room.settings.penalty || 0);
    const requiredInPlayerCurrency = convertCurrency(requirementInRoomCurrency, room.settings.betCurrency, playerInfo.currency, exchangeRates);

    // 2. El servidor valida contra sus propios datos.
    if (playerInfo.credits >= requiredInPlayerCurrency) {
        // SI HAY FONDOS: Procede con la lógica de revancha.
        room.rematchRequests.add(socket.id);

        const readyPlayerIds = new Set();
        room.rematchRequests.forEach(id => readyPlayerIds.add(id));
        room.seats.forEach(seat => {
            if (seat && seat.status === 'waiting') {
                readyPlayerIds.add(seat.playerId);
            }
        });

        const playersReadyNames = Array.from(readyPlayerIds).map(id => {
            const seat = room.seats.find(s => s && s.playerId === id);
            return seat ? seat.playerName : null;
        }).filter(Boolean);

        const totalPlayersReady = readyPlayerIds.size;

        io.to(roomId).emit('rematchUpdate', {
            playersReady: playersReadyNames,
            canStart: totalPlayersReady >= 2,
            hostId: room.hostId
        });
    } else {
        // SI NO HAY FONDOS: El servidor fuerza la salida del jugador.
        console.log(`[Servidor] Jugador ${socket.id} sin créditos para revancha. Se libera el asiento.`);
        socket.emit('rematchFailed', { reason: 'No tienes créditos suficientes para la siguiente partida.' });

        // Usamos la función existente para gestionar la salida y liberar el asiento.
        handlePlayerDeparture(roomId, socket.id, io);
    }
  });

  socket.on('startRematch', (roomId) => {
    const room = rooms[roomId];
    if (!room || socket.id !== room.hostId) return;

    // ▼▼▼ REEMPLAZA EL CONTENIDO DE socket.on('startRematch',...) CON ESTE BLOQUE COMPLETO ▼▼▼

    // LÓGICA DE CONTEO CORRECTA (copiada de la sección 'rematchUpdate')
    const readyPlayerIds = new Set();
    room.rematchRequests.forEach(id => readyPlayerIds.add(id));
    room.seats.forEach(seat => {
        if (seat && seat.status === 'waiting') {
            readyPlayerIds.add(seat.playerId);
        }
    });
    const totalPlayersReady = readyPlayerIds.size;

    // AHORA LA CONDICIÓN ES CORRECTA Y CONSISTENTE
    if (totalPlayersReady >= 2) {
        
        console.log(`Iniciando revancha en ${roomId}. Realizando reseteo total...`);

        // 1. IDENTIFICAR JUGADORES PARA LA NUEVA PARTIDA
        const nextGameParticipants = [];
        room.seats.forEach(seat => {
            if (seat && (room.rematchRequests.has(seat.playerId) || seat.status === 'waiting')) {
                nextGameParticipants.push({
                    playerId: seat.playerId,
                    playerName: seat.playerName,
                    avatar: seat.avatar,
                    active: true,
                    doneFirstMeld: false,
                    userId: seat.userId // ¡Esta es la corrección!
                });
            }
        });

        // ▼▼▼ AÑADE ESTE NUEVO BLOQUE DE CÓDIGO AQUÍ ▼▼▼
        // 2. ✨ LIMPIEZA DEFINITIVA DE LA LISTA DE ESPECTADORES ✨
        // Eliminamos a cualquiera que vaya a jugar de la lista de espectadores.
        if (room.spectators && room.spectators.length > 0) {
            const participantIds = new Set(nextGameParticipants.map(p => p.playerId));
            room.spectators = room.spectators.filter(spec => !participantIds.has(spec.id));
            console.log(`[Rematch Cleanup] Espectadores purgados. Quedan: ${room.spectators.length}`);
        }
        // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲

        // 3. ✨ RESETEO TOTAL DEL ESTADO DE LA SALA ✨
        const newSeats = [null, null, null, null];
        nextGameParticipants.forEach((player, i) => {
            if (i < 4) newSeats[i] = player;
        });

        room.state = 'playing';
        if (!room.chatHistory) room.chatHistory = [];
        room.chatHistory.push({ sender: 'Sistema', message: 'Ha comenzado la revancha.' });
        room.seats = newSeats;
        room.initialSeats = JSON.parse(JSON.stringify(room.seats.filter(s => s !== null)));
        room.melds = [];
        room.deck = [];
        room.discardPile = [];
        room.playerHands = {};
        room.turnMelds = [];
        room.turnPoints = 0;
        room.hasDrawn = false;
        room.drewFromDiscard = null;
        room.firstMeldCompletedByAnyone = false;
        room.rematchRequests.clear();

        // 3. REPARTIR CARTAS Y CONFIGURAR EL JUEGO

        // ▼▼▼ AÑADE ESTE BLOQUE COMPLETO AQUÍ ▼▼▼
        // LIMPIEZA DEFINITIVA DE ESPECTADORES:
        // Antes de continuar, validamos que todos en la lista de espectadores sigan conectados.
        if (room.spectators) {
            const connectedSocketsInRoom = io.sockets.adapter.rooms.get(roomId);
            if (connectedSocketsInRoom) {
                room.spectators = room.spectators.filter(spectator => 
                    connectedSocketsInRoom.has(spectator.id)
                );
                console.log(`Lista de espectadores purgada. Quedan ${room.spectators.length} espectadores válidos.`);
            } else {
                // Si por alguna razón la sala no existe en el adapter, la vaciamos.
                room.spectators = [];
            }
        }
        // ▲▲▲ FIN DEL BLOQUE AÑADIDO ▲▲▲

        // ▼▼▼ AÑADE ESTE BLOQUE COMPLETO AQUÍ ▼▼▼
        // 5. REINICIAR Y CALCULAR EL BOTE PARA LA REVANCHA
        room.pot = 0; // Se resetea el bote
        const seatedPlayersForRematch = room.seats.filter(s => s !== null);

        seatedPlayersForRematch.forEach(seat => {
            if (seat) {
                const playerInfo = users[seat.userId]; // Usamos el objeto 'users'
                if (playerInfo) {
                    const roomBet = room.settings.bet;
                    const roomCurrency = room.settings.betCurrency;

                    // 1. Convertir la apuesta a la moneda del jugador para descontarla
                    const betInPlayerCurrency = convertCurrency(roomBet, roomCurrency, playerInfo.currency, exchangeRates);

                    // 2. Descontar el valor convertido de los créditos del jugador
                    playerInfo.credits -= betInPlayerCurrency;

                    // 3. El bote siempre suma el valor original en la moneda de la mesa
                    room.pot += roomBet;

                    // 4. Notificar al jugador su estado completo (créditos y moneda)
                    io.to(seat.playerId).emit('userStateUpdated', playerInfo);
                }
            }
        });

        console.log(`[Rematch] Partida iniciada. Bote inicial: ${room.pot}.`);
        // Se notifica a todos en la sala del nuevo valor del bote
        io.to(roomId).emit('potUpdated', { newPotValue: room.pot, isPenalty: false });
        // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲

        const newDeck = buildDeck();
        shuffle(newDeck);
        const seatedPlayers = room.seats.filter(s => s !== null);

        if (room.lastWinnerId) {
            const winnerIndex = seatedPlayers.findIndex(p => p.playerId === room.lastWinnerId);
            if (winnerIndex > 0) {
                const winner = seatedPlayers.splice(winnerIndex, 1)[0];
                seatedPlayers.unshift(winner);
            }
        }
        
        seatedPlayers.forEach(player => {
            if (player) room.playerHands[player.playerId] = newDeck.splice(0, 14);
        });
        
        const startingPlayerId = seatedPlayers[0].playerId;
        room.playerHands[startingPlayerId].push(newDeck.shift());
        room.hasDrawn = true;
        room.discardPile = [newDeck.shift()];
        room.deck = newDeck;
        room.currentPlayerId = startingPlayerId;

        // 4. NOTIFICAR A TODOS LOS CLIENTES
        const playerHandCounts = {};
        seatedPlayers.forEach(player => {
            if (player) playerHandCounts[player.playerId] = room.playerHands[player.playerId].length;
        });

        // ▼▼▼ AÑADE ESTE BLOQUE AQUÍ ▼▼▼
        // Notifica a TODOS en la sala que reseteen su chat y lista de espectadores para la revancha.
        io.to(roomId).emit('resetForNewGame', { 
            spectators: room.spectators || [] // Envía la lista de espectadores actualizada
        });
        // ▲▲▲ FIN DEL BLOQUE AÑADIDO ▲▲▲

        seatedPlayers.forEach(player => {
            if (player) {
                io.to(player.playerId).emit('gameStarted', {
                    hand: room.playerHands[player.playerId],
                    discardPile: room.discardPile,
                    seats: room.seats,
                    currentPlayerId: room.currentPlayerId,
                    playerHandCounts: playerHandCounts,
                    melds: room.melds
                });
            }
        });

        broadcastRoomListUpdate(io);

    }
    // ▲▲▲ FIN DEL BLOQUE DE REEMPLAZO ▲▲▲
  });

  // ▼▼▼ REEMPLAZA TU LISTENER socket.on('leaveGame',...) ENTERO CON ESTE ▼▼▼
  socket.on('leaveGame', (data) => {
    const { roomId } = data;

    // 1. (LÍNEA AÑADIDA) Damos de baja la conexión de la sala a nivel de red.
    if (roomId) {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} ha salido de la sala Socket.IO: ${roomId}`);
    }

    // 2. (Línea existente) Limpiamos nuestra variable de seguimiento personalizada.
    delete socket.currentRoomId;
    
    // 3. (Línea existente) Ejecutamos la lógica para liberar el asiento y limpiar la mesa.
    handlePlayerDeparture(roomId, socket.id, io);
  });
  // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

  // ▼▼▼ AÑADE ESTE LISTENER COMPLETO AL FINAL ▼▼▼
  socket.on('requestPracticeRematch', (data) => {
    // ▼▼▼ REEMPLAZA EL CONTENIDO CON ESTE BLOQUE ▼▼▼
    const oldRoomId = data.roomId;
    const oldRoom = rooms[oldRoomId];

    const playerSeat = oldRoom ? oldRoom.seats.find(s => s && s.playerId === socket.id) : null;
    const username = playerSeat ? playerSeat.playerName : 'Jugador';

    if (oldRoom) {
        delete rooms[oldRoomId];
        console.log(`[Práctica] Sala anterior ${oldRoomId} eliminada.`);
    }

    console.log(`[Práctica] Creando nueva partida para ${username}.`);
    createAndStartPracticeGame(socket, username, io);
    // ▲▲▲ FIN DEL CÓDIGO DE REEMPLAZO ▲▲▲
  });
  // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

}); // <<-- Este es el cierre del 'io.on connection'

// --- FUNCIÓN DE PING AUTOMÁTICO PARA MANTENER ACTIVO EL SERVICIO EN RENDER ---
const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos en milisegundos

const selfPing = () => {
    // Render proporciona la URL externa de tu servicio en esta variable de entorno.
    const url = process.env.RENDER_EXTERNAL_URL;

    if (!url) {
        console.log('Ping omitido: La variable RENDER_EXTERNAL_URL no está definida.');
        return;
    }

    // Usamos el módulo 'https' de Node.js para hacer la solicitud.
    const https = require('https');

    console.log(`Ping automático iniciado a: ${url}`);

    https.get(url, (res) => {
        if (res.statusCode === 200) {
            console.log(`Ping exitoso a ${url}. Estado: ${res.statusCode}.`);
        } else {
            console.error(`Ping fallido a ${url}. Estado: ${res.statusCode}.`);
        }
    }).on('error', (err) => {
        console.error(`Error en el ping automático: ${err.message}`);
    });
};

// Programamos la función para que se ejecute cada 5 minutos.
// El primer ping se hará 30 segundos después de que el servidor arranque.
setTimeout(() => {
    setInterval(selfPing, PING_INTERVAL_MS);
}, 30000); // 30 segundos de espera inicial

server.listen(PORT, async () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  
  // Verificar estructura de la tabla users
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Estructura de la tabla users:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
  } catch (error) {
    console.error('❌ Error verificando estructura de la tabla:', error);
  }
});// Verificación de servidor - Tue Oct  7 13:42:08 WEST 2025
