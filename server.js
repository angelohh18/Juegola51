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


function checkAndCleanRoom(roomId, io) {
    const room = rooms[roomId];
    if (!room) {
        io.emit('updateRoomList', Object.values(rooms));
        return;
    }

    const playersInSeats = room.seats.filter(s => s !== null).length;

    // UNA SALA ESTÁ VACÍA SI NO HAY NADIE EN LOS ASIENTOS.
    if (playersInSeats === 0) {
        console.log(`Mesa ${roomId} está completamente vacía. Eliminando...`);
        delete rooms[roomId];
    }

    io.emit('updateRoomList', Object.values(rooms));
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

let rooms = {}; // Estado de las mesas se mantiene en memoria

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

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
    if (hasKing && hasAce) {
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

// ▼▼▼ REEMPLAZA LA FUNCIÓN endgameAndCalculateScores ENTERA CON ESTA ▼▼▼
// ▼▼▼ REEMPLAZA LA FUNCIÓN endGameAndCalculateScores ENTERA CON ESTA VERSIÓN ▼▼▼
function endGameAndCalculateScores(room, winnerSeat, io, abandonmentInfo = null) {
    if (!room || !winnerSeat || room.state !== 'playing') return;

    console.log(`Partida finalizada. Ganador: ${winnerSeat.playerName}`);
    room.state = 'post-game';
    room.lastWinnerId = winnerSeat.playerId;
    room.hostId = winnerSeat.playerId;

    let totalWinnings = 0;
    let losersInfo = [];
    
    const originalPlayerIds = room.initialSeats.map(s => s.playerId);

    originalPlayerIds.forEach(playerId => {
        if (playerId === winnerSeat.playerId) return;

        const loserSeat = room.seats.find(s => s && s.playerId === playerId);
        const loserName = room.initialSeats.find(s => s.playerId === playerId)?.playerName || 'Jugador Desconectado';

        let lossAmount = room.settings.bet || 0;
        let penaltyText = '';

        if (!loserSeat) {
            lossAmount += (room.settings.penalty || 0);
            penaltyText = `<span style="color:#ff4444;">Paga apuesta (${room.settings.bet}) + multa (${room.settings.penalty}) por abandonar.</span>`;
        } else {
            let paysPenalty = !loserSeat.doneFirstMeld;
            if (paysPenalty) {
                lossAmount += (room.settings.penalty || 0);
                penaltyText = `<span style="color:#ff4444;">Paga apuesta (${room.settings.bet}) + multa (${room.settings.penalty}) por no bajar.</span>`;
            } else {
                penaltyText = `<span style="color:#ffcc00;">Paga apuesta (${room.settings.bet}).</span>`;
            }
        }

        totalWinnings += lossAmount;
        losersInfo.push(`<p>${loserName} | ${penaltyText}</p>`);
    });

    const commission = totalWinnings * 0.10;
    const netWinnings = totalWinnings - commission;

    let winningsSummary = `<div style="border-top: 1px solid #c5a56a; margin-top: 15px; padding-top: 10px; text-align: left;">
                            <p><strong>Total Recaudado:</strong> ${totalWinnings.toFixed(2)}</p>
                            <p><strong>Comisión (10%):</strong> -${commission.toFixed(2)}</p>
                            <p style="color: #6bff6b; font-size: 1.2rem;"><strong>GANANCIA TOTAL: ${netWinnings.toFixed(2)}</strong></p>
                           </div>`;

    const scoresHTML = `<div style="text-align: left;"><p style="color:#c5a56a; font-weight:bold;">Detalle:</p>`
                        + losersInfo.join('')
                        + `</div>`
                        + winningsSummary;

    const finalSanitizedState = getSanitizedRoomForClient(room);

    io.to(room.roomId).emit('gameEnd', {
        winnerName: winnerSeat.playerName,
        scoresHTML: scoresHTML,
        finalRoomState: finalSanitizedState,
        abandonment: abandonmentInfo // <-- LÍNEA AÑADIDA: Enviamos la info de abandono
    });

    room.rematchRequests.clear();
    io.emit('updateRoomList', Object.values(rooms));
}
// ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
// ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

function checkVictoryCondition(room, roomId, io) {
  if (!room || room.state !== 'playing') return false;
  const winnerSeat = room.seats.find(s => s && s.active !== false && room.playerHands[s.playerId]?.length === 0);
  
  if (winnerSeat) {
    console.log(`¡VICTORIA! ${winnerSeat.playerName} se ha quedado sin cartas y gana la partida.`);
    endGameAndCalculateScores(room, winnerSeat, io);
    return true;
  }
  return false;
}

function handlePlayerElimination(room, faultingPlayerId, faultReason, io) {
    if (!room) return;
    const roomId = room.roomId;

    const playerSeat = room.seats.find(s => s && s.playerId === faultingPlayerId);
    if (playerSeat && playerSeat.active) {
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
            endGameAndCalculateScores(room, winnerSeat, io);
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
          const points = calculateMeldPoints(combo, type);
          // Puntuación simple para priorizar: más cartas es mejor, más puntos es mejor
          const score = combo.length * 100 + points;
          allPossibleMelds.push({ cards: combo, type, points, score });
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
    if (allMeldsOnTable.some(meld => canBeAddedToServerMeld(card, meld))) {
        score -= 1000;
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

async function botPlay(room, botPlayerId, io) {
  const botSeat = room.seats.find(s => s.playerId === botPlayerId);
  if (!botSeat || !botSeat.active) return; // Si el bot fue eliminado, no juega

  const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  await pause(1500); // Pausa inicial para simular que piensa

  let botHand = room.playerHands[botPlayerId];

  // Lógica de robar carta (inteligente)
  const topDiscard = room.discardPile.length > 0 ? room.discardPile[room.discardPile.length - 1] : null;
  let drewFromDiscard = false;
  if (topDiscard) {
    const potentialHand = [...botHand, topDiscard];
    const potentialMelds = findOptimalMelds(potentialHand);
    const meldsWithDiscard = potentialMelds.filter(m => m.cards.some(c => c.id === topDiscard.id));
    const canUseDiscard = meldsWithDiscard.length > 0 && 
                          (botSeat.doneFirstMeld || meldsWithDiscard.reduce((sum, m) => sum + m.points, 0) >= 51);

    if (canUseDiscard) {
      botHand.push(room.discardPile.pop());
      drewFromDiscard = true;
    }
  }
  if (!drewFromDiscard && room.deck.length > 0) {
    botHand.push(room.deck.shift());
  }

  room.playerHands[botPlayerId] = botHand;
  io.to(room.roomId).emit('handCountsUpdate', { /* ... actualiza contadores ... */ });
  await pause(1000);

  // Lógica de bajar juegos
  const meldsToPlay = findOptimalMelds(botHand);
  if (meldsToPlay.length > 0) {
    // ... (Aquí iría la lógica completa para que el bot baje sus juegos)
    // Por simplicidad en este paso, nos enfocaremos en el descarte
  }

  // Lógica de descarte
  if (botHand.length > 0) {
    const cardToDiscard = findWorstCardToDiscard(botHand, room.melds);
    const cardIndex = botHand.findIndex(c => c.id === cardToDiscard.id);

    if (cardIndex !== -1) {
      const [discardedCard] = botHand.splice(cardIndex, 1);
      room.discardPile.push(discardedCard);

      // Emitir cambio de turno
      const currentPlayerIndex = room.seats.findIndex(p => p && p.playerId === botPlayerId);
      let nextPlayerIndex = (currentPlayerIndex + 1) % room.seats.length;
      while (!room.seats[nextPlayerIndex] || !room.seats[nextPlayerIndex].active) {
        nextPlayerIndex = (nextPlayerIndex + 1) % room.seats.length;
      }
      const nextPlayer = room.seats[nextPlayerIndex];
      room.currentPlayerId = nextPlayer.playerId;

      const playerHandCounts = {};
      room.seats.filter(s => s).forEach(p => { playerHandCounts[p.playerId] = room.playerHands[p.playerId]?.length || 0; });

      io.to(room.roomId).emit('turnChanged', {
        discardedCard: discardedCard,
        discardingPlayerId: botPlayerId,
        newDiscardPile: room.discardPile,
        nextPlayerId: room.currentPlayerId,
        playerHandCounts: playerHandCounts
      });

      // Si el siguiente jugador es un bot, llamarse a sí mismo recursivamente
      if (room.seats.find(s => s && s.playerId === room.currentPlayerId)?.isBot) {
          botPlay(room, room.currentPlayerId, io);
      }
    }
  }

  checkVictoryCondition(room, room.roomId, io);
}

app.use(express.static(path.join(__dirname, '../cliente')));

// ▼▼▼ AÑADE ESTA FUNCIÓN COMPLETA ▼▼▼
// ▼▼▼ REEMPLAZA LA FUNCIÓN handlePlayerDeparture ENTERA CON ESTA VERSIÓN ▼▼▼
function handlePlayerDeparture(roomId, leavingPlayerId, io) {
    const room = rooms[roomId];
    if (!room) return;

    console.log(`Gestionando salida del jugador ${leavingPlayerId} de la sala ${roomId}.`);

    const seatIndex = room.seats.findIndex(s => s && s.playerId === leavingPlayerId);
    if (seatIndex === -1) {
        checkAndCleanRoom(roomId, io);
        return;
    }
    
    const playerName = room.seats[seatIndex].playerName;
    room.seats[seatIndex] = null;

    if (room.state === 'playing') {
        // ▼▼▼ BLOQUE AÑADIDO: Notificación de abandono ▼▼▼
        // Notificamos a TODOS en la sala (jugadores y espectadores) de la falta.
        const faultMessage = `${playerName} ha abandonado la partida, cometiendo una falta.`;
        io.to(roomId).emit('playerAbandoned', { 
            name: playerName,
            message: faultMessage 
        });
        // ▲▲▲ FIN DEL BLOQUE AÑADIDO ▲▲▲

        const activePlayers = room.seats.filter(s => s && s.active !== false);

        if (activePlayers.length === 1) {
            console.log(`Abandono de ${playerName}. Solo queda ${activePlayers[0].playerName}. Partida finalizada.`);
            
            // ▼▼▼ LÍNEA MODIFICADA: Pasamos la información del abandono ▼▼▼
            endGameAndCalculateScores(room, activePlayers[0], io, { name: playerName });
            // ▲▲▲ FIN DE LA LÍNEA MODIFICADA ▲▲▲
            return;
        
        } else if (activePlayers.length > 1) {
            if (room.currentPlayerId === leavingPlayerId) {
                console.log(`El jugador actual (${playerName}) ha abandonado. Avanzando el turno...`);
                resetTurnState(room);

                let oldPlayerIndex = -1;
                for(let i=0; i < room.initialSeats.length; i++) {
                    if (room.initialSeats[i].playerId === leavingPlayerId) {
                        oldPlayerIndex = i;
                        break;
                    }
                }

                let nextPlayerIndex = oldPlayerIndex;
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
                    console.log(`Nuevo turno para: ${nextPlayer.playerName}`);
                    io.to(roomId).emit('turnChanged', {
                        discardedCard: null,
                        discardingPlayerId: leavingPlayerId,
                        newDiscardPile: room.discardPile,
                        nextPlayerId: room.currentPlayerId,
                        playerHandCounts: getSanitizedRoomForClient(room).playerHandCounts,
                        newMelds: room.melds
                    });
                } else {
                    console.error("Error crítico: No se pudo encontrar un siguiente jugador activo.");
                }
            }
        }
    }
    
    io.to(roomId).emit('playerLeft', getSanitizedRoomForClient(room));
    checkAndCleanRoom(roomId, io);
}
// ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
// ▲▲▲ FIN DE LA NUEVA FUNCIÓN ▲▲▲

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
        { playerId: socket.id, playerName: settings.username, avatar: settings.userAvatar, active: true, doneFirstMeld: false },
        null, null, null
      ],
      state: 'waiting',
      deck: [],
      discardPile: [],
      playerHands: {},
      melds: [], // Combinaciones permanentes
      turnMelds: [], // NUEVO: Combinaciones temporales de este turno
      turnPoints: 0, // NUEVO: Puntos acumulados en este turno
      hasDrawn: false, // <-- AÑADE ESTA LÍNEA
      drewFromDiscard: null, // <-- AÑADE ESTA LÍNEA
      firstMeldCompletedByAnyone: false, // <-- AÑADE ESTA LÍNEA
      rematchRequests: new Set()
    };
    rooms[roomId] = newRoom;
    socket.join(roomId);
    socket.emit('roomCreatedSuccessfully', newRoom);
    io.emit('updateRoomList', Object.values(rooms));
    console.log(`Mesa creada: ${roomId} por ${settings.username}`);
  });

  socket.on('requestPracticeGame', (username) => {
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

    // Repartir cartas y empezar
    const deck = buildDeck();
    shuffle(deck);
    newRoom.seats.forEach(seat => {
        if (seat) newRoom.playerHands[seat.playerId] = deck.splice(0, 14);
    });

    const startingPlayerId = newRoom.seats[0].playerId; // El humano empieza
    newRoom.playerHands[startingPlayerId].push(deck.shift());
    
    // --- INICIO DE LA CORRECCIÓN ---
    newRoom.hasDrawn = true; // El primer jugador ya "robó" su carta inicial.
    // --- FIN DE LA CORRECCIÓN ---

    newRoom.discardPile.push(deck.shift());
    newRoom.deck = deck;
    newRoom.currentPlayerId = startingPlayerId;

    rooms[roomId] = newRoom;
    socket.join(roomId);

    // Enviar estado inicial al jugador humano
    const playerHandCounts = {};
    newRoom.seats.forEach(p => { playerHandCounts[p.playerId] = newRoom.playerHands[p.playerId].length; });

    io.to(socket.id).emit('gameStarted', {
        hand: newRoom.playerHands[socket.id],
        discardPile: newRoom.discardPile,
        seats: newRoom.seats,
        currentPlayerId: newRoom.currentPlayerId,
        playerHandCounts: playerHandCounts,
        melds: newRoom.melds // <-- AÑADE ESTA LÍNEA
    });
  });

  socket.on('joinRoom', ({ roomId, user }) => {
    const room = rooms[roomId];
    if (!room) {
        return socket.emit('joinError', 'La mesa no existe.');
    }

    // --- NUEVAS VALIDACIONES DE ENTRADA ---
    if (room.state !== 'waiting') {
        return socket.emit('joinError', 'La partida ya ha comenzado.');
    }

    const emptySeatIndex = room.seats.findIndex(seat => seat === null);
    if (emptySeatIndex === -1) {
        return socket.emit('joinError', 'La mesa está llena.');
    }
    // --- FIN DE VALIDACIONES ---

    const isAlreadySeated = room.seats.some(s => s && s.playerId === socket.id);
    if (isAlreadySeated) {
        console.log(`Previniendo unión duplicada del jugador ${socket.id} en la mesa ${roomId}.`);
        socket.join(roomId);
        socket.emit('joinedRoomSuccessfully', getSanitizedRoomForClient(room));
        return;
    }

    if (!room.players) room.players = [];
    room.players.push({ id: socket.id, name: user.username });
    room.seats[emptySeatIndex] = { playerId: socket.id, playerName: user.username, avatar: user.userAvatar, active: true, doneFirstMeld: false };
    socket.join(roomId);
    socket.emit('joinedRoomSuccessfully', getSanitizedRoomForClient(room));
    io.to(roomId).emit('playerJoined', getSanitizedRoomForClient(room));
    io.emit('updateRoomList', Object.values(rooms));
    console.log(`Jugador ${user.username} se sentó en la mesa ${roomId}`);
  });


  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
        console.log(`Iniciando juego en la mesa ${roomId}`);
        room.state = 'playing';
        room.initialSeats = JSON.parse(JSON.stringify(room.seats.filter(s => s !== null))); // Guardamos quiénes empezaron
        room.melds = [];
        
        room.seats.forEach(seat => {
            if(seat) {
                seat.active = true;
                seat.doneFirstMeld = false; // <-- AÑADE ESTA LÍNEA
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
        
        io.emit('updateRoomList', Object.values(rooms));
    }
  });

  socket.on('meldAction', (data) => {
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
    checkVictoryCondition(room, roomId, io);
  });

socket.on('accionDescartar', (data) => {
    const { roomId, card } = data;
    const room = rooms[roomId];
    if (!room || room.currentPlayerId !== socket.id) return;

    const playerSeat = room.seats.find(s => s && s.playerId === socket.id);
    if (!playerSeat) return;

    const playerHand = room.playerHands[socket.id];

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

    // REGLA 1 (CORREGIDA): El jugador debe haber robado, A MENOS QUE TENGA 15 CARTAS.
    const isFirstTurnWith15Cards = playerHand.length === 15;
    if (!room.hasDrawn && !isFirstTurnWith15Cards) {
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

    // REGLA 3: Descarte ilegal (ESTRICTO). Si la carta puede añadirse a un juego en mesa, es falta.
    const isWinningDiscard = playerHand.length === 1;

    // La validación se activa si hay juegos permanentes en la mesa y no es el descarte para ganar.
    if (room.melds.length > 0 && !isWinningDiscard) {
        // Se comprueba ÚNICAMENTE contra los juegos permanentes en la mesa (room.melds).
        for (const meld of room.melds) {
            if (canBeAddedToServerMeld(card, meld)) {
                // Si la carta se puede añadir, es falta y se elimina al jugador.
                const reason = `Descarte ilegal. La carta ${card.value}${getSuitIcon(card.suit)} podía ser añadida a un juego ya bajado en la mesa.`;
                return handlePlayerElimination(room, socket.id, reason, io);
            }
        }
    }

    // REGLA 4: Validar 51 puntos (ESTRICTO - CAUSA ELIMINACIÓN).
    if (!playerSeat.doneFirstMeld && room.turnPoints > 0) {
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
    const cardIndex = playerHand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) {
        return socket.emit('fault', { reason: 'Error de sincronización, la carta no está en tu mano.' });
    }

    // 1. Procesar la jugada.
    playerHand.splice(cardIndex, 1);
    room.discardPile.push(card);
    if (room.turnMelds.length > 0) {
        room.melds.push(...room.turnMelds);
    }

    // 2. Comprobar victoria.
    if (checkVictoryCondition(room, roomId, io)) return;

    // 3. Resetear y cambiar turno.
    resetTurnState(room);
    const seatedPlayers = room.seats.filter(s => s !== null);
    const currentPlayerIndex = seatedPlayers.findIndex(p => p.playerId === socket.id);
    let nextPlayerIndex = (currentPlayerIndex + 1) % seatedPlayers.length;
    while (!seatedPlayers[nextPlayerIndex] || seatedPlayers[nextPlayerIndex].active === false) {
        nextPlayerIndex = (nextPlayerIndex + 1) % seatedPlayers.length;
    }
    room.currentPlayerId = seatedPlayers[nextPlayerIndex].playerId;

    // 4. Notificar a TODOS.
    const playerHandCounts = {};
    seatedPlayers.forEach(p => { playerHandCounts[p.playerId] = room.playerHands[p.playerId]?.length || 0; });

    io.to(roomId).emit('turnChanged', {
        discardedCard: card,
        discardingPlayerId: socket.id,
        newDiscardPile: room.discardPile,
        nextPlayerId: room.currentPlayerId,
        playerHandCounts: playerHandCounts,
        newMelds: room.melds
    });

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
        source: 'deck'
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
          card: cardDrawn // Enviamos la carta para que se vea la animación correcta
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
    io.to(roomId).emit('gameChat', { sender, message });
  });

  // ▼▼▼ REEMPLAZA TU socket.on('disconnect', ...) ENTERO CON ESTE NUEVO CÓDIGO ▼▼▼
  socket.on('disconnect', () => {
    console.log('❌ Un jugador se ha desconectado:', socket.id);

    // NUEVA LÓGICA ROBUSTA:
    // Iteramos sobre NUESTRO PROPIO objeto de salas, que es la fuente de la verdad.
    // No confiamos más en 'socket.rooms'.
    for (const roomId in rooms) {
        const room = rooms[roomId];
        
        // Buscamos si el jugador desconectado estaba sentado en ESTA sala.
        const seatIndex = room.seats.findIndex(s => s && s.playerId === socket.id);

        if (seatIndex !== -1) {
            // ¡Lo encontramos! Estaba en esta sala.
            console.log(`El jugador ${socket.id} estaba en la mesa ${roomId}. Aplicando lógica de salida...`);
            
            // Ahora llamamos a la función central que ya sabemos que funciona bien con el botón.
            handlePlayerDeparture(roomId, socket.id, io);
            
            // Como un jugador solo puede estar en una mesa, rompemos el bucle.
            break;
        }
    }
  });
  // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

  socket.on('requestRematch', (data) => {
    const { roomId, credits } = data;
    const room = rooms[roomId];
    if (!room) return;

    const requiredCredits = (room.settings.bet || 0) + (room.settings.penalty || 0);

    // 1. Verificar si el jugador tiene créditos suficientes
    if (credits >= requiredCredits) {
      room.rematchRequests.add(socket.id);

      // ▼▼▼ REEMPLAZA TODO EL BLOQUE DE CÁLCULO DE JUGADORES LISTOS... ▼▼▼
      /*
      const playersReady = room.seats.filter(s => s && (room.rematchRequests.has(s.playerId) || s.status === 'waiting'));
      const playersReadyNames = playersReady.map(s => s.playerName);
      const totalPlayersReady = playersReady.length;
      */
      // ▲▲▲ ...CON ESTE NUEVO BLOQUE MÁS ROBUSTO ▼▼▼

      const readyPlayerIds = new Set();
      // 1. Añadimos a los que confirmaron revancha
      room.rematchRequests.forEach(id => readyPlayerIds.add(id));
      // 2. Añadimos a los que ya estaban esperando
      room.seats.forEach(seat => {
          if (seat && seat.status === 'waiting') {
              readyPlayerIds.add(seat.playerId);
          }
      });

      // Creamos la lista de nombres a partir de los IDs únicos
      const playersReadyNames = Array.from(readyPlayerIds).map(id => {
          const seat = room.seats.find(s => s && s.playerId === id);
          return seat ? seat.playerName : null;
      }).filter(Boolean);
      
      const totalPlayersReady = readyPlayerIds.size;
      
      // ▼▼▼ ELIMINA ESTA LÍNEA (ya no es necesaria) ▼▼▼
      // const totalPlayersAtTable = room.seats.filter(s => s !== null).length;

      io.to(roomId).emit('rematchUpdate', {
        playersReady: playersReadyNames,
        // ▼▼▼ REEMPLAZA ESTA LÍNEA... ▼▼▼
        // canStart: totalPlayersReady >= totalPlayersAtTable && totalPlayersReady >= 2,
        // ▲▲▲ ...CON LA LÍNEA ORIGINAL ▼▼▼
        canStart: totalPlayersReady >= 2,
        hostId: room.hostId
      });
      // --- FIN DE LA CORRECCIÓN ---

    } else {
      // 3. Si no tiene créditos, se levanta de la mesa
      console.log(`Jugador ${socket.id} no tiene créditos para la revancha. Levantando del asiento.`);
      socket.emit('rematchFailed', { reason: 'No tienes créditos suficientes para la siguiente partida.' });
      
      const seatIndex = room.seats.findIndex(s => s && s.playerId === socket.id);
      if (seatIndex !== -1) {
        room.seats[seatIndex] = null;
        // Notificar a todos que el jugador se levantó
        io.to(roomId).emit('playerLeft', room);
      }
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
                    doneFirstMeld: false
                });
            }
        });


        // 3. ✨ RESETEO TOTAL DEL ESTADO DE LA SALA ✨
        const newSeats = [null, null, null, null];
        nextGameParticipants.forEach((player, i) => {
            if (i < 4) newSeats[i] = player;
        });

        room.state = 'playing';
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

        io.emit('updateRoomList', Object.values(rooms));

    }
    // ▲▲▲ FIN DEL BLOQUE DE REEMPLAZO ▲▲▲
  });

  // ▼▼▼ REEMPLAZA TU LISTENER socket.on('leaveGame',...) CON ESTE ▼▼▼
  socket.on('leaveGame', (data) => {
    const { roomId } = data;
    // Simplemente llamamos a la función central. Ya no enviamos confirmación.
    handlePlayerDeparture(roomId, socket.id, io);
  });
  // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲



}); // <<-- Este es el cierre del 'io.on connection'

server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});