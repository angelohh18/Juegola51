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

const PORT = 3000;

let rooms = {}; // Estado de las mesas se mantiene en memoria

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

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

app.use(express.static(path.join(__dirname, '../cliente')));

io.on('connection', (socket) => {
  console.log('✅ Un jugador se ha conectado:', socket.id);
  console.log('ESTADO ACTUAL DE LAS MESAS EN EL SERVIDOR:', rooms);

  socket.emit('updateRoomList', Object.values(rooms));

  socket.on('createRoom', (settings) => {
    const roomId = `room-${socket.id}`;
    const newRoom = {
      roomId: roomId,
      hostId: socket.id,
      settings: settings,
      players: [{ id: socket.id, name: settings.username }],
      seats: [
        { playerId: socket.id, playerName: settings.username, avatar: settings.userAvatar, active: true },
        null, null, null
      ],
      state: 'waiting',
      deck: [],
      discardPile: [],
      playerHands: {},
      melds: []
    };
    rooms[roomId] = newRoom;
    socket.join(roomId);
    socket.emit('roomCreatedSuccessfully', newRoom);
    io.emit('updateRoomList', Object.values(rooms));
    console.log(`Mesa creada: ${roomId} por ${settings.username}`);
  });

  socket.on('joinRoom', ({ roomId, user }) => {
    const room = rooms[roomId];
    if (room && room.state === 'waiting' && room.players.length < 4) {
      const emptySeatIndex = room.seats.findIndex(seat => seat === null);
      if (emptySeatIndex !== -1) {
        room.players.push({ id: socket.id, name: user.username });
        room.seats[emptySeatIndex] = { playerId: socket.id, playerName: user.username, avatar: user.userAvatar, active: true };
        socket.join(roomId);
        socket.emit('joinedRoomSuccessfully', room);
        socket.to(roomId).emit('playerJoined', room);
        io.emit('updateRoomList', Object.values(rooms));
        console.log(`Jugador ${user.username} se unió a la mesa ${roomId}`);
      }
    } else {
      socket.emit('joinError', 'No se pudo unir a la mesa. Puede que esté llena o ya haya comenzado.');
    }
  });

  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
        console.log(`Iniciando juego en la mesa ${roomId}`);
        room.state = 'playing';
        room.melds = [];
        
        room.seats.forEach(seat => {
            if(seat) seat.active = true;
        });
        
        const newDeck = buildDeck();
        shuffle(newDeck);
        
        const seatedPlayers = room.seats.filter(s => s !== null);
        seatedPlayers.forEach(player => {
            room.playerHands[player.playerId] = newDeck.splice(0, 14);
        });

        const startingPlayerId = seatedPlayers[0].playerId;
        room.playerHands[startingPlayerId].push(newDeck.shift());
        
        room.discardPile = [newDeck.shift()];
        room.deck = newDeck;
        room.currentPlayerId = startingPlayerId;

        seatedPlayers.forEach(player => {
            io.to(player.playerId).emit('gameStarted', {
                hand: room.playerHands[player.playerId],
                discardPile: room.discardPile,
                seats: room.seats,
                currentPlayerId: room.currentPlayerId
            });
        });
        
        io.emit('updateRoomList', Object.values(rooms));
    }
  });

  socket.on('meldAction', (data) => {
    const { roomId, meld } = data;
    const room = rooms[roomId];
    if (!room || room.currentPlayerId !== socket.id) {
        return console.log('Meld inválido o fuera de turno');
    }

    if (meld.type === 'add') {
        const targetMeld = room.melds[meld.targetMeldIndex];
        if (targetMeld) {
            targetMeld.cards.push(...meld.cards);
        }
    } else {
        room.melds.push(meld);
    }

    const meldedCardIds = new Set(meld.cards.map(c => c.id));
    const playerHand = room.playerHands[socket.id];
    if (playerHand) {
        room.playerHands[socket.id] = playerHand.filter(card => !meldedCardIds.has(card.id));
    }
    const newHandCount = room.playerHands[socket.id].length;

    socket.emit('meldSuccess', {
        meldedCardIds: Array.from(meldedCardIds)
    });

    io.to(roomId).emit('meldUpdate', {
        melderId: socket.id,
        newMelds: room.melds,
        newHandCount: newHandCount
    });
  });

  socket.on('accionDescartar', (data) => {
    const { roomId, card } = data;
    const room = rooms[roomId];

    if (!room || room.currentPlayerId !== socket.id) {
      return;
    }
    
    const playerHand = room.playerHands[socket.id];
    if (playerHand) {
        const cardIndex = playerHand.findIndex(c => c.id === card.id);
        if (cardIndex !== -1) {
            playerHand.splice(cardIndex, 1);
        }
    }

    room.discardPile.push(card);

    const seatedPlayers = room.seats.filter(s => s !== null);
    const currentPlayerIndex = seatedPlayers.findIndex(p => p.playerId === socket.id);
    
    let nextPlayerIndex = (currentPlayerIndex + 1) % seatedPlayers.length;
    let attempts = 0;
    while(seatedPlayers[nextPlayerIndex].active === false && attempts < seatedPlayers.length) {
        nextPlayerIndex = (nextPlayerIndex + 1) % seatedPlayers.length;
        attempts++;
    }

    const nextPlayer = seatedPlayers[nextPlayerIndex];
    room.currentPlayerId = nextPlayer.playerId;
    
    console.log(`Jugador ${socket.id} descartó. Siguiente turno para: ${room.currentPlayerId}`);

    io.to(roomId).emit('turnChanged', {
      discardedCard: card,
      discardingPlayerId: socket.id,
      newDiscardPile: room.discardPile,
      nextPlayerId: room.currentPlayerId
    });
  });

  socket.on('drawFromDeck', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.currentPlayerId !== socket.id) {
        console.log('Robo inválido o fuera de turno');
        return;
    }

    if (room.deck.length === 0) {
        if (room.discardPile.length > 1) {
            console.log('Mazo vacío, barajando descarte...');
            const topCard = room.discardPile.pop();
            room.deck = room.discardPile;
            shuffle(room.deck);
            room.discardPile = [topCard];
        } else {
            socket.emit('drawError', 'No hay cartas disponibles para robar.');
            return;
        }
    }
    
    const cardDrawn = room.deck.shift();
    room.playerHands[socket.id].push(cardDrawn);

    socket.emit('cardDrawn', { 
        card: cardDrawn,
        newDeckSize: room.deck.length,
        newDiscardPile: room.discardPile 
    });
  });

  socket.on('playerFault', ({ roomId, faultReason }) => {
    const room = rooms[roomId];
    if (!room) return;

    const faultingPlayerId = socket.id;
    console.log(`Falta reportada por ${faultingPlayerId} en la mesa ${roomId}. Razón: ${faultReason}`);

    const playerSeat = room.seats.find(s => s && s.playerId === faultingPlayerId);
    if (playerSeat) {
        playerSeat.active = false;
    }

    io.to(roomId).emit('playerEliminated', {
        playerId: faultingPlayerId,
        playerName: playerSeat ? playerSeat.playerName : 'Desconocido',
        reason: faultReason,
        updatedSeats: room.seats
    });

    const activePlayers = room.seats.filter(s => s && s.active !== false);

    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        console.log(`Fin del juego en la mesa ${roomId}. Ganador: ${winner.playerName}`);
        io.to(roomId).emit('gameEnd', {
            winnerName: winner.playerName,
            reason: 'Último jugador en pie'
        });
        room.state = 'waiting';
        io.emit('updateRoomList', Object.values(rooms));
    } else if (room.currentPlayerId === faultingPlayerId) {
        const seatedPlayers = room.seats.filter(s => s !== null);
        const currentPlayerIndex = seatedPlayers.findIndex(p => p.playerId === faultingPlayerId);
        
        let nextPlayerIndex = (currentPlayerIndex + 1) % seatedPlayers.length;
        let attempts = 0;
        while (seatedPlayers[nextPlayerIndex].active === false && attempts < seatedPlayers.length) {
             nextPlayerIndex = (nextPlayerIndex + 1) % seatedPlayers.length;
             attempts++;
        }
        
        const nextPlayer = seatedPlayers[nextPlayerIndex];
        room.currentPlayerId = nextPlayer.playerId;

        io.to(roomId).emit('turnChanged', {
            discardedCard: null,
            discardingPlayerId: faultingPlayerId,
            newDiscardPile: room.discardPile,
            nextPlayerId: room.currentPlayerId
        });
    }
  });

  socket.on('sendGameChat', (data) => {
    const { roomId, message, sender } = data;
    io.to(roomId).emit('gameChat', { sender, message });
  });

  socket.on('disconnect', () => {
    console.log('❌ Un jugador se ha desconectado:', socket.id);
    let roomUpdated = false;
    let roomToDelete = null;

    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        if (room.hostId === socket.id && room.state === 'waiting') {
            roomToDelete = roomId;
            console.log(`El host abandonó. Mesa ${roomId} eliminada.`);
        } else {
            room.players.splice(playerIndex, 1);
            const seatIndex = room.seats.findIndex(s => s && s.playerId === socket.id);
            if(seatIndex !== -1) {
              room.seats[seatIndex] = null;
              io.to(roomId).emit('playerLeft', room);
            }
        }
        roomUpdated = true;
        break; 
      }
    }

    if (roomToDelete) {
        delete rooms[roomToDelete];
    }
    
    if(roomUpdated) {
        io.emit('updateRoomList', Object.values(rooms));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});