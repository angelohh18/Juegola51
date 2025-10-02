// game.js (Archivo completo y actualizado)

// --- INICIO: SCRIPT DE PUENTE (BRIDGE) ---
function showLobbyView() {
    document.body.classList.remove('game-active'); // >> AÑADE ESTA LÍNEA <<
    document.getElementById('lobby-overlay').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    hideOverlay('ready-overlay'); // Asegurarse que el overlay se oculte al volver
    if (typeof scaleAndCenterLobby === 'function') {
        scaleAndCenterLobby();
    }
    if (typeof updateLobbyCreditsDisplay === 'function') {
        updateLobbyCreditsDisplay();
    }
}

function showGameView(settings) {
    document.body.classList.add('game-active'); // >> AÑADE ESTA LÍNEA <<
    document.getElementById('lobby-overlay').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    if (typeof initializeGame === 'function') {
        initializeGame(settings);
    }
}
// --- FIN: SCRIPT DE PUENTE (BRIDGE) ---

// ▼▼▼ PEGA LAS FUNCIONES AQUÍ ▼▼▼
function showOverlay(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.style.display = 'flex';
}

function hideOverlay(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.style.display = 'none';
}
// ▲▲▲ FIN DEL CÓDIGO A PEGAR ▲▲▲

const socket = io("http://localhost:3000", { autoConnect: false });

let spectatorMode = 'wantsToPlay'; // Variable global para controlar el modo espectador

socket.on('connect', () => {
    console.log('🔌 Conexión global con el servidor establecida. ID:', socket.id);
});


// --- INICIO: SCRIPT DEL LOBBY ---
(function(){

    socket.on('updateRoomList', (serverRooms) => {
        renderRoomsOverview(serverRooms);
    });

    socket.on('roomCreatedSuccessfully', (roomData) => {
        showGameView({ ...roomData, isPractice: false });
    });
    
    socket.on('joinedRoomSuccessfully', (roomData) => {
        showGameView({ ...roomData, isPractice: false });
    });

    socket.on('joinedAsSpectator', (gameState) => {
        console.log('Te has unido como espectador. Pasando control a la vista de juego...');
        showGameView({ ...gameState, isSpectator: true });
    });

    socket.on('waitingConfirmed', () => {
        showToast('¡Listo! Te sentarás automáticamente cuando empiece la revancha.', 4000);
        addChatMessage(null, 'Estás en la lista de espera para la siguiente partida.', 'system');
    });


    function clearAllData() {
        const usersToKeep = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('registered_user_')) {
                usersToKeep[key] = localStorage.getItem(key);
            }
        }
        localStorage.clear();
        Object.keys(usersToKeep).forEach(key => {
            localStorage.setItem(key, usersToKeep[key]);
        });
        console.log('Cache limpiado - Estado reiniciado');
    }
    
    clearAllData();
    
    const MAX_SEATS = 4;
    function uid(prefix='id') { return prefix + '-' + Math.random().toString(36).slice(2,9); }
    function nowTs(){ return Date.now(); }
    
    const body = document.body;
    const lobbyOverlay = document.getElementById('lobby-overlay');
    const overlayContent = document.querySelector('.overlay-content');
    const chatEl = document.getElementById('lobby-chat');
    const chatInput = document.getElementById('lobby-chat-input-textarea');
    const roomsOverviewEl = document.getElementById('rooms-overview');
    const createRoomModal = document.getElementById('create-room-modal');
    const btnCreateRoomConfirm = document.getElementById('btn-create-room-confirm');
    const btnCreateRoomCancel = document.getElementById('btn-create-room-cancel');
    const betInput = document.getElementById('bet-input');
    const penaltyInput = document.getElementById('penalty-input');
    const createRoomError = document.getElementById('create-room-error');
    const btnRules = document.getElementById('btn-rules');
    const rulesModal = document.getElementById('rules-modal');
    const btnCloseRulesModal = document.getElementById('btn-close-rules-modal');
    const btnSendChat = document.getElementById('btn-send-chat');
    const btnLogout = document.getElementById('btn-logout');
    const userCreditsEl = document.getElementById('user-credits');
    const userAvatarEl = document.getElementById('user-avatar');
    const avatarInput = document.getElementById('avatar-input');
    const btnReloadCredits = document.getElementById('btn-reload-credits');
    const creditModal = document.getElementById('credit-modal');
    const btnCloseCreditModal = document.getElementById('btn-close-credit-modal');
    const loginModal = document.getElementById('login-modal');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const registerModal = document.getElementById('register-modal');
    const registerNameInput = document.getElementById('register-name');
    const registerCountrySelect = document.getElementById('register-country');
    const registerWhatsAppInput = document.getElementById('register-whatsapp');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
    const registerError = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');
    const btnRegisterSubmit = document.getElementById('btn-register-submit');
    const btnRegisterBack = document.getElementById('btn-register-back');
    const avatarGallery = document.getElementById('avatar-gallery');
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarPreviewContainer = document.getElementById('avatar-preview-container');
    const registerAvatarUpload = document.getElementById('register-avatar-upload');
    const avatarCropModal = document.getElementById('avatar-crop-modal');
    const cropContainer = document.getElementById('crop-container');
    const cropImageWrapper = document.getElementById('crop-image-wrapper');
    const cropImagePreview = document.getElementById('crop-image-preview');
    const zoomSlider = document.getElementById('zoom-slider');
    const btnSaveCrop = document.getElementById('btn-save-crop');
    const btnCancelCrop = document.getElementById('btn-cancel-crop');
    let localPlayerId = localStorage.getItem('la51_local_player_id') || uid('p');
    localStorage.setItem('la51_local_player_id', localPlayerId);

    const countries = [
        { name: "España", code: "ES", phone: "+34" }, { name: "México", code: "MX", phone: "+52" },
        { name: "Argentina", code: "AR", phone: "+54" }, { name: "Colombia", code: "CO", phone: "+57" },
        { name: "Chile", code: "CL", phone: "+56" }, { name: "Perú", code: "PE", phone: "+51" },
        { name: "Venezuela", code: "VE", phone: "+58" }, { name: "Ecuador", code: "EC", phone: "+593" },
        { name: "Bolivia", code: "BO", phone: "+591" }, { name: "Paraguay", code: "PY", phone: "+595" },
        { name: "Uruguay", code: "UY", phone: "+598" }, { name: "Costa Rica", code: "CR", phone: "+506" },
        { name: "Panamá", code: "PA", phone: "+507" }, { name: "República Dominicana", code: "DO", phone: "+1" },
        { name: "Honduras", code: "HN", phone: "+504" }, { name: "El Salvador", code: "SV", phone: "+503" },
        { name: "Nicaragua", code: "NI", phone: "+505" }, { name: "Guatemala", code: "GT", phone: "+502" },
        { name: "Cuba", code: "CU", phone: "+53" }, { name: "Puerto Rico", code: "PR", phone: "+1" }
    ];
    const defaultAvatars = [ 'https://i.pravatar.cc/150?img=1', 'https://i.pravatar.cc/150?img=2', 'https://i.pravatar.cc/150?img=3', 'https://i.pravatar.cc/150?img=4', 'https://i.pravatar.cc/150?img=5', 'https://i.pravatar.cc/150?img=6', 'https://i.pravatar.cc/150?img=7', 'https://i.pravatar.cc/150?img=8', 'https://i.pravatar.cc/150?img=9', 'https://i.pravatar.cc/150?img=10' ];
    let selectedAvatar = null;
    let currentPhonePrefix = '';

    function scaleAndCenterLobby() {
        if (window.getComputedStyle(lobbyOverlay).display === 'none' || !body.classList.contains('is-logged-in')) {
            overlayContent.style.transform = '';
            overlayContent.style.left = '';
            overlayContent.style.top = '';
            overlayContent.style.position = 'relative'; 
            return;
        }
        const lobbyWidth = 1100; const lobbyHeight = 700;
        const viewportWidth = window.innerWidth; const viewportHeight = window.innerHeight;
        const scale = Math.min(viewportWidth / lobbyWidth, viewportHeight / lobbyHeight);
        overlayContent.style.transformOrigin = 'top left';
        overlayContent.style.transform = `scale(${scale})`;
        const newWidth = lobbyWidth * scale; const newHeight = lobbyHeight * scale;
        const left = (viewportWidth - newWidth) / 2; const top = (viewportHeight - newHeight) / 2;
        overlayContent.style.position = 'absolute';
        overlayContent.style.left = `${left}px`;
        overlayContent.style.top = `${top}px`;
    }

    function updateCreditsDisplay() {
        const credits = parseInt(localStorage.getItem('userCredits')) || 0;
        userCreditsEl.textContent = 'Créditos ' + credits.toLocaleString();
    }
    window.updateLobbyCreditsDisplay = updateCreditsDisplay;
    
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                userAvatarEl.src = evt.target.result;
                localStorage.setItem('userAvatar', evt.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    btnReloadCredits.addEventListener('click', () => { creditModal.style.display = 'flex'; });
    btnCloseCreditModal.addEventListener('click', () => { creditModal.style.display = 'none'; });
    btnRules.addEventListener('click', () => { rulesModal.style.display = 'flex'; });
    btnCloseRulesModal.addEventListener('click', () => { rulesModal.style.display = 'none'; });

    function createRoom() {
        createRoomError.style.display = 'none';
        betInput.value = 10;
        penaltyInput.value = 5;
        createRoomModal.style.display = 'flex';
    }

    function confirmCreateRoom() {
        const bet = parseInt(betInput.value);
        const penalty = parseInt(penaltyInput.value);
        if (isNaN(bet) || bet <= 0) {
            createRoomError.textContent = 'La apuesta debe ser un número positivo.';
            createRoomError.style.display = 'block';
            return;
        }
        if (isNaN(penalty) || penalty < 0) {
            createRoomError.textContent = 'La multa debe ser un número cero o positivo.';
            createRoomError.style.display = 'block';
            return;
        }
        const totalCost = bet;
        const userCredits = parseInt(localStorage.getItem('userCredits')) || 0;
        if (userCredits < totalCost) {
            createRoomError.textContent = `No tienes créditos suficientes. Necesitas ${totalCost}.`;
            createRoomError.style.display = 'block';
            return;
        }
        
        const username = localStorage.getItem('username') || 'Jugador';
        const userAvatar = localStorage.getItem('userAvatar') || defaultAvatars[0];
        const roomSettings = {
            username: username,
            userAvatar: userAvatar,
            tableName: `Mesa de ${username}`,
            bet: bet,
            penalty: penalty
        };
        socket.emit('createRoom', roomSettings);
        createRoomModal.style.display = 'none';
    }

    btnCreateRoomConfirm.addEventListener('click', confirmCreateRoom);
    btnCreateRoomCancel.addEventListener('click', () => { createRoomModal.style.display = 'none'; });
    
    btnSendChat.addEventListener('click', () => {
        const txt = chatInput.value.trim();
        if (txt) sendChat(txt);
    });
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnSendChat.click();
        }
    });

    btnLogout.addEventListener('click', () => {
        socket.disconnect(); 
        localStorage.removeItem('username');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('userCredits');
        body.classList.remove('is-logged-in');
        window.removeEventListener('resize', scaleAndCenterLobby);
        scaleAndCenterLobby();
        lobbyOverlay.style.display = 'none';
        showLoginModal();
    });

    function getRoomStatePriority(r) {
        const seated = (r.seats || []).filter(Boolean).length;
        if (seated > 0) {
            if (r.state === 'playing') return 2;
            return 1;
        }
        return 3;
    }

    function handleJoinRoom(roomId, mode = 'wantsToPlay') {
        spectatorMode = mode; // Guardamos la intención del espectador
        const user = {
            username: localStorage.getItem('username') || 'Invitado',
            userAvatar: localStorage.getItem('userAvatar') || defaultAvatars[0]
        };
        socket.emit('joinRoom', { roomId, user });
    }

// REEMPLAZA LA FUNCIÓN renderRoomsOverview ENTERA CON ESTO:
function renderRoomsOverview(rooms = []) {
    if (!roomsOverviewEl) return;
    roomsOverviewEl.innerHTML = ''; // Limpiar la vista

    // --- MESA DE PRÁCTICA ---
    const practiceTable = document.createElement('div');
    practiceTable.className = 'table-item';
    practiceTable.innerHTML = `
        <div class="info">
            <div><strong>Modo Práctica</strong></div>
            <p style="font-size: 0.85rem; line-height: 1.3; margin-top: 10px; margin-bottom: 10px;">Aprende a jugar con bots.</p>
        </div>
        <div class="actions">
            <button class="play-button">Jugar</button>
        </div>
    `;
    practiceTable.querySelector('button').onclick = () => {
        const username = localStorage.getItem('username') || 'Jugador';
        socket.emit('requestPracticeGame', username);
    };
    roomsOverviewEl.appendChild(practiceTable);

    // --- BOTÓN DE CREAR MESA ---
    const createTableItem = document.createElement('div');
    createTableItem.className = 'table-item no-rooms';
    createTableItem.innerHTML = `
        <div class="info">
            <p>${rooms.length === 0 ? 'No hay mesas. ¡Crea una!' : 'Crear una nueva mesa'}</p>
        </div>
        <div class="actions">
            <button class="play-button">Crear Mesa</button>
        </div>`;
    createTableItem.querySelector('button').onclick = createRoom;
    roomsOverviewEl.appendChild(createTableItem);

    if (!Array.isArray(rooms)) {
        console.error("Error: el dato 'rooms' recibido no es un array.", rooms);
        return;
    }

    // --- RENDERIZAR MESAS REALES ---
    rooms.sort((a, b) => getRoomStatePriority(a) - getRoomStatePriority(b));

    rooms.forEach(roomData => {
        try {
            const div = document.createElement('div');
            div.className = 'table-item';

            const seated = (roomData.seats || []).filter(Boolean).length;
            const bet = parseInt(roomData.settings?.bet || 0);
            const hostUsername = roomData.settings?.username || 'Desconocido';
            // ▼▼▼ REEMPLAZA ESTA LÍNEA... ▼▼▼
            // const isPlaying = roomData.state === 'playing';
            // ▲▲▲ ...CON ESTA LÍNEA ▼▼▼
            const isEffectivelyPlaying = roomData.state === 'playing' || roomData.state === 'post-game';
            
            let stateText = isEffectivelyPlaying ? `Jugando (${seated} / 4)` : `En espera (${seated} / 4)`;
            const seatedPlayerNames = (roomData.seats || []).map(seat => seat ? seat.playerName : null).filter(Boolean);

            div.innerHTML = `
                <div class="info">
                    <div><strong>Mesa de:</strong> ${hostUsername}</div>
                    <div><strong>Estado:</strong> ${stateText}</div>
                    <div><strong>Apuesta:</strong> ${bet}</div>
                    <div><strong>Multa:</strong> ${roomData.settings?.penalty || 0}</div>
                    <div class="player-list"><strong>Jugadores:</strong> ${seatedPlayerNames.length > 0 ? seatedPlayerNames.join(', ') : '-'}</div>
                </div>
                <div class="actions"></div>
            `;

            const actionsContainer = div.querySelector('.actions');

            // ▼▼▼ REEMPLAZA ESTA LÍNEA... ▼▼▼
            // if (isPlaying) {
            // ▲▲▲ ...CON ESTA LÍNEA ▼▼▼
            if (isEffectivelyPlaying) {
                // ▼▼▼ REEMPLAZA EL BLOQUE DEL BOTÓN 'Unirse y Esperar' CON ESTO ▼▼▼
                
                const isFull = seated >= 4; // Comprobamos si la mesa está llena

                const btnJoinAndWait = document.createElement('button');
                btnJoinAndWait.textContent = 'Unirse y Esperar';
                btnJoinAndWait.className = 'play-button';
                btnJoinAndWait.disabled = isFull; // Deshabilitamos el botón si está llena

                if (isFull) {
                    btnJoinAndWait.title = 'La mesa está llena, no puedes unirte a la espera.';
                } else {
                    btnJoinAndWait.title = 'Entras como espectador con la opción de sentarte si se libera un puesto.';
                }
                btnJoinAndWait.onclick = () => handleJoinRoom(roomData.roomId, 'wantsToPlay');
                actionsContainer.appendChild(btnJoinAndWait);
                
                // ▲▲▲ FIN DEL CÓDIGO DE REEMPLAZO ▲▲▲

                const btnSpectateOnly = document.createElement('button');
                btnSpectateOnly.textContent = 'Solo Ver';
                btnSpectateOnly.className = 'play-button secondary'; // Estilo secundario
                btnSpectateOnly.title = 'Entras como espectador y no recibirás notificaciones para jugar.'
                btnSpectateOnly.onclick = () => handleJoinRoom(roomData.roomId, 'spectateOnly');
                actionsContainer.appendChild(btnSpectateOnly);
            } else {
                // Si la partida está en espera, mostrar solo el botón "Entrar"
                const btnEnter = document.createElement('button');
                btnEnter.textContent = 'Entrar';
                btnEnter.className = 'play-button';
                
                const currentCredits = parseInt(localStorage.getItem('userCredits')) || 0;
                const isFull = seated >= 4;
                const hasEnoughCredits = currentCredits >= bet;

                btnEnter.disabled = !hasEnoughCredits || isFull;
                if (!hasEnoughCredits) btnEnter.title = `Créditos insuficientes. Necesitas ${bet}.`;
                if (isFull) btnEnter.title = `Mesa llena.`;
                
                btnEnter.onclick = () => handleJoinRoom(roomData.roomId); // Asignación correcta
                actionsContainer.appendChild(btnEnter);
            }
            
            roomsOverviewEl.appendChild(div);

        } catch (error) {
            console.error(`ERROR al renderizar la mesa:`, error, roomData);
        }
    });
}
    
    function sendChat(text) {
        if (!text) return;
        const name = localStorage.getItem('username') || 'Anónimo';
        const chatMessages = JSON.parse(localStorage.getItem('lobby_chat')) || [];
        chatMessages.push({ id: uid('m'), from: name, text: text, ts: nowTs() });
        if(chatMessages.length > 50) chatMessages.slice(-50);
        localStorage.setItem('lobby_chat', JSON.stringify(chatMessages));
        chatInput.value = '';
        renderGlobalChat();
    }

    function renderGlobalChat() {
        const chatMessages = JSON.parse(localStorage.getItem('lobby_chat')) || [];
        if (chatMessages.length === 0) {
            chatMessages.push({ id: uid('m'), from: 'Sistema', text: '¡Bienvenido al Lobby! Sé respetuoso y disfruta del juego.', ts: nowTs() });
        }
        chatEl.innerHTML = '';
        chatMessages.forEach(msg => {
            const m = document.createElement('div'); m.style.marginBottom = '6px';
            const who = document.createElement('div'); who.style.fontSize='12px'; who.style.color='#6D2932'; who.textContent = msg.from;
            const txt = document.createElement('div'); txt.textContent = msg.text;
            const ts = document.createElement('div'); ts.style.fontSize='11px'; ts.style.color='#888'; ts.textContent = new Date(msg.ts).toLocaleTimeString();
            m.appendChild(who); m.appendChild(txt); m.appendChild(ts);
            chatEl.appendChild(m);
        });
        chatEl.scrollTop = chatEl.scrollHeight;
    }
    
// REEMPLAZA LA FUNCIÓN showRoomsOverview ENTERA CON ESTO
function showRoomsOverview() {
    if(roomsOverviewEl) roomsOverviewEl.style.display='grid';
    renderGlobalChat();
}

    function showLoginModal() {
        loginError.style.display = 'none';
        loginUsernameInput.value = ''; loginPasswordInput.value = '';
        loginModal.style.display = 'flex';
    }
    
    function showRegisterModal() {
        registerError.style.display = 'none'; registerSuccess.style.display = 'none';
        registerNameInput.value = ''; registerCountrySelect.value = ''; registerWhatsAppInput.value = '';
        registerPasswordInput.value = ''; registerConfirmPasswordInput.value = '';
        selectedAvatar = null; avatarPreviewContainer.style.display = 'none';
        populateAvatarGallery();
        loginModal.style.display = 'none'; registerModal.style.display = 'flex';
    }

    function validateUser(username, password) {
        if (!username || !password) { 
            loginError.textContent = 'Por favor, ingresa nombre y contraseña.'; 
            loginError.style.display = 'block'; 
            return null; 
        }
        const userKey = 'registered_user_' + username.toLowerCase();
        const storedUser = localStorage.getItem(userKey);
        if (!storedUser) {
            loginError.textContent = 'Usuario no encontrado. Debes registrarte primero.';
            loginError.style.display = 'block';
            return null;
        }
        try {
            const userData = JSON.parse(storedUser);
            if (userData.password !== password) {
                loginError.textContent = 'Contraseña incorrecta.';
                loginError.style.display = 'block';
                return null;
            }
            return { 
                name: userData.name, 
                password: userData.password, 
                avatar: userData.avatar || defaultAvatars[0],
                country: userData.country,
                whatsapp: userData.whatsapp
            };
        } catch (e) {
            loginError.textContent = 'Error al validar usuario.';
            loginError.style.display = 'block';
            return null;
        }
    }

    function registerUser(name, country, whatsapp, password, confirmPassword, avatar) {
        if (!name || !country || !whatsapp || !password || !confirmPassword) { 
            registerError.textContent = 'Por favor, completa todos los campos.'; 
            registerError.style.display = 'block'; 
            return false; 
        }
        if (password !== confirmPassword) { 
            registerError.textContent = 'Las contraseñas no coinciden.'; 
            registerError.style.display = 'block'; 
            return false; 
        }
        if (!avatar) { 
            registerError.textContent = 'Por favor, selecciona un avatar.'; 
            registerError.style.display = 'block'; 
            return false; 
        }
        const userKey = 'registered_user_' + name.toLowerCase();
        if (localStorage.getItem(userKey)) {
            registerError.textContent = 'Este nombre de usuario ya está en uso. Elige otro.';
            registerError.style.display = 'block';
            return false;
        }
        const userData = {
            name: name,
            country: country,
            whatsapp: whatsapp,
            password: password,
            avatar: avatar,
            registeredAt: Date.now()
        };
        try {
            localStorage.setItem(userKey, JSON.stringify(userData));
            registerSuccess.textContent = 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.';
            registerSuccess.style.display = 'block';
            return true;
        } catch (e) {
            registerError.textContent = 'Error al registrar usuario. Inténtalo de nuevo.';
            registerError.style.display = 'block';
            return false;
        }
    }

    function doLogin() {
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();
        const user = validateUser(username, password);
        if (user) {
           
            socket.connect(); 

            localStorage.setItem('username', user.name);
            loginModal.style.display = 'none';
            document.getElementById('user-name').textContent = user.name;
            const defaultAvatar = 'https://i.pravatar.cc/150?img=1';
            userAvatarEl.src = user.avatar || defaultAvatar;
            localStorage.setItem('userAvatar', user.avatar || defaultAvatar);
            localStorage.setItem('userCredits', 1000);
            updateCreditsDisplay();
            body.classList.add('is-logged-in');
            lobbyOverlay.style.display = 'flex';
            setTimeout(scaleAndCenterLobby, 0);
            window.addEventListener('resize', scaleAndCenterLobby);
        }
    }

    function doRegister() {
        const name = registerNameInput.value.trim();
        const country = registerCountrySelect.value;
        const whatsapp = registerWhatsAppInput.value.trim();
        const password = registerPasswordInput.value;
        const confirmPassword = registerConfirmPasswordInput.value;
        if (registerUser(name, country, whatsapp, password, confirmPassword, selectedAvatar)) {
            setTimeout(() => {
                registerModal.style.display = 'none';
                showLoginModal();
                loginUsernameInput.value = name;
            }, 2000);
        }
    }

    btnLogin.addEventListener('click', doLogin);
    btnRegister.addEventListener('click', showRegisterModal);
    btnRegisterSubmit.addEventListener('click', doRegister);
    btnRegisterBack.addEventListener('click', () => { registerModal.style.display = 'none'; showLoginModal(); });

    function initCountries() {
        countries.forEach(c => {
            const option = document.createElement('option');
            option.value = c.code; option.textContent = `${c.name} (${c.phone})`;
            registerCountrySelect.appendChild(option);
        });
        registerCountrySelect.addEventListener('change', () => {
            const selected = countries.find(c => c.code === registerCountrySelect.value);
            currentPhonePrefix = selected ? selected.phone : "";
            registerWhatsAppInput.value = currentPhonePrefix ? currentPhonePrefix + " " : "";
        });
        registerWhatsAppInput.addEventListener('input', () => { if (!registerWhatsAppInput.value.startsWith(currentPhonePrefix)) { registerWhatsAppInput.value = currentPhonePrefix + " "; } });
        registerWhatsAppInput.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && registerWhatsAppInput.selectionStart <= currentPhonePrefix.length + 1) e.preventDefault(); });
    }

    function populateAvatarGallery() {
        avatarGallery.innerHTML = '';
        const uploadOpt = document.createElement('div');
        uploadOpt.className = 'avatar-item'; uploadOpt.textContent = 'Subir Foto';
        uploadOpt.onclick = () => registerAvatarUpload.click();
        avatarGallery.appendChild(uploadOpt);
        defaultAvatars.forEach(url => {
            const item = document.createElement('div'); item.className = 'avatar-item';
            const img = document.createElement('img'); img.src = url;
            item.appendChild(img);
            item.addEventListener('click', () => {
                const current = avatarGallery.querySelector('.selected');
                if (current) current.classList.remove('selected');
                item.classList.add('selected');
                selectedAvatar = url;
                avatarPreview.src = url; avatarPreviewContainer.style.display = 'block';
            });
            avatarGallery.appendChild(item);
        });
    }

    let cropperState = { isDragging: false, startX: 0, startY: 0, wrapperX: 0, wrapperY: 0, scale: 1 };
    function openCropModal(imageDataUrl) {
        cropImagePreview.onload = () => {
            avatarCropModal.style.display = 'flex';
            cropperState = { isDragging: false, startX: 0, startY: 0, wrapperX: 0, wrapperY: 0, scale: 1 };
            zoomSlider.value = 100;
            const img = cropImagePreview, wrapper = cropImageWrapper, container = cropContainer;
            const containerSize = container.offsetWidth;
            let initialWidth, initialHeight;
            if (img.naturalWidth > img.naturalHeight) {
                initialHeight = containerSize; initialWidth = (img.naturalWidth / img.naturalHeight) * containerSize;
                cropperState.wrapperY = 0; cropperState.wrapperX = -(initialWidth - containerSize) / 2;
            } else {
                initialWidth = containerSize; initialHeight = (img.naturalHeight / img.naturalWidth) * containerSize;
                cropperState.wrapperX = 0; cropperState.wrapperY = -(initialHeight - containerSize) / 2;
            }
            wrapper.style.width = `${initialWidth}px`; wrapper.style.height = `${initialHeight}px`;
            wrapper.style.left = `${cropperState.wrapperX}px`; wrapper.style.top = `${cropperState.wrapperY}px`;
            img.style.transform = `scale(1)`;
        };
        cropImagePreview.src = imageDataUrl;
    }
    function closeCropModal() { avatarCropModal.style.display = 'none'; cropImagePreview.src = ''; registerAvatarUpload.value = ''; }
    function saveCrop() {
        const img = cropImagePreview, wrapper = cropImageWrapper, container = cropContainer, scale = cropperState.scale, containerSize = container.offsetWidth;
        const canvas = document.createElement('canvas'); canvas.width = containerSize; canvas.height = containerSize; const ctx = canvas.getContext('2d');
        ctx.beginPath(); ctx.arc(containerSize / 2, containerSize / 2, containerSize / 2, 0, Math.PI * 2, true); ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, containerSize, containerSize);
        const wrapperWidth = wrapper.offsetWidth, wrapperHeight = wrapper.offsetHeight;
        const scaledImgXInWrapper = (wrapperWidth - wrapperWidth * scale) / 2, scaledImgYInWrapper = (wrapperHeight - wrapperHeight * scale) / 2;
        const finalImgX = cropperState.wrapperX + scaledImgXInWrapper, finalImgY = cropperState.wrapperY + scaledImgYInWrapper;
        const finalImgWidth = wrapperWidth * scale, finalImgHeight = wrapperHeight * scale;
        ctx.drawImage(img, finalImgX, finalImgY, finalImgWidth, finalImgHeight);
        const dataUrl = canvas.toDataURL('image/png');
        selectedAvatar = dataUrl;
        avatarPreview.src = dataUrl;
        avatarPreviewContainer.style.display = 'block';
        const current = avatarGallery.querySelector('.selected');
        if (current) current.classList.remove('selected');
        avatarGallery.firstChild.classList.add('selected');
        closeCropModal();
    }
    cropContainer.addEventListener('mousedown', (e) => { e.preventDefault(); cropperState.isDragging = true; cropperState.startX = e.clientX - cropperState.wrapperX; cropperState.startY = e.clientY - cropperState.wrapperY; });
    window.addEventListener('mousemove', (e) => { if (!cropperState.isDragging || avatarCropModal.style.display !== 'flex') return; e.preventDefault(); cropperState.wrapperX = e.clientX - cropperState.startX; cropperState.wrapperY = e.clientY - cropperState.startY; cropImageWrapper.style.left = `${cropperState.wrapperX}px`; cropImageWrapper.style.top = `${cropperState.wrapperY}px`; });
    window.addEventListener('mouseup', (e) => { if (!cropperState.isDragging) return; cropperState.isDragging = false; });
    cropContainer.addEventListener('touchstart', (e) => { const touch = e.touches[0]; cropperState.isDragging = true; cropperState.startX = touch.clientX - cropperState.wrapperX; cropperState.startY = touch.clientY - cropperState.wrapperY; }, { passive: true });
    window.addEventListener('touchmove', (e) => { if (!cropperState.isDragging || avatarCropModal.style.display !== 'flex') return; e.preventDefault(); const touch = e.touches[0]; cropperState.wrapperX = touch.clientX - cropperState.startX; cropperState.wrapperY = touch.clientY - cropperState.startY; cropImageWrapper.style.left = `${cropperState.wrapperX}px`; cropImageWrapper.style.top = `${cropperState.wrapperY}px`; }, { passive: false });
    window.addEventListener('touchend', (e) => { if (!cropperState.isDragging) return; cropperState.isDragging = false; });
    zoomSlider.addEventListener('input', (e) => { cropperState.scale = e.target.value / 100; cropImagePreview.style.transform = `scale(${cropperState.scale})`; });
    btnSaveCrop.addEventListener('click', saveCrop);
    btnCancelCrop.addEventListener('click', closeCropModal);
    registerAvatarUpload.addEventListener('change', (e) => { const file = e.target.files[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = function(evt) { openCropModal(evt.target.result); }; reader.readAsDataURL(file); } });
    
    (function init() {
        console.log('--- INICIANDO VERSIÓN CORREGIDA DEL SCRIPT (V3) ---');
        initCountries();
        const loggedInUser = localStorage.getItem('username');
        if (loggedInUser) {
            
            socket.connect();

            const user = {
                name: loggedInUser,
                avatar: localStorage.getItem('userAvatar')
            };
            document.getElementById('user-name').textContent = user.name;
            userAvatarEl.src = user.avatar || defaultAvatars[0];
            updateCreditsDisplay();
            body.classList.add('is-logged-in');
            lobbyOverlay.style.display = 'flex';
            // Se elimina la llamada incorrecta a showRoomsOverview() de aquí.
            setTimeout(scaleAndCenterLobby, 0);
            window.addEventListener('resize', scaleAndCenterLobby);
        } else {
            body.classList.remove('is-logged-in');
            lobbyOverlay.style.display = 'none';
            showLoginModal();
        }
    })();
})();
// --- FIN: SCRIPT DEL LOBBY ---


// --- INICIO: SCRIPT DEL JUEGO ---
(function() {

    socket.on('oponenteDescarto', (data) => {
        console.log(`El oponente (${data.playerId}) descartó la carta:`, data.card);
        discardPile.push(data.card);
        renderDiscard();
    });

    socket.on('playerSatDownToWait', (data) => {
        console.log('Un jugador se ha sentado para esperar. Actualizando vista de jugadores.');
        
        const newSeats = data.seats;
        updatePlayersView(newSeats, true); 

        // ▼ AÑADE ESTA LÍNEA ▼
        renderSpectatorList(data.spectators || []);

        showToast(`${data.waitingPlayerName} se sentará en la próxima partida.`, 3000);
    });

    socket.on('seatBecameAvailable', (data) => {
        // Solo reaccionamos si somos espectadores con intención de jugar.
        const isSpectator = !orderedSeats.some(s => s && s.playerId === socket.id);
        if (!isSpectator || spectatorMode !== 'wantsToPlay') {
            return;
        }

        // Comprobación de créditos
        const roomSettings = currentGameSettings.settings;
        const requiredCredits = (roomSettings.bet || 0) + (roomSettings.penalty || 0);
        const userCredits = parseInt(localStorage.getItem('userCredits')) || 0;

        if (userCredits < requiredCredits) {
            showToast(`Un asiento está libre, pero necesitas ${requiredCredits} créditos para unirte.`, 4000);
            return;
        }

        // Mostrar el modal de confirmación
        const modal = document.getElementById('sit-request-modal');
        const btnConfirm = document.getElementById('btn-confirm-sit');
        const btnDecline = document.getElementById('btn-decline-sit');

        btnConfirm.onclick = () => {
            socket.emit('requestToSit', data.roomId);
            modal.style.display = 'none';
        };
        btnDecline.onclick = () => {
            // El jugador elige no sentarse. Cambiamos su modo para no volver a preguntarle.
            spectatorMode = 'spectateOnly';
            showToast('De acuerdo, seguirás solo como espectador.', 3000);
            modal.style.display = 'none';
        };
        
        modal.style.display = 'flex';
    });

    // Versión definitiva de 'turnChanged'
    socket.on('turnChanged', (data) => {
        console.log('Server broadcast: El turno ha cambiado.', data);
    
        // 1. El cliente deja de esperar y actualiza su estado con los datos del servidor.
        isWaitingForNextTurn = false;
        
        // --- INICIO: Bloque para animar el descarte de oponentes ---
        if (data.discardingPlayerId && data.discardingPlayerId !== socket.id && data.discardedCard) {
            const playerViewIndex = orderedSeats.findIndex(s => s && s.playerId === data.discardingPlayerId);
            if (playerViewIndex !== -1) {
                const startElement = document.getElementById(`info-player${playerViewIndex}`);
                const endElement = document.getElementById('discard');
                if (startElement && endElement) {
                    animateCardMovement({
                        cardsData: [data.discardedCard],
                        startElement,
                        endElement,
                        isBack: false,
                        duration: 900 // <-- CAMBIA 600 POR 900
                    });
                }
            }
        }
        // --- FIN: Bloque para animar el descarte ---
        
        allMelds = data.newMelds || [];
        turnMelds = [];
        discardPile = data.newDiscardPile;

        // 2. Si el descarte fue mío, AHORA es cuando se elimina la carta de la mano.
        const humanPlayer = players[0];
        if (data.discardingPlayerId === socket.id && humanPlayer && data.discardedCard) {
            const cardIndex = humanPlayer.hand.findIndex(c => c.id === data.discardedCard.id);
            if (cardIndex !== -1) {
                humanPlayer.hand.splice(cardIndex, 1);
            }
            selectedCards.clear();
        }

        // 3. Se determina el siguiente jugador.
        const newCurrentPlayerIndex = orderedSeats.findIndex(s => s && s.playerId === data.nextPlayerId);
        if (newCurrentPlayerIndex !== -1) {
            currentPlayer = newCurrentPlayerIndex;
        }
        
        // 4. Se resetean los estados del turno.
        hasDrawn = false;
        mustDiscard = false;
        
        // 5. Se actualizan los contadores de cartas.
        if (data.playerHandCounts) {
            updatePlayerHandCounts(data.playerHandCounts);
        }

        // 6. Se renderiza TODA la interfaz con el nuevo estado oficial.
        renderHands();
        renderDiscard();
        updateTurnIndicator();
        updateActionButtons();
    
        // 7. Se muestra la notificación de turno.
        const newCurrentPlayerSeat = orderedSeats[currentPlayer];
        if (newCurrentPlayerSeat) {
            if (newCurrentPlayerSeat.playerId === socket.id) {
                showToast("¡Es tu turno!", 2500);
            } else {
                showToast(`Turno de ${newCurrentPlayerSeat.playerName}.`, 2000);
            }
        }
    });

    socket.on('cardDrawn', async (data) => {
        console.log("Carta recibida del servidor:", data.card);
        const p = players[0]; // El jugador humano siempre es el 0 en su vista
        if (!p) return;

        // Si el mazo se barajó, el servidor nos manda el nuevo descarte
        discardPile = data.newDiscardPile;
        // ▼▼▼ ELIMINA LA LÍNEA DE ABAJO ▼▼▼
        // await animateShuffleIfNeeded(data.newDeckSize); // Ya no es necesaria

        const deckEl = document.getElementById('deck');
        const handEl = document.getElementById('human-hand');
        
        await animateCardMovement({
            cardsData: [data.card],
            startElement: deckEl,
            endElement: handEl,
            isBack: true
        });

        p.hand.push(data.card);
        hasDrawn = true;
        isDrawing = false; // Permitir nuevas acciones
        drewFromDiscard = false;
        discardCardUsed = null;
        drewFromDeckToWin = false;
        
        renderHands();
        renderDiscard();
        updateActionButtons();
        showToast("Has robado del mazo.", 2000);
    });

    // AÑADE este nuevo listener para la confirmación del robo del descarte
    socket.on('discardCardDrawn', async (data) => {
        console.log("Carta del descarte recibida del servidor:", data.card);
        const p = players[0]; // Jugador humano
        if (!p) return;

        const discardEl = document.getElementById('discard');
        const handEl = document.getElementById('human-hand');

        // La animación se ejecuta antes de añadir la carta a la mano
        if (discardEl && handEl) {
            await animateCardMovement({ cardsData: [data.card], startElement: discardEl, endElement: handEl });
        }

        p.hand.push(data.card);
        discardPile = data.newDiscardPile; // Sincronizamos el descarte

        // Actualizamos el estado local AHORA que el servidor ha confirmado
        hasDrawn = true;
        isDrawing = false;
        drewFromDiscard = true;
        discardCardUsed = data.card;
        drewFromDeckToWin = false;

        renderHands();
        renderDiscard();
        updateActionButtons();
        showToast(`Has robado del descarte. Debes usar esta carta.`, 3500);
    });

    socket.on('handUpdate', (newHand) => {
        const p = players[0];
        if (p) {
            p.hand = newHand;
            selectedCards.clear();
            showToast("Tus combinaciones han sido devueltas a tu mano.", 3500);
            renderHands();
        }
    });

    socket.on('meldUpdate', (data) => {
        console.log("Actualización de jugada recibida del servidor:", data);
        allMelds = data.newMelds || [];
        turnMelds = data.turnMelds || [];

        if (data.playerHandCounts) {
            updatePlayerHandCounts(data.playerHandCounts);
        }

        // 1. Primero, renderizamos la mesa con el nuevo estado oficial.
        renderMelds();

        // 2. Ahora que la carta ya existe en el DOM, aplicamos el resaltado si es necesario.
        if (data.highlight) {
            const { cardId, meldIndex } = data.highlight;

            const meldGroupEl = document.querySelector(`.meld-group[data-meld-index='${meldIndex}']`);
            if (meldGroupEl) {
                const cardEl = meldGroupEl.querySelector(`.card[data-card-id='${cardId}']`);
                if (cardEl) {
                    cardEl.classList.add('highlight-add');
                    setTimeout(() => {
                        cardEl.classList.remove('highlight-add');
                    }, 4000); // <-- CAMBIA 3000 POR 4000 AQUÍ
                }
            }
        }
    });

    socket.on('playerEliminated', (data) => {
        console.log('Jugador eliminado:', data);
        showEliminationMessage(data.playerName, data.reason);

        // Actualiza el estado local del jugador
        const playerViewIndex = orderedSeats.findIndex(s => s && s.playerId === data.playerId);
        if (playerViewIndex !== -1) {
            const p = players[playerViewIndex];
            if (p) {
                p.active = false;
                p.hand = []; // <<-- CORRECCIÓN 1: Limpia los datos de la mano
            }
            const infoBotEl = document.getElementById(`info-player${playerViewIndex}`);
            if (infoBotEl) {
                const counterEl = infoBotEl.querySelector('.card-counter');
                if (counterEl) {
                    counterEl.textContent = '❌ Eliminado';
                }
            }

            // <<-- CORRECCIÓN 2: Si el eliminado es el jugador humano, limpia la vista de su mano
            if (playerViewIndex === 0) { // El jugador humano siempre es el índice 0 en su vista
                const humanHandEl = document.getElementById('human-hand');
                if (humanHandEl) {
                    humanHandEl.innerHTML = '';
                }
            }
        }
    });

    // ▼▼▼ REEMPLAZA TU LISTENER socket.on('gameEnd', ...) CON ESTE ▼▼▼
    socket.on('gameEnd', (data) => {
        console.log('PARTIDA FINALIZADA. Razón: Un jugador abandonó o alguien ganó.', data);
        
        resetClientGameState(); 

        if (data.finalRoomState) {
            updatePlayersView(data.finalRoomState.seats, true); 
            renderSpectatorList(data.finalRoomState.spectators || []);
        }

        const wasPlayerInGame = data.finalRoomState.seats.some(s => s && s.playerId === socket.id);
        const victoryOverlay = document.getElementById('victory-overlay');
        const victoryMessage = document.getElementById('victory-message');
        const finalScores = document.getElementById('final-scores');
        const setupRematchBtn = document.getElementById('btn-setup-rematch');
        const secondaryBtn = victoryOverlay.querySelector('.secondary');

        if (wasPlayerInGame) {
            // ▼▼▼ BLOQUE MODIFICADO: Mensaje de victoria dinámico ▼▼▼
            let victoryText = `🏆 ${data.winnerName} ha ganado!`;
            if (data.abandonment && data.abandonment.name) {
                victoryText += `<br><span style="font-size: 0.9rem; color: #ffdddd;">(Por abandono de ${data.abandonment.name})</span>`;
            }
            victoryMessage.innerHTML = victoryText;
            // ▲▲▲ FIN DEL BLOQUE MODIFICADO ▲▲▲

            try {
                finalScores.innerHTML = data.scoresHTML || '<p>La partida ha finalizado.</p>';
            } catch (e) {
                console.error("Error al renderizar el HTML de las puntuaciones:", e);
                finalScores.innerHTML = '<p>Error al mostrar puntuaciones.</p>';
            }
            finalScores.style.display = 'block';
            setupRematchBtn.style.display = 'inline-block';
            setupRematchBtn.onclick = setupRematchScreen;
            secondaryBtn.textContent = '🚪 Volver al Lobby';
            secondaryBtn.onclick = () => goBackToLobby();
        } else {
            victoryMessage.textContent = `La partida ha terminado`;
            finalScores.style.display = 'none';
            setupRematchBtn.style.display = 'none';
            secondaryBtn.textContent = 'Aceptar';
            secondaryBtn.onclick = () => hideOverlay('victory-overlay');
        }

        showOverlay('victory-overlay');
    });
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

    socket.on('handCountsUpdate', (data) => {
        console.log('Actualización de contadores recibida:', data);
        if (data.playerHandCounts) {
            updatePlayerHandCounts(data.playerHandCounts);
        }
    });

    socket.on('gameChat', (data) => {
        const chatWindow = document.getElementById('chat-window');
        const badge = document.getElementById('chat-notification-badge');
        
        // Si el chat no está visible, incrementa el contador
        if (chatWindow && !chatWindow.classList.contains('visible')) {
            unreadMessages++;
            badge.textContent = unreadMessages;
            badge.style.display = 'flex';
        }
        addChatMessage(data.sender, data.message, 'player');
    });

    socket.on('rematchUpdate', (data) => {
        const statusEl = document.getElementById('rematch-status');
        if (statusEl) {
            statusEl.innerHTML = `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #555;">
                                      <strong>Jugadores listos:</strong> ${data.playersReady.join(', ')}
                                   </div>`;
        }
        addChatMessage(null, `Jugadores listos: ${data.playersReady.join(', ')}`, 'system');

        // Lógica para mostrar/ocultar el botón de inicio
        const startButton = document.getElementById('btn-start-rematch');
        // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
        const mainButton = document.getElementById('btn-ready-main');

        // El botón solo aparece si: se puede iniciar Y el jugador actual es el host
        if (data.canStart && socket.id === data.hostId) {
            startButton.style.display = 'block';
            startButton.disabled = false; // <-- AÑADE ESTA LÍNEA AQUÍ
            // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
            mainButton.style.display = 'none'; // Ocultamos el botón de "Esperando..."

            startButton.onclick = () => {
                startButton.disabled = true; // Evitar doble clic
                socket.emit('startRematch', currentGameSettings.roomId);
            };
        } else {
            startButton.style.display = 'none';
        }
    });

    socket.on('rematchFailed', (data) => {
        showToast(data.reason, 4000);
        const btn = document.getElementById('victory-overlay').querySelector('button.new-game-btn');
        if (btn) {
            btn.textContent = 'No puedes continuar';
            btn.disabled = true;
        }
    });

    socket.on('meldSuccess', (data) => {
        const p = players[0]; // El jugador humano
        if (p && data.meldedCardIds) {
            // Elimina las cartas confirmadas por el servidor de la mano local
            p.hand = p.hand.filter(card => !data.meldedCardIds.includes(card.id));
            selectedCards.clear();
            
            // Si el servidor confirmó que se bajó un conjunto, el jugador ya cumplió los 51 puntos
            if (!p.doneFirstMeld) {
                p.doneFirstMeld = true;
            }
            
            renderHands(); // Vuelve a renderizar la mano ya actualizada
        }
    });

    socket.on('fault', (data) => {
        // Muestra el motivo del error enviado por el servidor
        showToast(`❌ Jugada inválida: ${data.reason}`, 4000);
        // Deseleccionamos las cartas para que el jugador pueda intentar otra jugada
        selectedCards.clear();
        renderHands();
    });

    socket.on('spectatorJoined', (data) => {
        // Lógica para mostrar la notificación en el icono del chat
        const chatWindow = document.getElementById('chat-window');
        const badge = document.getElementById('chat-notification-badge');
        if (chatWindow && !chatWindow.classList.contains('visible')) {
            unreadMessages++;
            badge.textContent = unreadMessages;
            badge.style.display = 'flex';
        }
        
        addChatMessage(null, `${data.name} ha entrado a la sala como espectador.`, 'system');
        renderSpectatorList(data.spectators);
    });

    socket.on('spectatorListUpdated', (data) => {
        renderSpectatorList(data.spectators);
    });

    socket.on('kickedFromRoom', (data) => {
        showToast(data.reason, 5000);
        goBackToLobby();
    });

    // ▼▼▼ AÑADE ESTE NUEVO LISTENER COMPLETO ▼▼▼
    socket.on('newHostAssigned', (data) => {
        if (currentGameSettings) {
            currentGameSettings.hostId = data.hostId;
        }
        showToast(`${data.hostName} es ahora el nuevo anfitrión.`, 3500);

        // ▼▼▼ AÑADE ESTE BLOQUE ▼▼▼
        // Si estamos en la pantalla de revancha, actualizamos la vista.
        const readyOverlay = document.getElementById('ready-overlay');
        if (readyOverlay.style.display === 'flex') {
            // Forzamos una actualización pidiendo al servidor el estado de la revancha.
            // Usamos el ID del jugador que ahora es el host para la solicitud.
            socket.emit('requestRematch', {
                roomId: currentGameSettings.roomId,
                credits: parseInt(localStorage.getItem('userCredits')) || 0
            });
        }
        // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲

        // Volvemos a renderizar los controles, por si el nuevo anfitrión soy yo
        // y ahora me debe aparecer el botón de "Iniciar Partida".
        renderGameControls();
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

    socket.on('playerDrewCard', (data) => {
        // No animar para mí, mi propia acción ya tiene una animación local
        if (data.playerId === socket.id) return;

        const playerViewIndex = orderedSeats.findIndex(s => s && s.playerId === data.playerId);
        if (playerViewIndex === -1) return;

        const startElement = document.getElementById(data.source); // 'deck' o 'discard'
        const endElement = document.getElementById(`info-player${playerViewIndex}`);

        if (startElement && endElement) {
            if (data.source === 'deck') {
                animateCardMovement({ startElement, endElement, isBack: true, duration: 900 }); // <-- CAMBIA 600 POR 900
            } else {
                // Para el descarte, animamos la carta específica
                animateCardMovement({ cardsData: [data.card], startElement, endElement, isBack: false, duration: 900 }); // <-- CAMBIA 600 POR 900
            }
        }
    });

    // ▼▼▼ AÑADE ESTE NUEVO LISTENER COMPLETO ▼▼▼
    socket.on('deckShuffled', () => {
        // Al recibir la notificación del servidor, todos los clientes ejecutan la animación.
        animateShuffle();
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

    socket.on('animateNewMeld', (data) => {
        if (data.melderId === socket.id) return;
        const playerViewIndex = orderedSeats.findIndex(s => s && s.playerId === data.melderId);
        if (playerViewIndex === -1) return;

        const startElement = document.getElementById(`info-player${playerViewIndex}`);
        const meldsContainer = document.getElementById('melds-display');

        if (startElement && meldsContainer) {
            // 1. Creamos un marcador de posición invisible al final de la lista de juegos.
            const placeholder = document.createElement('div');
            placeholder.className = 'meld-group';
            placeholder.style.visibility = 'hidden';
            meldsContainer.appendChild(placeholder);

            // 2. Animamos las cartas hacia ese marcador de posición.
            animateCardMovement({
                cardsData: data.cards,
                startElement,
                endElement: placeholder, // El destino es el marcador
                duration: 1200
            }).then(() => {
                // 3. Una vez termina la animación, eliminamos el marcador.
                // El juego real se dibujará con el evento 'meldUpdate'.
                // ▼▼▼ REEMPLAZA ESTA LÍNEA... ▼▼▼
                // meldsContainer.removeChild(placeholder);
                // ▲▲▲ ...CON ESTE BLOQUE MÁS SEGURO ▼▼▼
                if (meldsContainer.contains(placeholder)) {
                    meldsContainer.removeChild(placeholder);
                }
                // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲
            });
        }
    });

    // ▼▼▼ AÑADE ESTE NUEVO LISTENER COMPLETO ▼▼▼
    socket.on('playerAbandoned', (data) => {
        // Mostramos una notificación visual a todos.
        showToast(data.message, 5000);
        // Y también lo registramos en el chat del juego.
        addChatMessage(null, data.message, 'system');
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

    socket.on('animateCardAdd', (data) => {
        // No animar mi propia jugada, se anima localmente
        if (data.melderId === socket.id) return;

        const playerViewIndex = orderedSeats.findIndex(s => s && s.playerId === data.melderId);
        if (playerViewIndex === -1) return;

        const startElement = document.getElementById(`info-player${playerViewIndex}`);
        const endElement = document.querySelector(`.meld-group[data-meld-index='${data.targetMeldIndex}']`);

        if (startElement && endElement) {
            animateCardMovement({
                cardsData: [data.card],
                startElement,
                endElement,
                duration: 1000 // <-- CAMBIA 700 POR 1000
            }).then(() => {
                // Iluminar la combinación para todos
                endElement.classList.add('card-illuminated');
                setTimeout(() => {
                    endElement.classList.remove('card-illuminated');
                }, 2500); // La duración de la animación CSS
            });
        }
    });

    let currentGameSettings = {};
    let currentUser = {}; 
    let players = [];
    let gameStarted = false;
    let deck = [], discardPile = [], currentPlayer = 0, allMelds = [], turnMelds = []; // Añadir turnMelds
    let unreadMessages = 0;
    let isWaitingForNextTurn = false;
    let penaltyAmount, requiredMeld, hasDrawn, drewFromDiscard, discardCardUsed, mustDiscard, strictRules, drewFromDeckToWin, selectedCards, isDrawing;

    // ▼▼▼ AÑADE ESTE LISTENER COMPLETO ▼▼▼
    socket.on('resetForNewGame', (data) => {
        console.log('Recibida orden del servidor para resetear la UI para la nueva partida.');
        
        // 1. Limpiar completamente el contenido del chat.
        const chatMessagesInner = document.getElementById('chat-messages-inner');
        if (chatMessagesInner) {
            chatMessagesInner.innerHTML = '';
        }

        // 2. Añadir un mensaje de sistema al chat vacío.
        addChatMessage(null, 'Se ha iniciado una nueva partida. ¡Buena suerte!', 'system');

        // 3. Renderizar la lista de espectadores con los datos FRESCOS del servidor.
        // Esto elimina espectadores antiguos y muestra correctamente a los que se quedaron.
        renderSpectatorList(data.spectators || []);
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

    socket.on('gameStarted', (initialState) => {
        // ▼▼▼ AÑADE ESTA LÍNEA AQUÍ ▼▼▼
        // Forzamos la visibilidad de los botones de acción para TODOS al empezar una partida.
        document.querySelector('.player-actions').style.display = 'flex';
        // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲

        // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
        resetClientGameState(); // ¡Limpia todo ANTES de procesar la nueva partida!
        // --- FIN DE LA CORRECCIÓN DEFINITIVA ---

        console.log("Servidor ha iniciado la partida. Recibiendo estado:", initialState);
        
        document.getElementById('btn-start-rematch').style.display = 'none';

        hideOverlay('victory-overlay');
        hideOverlay('ready-overlay');
        document.getElementById('start-game-btn').style.display = 'none';
        
        gameStarted = true;
        allMelds = initialState.melds || [];
        turnMelds = [];
        selectedCards = new Set();
        isDrawing = false;
        
        updatePlayersView(initialState.seats, true);
        
        const myPlayerData = players.find(p => p && p.name === currentUser.name);
        if (myPlayerData) {
            myPlayerData.hand = initialState.hand;
        }
        
        discardPile = initialState.discardPile;
        
        const startingPlayer = initialState.seats.find(sp => sp && sp.playerId === initialState.currentPlayerId);
        if (startingPlayer) {
            currentPlayer = orderedSeats.findIndex(s => s && s.playerId === startingPlayer.playerId);
        } else {
            currentPlayer = 0;
        }
        
        if (myPlayerData && myPlayerData.hand.length === 15) {
            hasDrawn = true;
            mustDiscard = true;
            showToast("Empiezas tú. Tienes 15 cartas, solo puedes descartar.", 4000);
        } else {
            hasDrawn = false;
            mustDiscard = false;
        }

        if (initialState.playerHandCounts) {
            updatePlayerHandCounts(initialState.playerHandCounts);
        }

        setupPileTouchInteractions();
        setupMeldDropZone();
        
        animateDealing(initialState).then(() => {
            renderHands();
            updateTurnIndicator();
            updateActionButtons();
        });
    });

    socket.on('playerJoined', (roomData) => {
        console.log('Un jugador se ha unido a la sala:', roomData);
        currentGameSettings = { ...currentGameSettings, ...roomData };
        updatePlayersView(roomData.seats, false);
        renderGameControls();
    });

    socket.on('playerLeft', (roomData) => {
        console.log('Un jugador ha abandonado la sala:', roomData);
        currentGameSettings = { ...currentGameSettings, ...roomData };
        updatePlayersView(roomData.seats, gameStarted); // Pasamos el estado actual del juego
        renderGameControls();
        renderSpectatorList(roomData.spectators || []); // <<-- AÑADE ESTA LÍNEA
    });
    
    function resetClientGameState() {
        console.log('CLIENTE: Reseteando estado del juego para nueva partida.');

        gameStarted = false;
        players = [];
        orderedSeats = []; // <<-- ESTA ES LA LÍNEA QUE FALTABA Y SOLUCIONA TODO
        deck = [];
        discardPile = [];
        currentPlayer = 0;
        allMelds = [];
        turnMelds = [];
        unreadMessages = 0;
        isWaitingForNextTurn = false;

        hasDrawn = false;
        drewFromDiscard = false;
        discardCardUsed = null;
        mustDiscard = false;
        drewFromDeckToWin = false;
        isDrawing = false;
        if (selectedCards) selectedCards.clear();

        // El resto del código de limpieza que ya tenías
        document.getElementById('human-hand').innerHTML = '';
        document.getElementById('melds-display').innerHTML = '';
        document.getElementById('discard').innerHTML = 'Descarte<br>Vacío';
        document.getElementById('start-game-btn').style.display = 'none';

        hideOverlay('victory-overlay');

        const deckEl = document.getElementById('deck');
        const discardEl = document.getElementById('discard');
        if (deckEl) deckEl.onclick = null;
        if (discardEl) discardEl.onclick = null;

        for (let i = 0; i < 4; i++) {
            const playerInfoEl = document.getElementById(`info-player${i}`);
            if (playerInfoEl) {
                playerInfoEl.classList.remove('current-turn-glow');
                const playerNameEl = playerInfoEl.querySelector('.player-name');
                const playerAvatarEl = playerInfoEl.querySelector('.player-avatar');
                const playerCounterEl = playerInfoEl.querySelector('.card-counter');
                playerNameEl.textContent = "Asiento Vacío";
                playerAvatarEl.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                playerCounterEl.textContent = '';
            }
        }
    }
    // ▲▲▲ FIN DEL CÓDIGO DE REEMPLAZO ▲▲▲
    
    window.initializeGame = function(settings) {
        resetClientGameState(); // Esta línea ya la tenías, déjala como está
        currentGameSettings = settings;
        currentUser = {
            name: localStorage.getItem('username'),
            id: socket.id
        };

        // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
        const gameContainer = document.getElementById('game-container');

        const readyOverlay = document.getElementById('ready-overlay');
        const welcomeMsg = document.getElementById('welcome-message');
        const betInfo = document.getElementById('bet-info');
        const penaltyInfo = document.getElementById('penalty-info');
        const mainButton = document.getElementById('btn-ready-main');
        const spectatorButton = document.getElementById('btn-spectator-sit');

        // Ocultar elementos de revancha por si acaso
        document.getElementById('rematch-status').innerHTML = '';
        document.getElementById('btn-start-rematch').style.display = 'none';

        // Lógica condicional: ¿Es un espectador o un jugador?
        if (settings.isSpectator) {
            // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
            gameContainer.classList.add('spectator-view');

            gameStarted = true;
            updatePlayersView(settings.seats, true);
            allMelds = settings.melds || [];
            discardPile = settings.discardPile || [];
            renderMelds();
            renderDiscard();
            document.getElementById('human-hand').innerHTML = '';
            document.querySelector('.player-actions').style.display = 'none';

            if (spectatorMode === 'wantsToPlay') {
                // Muestra el modal SOLO si el espectador eligió "Unirse y Esperar".
                welcomeMsg.innerHTML = `Partida en curso.<br>Estás viendo como espectador.`;
                betInfo.textContent = `Apuesta: ${settings.settings.bet}`;
                penaltyInfo.textContent = `Multa: ${settings.settings.penalty}`;
                mainButton.style.display = 'none';
                spectatorButton.style.display = 'block';
                spectatorButton.disabled = false;
                spectatorButton.textContent = '✔️ Sentarse en la Próxima Partida';
                spectatorButton.onclick = () => {
                    socket.emit('requestToSit', settings.roomId);
                    hideOverlay('ready-overlay');
                };
                showOverlay('ready-overlay');
            } else {
                // Si el modo es 'spectateOnly', no mostramos ningún modal.
                hideOverlay('ready-overlay');
            }
            
        } else {
            // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
            gameContainer.classList.remove('spectator-view');

            // Lógica original para un jugador que se une a una mesa en espera
            console.log('Inicializando la vista de juego como JUGADOR.');
            gameStarted = false;
            welcomeMsg.textContent = `Bienvenido a la mesa de ${settings.settings.username}`;
            betInfo.textContent = `Apuesta: ${settings.settings.bet}`;
            penaltyInfo.textContent = `Multa: ${settings.settings.penalty}`;
            mainButton.style.display = 'block';
            spectatorButton.style.display = 'none';
            
            if (settings.isPractice) {
                mainButton.textContent = 'Empezar Práctica';
                mainButton.onclick = () => {
                    hideOverlay('ready-overlay');
                    // Esta parte necesita ser implementada o revisada
                    console.error("Lógica de práctica debe ser iniciada desde el servidor.");
                };
            } else {
                mainButton.textContent = 'Sentarse';
                mainButton.onclick = handleSitDown;
            }

            updatePlayersView(settings.seats, false);
            document.querySelector('.player-actions').style.display = 'flex';
            showOverlay('ready-overlay');
        }

        // Configuración común
        // ▼▼▼ AÑADE ESTE BLOQUE AL FINAL DE LA FUNCIÓN initializeGame ▼▼▼
        // FORZAR REINICIO DEL CHAT:
        // Esto garantiza que el chat siempre esté en su estado inicial (oculto y limpio)
        // al entrar a una sala, solucionando el bloqueo al salir y volver a entrar.
        const chatWindow = document.getElementById('chat-window');
        const chatMessagesInner = document.getElementById('chat-messages-inner');
        if (chatWindow) {
            chatWindow.classList.remove('visible'); // Asegurarse de que empieza oculto
        }
        if (chatMessagesInner) {
            chatMessagesInner.innerHTML = ''; // Limpiar mensajes anteriores
        }
        // ▲▲▲ FIN DEL BLOQUE AÑADIDO ▲▲▲

        setupChat();
        document.getElementById('melds-display').innerHTML = '';
        renderDiscard();
        setupInGameLeaveButton();
        renderSpectatorList(settings.spectators || []); // <<-- AÑADE ESTA LÍNEA
    }

    function setupInGameLeaveButton() {
        const leaveButton = document.getElementById('btn-back-to-lobby-ingame');
        const modal = document.getElementById('confirm-leave-modal');
        const messageEl = document.getElementById('confirm-leave-message');
        const confirmBtn = document.getElementById('btn-confirm-leave-yes');
        const cancelBtn = document.getElementById('btn-confirm-leave-no');

        if (!leaveButton || !modal) return;

        leaveButton.onclick = () => {
            const isActivePlayer = orderedSeats.some(s => s && s.playerId === socket.id && s.active !== false && s.status !== 'waiting');
            if (isActivePlayer) {
                messageEl.innerHTML = '¿Estás seguro de que quieres volver al lobby? <br><strong style="color: #ff4444;">Se contará como una derrota y pagarás la apuesta y la multa.</strong>';
            } else {
                messageEl.textContent = '¿Estás seguro de que quieres volver al lobby?';
            }
            modal.style.display = 'flex';
        };

        confirmBtn.onclick = () => {
            // ▼ REEMPLAZA ESTA LÍNEA... ▼
            // socket.emit('leaveGame', { roomId: currentGameSettings.roomId });
            // ▼ ...CON ESTA LÍNEA ▼
            goBackToLobby();
            modal.style.display = 'none';
        };

        cancelBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    function renderSpectatorList(spectators = []) {
        const listContainer = document.getElementById('spectators-list-host');
        if (!listContainer) return;
        listContainer.innerHTML = ''; // Limpiar la lista anterior.

        if (spectators && spectators.length > 0) {
            const isHost = socket.id === currentGameSettings.hostId;
            const title = document.createElement('div');
            title.className = 'spectator-list-title';
            title.textContent = `Espectadores (${spectators.length}):`;
            listContainer.appendChild(title);

            spectators.forEach(spec => {
                if (!spec) return; // Añadido para seguridad
                const item = document.createElement('div');
                item.className = 'spectator-item';
                item.textContent = spec.name;

                // El anfitrión puede expulsar a cualquier espectador excepto a sí mismo
                if (isHost && spec.id !== socket.id) {
                    const kickBtn = document.createElement('button');
                    kickBtn.className = 'kick-btn';
                    kickBtn.textContent = 'Expulsar';
                    kickBtn.onclick = () => {
                        socket.emit('kickSpectator', {
                            roomId: currentGameSettings.roomId,
                            spectatorId: spec.id
                        });
                    };
                    item.appendChild(kickBtn);
                }
                listContainer.appendChild(item);
            });
        }
    }
    
    function handleSitDown() {
        hideOverlay('ready-overlay');
        renderGameControls();
    }
    
    function renderGameControls() {
        const startGameBtn = document.getElementById('start-game-btn');
        const isHost = currentGameSettings.hostId === currentUser.id;

        if (isHost && !gameStarted) {
            startGameBtn.style.display = 'block';
            const playerCount = currentGameSettings.seats.filter(s => s !== null).length;
            
            startGameBtn.disabled = playerCount < 2;

            if (playerCount < 2) {
                startGameBtn.title = "Se necesitan al menos 2 jugadores para empezar.";
            } else {
                startGameBtn.title = "Iniciar la partida.";
            }

            startGameBtn.onclick = () => {
                console.log("Host iniciando la partida...");
                socket.emit('startGame', currentGameSettings.roomId);
            };
        } else {
            startGameBtn.style.display = 'none';
        }
    }

    let orderedSeats = [];

// ▼▼▼ REEMPLAZA LA FUNCIÓN updatePlayersView ENTERA CON ESTE CÓDIGO ORIGINAL ▼▼▼
function updatePlayersView(seats, inGame = false) {
    // --- INICIO DE LA LÓGICA DE CORRECCIÓN DEFINITIVA ---

    // 1. Encontrar mi propio índice en los asientos del servidor.
    // Si soy espectador (myIndex === -1), uso la vista del anfitrión (asiento 0).
    let myIndex = seats.findIndex(s => s && s.playerId === socket.id);
    if (myIndex === -1) {
        myIndex = 0;
    }

    // 2. Rotar los asientos para que mi vista siempre me ponga en la parte inferior.
    orderedSeats = seats.slice(myIndex).concat(seats.slice(0, myIndex));
    
    // 3. Crear un array de jugadores FRESCO. NO reutilizamos datos viejos.
    const newPlayers = [];
    const myCurrentHand = (players && players[0]) ? players[0].hand : []; // Salvamos la mano actual del jugador humano.

    for (let i = 0; i < 4; i++) {
        const seat = orderedSeats[i];
        const playerInfoEl = document.getElementById(`info-player${i}`);
        if (!playerInfoEl) continue;

        const playerNameEl = playerInfoEl.querySelector('.player-name');
        const playerAvatarEl = playerInfoEl.querySelector('.player-avatar');
        const playerCounterEl = playerInfoEl.querySelector('.card-counter');
        const playerDetailsEl = playerInfoEl.querySelector('.player-details');

        // Limpieza de botones de "Sentarse" residuales para evitar duplicados.
        const oldSitBtn = playerDetailsEl.querySelector('.sit-down-btn');
        if (oldSitBtn) oldSitBtn.remove();
        
        if (seat) {
            // --- LÓGICA PARA UN ASIENTO OCUPADO ---
            playerInfoEl.classList.remove('empty-seat');
            playerInfoEl.style.visibility = 'visible';
            playerNameEl.textContent = seat.playerName;
            playerAvatarEl.src = seat.avatar || 'https://i.pravatar.cc/150?img=1';
            playerInfoEl.classList.remove('player-waiting');

            if (seat.status === 'waiting') {
                playerCounterEl.textContent = '';
                playerInfoEl.classList.add('player-waiting');
            } else {
                playerCounterEl.textContent = gameStarted ? '' : 'Listo';
            }

            // Se crea el objeto de jugador desde cero.
            const playerObject = {
                name: seat.playerName,
                hand: [], // La mano se asignará después si es el jugador local.
                isBot: false,
                active: seat.active !== false
            };

            // Si este asiento corresponde al jugador local, le asignamos su mano.
            if (i === 0) {
                playerObject.hand = myCurrentHand;
            }
            newPlayers[i] = playerObject;
            
        } else {
            // --- LÓGICA PARA UN ASIENTO VACÍO ---
            playerInfoEl.style.visibility = 'visible';
            playerInfoEl.classList.add('empty-seat');
            playerInfoEl.classList.remove('player-waiting');
            playerNameEl.textContent = "Asiento Vacío";
            playerAvatarEl.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            playerCounterEl.innerHTML = '';
            newPlayers[i] = null;

            // Lógica para que un espectador vea el botón de "Sentarse"
            const isSpectator = !seats.some(s => s && s.playerId === socket.id);
            if (isSpectator) {
                const requiredCredits = (currentGameSettings.settings.bet || 0) + (currentGameSettings.settings.penalty || 0);
                const userCredits = parseInt(localStorage.getItem('userCredits')) || 0;
                const canAfford = userCredits >= requiredCredits;

                const sitDownBtn = document.createElement('button');
                sitDownBtn.className = 'sit-down-btn';
                sitDownBtn.textContent = 'Sentarse';
                sitDownBtn.disabled = !canAfford;
                sitDownBtn.title = !canAfford ? `Necesitas ${requiredCredits} créditos` : 'Sentarse para la próxima partida';
                
                sitDownBtn.onclick = () => {
                    if (canAfford) {
                        socket.emit('requestToSit', currentGameSettings.roomId);
                        sitDownBtn.disabled = true;
                        sitDownBtn.textContent = 'Reservado';
                    } else {
                        showToast(`No tienes créditos suficientes. Necesitas ${requiredCredits}.`, 3000);
                    }
                };
                playerDetailsEl.appendChild(sitDownBtn);
            }
        }
    }

    // 4. Reemplazamos la lista de jugadores vieja con la nueva, totalmente sincronizada.
    players = newPlayers;
}
// ▲▲▲ FIN DEL CÓDIGO DE REEMPLAZO ▲▲▲
    
    async function animateDealing(initialState) {
        const deckEl = document.getElementById('deck');
        const seatedPlayers = initialState.seats.filter(s => s !== null);

        for (let i = 0; i < 14; i++) {
            for (const seat of seatedPlayers) {
                const playerViewIndex = orderedSeats.findIndex(os => os && os.playerId === seat.playerId);
                if (playerViewIndex !== -1) {
                    const playerInfoEl = document.getElementById(`info-player${playerViewIndex}`);
                    await animateCardMovement({
                        startElement: deckEl,
                        endElement: playerInfoEl,
                        isBack: true,
                        duration: 80
                    });
                }
            }
        }
        
        const startingPlayerId = initialState.currentPlayerId;
        const startingPlayerViewIndex = orderedSeats.findIndex(os => os && os.playerId === startingPlayerId);
        if (startingPlayerViewIndex !== -1) {
             const playerInfoEl = document.getElementById(`info-player${startingPlayerViewIndex}`);
             await animateCardMovement({
                startElement: deckEl,
                endElement: playerInfoEl,
                isBack: true,
                duration: 80
             });
        }
        
        showToast("¡Repartiendo cartas!", 1500);
        await new Promise(r => setTimeout(r, 500));
    }


    function setupPileTouchInteractions() {
        const deckEl = document.getElementById('deck');
        const discardEl = document.getElementById('discard');

        // Limpiar manejadores para evitar duplicados
        deckEl.onclick = null;
        deckEl.ontouchend = null;
        discardEl.onclick = null;
        discardEl.ontouchend = null;

        // Manejador unificado simple
        const handleInteraction = (action) => (event) => {
            event.preventDefault(); // Prevenir comportamientos por defecto (zoom, clic fantasma)
            event.stopPropagation(); // Detener el evento aquí para que no interfiera con otros
            action();
        };

        // Lógica para el Mazo
        const deckAction = () => {
            if (currentPlayer !== 0 || !gameStarted || hasDrawn || mustDiscard) return;
            drawFromDeck();
        };

        // Lógica para el Descarte
        const discardAction = () => {
            if (currentPlayer !== 0 || !gameStarted) return;
            if (hasDrawn || mustDiscard) {
                attemptDiscard();
            } else {
                drawFromDiscard();
            }
        };

        // Asignar los listeners
        deckEl.addEventListener('click', handleInteraction(deckAction));
        deckEl.addEventListener('touchend', handleInteraction(deckAction));

        discardEl.addEventListener('click', handleInteraction(discardAction));
        discardEl.addEventListener('touchend', handleInteraction(discardAction));
    }

    // ▼▼▼ REEMPLAZA LA FUNCIÓN goBackToLobby CON ESTA ▼▼▼
    window.goBackToLobby = function() {
        // 1. Notificamos al servidor que estamos saliendo (para que limpie la sala).
        // Esto es "fire and forget", no esperamos respuesta.
        if (currentGameSettings && currentGameSettings.roomId) {
            console.log('Notificando al servidor la salida de la sala...');
            socket.emit('leaveGame', { roomId: currentGameSettings.roomId });
        }

        // 2. Reseteamos el estado del cliente y volvemos al lobby INMEDIATAMENTE.
        // Esto hace que la acción sea instantánea, igual que cerrar la pestaña.
        console.log('Volviendo al lobby AHORA.');
        resetClientGameState();
        showLobbyView();
    }
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

    function getCardImageUrl(card) {
        if (!card || !card.value || !card.suit) {
            return 'https://deckofcardsapi.com/static/img/back.png'; 
        }
        const valueMap = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '0', 'J': 'J', 'Q': 'Q', 'K': 'K' };
        const suitMap = { 'hearts': 'H', 'diamonds': 'D', 'clubs': 'C', 'spades': 'S' };
        const value = valueMap[card.value];
        const suit = suitMap[card.suit];
        if (!value || !suit) {
            return 'https://deckofcardsapi.com/static/img/back.png';
        }
        return `https://deckofcardsapi.com/static/img/${value}${suit}.png`;
    }

    function setupChat() {
        const rulesBtn = document.getElementById('game-rules-btn');
        const rulesModal = document.getElementById('rules-modal');
        if (rulesBtn && rulesModal) {
            rulesBtn.addEventListener('click', () => {
                rulesModal.style.display = 'flex';
            });
        }
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const chatWindow = document.getElementById('chat-window');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');
        const chatUiContent = document.getElementById('chat-ui-content');

        toggleBtn.addEventListener('click', () => {
            chatWindow.classList.toggle('visible');
            if (chatWindow.classList.contains('visible')) {
                unreadMessages = 0;
                const badge = document.getElementById('chat-notification-badge');
                badge.style.display = 'none';
                
                input.focus();
                const messagesContainer = document.getElementById('chat-messages');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
        const sendMessage = () => {
            const message = input.value.trim();
            if (message && currentGameSettings.roomId) {
                socket.emit('sendGameChat', {
                    roomId: currentGameSettings.roomId,
                    message: message,
                    sender: currentUser.name
                });
                input.value = '';
            }
        };
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

        chatUiContent.innerHTML = '';
        if (currentUser.role === 'spectator') {
            const sitDownArea = document.createElement('div');
            sitDownArea.id = 'spectator-controls';
            sitDownArea.innerHTML = `<button id="sit-down-btn">Sentarse en la próxima partida</button>`;
            chatUiContent.appendChild(sitDownArea);
            document.getElementById('sit-down-btn').addEventListener('click', () => {
                const credits = 500;
                if (credits >= currentGameSettings.bet + currentGameSettings.penalty) {
                    showToast("Te has sentado. Esperando a la siguiente partida...", 3000);
                } else { showToast("No tienes créditos suficientes para sentarte.", 3000); }
            });
        } else if (currentUser.role === 'host') { renderSpectatorListForHost(); }
        addChatMessage(null, `Bienvenido a la mesa de ${currentGameSettings.settings.username}.`, 'system');
    }
    function addChatMessage(sender, message, role) {
        const messagesInner = document.getElementById('chat-messages-inner');
        const li = document.createElement('li');
        li.classList.add(role);
        li.innerHTML = (role === 'system') ? message : `<span class="sender">${sender}</span>${message}`;
        messagesInner.appendChild(li);
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    function renderSpectatorListForHost() { }
    // Versión definitiva de discardCardByIndex
    async function discardCardByIndex(index) {
        if (isWaitingForNextTurn) return;
        const p = players[0];
        if (!p) return;

        const cardToDiscard = p.hand[index];

        // 1. Emitir la acción al servidor.
        socket.emit('accionDescartar', { 
            roomId: currentGameSettings.roomId, 
            card: cardToDiscard 
        });

        // 2. Bloquear la UI y animar.
        isWaitingForNextTurn = true;
        updateActionButtons();

        const cardEl = document.querySelector(`#human-hand .card[data-index='${index}']`);
        const discardEl = document.getElementById('discard');
        if (cardEl && discardEl) {
            // La animación ahora es solo un efecto visual, no esperamos a que termine.
            animateCardMovement({ cardsData: [cardToDiscard], startElement: cardEl, endElement: discardEl });
        }

        // IMPORTANTE: No se modifica la mano ni se renderiza nada aquí.
        // Solo esperamos la respuesta del servidor.
    }
    
    function updatePlayerHandCounts(playerHandCounts) {
        // Actualiza los contadores de cartas de todos los jugadores en tiempo real
        for (let i = 0; i < 4; i++) {
            const playerInSeat = orderedSeats[i];
            if (playerInSeat && playerHandCounts[playerInSeat.playerId] !== undefined) {
                const counterEl = document.getElementById(`info-player${i}`)?.querySelector('.card-counter');
                if (counterEl && !counterEl.textContent.includes('❌ Eliminado')) {
                    const count = playerHandCounts[playerInSeat.playerId];
                    counterEl.textContent = `🂠 ${count}`;
                }
            }
        }
    }
    
    function renderHands() {
        const human = document.getElementById('human-hand');
        human.innerHTML = '';
        const humanPlayer = players[0]; // Jugador local (puede ser espectador con mano vacía)

        // Si no hay un jugador local o la partida no ha comenzado, no hay mano que renderizar.
        // Esto es especialmente importante para la vista del espectador.
        if (!humanPlayer || !gameStarted || !humanPlayer.hand) {
            // Nos aseguramos de que otras partes de la UI se refresquen, pero no se renderizan cartas.
            renderDiscard();
            renderMelds();
            updateActionButtons();
            updateDebugInfo();
            return;
        }
      
      const fragment = document.createDocumentFragment();
      humanPlayer.hand.forEach((card, idx) => {
        // << --- REEMPLAZA EL CONTENIDO DEL BUCLE forEach CON ESTO --- >>

        const d = document.createElement('div');
        d.className = 'card';
        if (selectedCards.has(card.id)) {
            d.classList.add('selected');
        }
        d.setAttribute('draggable', true);
        d.dataset.index = idx;
        d.dataset.cardId = card.id;
        d.innerHTML = `<img src="${getCardImageUrl(card)}" alt="${getSuitName(card.suit)}" style="width: 100%; height: 100%; border-radius: inherit; display: block;">`;

        let longPressTimer;

        // --- Lógica Original de Arrastre (Funciona en PC y Móvil) ---

        const startDrag = (e) => {
            // Determina qué cartas se están arrastrando (una o un grupo seleccionado)
            const selectedElements = document.querySelectorAll('#human-hand .card.selected');
            const isGroupDrag = selectedElements.length > 1 && d.classList.contains('selected');
            let indicesToDrag = isGroupDrag ? Array.from(selectedElements).map(el => parseInt(el.dataset.index)) : [idx];
            const dataToTransfer = JSON.stringify(indicesToDrag);

            // Para el arrastre en PC, se usa dataTransfer
            if (e.type === 'dragstart') {
                e.dataTransfer.setData('application/json', dataToTransfer);
                
                // Crea una imagen customizada para el arrastre de grupo en PC
                let dragImageContainer = document.createElement('div');
                dragImageContainer.style.position = 'absolute';
                dragImageContainer.style.left = '-1000px'; // Fuera de la pantalla
                if (isGroupDrag) {
                    dragImageContainer.style.display = 'flex';
                    selectedElements.forEach((selectedCard, index) => {
                        const clone = selectedCard.cloneNode(true);
                        clone.classList.remove('selected');
                        if (index > 0) clone.style.marginLeft = '-35px'; // Superponer
                        dragImageContainer.appendChild(clone);
                    });
                } else {
                    const clone = d.cloneNode(true);
                    clone.classList.remove('selected');
                    dragImageContainer.appendChild(clone);
                }
                document.body.appendChild(dragImageContainer);
                e.dataTransfer.setDragImage(dragImageContainer, 35, 52.5);
                setTimeout(() => document.body.removeChild(dragImageContainer), 0);
            }

            // Añade la clase 'dragging' para el efecto visual
            setTimeout(() => {
                indicesToDrag.forEach(i => {
                    const cardEl = document.querySelector(`#human-hand .card[data-index='${i}']`);
                    if (cardEl) cardEl.classList.add('dragging');
                });
            }, 0);

            return dataToTransfer; // Devuelve los datos para el manejador táctil
        };

        const endDrag = () => {
            clearTimeout(longPressTimer);
            document.querySelectorAll('#human-hand .card.dragging').forEach(c => c.classList.remove('dragging'));
        };

        // --- Lógica de Touch (Móvil) ---

        // Esta es la función clave del archivo original que faltaba
        const handleTouchDrag = (initialTouch, dragData) => {
            const cloneContainer = document.getElementById('drag-clone-container');
            cloneContainer.innerHTML = ''; // Limpiar clones anteriores

            const indices = JSON.parse(dragData);
            const selectedElements = indices.map(i => document.querySelector(`#human-hand .card[data-index='${i}']`));
            
            const dragImage = document.createElement('div');
            dragImage.className = 'drag-clone-visual';
            dragImage.style.display = 'flex';

            selectedElements.forEach((el, i) => {
                if (!el) return;
                const clone = el.cloneNode(true);
                clone.classList.remove('selected', 'dragging');
                clone.style.transform = '';
                if (i > 0) clone.style.marginLeft = `-${clone.offsetWidth / 2}px`;
                dragImage.appendChild(clone);
            });

            cloneContainer.appendChild(dragImage);
            const offsetX = dragImage.offsetWidth / 2;
            const offsetY = dragImage.offsetHeight / 2;

            const updatePosition = (touch) => {
                cloneContainer.style.transform = `translate(${touch.clientX - offsetX}px, ${touch.clientY - offsetY}px)`;
            };
            updatePosition(initialTouch);

            let lastTarget = null;
            const dropTargets = [...document.querySelectorAll('#human-hand .card'), document.getElementById('discard'), ...document.querySelectorAll('.meld-group'), document.querySelector('.center-area')];

            const onTouchMove = (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                updatePosition(touch);

                cloneContainer.style.display = 'none';
                const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                cloneContainer.style.display = 'block';
                
                let currentTarget = elementUnder ? dropTargets.find(dt => dt.contains(elementUnder)) : null;

                if (lastTarget && lastTarget !== currentTarget) lastTarget.classList.remove('drag-over', 'drop-zone');
                if (currentTarget && currentTarget !== lastTarget) {
                    const className = currentTarget.classList.contains('card') ? 'drag-over' : 'drop-zone';
                    currentTarget.classList.add(className);
                }
                lastTarget = currentTarget;
            };

            const onTouchEnd = (e) => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                cloneContainer.innerHTML = '';
                
                if (lastTarget) lastTarget.classList.remove('drag-over', 'drop-zone');
                
                document.querySelectorAll('#human-hand .card.dragging').forEach(c => c.classList.remove('dragging'));

                try {
                    const droppedIndices = JSON.parse(dragData);
                    if (!lastTarget) return;

                    if (lastTarget.classList.contains('card')) {
                        reorderHand(droppedIndices, parseInt(lastTarget.dataset.index));
                    } else if (lastTarget.id === 'discard') {
                        if (droppedIndices.length !== 1) { showToast('Solo puedes descartar una carta a la vez.', 2000); return; }
                        if (canDiscardByDrag()) discardCardByIndex(droppedIndices[0]);
                    } else if (lastTarget.classList.contains('center-area')) {
                         if (droppedIndices.length >= 3) {
                             const p = players[0];
                             const cardIds = droppedIndices.map(index => p.hand[index]?.id).filter(Boolean);
                             if (cardIds.length === droppedIndices.length) {
                                 socket.emit('meldAction', { roomId: currentGameSettings.roomId, cardIds: cardIds });
                             }
                         } else {
                             showToast("Arrastra un grupo de 3 o más cartas para bajar.", 2000);
                         }
                    } else if (lastTarget.classList.contains('meld-group')) {
                        if (droppedIndices.length === 1) attemptAddCardToMeld(droppedIndices[0], parseInt(lastTarget.dataset.meldIndex));
                        else showToast("Arrastra solo una carta para añadir a una combinación existente.", 2500);
                    }
                } catch(err) {
                    console.error("Error en touch end:", err);
                    renderHands(); // Reset en caso de error
                }
            };
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        };


        // --- Asignación de Eventos (Como en el original) ---

        d.addEventListener('click', () => {
            if (selectedCards.has(card.id)) {
                selectedCards.delete(card.id);
                d.classList.remove('selected');
            } else {
                selectedCards.add(card.id);
                d.classList.add('selected');
            }
            updateActionButtons();
        });

        d.addEventListener('dragstart', startDrag);
        d.addEventListener('dragend', endDrag);

        d.addEventListener('touchstart', (e) => {
            // Iniciar un temporizador para el "toque largo"
            longPressTimer = setTimeout(() => {
                e.preventDefault(); // Previene scroll solo si es un toque largo
                const dragData = startDrag(e);
                handleTouchDrag(e.touches[0], dragData);
            }, 200);
        }, { passive: false });

        d.addEventListener('touchend', () => {
            clearTimeout(longPressTimer); // Si el dedo se levanta rápido, es un clic, no un arrastre
        });
        d.addEventListener('touchcancel', () => {
            clearTimeout(longPressTimer);
        });


        // Eventos de Drop (comunes para PC y Móvil simulado)
        d.addEventListener('dragover', (e) => {
            e.preventDefault();
            d.classList.add('drag-over');
        });
        d.addEventListener('dragleave', () => d.classList.remove('drag-over'));

        d.addEventListener('drop', (e) => {
            e.preventDefault();
            d.classList.remove('drag-over');
            try {
                const droppedIndices = JSON.parse(e.dataTransfer.getData('application/json'));
                reorderHand(droppedIndices, idx);
            } catch (error) {
                console.error("Error al soltar la carta (drop):", error);
                renderHands();
            }
        });

        fragment.appendChild(d);
    });
    
    human.appendChild(fragment);
    renderDiscard();
    renderMelds();
    updateActionButtons();
    updateDebugInfo();
}
    function reorderHand(draggedIndices, targetDropIndex) {
        const player = players[0];
        if (!player || draggedIndices.includes(targetDropIndex)) {
            renderHands();
            return;
        }
        const sortedDraggedIndices = [...draggedIndices].sort((a, b) => a - b);
        const draggedCards = sortedDraggedIndices.map(index => player.hand[index]);
        const remainingHand = player.hand.filter((_, index) => !sortedDraggedIndices.includes(index));
        const itemsRemovedBeforeTarget = sortedDraggedIndices.filter(i => i < targetDropIndex).length;
        remainingHand.splice(targetDropIndex - itemsRemovedBeforeTarget, 0, ...draggedCards);
        player.hand = remainingHand;
        selectedCards.clear();
        renderHands();
    }
    function renderDiscard() {
      const pile = document.getElementById('discard');
      pile.ondragover = (e) => { e.preventDefault(); if (canDiscardByDrag()) pile.classList.add('drop-zone'); };
      pile.ondragleave = () => pile.classList.remove('drop-zone');
      pile.ondrop = (e) => {
        if (isWaitingForNextTurn) return;
        e.preventDefault(); pile.classList.remove('drop-zone');
        try {
            const indices = JSON.parse(e.dataTransfer.getData('application/json'));
            if (indices.length !== 1) { showToast('Solo puedes descartar una carta a la vez.', 2000); return; }
            if (canDiscardByDrag()) discardCardByIndex(indices[0]);
        } catch(err) { console.error("Error en drop de descarte:", err); }
      };
      if (discardPile.length > 0) {
        const top = discardPile[discardPile.length-1];
        pile.innerHTML = `<div class="card-image-wrapper"><img src="${getCardImageUrl(top)}" alt="${top.value} of ${getSuitName(top.suit)}" style="width: 100%; height: 100%; border-radius: inherit;"></div>`;
      } else { pile.innerHTML = 'Descarte<br>Vacío'; }
    }
    function renderMelds() {
        const display = document.getElementById('melds-display');
        display.innerHTML = '';
        
        // Unimos las combinaciones permanentes y las temporales del turno actual para dibujarlas todas
        const combinedMelds = [...allMelds, ...turnMelds];

        combinedMelds.forEach(meld => {
            const g = document.createElement('div');
            g.className = 'meld-group';

            // Añadimos una clase especial si la combinación es temporal para poder darle un estilo diferente
            if (turnMelds.includes(meld)) {
                g.classList.add('temporary-meld');
            }

            // El 'drop' para añadir cartas solo debe funcionar en combinaciones permanentes
            const permanentIndex = allMelds.indexOf(meld);
            if (permanentIndex !== -1) {
                g.dataset.meldIndex = permanentIndex;
        g.ondragover = (e) => { e.preventDefault(); g.classList.add('drop-zone'); };
        g.ondragleave = () => g.classList.remove('drop-zone');
        g.ondrop = (e) => {
            if (isWaitingForNextTurn) return;
            e.preventDefault(); g.classList.remove('drop-zone');
            try {
                const cardIndices = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (cardIndices.length === 1) attemptAddCardToMeld(cardIndices[0], permanentIndex);
                else showToast("Arrastra solo una carta para añadir a una combinación existente.", 2500);
            } catch(err) { console.error("Error al añadir carta a combinación:", err); }
        };
        const handleMeldGroupClick = (event) => {
            event.preventDefault();
            if (currentPlayer !== 0 || !gameStarted) return;
            const selected = document.querySelectorAll('#human-hand .card.selected');
            if (selected.length === 1) {
                        attemptAddCardToMeld(parseInt(selected[0].dataset.index), permanentIndex);
            }
        };
        g.addEventListener('click', handleMeldGroupClick);
            }
            
        for (let c of meld.cards) {
                const cd = document.createElement('div');
                cd.className = `card`;
            cd.dataset.cardId = c.id;
            cd.innerHTML = `<img src="${getCardImageUrl(c)}" alt="${c.value} of ${getSuitName(c.suit)}" style="width: 100%; height: 100%; border-radius: inherit; display: block;">`;
            g.appendChild(cd);
        }
        display.appendChild(g);
        });
    }
    function animateCardMovement({
        cardsData = [],
        startElement,
        endElement,
        isBack = false,
        duration = 1200, // <<-- Duración por defecto aumentada para más realismo
        rotation = 5
    }) {
        return new Promise(resolve => {
            if (!startElement || !endElement) {
                return resolve();
            }
            const startRect = startElement.getBoundingClientRect();
            const endRect = endElement.getBoundingClientRect();
            const animContainer = document.createElement('div');
            animContainer.className = 'animated-card-container';
            animContainer.style.display = 'flex';
            animContainer.style.transform = `rotate(${Math.random() * rotation * 2 - rotation}deg)`;
            const cardWidth = 90;
            const cardHeight = 135;
            const cardCount = cardsData.length || 1;
            for(let i=0; i < cardCount; i++) {
                const cardData = cardsData[i];
                const innerCard = document.createElement('div');
                innerCard.className = 'card';
                innerCard.style.width = `${cardWidth}px`;
                innerCard.style.height = `${cardHeight}px`;
                if (isBack) {
                    innerCard.classList.add('card-back');
                } else if (cardData) {
                    innerCard.innerHTML = `<img src="${getCardImageUrl(cardData)}" alt="${cardData.value}" style="width: 100%; height: 100%; border-radius: inherit; display: block;">`;
                }
                if (i > 0) {
                    innerCard.style.marginLeft = `-${cardWidth / 2}px`;
                }
                animContainer.appendChild(innerCard);
            }
            const totalAnimWidth = cardWidth + (cardCount - 1) * (cardWidth / 2);
            animContainer.style.left = `${startRect.left + (startRect.width / 2) - (totalAnimWidth / 2)}px`;
            animContainer.style.top = `${startRect.top + (startRect.height / 2) - (cardHeight / 2)}px`;
            document.body.appendChild(animContainer);
            requestAnimationFrame(() => {
                animContainer.style.transition = `all ${duration}ms cubic-bezier(0.65, 0, 0.35, 1)`;
                const targetLeft = endRect.left + (endRect.width / 2) - (totalAnimWidth / 2);
                const targetTop = endRect.top + (endRect.height / 2) - (cardHeight / 2);
                const finalScale = (endElement.querySelector('.card')?.offsetWidth || 60) / cardWidth;
                animContainer.style.transform = `translate(${targetLeft - parseFloat(animContainer.style.left)}px, ${targetTop - parseFloat(animContainer.style.top)}px) scale(${finalScale}) rotate(0deg)`;
            });
            setTimeout(() => {
                animContainer.remove();
                resolve();
            }, duration);
        });
    }
    function getSuitName(s) { if(s==='hearts')return'Corazones'; if(s==='diamonds')return'Diamantes'; if(s==='clubs')return'Tréboles'; if(s==='spades')return'Picas'; return ''; }
    function getSuitIcon(s) { if(s==='hearts')return'♥'; if(s==='diamonds')return'♦'; if(s==='clubs')return'♣'; if(s==='spades')return'♠'; return ''; }
    function updateTurnIndicator() { for (let i = 0; i < 4; i++) { const e = document.getElementById(`info-player${i}`); if(e) e.classList.remove('current-turn-glow'); } const e = document.getElementById(`info-player${currentPlayer}`); if(e) e.classList.add('current-turn-glow'); }
    function updatePointsIndicator() { } function updateDebugInfo() { } let hidePlayerActionToasts = true; function showToast(msg, duration=3000) { /* Lógica de toast... */ } function showPlayerToast(msg, duration=3000) { if (hidePlayerActionToasts) return; showToast(msg, duration); } function showOverlay(id) { document.getElementById(id).style.display = 'flex'; } function hideOverlay(id) { document.getElementById(id).style.display = 'none'; }
    function showEliminationMessage(playerName, faultReason) {
        const el = document.getElementById('elimination-message');
        if (el) {
            el.innerHTML = `Jugador <strong>${playerName}</strong> ha sido eliminado y pagará la multa adicional de <strong>${penaltyAmount || currentGameSettings.settings.penalty}</strong> por la siguiente falta:
                          <div style="background: rgba(255,0,0,0.1); border: 1px solid #ff4444; padding: 10px; border-radius: 8px; margin-top: 15px; font-size: 1.1em; color: #ffdddd; text-align: center;">
                              ${faultReason}
                          </div>`;
        }
        showOverlay('elimination-overlay');
    }
    window.closeEliminationOverlay = function() { hideOverlay('elimination-overlay'); }
    // ▼▼▼ ELIMINA ESTA FUNCIÓN COMPLETA ▼▼▼
    /*
    async function animateShuffleIfNeeded(newDeckSize) {
      if (newDeckSize > 0 && newDeckSize < 10) { 
          await animateShuffle();
      }
    }
    */
    // ▲▲▲ FIN DE LA FUNCIÓN A ELIMINAR ▲▲▲
    async function animateShuffle() {
      return new Promise(resolve => {
        const centerArea = document.querySelector('.center-area');
        if (!centerArea) {
          resolve();
          return;
        }
        showToast('Mazo vacío. Barajando el descarte...', 5000);
        const container = document.createElement('div');
        container.className = 'shuffling-animation-container';
        for (let i = 0; i < 8; i++) {
          const card = document.createElement('div');
          card.className = 'card-back-anim';
          card.style.animationDelay = `${i * 0.1}s`;
          container.appendChild(card);
        }
        centerArea.appendChild(container);
        setTimeout(() => {
          container.remove();
          resolve();
        }, 5000);
      });
    }
    
    function canDiscardByDrag() { return currentPlayer === 0 && gameStarted && (hasDrawn || mustDiscard); }

    window.drawFromDeck = function() {
        if (isDrawing || isWaitingForNextTurn) return; // Previene dobles clics o acciones mientras se espera al servidor
        isDrawing = true; 
        console.log("Solicitando carta al servidor desde el mazo...");
        socket.emit('drawFromDeck', currentGameSettings.roomId);
    }

    window.drawFromDiscard = async function() {
        if (isDrawing || isWaitingForNextTurn) return; // Previene dobles clics o acciones mientras se espera al servidor
        if (discardPile.length === 0) {
            showToast('El descarte está vacío', 1500);
            return;
        }
        isDrawing = true; 
        console.log("Solicitando carta al servidor desde el descarte...");
        socket.emit('drawFromDiscard', currentGameSettings.roomId);
    }
    window.attemptMeld = function() {
        if (isWaitingForNextTurn || currentPlayer !== 0 || !gameStarted) return;
        const selectedElements = document.querySelectorAll('#human-hand .card.selected');
        if (selectedElements.length < 3) {
            showToast('Selecciona al menos 3 cartas para bajar.', 1800);
            return;
        }

        const cardIds = Array.from(selectedElements).map(el => el.dataset.cardId);
        const cardsData = cardIds.map(id => players[0].hand.find(c => c.id === id)).filter(Boolean);
        const meldsContainer = document.getElementById('melds-display');

        if (cardsData.length === cardIds.length && meldsContainer) {
            // 1. Creamos el mismo marcador de posición invisible.
            const placeholder = document.createElement('div');
            placeholder.className = 'meld-group';
            placeholder.style.visibility = 'hidden';
            meldsContainer.appendChild(placeholder);

            // 2. Animamos las cartas del jugador hacia el marcador.
            animateCardMovement({
                cardsData: cardsData,
                startElement: document.getElementById('human-hand'),
                endElement: placeholder,
                duration: 1200
            }).then(() => {
                // 3. Eliminamos el marcador al finalizar.
                if (meldsContainer.contains(placeholder)) {
                    meldsContainer.removeChild(placeholder);
                }
            });
        }

        // 4. Enviamos la acción al servidor como siempre.
        socket.emit('meldAction', {
            roomId: currentGameSettings.roomId,
            cardIds: cardIds
        });
    }
    function setupMeldDropZone() {
        const meldZone = document.querySelector('.center-area');
        meldZone.addEventListener('dragover', (e) => { e.preventDefault(); try { const data = JSON.parse(e.dataTransfer.getData('application/json')); if (Array.isArray(data) && data.length >= 3) meldZone.classList.add('drop-zone'); } catch(e) {} });
        meldZone.addEventListener('dragleave', () => meldZone.classList.remove('drop-zone'));
        meldZone.addEventListener('drop', (e) => {
            if (isWaitingForNextTurn) return;
            e.preventDefault(); meldZone.classList.remove('drop-zone');
            try {
                const indices = JSON.parse(e.dataTransfer.getData('application/json'));
                if (Array.isArray(indices) && indices.length >= 3) {
                    const p = players[0]; // El jugador humano
                    if (!p) return;

                    // Obtenemos los IDs de las cartas a partir de los índices arrastrados
                    const cardIds = indices.map(index => p.hand[index]?.id).filter(Boolean);

                    // Verificamos que todas las cartas se encontraron
                    if (cardIds.length === indices.length) {
                        socket.emit('meldAction', {
                            roomId: currentGameSettings.roomId,
                            cardIds: cardIds
                        });
                    }
                } else {
                    showToast("Arrastra un grupo de 3 o más cartas para bajar.", 2000);
                }
            } catch (err) {
                console.error("Error al soltar para combinar:", err);
            }
        });
        const handleMeldZoneClick = (event) => {
            event.preventDefault();
            // Simplemente llamamos a la función que ya funciona para el botón
            window.attemptMeld();
        };
        meldZone.addEventListener('click', handleMeldZoneClick);
        meldZone.addEventListener('touchend', handleMeldZoneClick);
    }
    window.attemptDiscard = async function() {
        if (isWaitingForNextTurn) {
            showToast('Esperando tu turno...', 1500);
            return;
        }
        if (currentPlayer !== 0) {
            showToast('No es tu turno', 1500);
            return;
        }
        const p = players[currentPlayer];
        if (!p || p.isBot || !gameStarted) {
            showToast('No es tu turno', 1500);
            return;
        }
        if (!hasDrawn && !mustDiscard) {
            showToast('Debes robar antes de descartar', 2000);
            return;
        }
        const selected = document.querySelectorAll('#human-hand .card.selected');
        if (selected.length === 0) {
            showToast('Toca una carta en tu mano para seleccionarla y luego toca el descarte.', 3000);
            return;
        }
        if (selected.length > 1) {
            showToast('Selecciona solo una carta para descartar.', 2000);
            return;
        }
        // La validación de los 51 puntos ha sido eliminada. El servidor se encargará de ello.
        await discardCardByIndex(parseInt(selected[0].dataset.index));
    }
    
    function showFault(message) {
        showToast('FALTA: ' + message, 3500);
        socket.emit('playerFault', {
            roomId: currentGameSettings.roomId,
            faultReason: message
        });
    }


    function attemptAddCardToMeld(cardIndex, meldIndex) {
        if (isWaitingForNextTurn || currentPlayer !== 0 || !gameStarted) return;

        const p = players[0];
        if (!p || cardIndex < 0 || cardIndex >= p.hand.length) return;

        const card = p.hand[cardIndex];
        const startElement = document.querySelector(`#human-hand .card[data-index='${cardIndex}']`);
        const endElement = document.querySelector(`.meld-group[data-meld-index='${meldIndex}']`);

        // --- INICIO: Lógica de animación e iluminación local ---
        if (startElement && endElement) {
            animateCardMovement({
                cardsData: [card],
                startElement: startElement,
                endElement: endElement,
                duration: 1000 // <-- CAMBIA 700 POR 1000
            }).then(() => {
                // Iluminar la combinación al instante
                endElement.classList.add('card-illuminated');
                setTimeout(() => endElement.classList.remove('card-illuminated'), 2500);
            });
        }
        // --- FIN: Lógica de animación e iluminación local ---

        socket.emit('meldAction', { 
            roomId: currentGameSettings.roomId, 
            cardIds: [card.id],
            targetMeldIndex: meldIndex
        });
    }
    function setupRematchScreen() {
        // ▲ ...CON ESTE NUEVO BLOQUE ▼
        const wasPlayerInGame = orderedSeats.some(s => s && s.playerId === socket.id);
        if (!wasPlayerInGame) {
            // Si el usuario NO estaba en un asiento (ni jugando ni esperando), es un espectador puro.
            addChatMessage(null, 'La partida ha terminado. Puedes quedarte a ver la revancha.', 'system');
            return; // No mostramos NINGÚN overlay de revancha para él.
        }

        hideOverlay('victory-overlay');

        const readyOverlay = document.getElementById('ready-overlay');
        const welcomeMsg = document.getElementById('welcome-message');
        const mainButton = document.getElementById('btn-ready-main');
        const spectatorButton = document.getElementById('btn-spectator-sit');
        const rematchStatusEl = document.getElementById('rematch-status');

        welcomeMsg.textContent = 'Sala de Revancha';

        // --- INICIO DE LA LÓGICA DE CORRECCIÓN ---

        // 1. Identificamos el rol del jugador en la partida que acaba de terminar.
        const wasWaitingPlayer = orderedSeats.some(s => s && s.playerId === socket.id && s.status === 'waiting');
        const wasActivePlayer = orderedSeats.some(s => s && s.playerId === socket.id && s.status !== 'waiting');

        // Por defecto, mostramos el estado de espera.
        rematchStatusEl.innerHTML = '<p>Esperando confirmación de los jugadores...</p>';

        if (wasWaitingPlayer) {
            // CASO A: El jugador ya estaba en la lista de espera.
            // No necesita confirmar nada. Ocultamos todos los botones.
            mainButton.style.display = 'none';
            spectatorButton.style.display = 'none';
            rematchStatusEl.innerHTML = '<p>Ya estás listo para la siguiente partida. Esperando al anfitrión...</p>';

        } else if (wasActivePlayer) {
            // CASO B: El jugador participó activamente en la partida.
            // Le mostramos el botón para confirmar la revancha.
            mainButton.style.display = 'block';
            spectatorButton.style.display = 'none';
            mainButton.textContent = 'Confirmar Revancha';
            mainButton.disabled = false;
            mainButton.onclick = () => {
                mainButton.disabled = true;
                mainButton.textContent = 'Esperando a los demás...';
                const currentCredits = parseInt(localStorage.getItem('userCredits')) || 0;
                addChatMessage(null, 'Has confirmado la revancha. Esperando...', 'system');
                socket.emit('requestRematch', {
                    roomId: currentGameSettings.roomId,
                    credits: currentCredits
                });
            };
        } else {
            // CASO C: Es un espectador que acaba de llegar (no estaba ni activo ni en espera).
            // Le mostramos el botón para sentarse por primera vez.
            mainButton.style.display = 'none';
            spectatorButton.style.display = 'block';
            spectatorButton.disabled = false;
            spectatorButton.textContent = '✔️ Unirse a la Próxima Partida';
            spectatorButton.onclick = () => {
                socket.emit('requestToSit', currentGameSettings.roomId);
                hideOverlay('ready-overlay'); // Ocultar modal tras confirmar
            };
        }
        // --- FIN DE LA LÓGICA DE CORRECCIÓN ---

        showOverlay('ready-overlay');
    }
    function updateActionButtons() {
      const meldBtn = document.getElementById('meld-btn'); const discardBtn = document.getElementById('discard-btn');
      
      if (isWaitingForNextTurn) {
          meldBtn.disabled = true;
          discardBtn.disabled = true;
          discardBtn.classList.remove('ready');
          return;
      }

      if (!gameStarted || currentPlayer !== 0 || !players[0]) { meldBtn.disabled = true; discardBtn.disabled = true; return; }
      const selected = document.querySelectorAll('#human-hand .card.selected');
      meldBtn.disabled = selected.length < 3;
      const canDisc = (selected.length === 1) && (hasDrawn || mustDiscard);
      discardBtn.disabled = !canDisc;
      if(canDisc) discardBtn.classList.add('ready'); else discardBtn.classList.remove('ready');
    }
    console.log('Script de juego cargado.');
})();
// --- FIN: SCRIPT DEL JUEGO ---