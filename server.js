// server.js (Archivo completo y actualizado)

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

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

  // Resto de la lógica del juego...
  // (Aquí iría todo el código del juego que ya teníamos)
});

// Funciones del juego (simplificadas para el ejemplo)
function handlePlayerLeaving(roomId, playerId, io) {
  // Lógica para manejar cuando un jugador sale
  console.log(`Gestionando salida del jugador ${playerId} de la sala ${roomId}.`);
}