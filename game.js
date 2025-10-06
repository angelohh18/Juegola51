// game.js - Cliente del juego La 51
(function() {
    'use strict';
    
    // Variables globales
    let socket;
    let currentUser = null;
    let currentGameSettings = null;
    let selectedAvatar = null;
    let currentPhonePrefix = '';
    let onCropCompleteCallback = null;
    let unreadMessages = 0;
    
    // Elementos del DOM
    const elements = {
        loginModal: null,
        registerModal: null,
        createRoomModal: null,
        avatarCropModal: null,
        lobby: null,
        gameContainer: null,
        userAvatarEl: null,
        userNameEl: null,
        userCreditsEl: null,
        userCurrencyEl: null,
        roomsList: null,
        lobbyChatWindow: null,
        lobbyChatMessages: null,
        lobbyChatInput: null,
        lobbyChatSend: null,
        lobbyChatToggle: null
    };
    
    // Inicialización
    function init() {
        console.log('🎮 Inicializando juego La 51...');
        
        // Obtener elementos del DOM
        getDOMElements();
        
        // Configurar Socket.IO
        setupSocket();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Mostrar modal de login si no hay usuario
        if (!currentUser) {
            showLoginModal();
        }
        
        console.log('✅ Juego inicializado correctamente');
    }
    
    function getDOMElements() {
        elements.loginModal = document.getElementById('login-modal');
        elements.registerModal = document.getElementById('register-modal');
        elements.createRoomModal = document.getElementById('create-room-modal');
        elements.avatarCropModal = document.getElementById('avatar-crop-modal');
        elements.lobby = document.getElementById('lobby');
        elements.gameContainer = document.getElementById('game-container');
        elements.userAvatarEl = document.getElementById('user-avatar');
        elements.userNameEl = document.getElementById('user-name');
        elements.userCreditsEl = document.getElementById('user-credits');
        elements.userCurrencyEl = document.getElementById('user-currency');
        elements.roomsList = document.getElementById('rooms-list');
        elements.lobbyChatWindow = document.getElementById('lobby-chat-window');
        elements.lobbyChatMessages = document.getElementById('lobby-chat-messages');
        elements.lobbyChatInput = document.getElementById('lobby-chat-input');
        elements.lobbyChatSend = document.getElementById('lobby-chat-send');
        elements.lobbyChatToggle = document.getElementById('lobby-chat-toggle');
    }
    
    function setupSocket() {
        socket = io();
        
        // Eventos de conexión
        socket.on('connect', () => {
            console.log('🔌 Conectado al servidor');
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor');
        });
        
        // Eventos del lobby
        socket.on('lobbyChatHistory', (history) => {
            renderLobbyChat(history);
        });
        
        socket.on('lobbyChatUpdate', (message) => {
            addLobbyChatMessage(message);
        });
        
        socket.on('roomsUpdate', (rooms) => {
            renderRoomsOverview(rooms);
        });
        
        socket.on('userData', (userData) => {
            updateUserInfo(userData);
        });
        
        // Eventos del juego
        socket.on('gameState', (gameState) => {
            if (currentGameSettings) {
                renderGameState(gameState);
            }
        });
        
        socket.on('gameChat', (message) => {
            addGameChatMessage(message);
        });
        
        socket.on('gameEnd', (results) => {
            showGameEnd(results);
        });
    }
    
    function setupEventListeners() {
        // Modal de login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // Modal de registro
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
        
        // Modal de crear mesa
        const createRoomForm = document.getElementById('create-room-form');
        if (createRoomForm) {
            createRoomForm.addEventListener('submit', handleCreateRoom);
        }
        
        // Botones del lobby
        const createRoomBtn = document.getElementById('create-room-btn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => showCreateRoomModal());
        }
        
        const practiceBtn = document.getElementById('practice-btn');
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => startPractice());
        }
        
        // Chat del lobby
        if (elements.lobbyChatToggle) {
            elements.lobbyChatToggle.addEventListener('click', toggleLobbyChat);
        }
        
        if (elements.lobbyChatSend) {
            elements.lobbyChatSend.addEventListener('click', sendLobbyChat);
        }
        
        if (elements.lobbyChatInput) {
            elements.lobbyChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendLobbyChat();
                }
            });
        }
        
        // Avatar
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        openCropModal(evt.target.result, (croppedDataUrl) => {
                            elements.userAvatarEl.src = croppedDataUrl;
                            currentUser.userAvatar = croppedDataUrl;
                            localStorage.setItem('userAvatar', croppedDataUrl);
                            showToast('Avatar actualizado con éxito.', 2500);
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        const editAvatarBtn = document.getElementById('edit-avatar-btn');
        if (editAvatarBtn) {
            editAvatarBtn.addEventListener('click', () => {
                avatarInput.click();
            });
        }
        
        // Avatar del registro
        const registerAvatarUpload = document.getElementById('register-avatar-upload');
        if (registerAvatarUpload) {
            registerAvatarUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        openCropModal(evt.target.result, (croppedDataUrl) => {
                            selectedAvatar = croppedDataUrl;
                            const avatarPreview = document.getElementById('avatar-preview');
                            const avatarPreviewContainer = document.getElementById('avatar-preview-container');
                            if (avatarPreview) avatarPreview.src = croppedDataUrl;
                            if (avatarPreviewContainer) avatarPreviewContainer.style.display = 'block';
                            const current = document.querySelector('.avatar-option.selected');
                            if (current) current.classList.remove('selected');
                            document.querySelector('.avatar-option').classList.add('selected');
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
        if (uploadAvatarBtn) {
            uploadAvatarBtn.addEventListener('click', () => {
                registerAvatarUpload.click();
            });
        }
        
        // Galería de avatares
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedAvatar = option.dataset.avatar;
            });
        });
        
        // Modal de recorte
        const cropSave = document.getElementById('crop-save');
        const cropCancel = document.getElementById('crop-cancel');
        
        if (cropSave) {
            cropSave.addEventListener('click', saveCrop);
        }
        
        if (cropCancel) {
            cropCancel.addEventListener('click', closeCropModal);
        }
        
        // Cerrar modales al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeAllModals();
            }
        });
    }
    
    // Funciones de login/registro
    function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const currency = document.getElementById('login-currency').value;
        
        if (!username) {
            showToast('Por favor ingresa un nombre', 3000);
            return;
        }
        
        currentUser = {
            username: username,
            currency: currency,
            userAvatar: localStorage.getItem('userAvatar') || 'https://i.pravatar.cc/150?img=1'
        };
        
        socket.emit('lobbyLogin', currentUser);
        hideLoginModal();
        showLobby();
    }
    
    function handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const currency = document.getElementById('register-currency').value;
        const avatar = selectedAvatar || 'https://i.pravatar.cc/150?img=1';
        
        if (!name) {
            showToast('Por favor ingresa un nombre', 3000);
            return;
        }
        
        currentUser = {
            username: name,
            currency: currency,
            userAvatar: avatar
        };
        
        socket.emit('lobbyLogin', currentUser);
        hideRegisterModal();
        showLobby();
    }
    
    function handleCreateRoom(e) {
        e.preventDefault();
        const roomName = document.getElementById('room-name').value.trim();
        const bet = parseInt(document.getElementById('room-bet').value);
        const penalty = parseInt(document.getElementById('room-penalty').value);
        const currency = document.getElementById('room-currency').value;
        
        if (!roomName) {
            showToast('Por favor ingresa un nombre para la mesa', 3000);
            return;
        }
        
        const roomData = {
            tableName: roomName,
            bet: bet,
            penalty: penalty,
            betCurrency: currency,
            username: currentUser.username,
            userAvatar: currentUser.userAvatar,
            userId: `user_${currentUser.username.toLowerCase()}`
        };
        
        socket.emit('createRoom', roomData);
        hideCreateRoomModal();
    }
    
    // Funciones de UI
    function showLoginModal() {
        if (elements.loginModal) {
            elements.loginModal.classList.add('show');
        }
    }
    
    function hideLoginModal() {
        if (elements.loginModal) {
            elements.loginModal.classList.remove('show');
        }
    }
    
    function showRegisterModal() {
        hideLoginModal();
        if (elements.registerModal) {
            elements.registerModal.classList.add('show');
        }
    }
    
    function hideRegisterModal() {
        if (elements.registerModal) {
            elements.registerModal.classList.remove('show');
        }
    }
    
    function showCreateRoomModal() {
        if (elements.createRoomModal) {
            elements.createRoomModal.classList.add('show');
        }
    }
    
    function hideCreateRoomModal() {
        if (elements.createRoomModal) {
            elements.createRoomModal.classList.remove('show');
        }
    }
    
    function showLobby() {
        if (elements.lobby) {
            elements.lobby.style.display = 'block';
        }
        if (elements.gameContainer) {
            elements.gameContainer.style.display = 'none';
        }
    }
    
    function showGame() {
        if (elements.lobby) {
            elements.lobby.style.display = 'none';
        }
        if (elements.gameContainer) {
            elements.gameContainer.style.display = 'block';
        }
    }
    
    function closeAllModals() {
        hideLoginModal();
        hideRegisterModal();
        hideCreateRoomModal();
        closeCropModal();
    }
    
    // Funciones de chat
    function toggleLobbyChat() {
        if (elements.lobbyChatWindow) {
            elements.lobbyChatWindow.classList.toggle('visible');
            if (elements.lobbyChatWindow.classList.contains('visible')) {
                unreadMessages = 0;
                const badge = document.getElementById('chat-notification-badge');
                if (badge) badge.style.display = 'none';
                if (elements.lobbyChatInput) elements.lobbyChatInput.focus();
                if (elements.lobbyChatMessages) {
                    elements.lobbyChatMessages.scrollTop = elements.lobbyChatMessages.scrollHeight;
                }
            }
        }
    }
    
    function sendLobbyChat() {
        if (!elements.lobbyChatInput) return;
        const message = elements.lobbyChatInput.value.trim();
        if (message && currentUser) {
            socket.emit('sendLobbyChat', {
                text: message,
                sender: currentUser.username
            });
            elements.lobbyChatInput.value = '';
        }
    }
    
    function addLobbyChatMessage(message) {
        if (!elements.lobbyChatMessages) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        const isOwn = message.from === currentUser.username;
        messageEl.classList.add(isOwn ? 'own' : 'other');
        
        messageEl.innerHTML = `
            <div class="chat-message-header">${message.from} - ${new Date(message.ts).toLocaleTimeString()}</div>
            <div>${message.text}</div>
        `;
        
        elements.lobbyChatMessages.appendChild(messageEl);
        elements.lobbyChatMessages.scrollTop = elements.lobbyChatMessages.scrollHeight;
        
        if (!elements.lobbyChatWindow.classList.contains('visible')) {
            unreadMessages++;
            const badge = document.getElementById('chat-notification-badge');
            if (badge) {
                badge.textContent = unreadMessages;
                badge.style.display = 'block';
            }
        }
    }
    
    function renderLobbyChat(history) {
        if (!elements.lobbyChatMessages) return;
        
        elements.lobbyChatMessages.innerHTML = '';
        history.forEach(message => {
            addLobbyChatMessage(message);
        });
    }
    
    // Funciones de mesas
    function renderRoomsOverview(rooms = []) {
        if (!elements.roomsList) return;
        
        elements.roomsList.innerHTML = '';
        
        if (!rooms || Object.keys(rooms).length === 0) {
            elements.roomsList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.7;">No hay mesas disponibles</div>';
            return;
        }
        
        Object.values(rooms).forEach(roomData => {
            if (roomData.isPractice) return;
            
            try {
                const div = document.createElement('div');
                div.className = 'room-card';
                
                const players = roomData.players || [];
                const isFull = players.length >= 4;
                const canJoin = !isFull && roomData.state === 'waiting';
                
                div.innerHTML = `
                    <div class="room-header">
                        <div class="room-name">${roomData.settings.tableName || 'Mesa sin nombre'}</div>
                        <div class="room-status ${roomData.state}">
                            ${roomData.state === 'playing' ? 'Jugando' : 'Esperando'}
                        </div>
                    </div>
                    <div class="room-details">
                        <div class="room-detail">
                            <div class="room-detail-label">Apuesta</div>
                            <div class="room-detail-value">${roomData.settings.bet} ${roomData.settings.betCurrency}</div>
                        </div>
                        <div class="room-detail">
                            <div class="room-detail-label">Multa</div>
                            <div class="room-detail-value">${roomData.settings.penalty} ${roomData.settings.betCurrency}</div>
                        </div>
                        <div class="room-detail">
                            <div class="room-detail-label">Jugadores</div>
                            <div class="room-detail-value">${players.length}/4</div>
                        </div>
                        <div class="room-detail">
                            <div class="room-detail-label">Bote</div>
                            <div class="room-detail-value">${roomData.pot || 0} ${roomData.settings.betCurrency}</div>
                        </div>
                    </div>
                    <div class="room-players">
                        <h4>Jugadores:</h4>
                        <div class="players-list">
                            ${players.map(player => `
                                <img src="${player.userAvatar}" alt="${player.username}" class="player-avatar" title="${player.username}">
                            `).join('')}
                        </div>
                    </div>
                    <div class="room-actions">
                        <button class="room-join-btn" ${!canJoin ? 'disabled' : ''} onclick="joinRoom('${roomData.roomId}')">
                            ${isFull ? 'Mesa llena' : roomData.state === 'playing' ? 'En juego' : 'Unirse'}
                        </button>
                    </div>
                `;
                
                elements.roomsList.appendChild(div);
            } catch (error) {
                console.error('Error renderizando mesa:', error);
            }
        });
    }
    
    function joinRoom(roomId) {
        if (!currentUser) return;
        
        socket.emit('joinRoom', {
            roomId: roomId,
            username: currentUser.username,
            userAvatar: currentUser.userAvatar,
            userId: `user_${currentUser.username.toLowerCase()}`
        });
    }
    
    function startPractice() {
        if (!currentUser) return;
        
        socket.emit('startPractice', {
            username: currentUser.username,
            userAvatar: currentUser.userAvatar,
            userId: `user_${currentUser.username.toLowerCase()}`
        });
    }
    
    // Funciones de avatar
    function openCropModal(imageDataUrl, callback) {
        onCropCompleteCallback = callback;
        const cropImagePreview = document.getElementById('crop-image-preview');
        const avatarCropModal = document.getElementById('avatar-crop-modal');
        
        if (cropImagePreview && avatarCropModal) {
            cropImagePreview.onload = () => {
                avatarCropModal.classList.add('show');
                // Aquí iría la lógica de recorte con canvas
            };
            cropImagePreview.src = imageDataUrl;
        }
    }
    
    function saveCrop() {
        // Aquí iría la lógica de guardar el recorte
        if (typeof onCropCompleteCallback === 'function') {
            onCropCompleteCallback('data:image/png;base64,recorte_guardado');
        }
        onCropCompleteCallback = null;
        closeCropModal();
    }
    
    function closeCropModal() {
        const avatarCropModal = document.getElementById('avatar-crop-modal');
        if (avatarCropModal) {
            avatarCropModal.classList.remove('show');
        }
    }
    
    // Funciones de juego
    function initializeGame(settings) {
        currentGameSettings = settings;
        
        // Resetear chat UI
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
            chatWindow.classList.remove('visible');
        }
        const chatNotificationBadge = document.getElementById('chat-notification-badge');
        if (chatNotificationBadge) {
            chatNotificationBadge.style.display = 'none';
        }
        
        showGame();
        
        // Configurar elementos del juego
        setupGameUI();
        setupChat();
        
        // Renderizar estado inicial
        socket.emit('getGameState', { roomId: settings.roomId });
    }
    
    function setupGameUI() {
        // Configurar interfaz del juego
        if (elements.gameContainer) {
            elements.gameContainer.innerHTML = `
                <div class="game-header">
                    <h2>Mesa: ${currentGameSettings.tableName || 'Sin nombre'}</h2>
                    <button id="leave-game-btn" class="btn btn-secondary">Salir de la Mesa</button>
                </div>
                <div class="game-content">
                    <div class="game-info">
                        <div class="game-stats">
                            <div class="stat">
                                <span class="stat-label">Apuesta:</span>
                                <span class="stat-value">${currentGameSettings.bet} ${currentGameSettings.betCurrency}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Multa:</span>
                                <span class="stat-value">${currentGameSettings.penalty} ${currentGameSettings.betCurrency}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Bote:</span>
                                <span class="stat-value" id="game-pot">0 ${currentGameSettings.betCurrency}</span>
                            </div>
                        </div>
                    </div>
                    <div class="game-board">
                        <div class="discard-pile" id="discard-pile">
                            <h3>Descarte</h3>
                            <div class="cards-container" id="discard-cards"></div>
                        </div>
                        <div class="deck-pile" id="deck-pile">
                            <h3>Mazo</h3>
                            <div class="cards-container" id="deck-cards"></div>
                        </div>
                    </div>
                    <div class="player-hand" id="player-hand">
                        <h3>Tu Mano</h3>
                        <div class="cards-container" id="player-cards"></div>
                    </div>
                    <div class="melds-display" id="melds-display">
                        <h3>Combinaciones</h3>
                        <div class="melds-container" id="melds-container"></div>
                    </div>
                </div>
                <div class="game-chat">
                    <div class="chat-header">
                        <h4>Chat de la Partida</h4>
                        <button id="chat-toggle-btn" class="chat-toggle-btn">💬</button>
                    </div>
                    <div id="chat-window" class="chat-window">
                        <div id="chat-messages" class="chat-messages"></div>
                        <div class="chat-input-container">
                            <input type="text" id="chat-input" placeholder="Escribe un mensaje..." maxlength="200">
                            <button id="chat-send-btn">Enviar</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Configurar botón de salir
        const leaveGameBtn = document.getElementById('leave-game-btn');
        if (leaveGameBtn) {
            leaveGameBtn.addEventListener('click', () => {
                socket.emit('leaveRoom', { roomId: currentGameSettings.roomId });
                showLobby();
            });
        }
    }
    
    function setupChat() {
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');
        
        if (!toggleBtn || !sendBtn || !input) {
            console.error("No se encontraron los elementos de la UI del chat.");
            return;
        }
        
        // Eliminar listeners antiguos
        toggleBtn.removeEventListener('click', handleChatToggle);
        sendBtn.removeEventListener('click', handleChatSend);
        input.removeEventListener('keypress', handleChatKeypress);
        
        // Añadir nuevos listeners
        toggleBtn.addEventListener('click', handleChatToggle);
        sendBtn.addEventListener('click', handleChatSend);
        input.addEventListener('keypress', handleChatKeypress);
    }
    
    function handleChatToggle() {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) return;
        chatWindow.classList.toggle('visible');
        if (chatWindow.classList.contains('visible')) {
            unreadMessages = 0;
            const badge = document.getElementById('chat-notification-badge');
            if (badge) badge.style.display = 'none';
            const input = document.getElementById('chat-input');
            if (input) input.focus();
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    function handleChatSend() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        const message = input.value.trim();
        if (message && currentGameSettings && currentGameSettings.roomId) {
            socket.emit('sendGameChat', {
                roomId: currentGameSettings.roomId,
                message: message,
                sender: currentUser.username
            });
            input.value = '';
        }
    }
    
    function handleChatKeypress(e) {
        if (e.key === 'Enter') {
            handleChatSend();
        }
    }
    
    function addGameChatMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        const isOwn = message.sender === currentUser.username;
        messageEl.classList.add(isOwn ? 'own' : 'other');
        
        messageEl.innerHTML = `
            <div class="chat-message-header">${message.sender} - ${new Date(message.timestamp).toLocaleTimeString()}</div>
            <div>${message.message}</div>
        `;
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (!document.getElementById('chat-window').classList.contains('visible')) {
            unreadMessages++;
            const badge = document.getElementById('chat-notification-badge');
            if (badge) {
                badge.textContent = unreadMessages;
                badge.style.display = 'block';
            }
        }
    }
    
    function renderGameState(gameState) {
        // Renderizar estado del juego
        console.log('Estado del juego:', gameState);
    }
    
    function showGameEnd(results) {
        // Mostrar resultados del juego
        console.log('Juego terminado:', results);
    }
    
    function updateUserInfo(userData) {
        if (elements.userNameEl) {
            elements.userNameEl.textContent = userData.username;
        }
        if (elements.userCreditsEl) {
            elements.userCreditsEl.textContent = userData.credits || 0;
        }
        if (elements.userCurrencyEl) {
            elements.userCurrencyEl.textContent = userData.currency || 'USD';
        }
        if (elements.userAvatarEl) {
            elements.userAvatarEl.src = userData.userAvatar || 'https://i.pravatar.cc/150?img=1';
        }
    }
    
    function showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
    
    // Funciones globales
    window.joinRoom = joinRoom;
    window.initializeGame = initializeGame;
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
