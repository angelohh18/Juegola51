// game.js - Cliente del juego La 51
(function() {
    'use strict';
    
    // Variables globales
    let socket;
    let currentUser = null;
    let currentGameSettings = null;
    let selectedAvatar = null;
    let onCropCompleteCallback = null;
    let unreadMessages = 0;
    
    // Inicialización
    function init() {
        console.log('🎮 Inicializando juego La 51...');
        
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
        const lobbyChatToggle = document.getElementById('lobby-chat-toggle');
        if (lobbyChatToggle) {
            lobbyChatToggle.addEventListener('click', toggleLobbyChat);
        }
        
        const lobbyChatSend = document.getElementById('lobby-chat-send');
        if (lobbyChatSend) {
            lobbyChatSend.addEventListener('click', sendLobbyChat);
        }
        
        const lobbyChatInput = document.getElementById('lobby-chat-input');
        if (lobbyChatInput) {
            lobbyChatInput.addEventListener('keypress', (e) => {
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
                            const userAvatarEl = document.getElementById('user-avatar');
                            if (userAvatarEl) userAvatarEl.src = croppedDataUrl;
                            if (currentUser) currentUser.userAvatar = croppedDataUrl;
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
                if (avatarInput) avatarInput.click();
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
                            const firstOption = document.querySelector('.avatar-option');
                            if (firstOption) firstOption.classList.add('selected');
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
        if (uploadAvatarBtn) {
            uploadAvatarBtn.addEventListener('click', () => {
                if (registerAvatarUpload) registerAvatarUpload.click();
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
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.add('show');
        }
    }
    
    function hideLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('show');
        }
    }
    
    function showRegisterModal() {
        hideLoginModal();
        const registerModal = document.getElementById('register-modal');
        if (registerModal) {
            registerModal.classList.add('show');
        }
    }
    
    function hideRegisterModal() {
        const registerModal = document.getElementById('register-modal');
        if (registerModal) {
            registerModal.classList.remove('show');
        }
    }
    
    function showCreateRoomModal() {
        const createRoomModal = document.getElementById('create-room-modal');
        if (createRoomModal) {
            createRoomModal.classList.add('show');
        }
    }
    
    function hideCreateRoomModal() {
        const createRoomModal = document.getElementById('create-room-modal');
        if (createRoomModal) {
            createRoomModal.classList.remove('show');
        }
    }
    
    function showLobby() {
        const lobby = document.getElementById('lobby');
        const gameContainer = document.getElementById('game-container');
        if (lobby) lobby.style.display = 'block';
        if (gameContainer) gameContainer.style.display = 'none';
    }
    
    function showGame() {
        const lobby = document.getElementById('lobby');
        const gameContainer = document.getElementById('game-container');
        if (lobby) lobby.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'block';
    }
    
    function closeAllModals() {
        hideLoginModal();
        hideRegisterModal();
        hideCreateRoomModal();
        closeCropModal();
    }
    
    // Funciones de chat
    function toggleLobbyChat() {
        const chatWindow = document.getElementById('lobby-chat-window');
        if (!chatWindow) return;
        chatWindow.classList.toggle('visible');
        if (chatWindow.classList.contains('visible')) {
            unreadMessages = 0;
            const badge = document.getElementById('chat-notification-badge');
            if (badge) badge.style.display = 'none';
            const input = document.getElementById('lobby-chat-input');
            if (input) input.focus();
            const messagesContainer = document.getElementById('lobby-chat-messages');
            if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    function sendLobbyChat() {
        const input = document.getElementById('lobby-chat-input');
        if (!input) return;
        const message = input.value.trim();
        if (message && currentUser) {
            socket.emit('sendLobbyChat', {
                text: message,
                sender: currentUser.username
            });
            input.value = '';
        }
    }
    
    function addLobbyChatMessage(message) {
        const messagesContainer = document.getElementById('lobby-chat-messages');
        if (!messagesContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        const isOwn = message.from === currentUser.username;
        messageEl.classList.add(isOwn ? 'own' : 'other');
        
        messageEl.innerHTML = `
            <div class="chat-message-header">${message.from} - ${new Date(message.ts).toLocaleTimeString()}</div>
            <div>${message.text}</div>
        `;
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        const chatWindow = document.getElementById('lobby-chat-window');
        if (chatWindow && !chatWindow.classList.contains('visible')) {
            unreadMessages++;
            const badge = document.getElementById('chat-notification-badge');
            if (badge) {
                badge.textContent = unreadMessages;
                badge.style.display = 'block';
            }
        }
    }
    
    function renderLobbyChat(history) {
        const messagesContainer = document.getElementById('lobby-chat-messages');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        history.forEach(message => {
            addLobbyChatMessage(message);
        });
    }
    
    // Funciones de mesas
    function renderRoomsOverview(rooms = []) {
        const roomsList = document.getElementById('rooms-list');
        if (!roomsList) return;
        
        roomsList.innerHTML = '';
        
        if (!rooms || Object.keys(rooms).length === 0) {
            roomsList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.7;">No hay mesas disponibles</div>';
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
                
                roomsList.appendChild(div);
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
            };
            cropImagePreview.src = imageDataUrl;
        }
    }
    
    function saveCrop() {
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
        showGame();
        console.log('Juego inicializado:', settings);
    }
    
    function renderGameState(gameState) {
        console.log('Estado del juego:', gameState);
    }
    
    function addGameChatMessage(message) {
        console.log('Mensaje del juego:', message);
    }
    
    function showGameEnd(results) {
        console.log('Juego terminado:', results);
    }
    
    function updateUserInfo(userData) {
        const userNameEl = document.getElementById('user-name');
        const userCreditsEl = document.getElementById('user-credits');
        const userCurrencyEl = document.getElementById('user-currency');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (userNameEl) userNameEl.textContent = userData.username;
        if (userCreditsEl) userCreditsEl.textContent = userData.credits || 0;
        if (userCurrencyEl) userCurrencyEl.textContent = userData.currency || 'USD';
        if (userAvatarEl) userAvatarEl.src = userData.userAvatar || 'https://i.pravatar.cc/150?img=1';
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