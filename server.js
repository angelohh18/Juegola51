const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  }
});

const PORT = process.env.PORT || 3000;

// Variables globales
let rooms = {};
let users = {};
let commissionLog = [];
let lobbyChatHistory = [];
const LOBBY_CHAT_HISTORY_LIMIT = 50;

// Configuración de Express
app.use(express.static(path.join(__dirname)));

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('✅ Un jugador se ha conectado:', socket.id);
  
  // Enviar historial de chat del lobby
  socket.emit('lobbyChatHistory', lobbyChatHistory);

  socket.on('disconnect', () => {
    console.log('❌ Un jugador se ha desconectado:', socket.id);
    
    // Buscar en qué mesa está el jugador
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.seats.some(seat => seat && seat.playerId === socket.id)) {
        console.log(`El jugador ${socket.id} estaba en la mesa ${roomId}. Aplicando lógica de salida...`);
        handlePlayerLeaving(roomId, socket.id, io);
        break;
      }
    }
  });

  // Lobby Chat
  socket.on('sendLobbyChat', (data) => {
    if (!data || !data.text || !data.sender) return;
    
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      from: data.sender,
      text: data.text,
      ts: Date.now()
    };
    
    lobbyChatHistory.push(newMessage);
    if (lobbyChatHistory.length > LOBBY_CHAT_HISTORY_LIMIT) {
      lobbyChatHistory.shift();
    }
    
    io.emit('lobbyChatUpdate', newMessage);
  });

  // Lobby Login
  socket.on('lobbyLogin', (userData) => {
    console.log(`[Lobby Login] Primer registro de ${userData.username}. Asignando 0 créditos en ${userData.currency}.`);
    
    users[socket.id] = {
      ...userData,
      credits: 0,
      socketId: socket.id
    };
    
    socket.emit('userData', users[socket.id]);
    
    // Enviar mesas disponibles
    socket.emit('roomsUpdate', rooms);
  });

  // Obtener mesas
  socket.on('getRooms', () => {
    socket.emit('roomsUpdate', rooms);
  });

  // Crear mesa
  socket.on('createRoom', (roomData) => {
    const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    const userId = `user_${roomData.username.toLowerCase()}`;
    
    console.log(`[Servidor] Asignando userId al creador '${roomData.username}': ${userId}`);
    
    const newRoom = {
      roomId: roomId,
      hostId: socket.id,
      settings: {
        username: roomData.username,
        userAvatar: roomData.userAvatar,
        userId: userId,
        tableName: roomData.tableName,
        bet: roomData.bet,
        penalty: roomData.penalty,
        betCurrency: roomData.betCurrency
      },
      players: [],
      seats: [null, null, null, null],
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
      chatHistory: [],
      initialSeats: [],
      pot: 0
    };
    
    rooms[roomId] = newRoom;
    
    console.log(`Mesa creada: ${roomId} por ${roomData.username}`);
    console.log(`[Broadcast] Se ha actualizado la lista de mesas para todos los clientes.`);
    
    // Notificar a todos los clientes
    io.emit('roomsUpdate', rooms);
  });

  // Unirse a mesa
  socket.on('joinRoom', (data) => {
    const room = rooms[data.roomId];
    if (!room) return;
    
    if (room.players.length >= 4) {
      socket.emit('error', 'La mesa está llena');
      return;
    }
    
    const player = {
      playerId: socket.id,
      username: data.username,
      userAvatar: data.userAvatar,
      userId: data.userId,
      credits: 0
    };
    
    room.players.push(player);
    
    // Asignar asiento
    for (let i = 0; i < 4; i++) {
      if (!room.seats[i]) {
        room.seats[i] = player;
        break;
      }
    }
    
    socket.join(data.roomId);
    
    // Si hay 2+ jugadores, iniciar juego
    if (room.players.length >= 2) {
      startGame(data.roomId);
    }
    
    io.emit('roomsUpdate', rooms);
  });

  // Práctica
  socket.on('startPractice', (data) => {
    const practiceRoomId = `practice-${socket.id}`;
    const userId = `user_${data.username.toLowerCase()}`;
    
    const practiceRoom = {
      roomId: practiceRoomId,
      hostId: socket.id,
      settings: {
        username: 'Práctica',
        bet: 0,
        penalty: 0
      },
      players: [],
      seats: [null, null, null, null],
      state: 'playing',
      isPractice: true,
      deck: [],
      discardPile: [],
      playerHands: {},
      melds: [],
      turnMelds: [],
      turnPoints: 0,
      hasDrawn: false,
      drewFromDiscard: null,
      firstMeldCompletedByAnyone: false,
      rematchRequests: new Set()
    };
    
    rooms[practiceRoomId] = practiceRoom;
    socket.join(practiceRoomId);
    
    // Iniciar práctica inmediatamente
    startPracticeGame(practiceRoomId, data);
  });
});

// Funciones del juego
function startGame(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  room.state = 'playing';
  
  // Inicializar juego
  initializeGame(room);
  
  // Notificar a los jugadores
  io.to(roomId).emit('gameStarted', {
    roomId: roomId,
    settings: room.settings
  });
}

function startPracticeGame(roomId, playerData) {
  const room = rooms[roomId];
  if (!room) return;
  
  // Crear jugadores bot
  const bots = [
    { playerId: 'bot_1', username: 'Bot 1', userAvatar: 'https://i.pravatar.cc/150?img=7' },
    { playerId: 'bot_2', username: 'Bot 2', userAvatar: 'https://i.pravatar.cc/150?img=8' },
    { playerId: 'bot_3', username: 'Bot 3', userAvatar: 'https://i.pravatar.cc/150?img=9' }
  ];
  
  // Agregar jugador humano
  const humanPlayer = {
    playerId: socket.id,
    username: playerData.username,
    userAvatar: playerData.userAvatar,
    userId: playerData.userId
  };
  
  room.players = [humanPlayer, ...bots];
  room.seats = [humanPlayer, ...bots];
  
  // Inicializar juego de práctica
  initializeGame(room);
  
  // Notificar al jugador
  io.to(roomId).emit('gameStarted', {
    roomId: roomId,
    settings: room.settings
  });
}

function initializeGame(room) {
  // Crear mazo
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  room.deck = [];
  for (const suit of suits) {
    for (const value of values) {
      room.deck.push({ suit, value, id: `${suit}${value}` });
    }
  }
  
  // Barajar
  for (let i = room.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [room.deck[i], room.deck[j]] = [room.deck[j], room.deck[i]];
  }
  
  // Repartir cartas
  room.playerHands = {};
  room.players.forEach(player => {
    room.playerHands[player.playerId] = room.deck.splice(0, 13);
  });
  
  // Pila de descarte
  room.discardPile = [room.deck.pop()];
  
  // Estado inicial
  room.currentPlayerId = room.players[0].playerId;
  room.hasDrawn = false;
  room.drewFromDiscard = null;
  room.firstMeldCompletedByAnyone = false;
  room.turnMelds = [];
  room.turnPoints = 0;
  room.melds = [];
  
  // Enviar estado a todos los jugadores
  room.players.forEach(player => {
    const playerSocket = io.sockets.sockets.get(player.playerId);
    if (playerSocket) {
      playerSocket.emit('gameState', {
        roomId: room.roomId,
        currentPlayer: room.currentPlayerId,
        playerHand: room.playerHands[player.playerId],
        discardPile: room.discardPile,
        melds: room.melds,
        turnMelds: room.turnMelds,
        turnPoints: room.turnPoints,
        hasDrawn: room.hasDrawn,
        drewFromDiscard: room.drewFromDiscard,
        firstMeldCompletedByAnyone: room.firstMeldCompletedByAnyone,
        players: room.players,
        settings: room.settings
      });
    }
  });
}

function handlePlayerLeaving(roomId, playerId, io) {
  const room = rooms[roomId];
  if (!room) return;
  
  console.log(`Gestionando salida del jugador ${playerId} de la sala ${roomId}.`);
  
  // Remover jugador de la mesa
  room.players = room.players.filter(p => p.playerId !== playerId);
  room.seats = room.seats.map(seat => seat && seat.playerId === playerId ? null : seat);
  
  // Si es práctica, eliminar mesa
  if (room.isPractice) {
    console.log(`[Práctica] El jugador humano ha salido. Eliminando la mesa de práctica ${roomId}.`);
    delete rooms[roomId];
    io.emit('roomsUpdate', rooms);
    return;
  }
  
  // Si la mesa queda vacía, eliminarla
  if (room.players.length === 0) {
    console.log(`Mesa ${roomId} está completamente vacía. Eliminando...`);
    delete rooms[roomId];
  }
  
  console.log(`[Broadcast] Se ha actualizado la lista de mesas para todos los clientes.`);
  io.emit('roomsUpdate', rooms);
}