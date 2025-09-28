// game.js (Archivo completo y actualizado)

// --- INICIO: SCRIPT DE PUENTE (BRIDGE) ---
function showLobbyView() {
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
    document.getElementById('lobby-overlay').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    if (typeof initializeGame === 'function') {
        initializeGame(settings);
    }
}
// --- FIN: SCRIPT DE PUENTE (BRIDGE) ---

const socket = io("http://localhost:3000", { autoConnect: false });

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

    function handleJoinRoom(roomId) {
        const user = {
            username: localStorage.getItem('username') || 'Invitado',
            userAvatar: localStorage.getItem('userAvatar') || defaultAvatars[0]
        };
        socket.emit('joinRoom', { roomId, user });
    }

    function renderRoomsOverview(rooms = []) {
        roomsOverviewEl.innerHTML = '';

        const practiceTable = document.createElement('div');
        practiceTable.className = 'table-item';
        const practiceInfo = document.createElement('div');
        practiceInfo.className = 'info';
        practiceInfo.innerHTML = `<div><strong>Modo Práctica</strong></div><p style="font-size: 0.85rem; line-height: 1.3; margin-top: 10px; margin-bottom: 10px;">Aprende a jugar con bots.</p>`;
        const practiceActions = document.createElement('div');
        practiceActions.className = 'actions';
        const practiceButton = document.createElement('button');
        practiceButton.textContent = 'Jugar';
        practiceButton.className = 'play-button';
        practiceButton.onclick = () => {
            const username = localStorage.getItem('username') || 'Jugador';
            const gameSettings = { 
                username: username, 
                tableName: `Mesa de Práctica`, 
                bet: 0, 
                penalty: 0, 
                isPractice: true 
            };
            showGameView(gameSettings);
        };
        practiceActions.appendChild(practiceButton);
        practiceTable.appendChild(practiceInfo);
        practiceTable.appendChild(practiceActions);
        roomsOverviewEl.appendChild(practiceTable);
        
        const createTableItem = document.createElement('div');
        createTableItem.className = 'table-item no-rooms';
        createTableItem.innerHTML = `<div class="info"><p>${rooms.length === 0 ? 'No hay mesas. ¡Crea una!' : 'Crear una nueva mesa'}</p></div>
                                     <div class="actions"><button class="play-button">Crear Mesa</button></div>`;
        createTableItem.querySelector('button').onclick = createRoom;
        roomsOverviewEl.appendChild(createTableItem);

        if (!Array.isArray(rooms)) {
            console.error("Error: el dato 'rooms' recibido no es un array.", rooms);
            return;
        }
        
        rooms.sort((a, b) => getRoomStatePriority(a) - getRoomStatePriority(b));

        rooms.forEach((r, index) => {
            try {
                const div = document.createElement('div');
                div.className = 'table-item';

                const seated = (r.seats || []).filter(Boolean).length;
                const bet = parseInt(r.settings?.bet || 0);
                const hostUsername = r.settings?.username || 'Desconocido';
                const totalCost = bet;
                const currentCredits = parseInt(localStorage.getItem('userCredits')) || 0;

                const isFull = seated >= MAX_SEATS;
                const isPlaying = r.state === 'playing';
                const hasEnoughCredits = currentCredits >= totalCost;
                
                let stateText = isPlaying ? `Jugando (${seated} / ${MAX_SEATS})` : `En espera (${seated} / ${MAX_SEATS})`;

                const infoContainer = document.createElement('div');
                infoContainer.className = 'info';
                infoContainer.innerHTML = `<div><strong>Mesa de:</strong> ${hostUsername}</div>
                    <div><strong>Estado:</strong> ${stateText}</div>
                    <div><strong>Apuesta:</strong> ${bet}</div>
                    <div><strong>Multa:</strong> ${r.settings?.penalty || 0}</div>`;
                
                const playersListDiv = document.createElement('div');
                playersListDiv.className = 'player-list';
                const seatedPlayerNames = (r.seats || []).map(seat => seat ? seat.playerName : null).filter(Boolean);
                playersListDiv.innerHTML = `<strong>Jugadores:</strong> ${seatedPlayerNames.length > 0 ? seatedPlayerNames.join(', ') : '-'}`;
                infoContainer.appendChild(playersListDiv);

                const actions = document.createElement('div');
                actions.className = 'actions';
                const btnEnter = document.createElement('button');
                btnEnter.textContent = 'Entrar';
                btnEnter.className = 'play-button';

                btnEnter.disabled = !hasEnoughCredits || isFull || isPlaying;
                if (!hasEnoughCredits) btnEnter.title = `Créditos insuficientes. Necesitas ${totalCost}.`;
                if (isFull) btnEnter.title = `Mesa llena.`;
                if (isPlaying) btnEnter.title = 'La partida ya ha comenzado.';
                
                btnEnter.onclick = () => handleJoinRoom(r.roomId);

                actions.appendChild(btnEnter);
                const btnSpectate = document.createElement('button');
                btnSpectate.textContent = 'Ver';
                btnSpectate.className = 'play-button spectate-button';
                actions.appendChild(btnSpectate);
                
                div.appendChild(infoContainer);
                div.appendChild(actions);
                
                roomsOverviewEl.appendChild(div);

            } catch (error) {
                console.error(`ERROR al renderizar la mesa #${index + 1}:`, error);
                console.error("Datos de la mesa que causaron el error:", r);
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
    
    function showRoomsOverview() {
        roomsOverviewEl.style.display='grid';
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
            showRoomsOverview();
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
            showRoomsOverview();
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

    socket.on('turnChanged', (data) => {
        console.log('Server broadcast: El turno ha cambiado.', data);
    
        isWaitingForNextTurn = false;
        discardPile = data.newDiscardPile;
        renderDiscard();
    
        const newCurrentPlayerIndex = orderedSeats.findIndex(s => s && s.playerId === data.nextPlayerId);
        
        if (newCurrentPlayerIndex !== -1) {
            currentPlayer = newCurrentPlayerIndex;
        } else {
            console.error('Error: No se pudo encontrar al siguiente jugador en la vista local.', data.nextPlayerId);
            return;
        }
        
        hasDrawn = false;
        mustDiscard = false;
        
        updateTurnIndicator();
        updateActionButtons();
        renderHands();
    
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
        await animateShuffleIfNeeded(data.newDeckSize);

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

    socket.on('meldUpdate', (data) => {
        console.log("Actualización de jugada recibida del servidor:", data);
        allMelds = data.newMelds; // La fuente de la verdad es el servidor
        
        const melderViewIndex = orderedSeats.findIndex(s => s && s.playerId === data.melderId);
        
        if (melderViewIndex !== -1) {
            // Actualizar contador de cartas del jugador que bajó
            const counterEl = document.getElementById(`info-player${melderViewIndex}`).querySelector('.card-counter');
            if (counterEl) {
                counterEl.textContent = `🂠 ${data.newHandCount}`;
            }
        }
        
        renderMelds();
        renderHands(); // Volver a renderizar manos para actualizar contadores
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
            }
            const counterEl = document.getElementById(`info-player${playerViewIndex}`).querySelector('.card-counter');
            if (counterEl) {
                counterEl.textContent = '❌ Eliminado';
            }
        }
    });

    socket.on('gameEnd', (data) => {
        // Usa la lógica existente de la pantalla de victoria
        document.getElementById('victory-message').textContent = `🏆 ${data.winnerName} ha ganado!`;
        document.getElementById('final-scores').innerHTML = `<p>${data.reason}</p>`;
        showOverlay('victory-overlay');
        gameStarted = false;
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

    socket.on('meldSuccess', (data) => {
        const p = players[0]; // El jugador humano
        if (p && data.meldedCardIds) {
            // Elimina las cartas confirmadas por el servidor de la mano local
            p.hand = p.hand.filter(card => !data.meldedCardIds.includes(card.id));
            selectedCards.clear();
            renderHands(); // Vuelve a renderizar la mano ya actualizada
        }
    });

    let currentGameSettings = {};
    let currentUser = {}; 
    let players = [];
    let gameStarted = false;
    let deck = [], discardPile = [], currentPlayer = 0, allMelds = [];
    let unreadMessages = 0;
    let isWaitingForNextTurn = false;
    let penaltyAmount, requiredMeld, hasDrawn, drewFromDiscard, discardCardUsed, mustDiscard, strictRules, drewFromDeckToWin, selectedCards, isDrawing;

    socket.on('gameStarted', (initialState) => {
        console.log("Servidor ha iniciado la partida. Recibiendo estado:", initialState);
        
        hideOverlay('ready-overlay');
        document.getElementById('start-game-btn').style.display = 'none';
        
        gameStarted = true;
        allMelds = [];
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
        updatePlayersView(roomData.seats, false);
        renderGameControls();
    });
    
    window.initializeGame = function(settings) {
        gameStarted = false;
        currentGameSettings = settings;
        currentUser = {
            name: localStorage.getItem('username'),
            id: socket.id
        };

        const readyOverlay = document.getElementById('ready-overlay');
        const welcomeMsg = document.getElementById('welcome-message');
        const betInfo = document.getElementById('bet-info');
        const penaltyInfo = document.getElementById('penalty-info');
        const mainButton = readyOverlay.querySelector('button');

        welcomeMsg.textContent = `Bienvenido a la mesa de ${settings.settings.username}`;
        betInfo.textContent = `Apuesta: ${settings.settings.bet}`;
        penaltyInfo.textContent = `Multa: ${settings.settings.penalty}`;

        if (settings.isPractice) {
            mainButton.textContent = 'Empezar Práctica';
            mainButton.onclick = () => {
                hideOverlay('ready-overlay');
                createPlayersWithBots(currentUser.name);
                startGame();
            };
        } else {
            mainButton.textContent = 'Sentarse';
            mainButton.onclick = handleSitDown;
        }
        
        document.getElementById('human-hand').innerHTML = '';
        document.getElementById('melds-display').innerHTML = '';
        renderDiscard();
        updatePlayersView(settings.seats, false);
        document.getElementById('start-game-btn').style.display = 'none';

        setupChat();
        
        showOverlay('ready-overlay');
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

    function updatePlayersView(seats, inGame = false) {
        players = []; 
        const meIndex = seats.findIndex(s => s && s.playerId === socket.id);
        
        orderedSeats = [...seats];
        if (meIndex > 0) {
            const mySeat = orderedSeats.splice(meIndex, 1)[0];
            orderedSeats.unshift(mySeat);
        }

        for (let i = 0; i < 4; i++) {
            const seat = orderedSeats[i];
            const playerInfoEl = document.getElementById(`info-player${i}`);
            if (!playerInfoEl) continue;

            const playerNameEl = playerInfoEl.querySelector('.player-name');
            const playerAvatarEl = playerInfoEl.querySelector('.player-avatar');
            const playerCounterEl = playerInfoEl.querySelector('.card-counter');

            if (seat) {
                playerInfoEl.style.visibility = 'visible';
                playerNameEl.textContent = seat.playerName;
                playerAvatarEl.src = seat.avatar || 'https://i.pravatar.cc/150?img=1';
                playerCounterEl.textContent = inGame ? `🂠 14` : 'Sentado';
                players[i] = { 
                    name: seat.playerName, 
                    hand: [], 
                    isBot: false,
                    sessionPoints: 0,
                    doneFirstMeld: false,
                    firstMeldThisTurnPoints: 0,
                    hasLoweredThisTurn: false,
                    active: seat.active !== false
                };
            } else {
                playerInfoEl.style.visibility = 'visible';
                playerNameEl.textContent = "Asiento Vacío";
                playerAvatarEl.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                playerCounterEl.textContent = '';
                players[i] = null;
            }
        }
    }
    
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

    function createPlayersWithBots(username) {
      document.querySelector('#info-player0 .player-name').textContent = username;
      players = [
        { name: username, hand: [], isBot: false, sessionPoints: 0, doneFirstMeld: false, firstMeldThisTurnPoints: 0, hasLoweredThisTurn: false, active: true },
        { name: "Bot 1", hand: [], isBot: true, sessionPoints: 0, doneFirstMeld: false, firstMeldThisTurnPoints: 0, hasLoweredThisTurn: false, active: true },
        { name: "Bot 2", hand: [], isBot: true, sessionPoints: 0, doneFirstMeld: false, firstMeldThisTurnPoints: 0, hasLoweredThisTurn: false, active: true },
        { name: "Bot 3", hand: [], isBot: true, sessionPoints: 0, doneFirstMeld: false, firstMeldThisTurnPoints: 0, hasLoweredThisTurn: false, active: true }
      ];
      orderedSeats = players.map(p => ({ playerName: p.name }));
      for (let i = 0; i < players.length; i++) {
          const playerInfoEl = document.getElementById(`info-player${i}`);
          if (playerInfoEl) {
              playerInfoEl.querySelector('.player-name').textContent = players[i].name;
              playerInfoEl.style.visibility = 'visible';
          }
      }
    }

    function setupPileTouchInteractions() {
        const deckEl = document.getElementById('deck');
        const discardEl = document.getElementById('discard');
        deckEl.onclick = null;
        discardEl.onclick = null;
        const handleDeckInteraction = (event) => {
            if (event.type === 'touchend') event.preventDefault();
            drawFromDeck();
        };
        deckEl.addEventListener('click', handleDeckInteraction);
        deckEl.addEventListener('touchend', handleDeckInteraction);
        const handleDiscardInteraction = (event) => {
            if (event.type === 'touchend') event.preventDefault();
            if (hasDrawn || mustDiscard) {
                attemptDiscard();
            } else { 
                drawFromDiscard();
            }
        };
        discardEl.addEventListener('click', handleDiscardInteraction);
        discardEl.addEventListener('touchend', handleDiscardInteraction);
    }

    window.goBackToLobby = function() {
        hideOverlay('victory-overlay');
        hideOverlay('ready-overlay');
        gameStarted = false;
        players = [];
        allMelds = [];
        showLobbyView();
    }

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
        addChatMessage(null, `Bienvenido a la mesa ${currentGameSettings.tableName}.`, 'system');
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
    function buildDeck() {
      deck = [];
      const suits = ["hearts","diamonds","clubs","spades"];
      const values = [ {v:"A", p:10}, {v:"2", p:2}, {v:"3", p:3}, {v:"4", p:4}, {v:"5", p:5}, {v:"6", p:6}, {v:"7", p:7}, {v:"8", p:8}, {v:"9", p:9}, {v:"10", p:10}, {v:"J", p:10}, {v:"Q", p:10}, {v:"K", p:10} ];
      for (let copy = 0; copy < 2; copy++) for (let s of suits) for (let val of values) deck.push({ suit:s, value:val.v, points:val.p, id:`${s}-${val.v}-${copy}` });
    }
    function shuffle(array) {
      for (let i = array.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [array[i], array[j]] = [array[j], array[i]]; }
    }
    function dealCards() {
      players.forEach(pl => { 
          if(pl) {
            pl.hand = []; pl.sessionPoints = 0; pl.doneFirstMeld = false; pl.firstMeldThisTurnPoints = 0; pl.hasLoweredThisTurn = false; pl.active = true; 
          }
      });
      allMelds = [];
      players.forEach(pl => { 
          if(pl) pl.hand = deck.splice(0,14); 
      });
      if(players[0]) players[0].hand.push(deck.shift());
      discardPile = [];
      if (deck.length > 0) discardPile.push(deck.shift());
    }
    window.startGame = function() {
      isWaitingForNextTurn = false;
      requiredMeld = 51; // Puntos necesarios para la primera bajada
      strictRules = true; // Activar reglas estrictas (faltas)
      const currentCredits = parseInt(localStorage.getItem('userCredits')) || 0;
      const gameCost = currentGameSettings.bet + currentGameSettings.penalty;
      if (gameCost > 0 && currentCredits < gameCost) {
          showToast('Créditos insuficientes para sentarte. Volviendo al lobby.', 3000);
          setTimeout(goBackToLobby, 3000);
          return;
      }
      hideOverlay('ready-overlay');
      buildDeck(); shuffle(deck); dealCards();
      currentPlayer = 0; hasDrawn = false; gameStarted = true; drewFromDiscard = false; discardCardUsed = null;
      mustDiscard = true; drewFromDeckToWin = false; selectedCards = new Set();
      if(players[0]) players[0].isFirstTurn = true;
      renderHands(); updateTurnIndicator(); updatePointsIndicator(); updateDebugInfo();
      showToast("Juego iniciado. Tienes 15 cartas, en tu primer turno SOLO puedes descartar.");
    }
    async function discardCardByIndex(index) {
        if (isWaitingForNextTurn) return;
        const p = players[0];
        if (!p) return;
        
        if (drewFromDeckToWin && p.hand.length > 1) {
            showFault('Falta: Tras robar del mazo y bajar, es obligatorio ganar. No puedes descartar si no es tu última carta.');
            return;
        }

        const cardToDiscard = p.hand[index];
        socket.emit('accionDescartar', { 
            roomId: currentGameSettings.roomId, 
            card: cardToDiscard 
        });

        isWaitingForNextTurn = true;
        updateActionButtons();

        const cardEl = document.querySelector(`#human-hand .card[data-index='${index}']`);
        const discardEl = document.getElementById('discard');
        if (cardEl && discardEl) {
            await animateCardMovement({ cardsData: [cardToDiscard], startElement: cardEl, endElement: discardEl });
        }
        
        p.hand.splice(index, 1);
        selectedCards.clear();
        
        renderHands();
        renderDiscard();
        updateActionButtons();
    }
    
    function renderHands() {
      const human = document.getElementById('human-hand');
      human.innerHTML = '';
      const humanPlayerInSeat = orderedSeats[0];
      const humanPlayer = players[0];

      const humanCounter = document.getElementById('counter-human');
      if (humanCounter) {
          if (!humanPlayerInSeat) {
            humanCounter.textContent = '';
          } else {
            const handLength = humanPlayer && humanPlayer.hand ? humanPlayer.hand.length : 0;
            humanCounter.textContent = (!gameStarted ? 'Sentado' : (!humanPlayer.active ? '❌ Eliminado' : `🂠 ${handLength}`));
          }
      }
      
      for(let i = 1; i < 4; i++) {
        const opponentInSeat = orderedSeats[i];
        const c = document.getElementById(`info-player${i}`)?.querySelector('.card-counter'); 
        if(c && opponentInSeat) {
           if (c.textContent.startsWith('🂠') || c.textContent.startsWith('❌')) {
              // No actualizamos si ya tiene estado para no sobreescribir el update de meld/fault
           } else {
              c.textContent = (!gameStarted ? 'Sentado' : '🂠 14');
           }
        } else if (c) {
           c.textContent = '';
        }
      }
      
      if (!humanPlayer || !gameStarted) return;
      
      const fragment = document.createDocumentFragment();
      humanPlayer.hand.forEach((card, idx) => {
        const d = document.createElement('div');
        d.className = `card`;
        if (selectedCards.has(card.id)) d.classList.add('selected');
        d.setAttribute('draggable', true);
        d.dataset.index = idx; d.dataset.cardId = card.id;
        d.innerHTML = `<img src="${getCardImageUrl(card)}" alt="${card.value} of ${getSuitName(card.suit)}" style="width: 100%; height: 100%; border-radius: inherit; display: block;">`;
        let longPressTimer;
        const startDrag = (e) => {
            const selectedElements = document.querySelectorAll('#human-hand .card.selected');
            const isGroupDrag = selectedElements.length > 1 && d.classList.contains('selected');
            let indicesToDrag = isGroupDrag ? Array.from(selectedElements).map(el => parseInt(el.dataset.index)) : [idx];
            const dataToTransfer = JSON.stringify(indicesToDrag);
            if (e.type === 'dragstart') e.dataTransfer.setData('application/json', dataToTransfer);
            setTimeout(() => { indicesToDrag.forEach(i => { const cardEl = human.querySelector(`[data-index='${i}']`); if(cardEl) cardEl.classList.add('dragging'); }); }, 0);
            return dataToTransfer;
        };
        const endDrag = () => { clearTimeout(longPressTimer); document.querySelectorAll('#human-hand .card.dragging').forEach(c => c.classList.remove('dragging')); };
        d.addEventListener('click', () => {
            if (selectedCards.has(card.id)) { selectedCards.delete(card.id); d.classList.remove('selected'); }
            else { selectedCards.add(card.id); d.classList.add('selected'); }
            updateActionButtons(); updateDebugInfo();
        });
        d.addEventListener('dragstart', (e) => {
            const dragData = startDrag(e); let dragImageContainer = document.createElement('div');
            dragImageContainer.style.position = 'absolute'; dragImageContainer.style.left = '-1000px';
            const selectedElements = document.querySelectorAll('#human-hand .card.selected');
            const isGroupDrag = selectedElements.length > 1 && d.classList.contains('selected');
            if (isGroupDrag) {
                dragImageContainer.style.display = 'flex';
                selectedElements.forEach((selectedCard, index) => {
                    const clone = selectedCard.cloneNode(true);
                    clone.classList.remove('selected'); if (index > 0) clone.style.marginLeft = '-35px';
                    dragImageContainer.appendChild(clone);
                });
            } else { const clone = d.cloneNode(true); clone.classList.remove('selected'); dragImageContainer.appendChild(clone); }
            document.body.appendChild(dragImageContainer); e.dataTransfer.setDragImage(dragImageContainer, 35, 52.5);
            setTimeout(() => document.body.removeChild(dragImageContainer), 0);
        });
        d.addEventListener('dragend', endDrag);
        d.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            longPressTimer = setTimeout(() => { e.preventDefault(); const dragData = startDrag(e); handleTouchDrag(touch, dragData); }, 200);
        }, { passive: false });
        d.addEventListener('touchend', () => { clearTimeout(longPressTimer); });
        d.addEventListener('dragover', (e) => { e.preventDefault(); d.classList.add('drag-over'); });
        d.addEventListener('dragleave', () => d.classList.remove('drag-over'));
        
        d.addEventListener('drop', (e) => {
            e.preventDefault();
            d.classList.remove('drag-over');
            try {
                const droppedIndices = JSON.parse(e.dataTransfer.getData('application/json'));
                const targetRect = e.target.getBoundingClientRect();
                const isAfter = e.clientX > targetRect.left + targetRect.width / 2;
                let finalDropIndex = isAfter ? idx + 1 : idx;
                
                reorderHand(droppedIndices, finalDropIndex);
            }
            catch(error) { console.error("Error al soltar la carta (drop):", error); renderHands(); }
        });

        fragment.appendChild(d);
      });
      human.appendChild(fragment);
      renderDiscard(); renderMelds(); updateActionButtons(); updateDebugInfo();
    }
    function handleTouchDrag(initialTouch, dragData) {
        const cloneContainer = document.getElementById('drag-clone-container');
        cloneContainer.innerHTML = '';
        const indices = JSON.parse(dragData);
        const selectedElements = indices.map(i => document.querySelector(`#human-hand .card[data-index='${i}']`));
        const dragImage = document.createElement('div');
        dragImage.className = 'drag-clone-visual'; dragImage.style.display = 'flex';
        selectedElements.forEach((el, i) => {
            const clone = el.cloneNode(true); clone.classList.remove('selected', 'dragging'); clone.style.transform = '';
            if (i > 0) clone.style.marginLeft = `-${clone.offsetWidth / 2}px`;
            dragImage.appendChild(clone);
        });
        cloneContainer.appendChild(dragImage);
        const offsetX = dragImage.offsetWidth / 2; const offsetY = dragImage.offsetHeight / 2;
        const updatePosition = (touch) => { cloneContainer.style.transform = `translate(${touch.clientX - offsetX}px, ${touch.clientY - offsetY}px)`; };
        updatePosition(initialTouch);
        if (navigator.vibrate) navigator.vibrate(50);
        let lastTarget = null;
        const dropTargets = [ ...document.querySelectorAll('#human-hand .card'), document.getElementById('discard'), ...document.querySelectorAll('.meld-group'), document.querySelector('.center-area') ];
        const onTouchMove = (e) => {
            e.preventDefault(); const touch = e.touches[0]; updatePosition(touch);
            cloneContainer.style.display = 'none'; const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY); cloneContainer.style.display = 'block';
            let currentTarget = elementUnder ? dropTargets.find(dt => dt.contains(elementUnder)) : null;
            if (lastTarget && lastTarget !== currentTarget) lastTarget.classList.remove('drag-over', 'drop-zone');
            if (currentTarget && currentTarget !== lastTarget) { const className = currentTarget.classList.contains('card') ? 'drag-over' : 'drop-zone'; currentTarget.classList.add(className); }
            lastTarget = currentTarget;
        };
        const onTouchEnd = (e) => {
            document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd);
            cloneContainer.innerHTML = '';
            if(lastTarget) { lastTarget.classList.remove('drag-over', 'drop-zone'); if (navigator.vibrate) navigator.vibrate(20); }
            document.querySelectorAll('#human-hand .card.dragging').forEach(c => c.classList.remove('dragging'));
            try {
                const droppedIndices = JSON.parse(dragData); if (!lastTarget) return;
                if (lastTarget.classList.contains('card')) { reorderHand(droppedIndices, parseInt(lastTarget.dataset.index)); }
                else if (lastTarget.id === 'discard') {
                    if (droppedIndices.length !== 1) { showToast('Solo puedes descartar una carta a la vez.', 2000); return; }
                    if (canDiscardByDrag()) discardCardByIndex(droppedIndices[0]);
                } else if (lastTarget.classList.contains('center-area')) {
                    if (droppedIndices.length >= 3) meldCardIndices(droppedIndices);
                    else showToast("Arrastra un grupo de 3 o más cartas para bajar.", 2000);
                } else if (lastTarget.classList.contains('meld-group')) {
                    if (droppedIndices.length === 1) attemptAddCardToMeld(droppedIndices[0], parseInt(lastTarget.dataset.meldIndex));
                    else showToast("Arrastra solo una carta para añadir a una combinación existente.", 2500);
                }
            } catch(err) { console.error("Error en touch end:", err); renderHands(); }
        };
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }
    function reorderHand(draggedIndices, targetDropIndex) {
        const handContainer = document.getElementById('human-hand'); if (!handContainer) return;
        const childNodes = Array.from(handContainer.children); const initialPositions = new Map();
        childNodes.forEach(cardNode => { const cardId = cardNode.dataset.cardId; if (cardId) initialPositions.set(cardId, cardNode.getBoundingClientRect()); });
        const player = players[0];
        if (!player || draggedIndices.includes(targetDropIndex)) { renderHands(); return; }
        const sortedDraggedIndices = [...draggedIndices].sort((a, b) => a - b);
        const draggedCards = sortedDraggedIndices.map(index => player.hand[index]);
        const remainingHand = player.hand.filter((_, index) => !sortedDraggedIndices.includes(index));
        const itemsRemovedBeforeTarget = sortedDraggedIndices.filter(i => i < targetDropIndex).length;
        remainingHand.splice(targetDropIndex - itemsRemovedBeforeTarget, 0, ...draggedCards);
        player.hand = remainingHand;
        selectedCards.clear();
        renderHands();
        const finalPositions = new Map();
        Array.from(handContainer.children).forEach(cardNode => { const cardId = cardNode.dataset.cardId; if (cardId) finalPositions.set(cardId, cardNode.getBoundingClientRect()); });
        Array.from(handContainer.children).forEach(cardNode => {
            const cardId = cardNode.dataset.cardId; const initialPos = initialPositions.get(cardId); const finalPos = finalPositions.get(cardId);
            if (!initialPos || !finalPos) return;
            const deltaX = initialPos.left - finalPos.left; const deltaY = initialPos.top - finalPos.top;
            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
                cardNode.style.transition = 'none'; 
                cardNode.style.transform = `translate(${deltaX}px, ${deltaY}px)`; 
                cardNode.style.willChange = 'transform';
                requestAnimationFrame(() => {
                    cardNode.style.transition = `transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1)`; 
                    cardNode.style.transform = 'translate(0, 0)';
                    cardNode.addEventListener('transitionend', () => { 
                        cardNode.style.transition = ''; 
                        cardNode.style.willChange = 'auto'; 
                    }, { once: true });
                });
            }
        });
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
      const display = document.getElementById('melds-display'); display.innerHTML = '';
      for (let i=0;i<allMelds.length;i++) {
        const meld = allMelds[i]; const g = document.createElement('div');
        g.className = 'meld-group'; g.dataset.meldIndex = i;
        g.ondragover = (e) => { e.preventDefault(); g.classList.add('drop-zone'); };
        g.ondragleave = () => g.classList.remove('drop-zone');
        g.ondrop = (e) => {
            if (isWaitingForNextTurn) return;
            e.preventDefault(); g.classList.remove('drop-zone');
            try {
                const cardIndices = JSON.parse(e.dataTransfer.getData('application/json'));
                if (cardIndices.length === 1) attemptAddCardToMeld(cardIndices[0], i);
                else showToast("Arrastra solo una carta para añadir a una combinación existente.", 2500);
            } catch(err) { console.error("Error al añadir carta a combinación:", err); }
        };
        const handleMeldGroupClick = (event) => {
            event.preventDefault();
            if (currentPlayer !== 0 || !gameStarted) return;
            const selected = document.querySelectorAll('#human-hand .card.selected');
            if (selected.length === 1) {
                const cardIndex = parseInt(selected[0].dataset.index);
                const meldIndex = parseInt(g.dataset.meldIndex);
                attemptAddCardToMeld(cardIndex, meldIndex);
            } else if (selected.length > 1) {
                showToast('Solo puedes añadir una carta a la vez a una combinación existente.', 2500);
            }
        };
        g.addEventListener('click', handleMeldGroupClick);
        g.addEventListener('touchend', handleMeldGroupClick);
        for (let c of meld.cards) {
            const cd = document.createElement('div'); cd.className = `card`;
            cd.dataset.cardId = c.id;
            cd.innerHTML = `<img src="${getCardImageUrl(c)}" alt="${c.value} of ${getSuitName(c.suit)}" style="width: 100%; height: 100%; border-radius: inherit; display: block;">`;
            g.appendChild(cd);
        }
        display.appendChild(g);
      }
    }
    function animateCardMovement({
        cardsData = [],
        startElement,
        endElement,
        isBack = false,
        duration = 950,
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
    async function animateShuffleIfNeeded(newDeckSize) {
      if (newDeckSize > 0 && newDeckSize < 10) { // Un umbral para saber que se barajó
          await animateShuffle();
      }
    }
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
        if (isWaitingForNextTurn) return;
        if (currentPlayer !== 0 || hasDrawn || mustDiscard || !gameStarted || isDrawing) {
            showToast('No puedes robar ahora', 1500);
            return;
        }
        isDrawing = true; 
        console.log("Solicitando carta al servidor desde el mazo...");
        socket.emit('drawFromDeck', currentGameSettings.roomId);
    }

    window.drawFromDiscard = async function() {
        if (isWaitingForNextTurn) return;
        const p = players[0];
        if (!p || p.isBot || hasDrawn || mustDiscard || discardPile.length === 0 || !gameStarted || isDrawing) {
            if (currentPlayer === 0 && gameStarted && !isDrawing) showToast('No puedes robar del descarte ahora', 1500);
            return;
        }
        isDrawing = true; 
        const cardToDraw = discardPile[discardPile.length - 1];
        const discardEl = document.getElementById('discard');
        const handEl = document.getElementById('human-hand');
        showToast(`Robando del descarte: ${cardToDraw.value} de ${getSuitName(cardToDraw.suit)}`, 2500);
        if (discardEl && handEl) {
            await animateCardMovement({ cardsData: [cardToDraw], startElement: discardEl, endElement: handEl });
        }
        p.hand.push(discardPile.pop());
        renderDiscard();
        hasDrawn = true;
        drewFromDiscard = true;
        discardCardUsed = cardToDraw;
        drewFromDeckToWin = false;
        renderHands();
        setTimeout(() => { showToast('Recuerda: Debes usar esa carta en una combinación este turno.', 3500) }, 1000);
        isDrawing = false; 
    }
    function validateMeld(cards) { if (!cards || cards.length < 3) return false; const sortedByValue = [...cards].sort((a,b)=>["A","2","3","4","5","6","7","8","9","10","J","Q","K"].indexOf(a.value)-["A","2","3","4","5","6","7","8","9","10","J","Q","K"].indexOf(b.value)); if (isValidSet(sortedByValue)) return 'grupo'; if (isValidRun(sortedByValue)) return 'escalera'; return false; }
    function isValidSet(cards) { if (!cards || (cards.length !== 3 && cards.length !== 4) || !cards.every(c => c.value === cards[0].value)) return false; const suits = cards.map(c => c.suit); if ((new Set(suits)).size !== cards.length) return false; const colorOf = s => (s === 'hearts' || s === 'diamonds') ? 'R' : 'B'; const colors = suits.map(s => colorOf(s)); const checkAlt = (start) => { for (let i=0;i<colors.length;i++) if(colors[i] !== ((i % 2 === 0) ? start : (start === 'R' ? 'B' : 'R'))) return false; return true; }; return checkAlt('R') || checkAlt('B'); }
    function isValidRun(cards) { if (!cards || cards.length < 3) return false; if (!cards.every(c => c.suit === cards[0].suit)) return false; const values = cards.map(c => c.value); if ((new Set(values)).size !== values.length) return false; const order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]; const ranks = values.map(v => (v==='A'?[1,14]:[order.indexOf(v)+1])).flat().sort((a,b)=>a-b); const uniqueRanks = [...new Set(ranks)]; for (let i=0; i<=uniqueRanks.length-cards.length; i++) { let isSeq = true; for (let j=1; j<cards.length; j++) if (uniqueRanks[i+j] !== uniqueRanks[i]+j) { isSeq=false; break; } if(isSeq) return true; } return false; }
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
    window.attemptMeld = async function() { 
        if (isWaitingForNextTurn) return;
        const p = players[0];
        if (!p || p.isFirstTurn) {
            showToast('En tu primer turno solo puedes descartar. No puedes bajar combinaciones.', 3000);
            return;
        }
        const selected = document.querySelectorAll('#human-hand .card.selected'); 
        if (selected.length < 3) { 
            showToast('Selecciona al menos 3 cartas', 1800); 
            return; 
        } 
        await meldCardIndices(Array.from(selected).map(s => parseInt(s.dataset.index))); 
    }
    async function meldCardIndices(indices) {
        const p = players[currentPlayer];
        if (!p || p.isBot || !gameStarted) return;
        if (hasDrawn && !drewFromDiscard && !p.doneFirstMeld) {
            drewFromDeckToWin = true;
            showToast('Has bajado un nuevo conjunto. DEBES GANAR en este turno.', 4500);
        }
        const cards = indices.map(i => p.hand[i]);
        let discardCardRequirementMet = false;
        if (strictRules && drewFromDiscard && discardCardUsed) {
            if (!cards.some(c => c.id === discardCardUsed.id)) {
                showFault(`Falta: El primer conjunto que bajes debe incluir la carta del descarte (${discardCardUsed.value} de ${getSuitName(discardCardUsed.suit)}).`);
                return;
            }
            discardCardRequirementMet = true;
        }
        const type = validateMeld(cards);
        if (!type || (type === 'grupo' && !isValidSet(cards)) || (type === 'escalera' && !isValidRun(cards))) {
            showFault('Falta: Combinación inválida. Pierdes automáticamente y pagas multa.');
            return;
        }
        const pts = calculateMeldPoints(cards, type);
        let finalMeldCards = [...cards];
        if (type === 'escalera') {
            const order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
            const hasAce = finalMeldCards.some(c => c.value === 'A'), hasKing = finalMeldCards.some(c => c.value === 'K');
            finalMeldCards.sort((a, b) => {
                let rankA = order.indexOf(a.value), rankB = order.indexOf(b.value);
                if (hasAce && hasKing) {
                    if (a.value === 'A') rankA = 13;
                    if (b.value === 'A') rankB = 13;
                }
                return rankA - rankB;
            });
        }

        const meldData = { cards: finalMeldCards, type, points: pts };
        socket.emit('meldAction', { 
            roomId: currentGameSettings.roomId, 
            meld: meldData 
        });

        const cardElements = indices.map(i => document.querySelector(`#human-hand .card[data-index='${i}']`));
        const handElement = document.getElementById('human-hand');
        const targetMeldArea = document.querySelector('.center-area');
        if (handElement && targetMeldArea) {
           cardElements.forEach(el => { if(el) el.style.opacity = '0' });
           const originPoint = document.createElement('div');
           originPoint.style.position = 'absolute';
           originPoint.style.left = '50%';
           originPoint.style.top = '50%';
           originPoint.style.transform = 'translate(-50%, -50%)';
           originPoint.style.width = '0px';
           originPoint.style.height = '0px';
           handElement.appendChild(originPoint);
           await animateCardMovement({ 
                cardsData: finalMeldCards, 
                startElement: originPoint, 
                endElement: targetMeldArea,
                duration: 1200 
           });
           handElement.removeChild(originPoint);
        }
        
        p.hasLoweredThisTurn = true;
        if (!p.doneFirstMeld) {
            p.firstMeldThisTurnPoints = (p.firstMeldThisTurnPoints || 0) + pts;
            if (p.firstMeldThisTurnPoints >= requiredMeld) {
                p.doneFirstMeld = true;
                p.firstMeldThisTurnPoints = 0;
            }
        }
        if (discardCardRequirementMet) discardCardUsed = null;
        updatePointsIndicator();
        if (checkVictory()) return;
    }
    function setupMeldDropZone() {
        const meldZone = document.querySelector('.center-area');
        meldZone.addEventListener('dragover', (e) => { e.preventDefault(); try { const data = JSON.parse(e.dataTransfer.getData('application/json')); if (Array.isArray(data) && data.length >= 3) meldZone.classList.add('drop-zone'); } catch(e) {} });
        meldZone.addEventListener('dragleave', () => meldZone.classList.remove('drop-zone'));
        meldZone.addEventListener('drop', (e) => {
            if (isWaitingForNextTurn) return;
            e.preventDefault(); meldZone.classList.remove('drop-zone');
            try { const indices = JSON.parse(e.dataTransfer.getData('application/json')); if (Array.isArray(indices) && indices.length >= 3) meldCardIndices(indices); else showToast("Arrastra un grupo de 3 o más cartas para bajar.", 2000); }
            catch (err) { console.error("Error al soltar para combinar:", err); }
        });
        const handleMeldZoneClick = (event) => {
            event.preventDefault();
            if (currentPlayer !== 0 || !gameStarted) return;
            const selected = document.querySelectorAll('#human-hand .card.selected');
            if (selected.length >= 3) {
                const indices = Array.from(selected).map(s => parseInt(s.dataset.index));
                meldCardIndices(indices);
            } else if (selected.length > 0) {
                showToast('Selecciona al menos 3 cartas para bajar una nueva combinación.', 2500);
            }
        };
        meldZone.addEventListener('click', handleMeldZoneClick);
        meldZone.addEventListener('touchend', handleMeldZoneClick);
    }
    window.attemptDiscard = async function() {
        if (isWaitingForNextTurn) return;
        const p = players[currentPlayer];
        if (!p || p.isBot || !gameStarted) {
            showToast('No es tu turno');
            return;
        }
        if (!hasDrawn && !mustDiscard) {
            showToast('Debes robar antes de descartar');
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
        if (!p.doneFirstMeld && p.hasLoweredThisTurn && p.firstMeldThisTurnPoints < requiredMeld) {
            showFault('Falta: no completaste 51 pts en tu primer intento de bajar. Has perdido.');
            return;
        }
        await discardCardByIndex(parseInt(selected[0].dataset.index));
    }
    
    function showFault(message) {
        showToast('FALTA: ' + message, 3500);
        socket.emit('playerFault', {
            roomId: currentGameSettings.roomId,
            faultReason: message
        });
    }

    function showBotFault(message, botName) { const idx = players.findIndex(p => p.name === botName && p.isBot); if (idx !== -1) { showToast(`FALTA por ${botName}: ${message}`, 3500); /* Bot faults are handled locally for now */ } }
    function canAddCardToMeld(card, meld, actor) { if (!meld || !card || (actor && !actor.doneFirstMeld)) return false; if (meld.type === 'grupo') { if (card.value !== meld.cards[0].value || meld.cards.some(c=>c.suit===card.suit)) return false; try { return isValidSet(meld.cards.concat(card)); } catch (e) { return false; } } else if (meld.type === 'escalera') { if (card.suit !== meld.cards[0].suit || meld.cards.some(c => c.value === card.value)) return false; return isValidRun([...meld.cards, card]); } return false; }
    
    function fitsAtEnds(meld, card) {
        if (!meld || !card) return false;
        const newSet = [...meld.cards, card];
        if (meld.type === 'grupo') {
            return isValidSet(newSet);
        } else if (meld.type === 'escalera') {
            return isValidRun(newSet);
        }
        return false;
    }

    async function attemptAddCardToMeld(cardIndex, meldIndex) {
        if (isWaitingForNextTurn) return;
        if (!gameStarted || currentPlayer !== 0) {
            showToast('Solo puedes añadir cartas a combinaciones en tu turno', 2000);
            return;
        }
        const p = players[0];
        if (!p || p.isFirstTurn) {
            showToast('En tu primer turno solo puedes descartar. No puedes añadir cartas a combinaciones.', 3000);
            return;
        }
        if (hasDrawn && !drewFromDiscard && !p.doneFirstMeld) {
            drewFromDeckToWin = true;
            showToast('Has añadido una carta a un conjunto. DEBES GANAR en este turno.', 4500);
        }
        if (cardIndex < 0 || cardIndex >= p.hand.length) return;
        if (!p.doneFirstMeld) {
            showFault('Falta: No puedes añadir cartas a una combinación existente sin haber bajado tus 51 puntos primero.');
            return;
        }
        const card = p.hand[cardIndex];
        const meld = allMelds[meldIndex];
        if (!meld) return;
        if (meld.type === 'grupo' && meld.cards.some(c => c.suit === card.suit)) {
            showFault(`Palo repetido en grupo (intentó añadir ${card.value} de ${card.suit})`);
            return;
        }
        if (!fitsAtEnds(meld, card)) {
            showFault(`Carta inválida al intentar agregar a la combinación`);
            return;
        }

        const meldData = { cards: [card], type: 'add', targetMeldIndex: meldIndex };
        socket.emit('meldAction', { 
            roomId: currentGameSettings.roomId, 
            meld: meldData 
        });

        const cardEl = document.querySelector(`#human-hand .card[data-index='${cardIndex}']`);
        const meldGroupEl = document.querySelector(`.meld-group[data-meld-index='${meldIndex}']`);
        if (cardEl && meldGroupEl) {
            cardEl.style.opacity = '0';
            await animateCardMovement({ cardsData: [card], startElement: cardEl, endElement: meldGroupEl });
        }
        p.hasLoweredThisTurn = true;

        // Optimistic UI update, server will send the final state
        meld.cards.push(card);
        if (meld.type === 'escalera') {
            const order = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
            const hasKing = meld.cards.some(c => c.value === 'K');
            meld.cards.sort((a, b) => {
                let rankA = order.indexOf(a.value), rankB = order.indexOf(b.value);
                if (hasKing && a.value === 'A') rankA = 13;
                if (hasKing && b.value === 'A') rankB = 13;
                return rankA - rankB;
            });
        }

        selectedCards.clear();
        meld.points = calculateMeldPoints(meld.cards, meld.type);
        renderMelds();
        renderHands();

        const finalCardInMeld = document.querySelector(`.meld-group[data-meld-index='${meldIndex}'] .card[data-card-id='${card.id}']`);
        if (finalCardInMeld) {
            finalCardInMeld.classList.add('card-illuminated');
            finalCardInMeld.addEventListener('animationend', () => {
                finalCardInMeld.classList.remove('card-illuminated');
            }, { once: true });
        }
        showToast('Carta añadida a la combinación', 1400);
        if (checkVictory()) return;
    }
    function nextTurn() {
      if (!gameStarted) return; drewFromDeckToWin = false;
      const p = players[currentPlayer];
      if (p) { 
        p.hasLoweredThisTurn = false; 
        p.firstMeldThisTurnPoints = 0;
        p.isFirstTurn = false;
      }
      allMelds.forEach(m => delete m.justLoweredBy);
      let next = currentPlayer, attempts = 0;
      do { next = (next + 1) % players.length; attempts++; } while (!players[next] && attempts < players.length);
      
      const activePlayers = players.filter(p => p && p.active);
      if(activePlayers.length <= 1) {
          if(activePlayers.length === 1) {
             const winner = activePlayers[0];
             document.getElementById('victory-message').textContent = `🏆 ${winner.name} gana — los demás han sido eliminados`;
             showOverlay('victory-overlay');
          } else {
             showToast('No hay jugadores activos. Fin de la partida.'); 
          }
          gameStarted=false; 
          return;
      }

      currentPlayer = next; updateTurnIndicator(); hasDrawn = false; mustDiscard = false;
      updateActionButtons(); updateDebugInfo();
      if (players[currentPlayer] && players[currentPlayer].isBot) setTimeout(botPlay, 900); else if (players[currentPlayer]) {
        const currentPlayerObj = players[currentPlayer];
        if (currentPlayerObj.isFirstTurn) {
          showToast('Es tu turno. Recuerda: en tu primer turno solo puedes descartar.', 2500);
        } else {
          showToast('Es tu turno.', 1400);
        }
      } else {
          nextTurn();
      }
    }
    function getCombinations(arr, size) { if (size > arr.length) return []; if (size === 0) return [[]]; if (size === 1) return arr.map(x=>[x]); const res = []; arr.forEach((head, i) => { getCombinations(arr.slice(i+1), size-1).forEach(t => res.push([head, ...t])); }); return res; }
    function findOptimalMelds(hand) {
        let availableCards = [...hand], foundMelds = [], changed = true;
        while (changed) {
            changed = false; let bestMeld = null; const allPossibleMelds = [];
            for (let size=Math.min(7,availableCards.length); size>=3; size--) {
                for (const combo of getCombinations(availableCards, size)) {
                    const type = validateMeld(combo);
                    if (type) {
                        let finalComboCards = [...combo];
                        if (type === 'escalera') { const order=["A","2","3","4","5","6","7","8","9","10","J","Q","K"]; const hasAce=finalComboCards.some(c=>c.value==='A'), hasKing=finalComboCards.some(c=>c.value==='K'); finalComboCards.sort((a,b)=>{let rankA=order.indexOf(a.value), rankB=order.indexOf(b.value); if(hasAce&&hasKing){if(a.value==='A')rankA=13; if(b.value==='A')rankB=13;} return rankA-rankB;}); }
                        allPossibleMelds.push({ cards: finalComboCards, type, points: calculateMeldPoints(finalComboCards, type), score: finalComboCards.length*100 + calculateMeldPoints(finalComboCards, type) });
                    }
                }
            }
            if (allPossibleMelds.length > 0) {
                bestMeld = allPossibleMelds.sort((a, b) => b.score - a.score)[0];
                foundMelds.push(bestMeld);
                availableCards = availableCards.filter(card => !bestMeld.cards.some(mc => mc.id === card.id));
                changed = true;
            }
        }
        return foundMelds;
    }
    function findWorstCardToDiscard(hand, allMeldsOnTable) {
        if (hand.length <= 1) return hand[0] || null;
        const rankOrder = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"]; const getRank = (c) => rankOrder.indexOf(c.value);
        const scores = hand.map(card => { let score = card.points; for(const meld of allMeldsOnTable) if(fitsAtEnds(meld, card)) score -= 1000; for(const otherCard of hand) { if (card.id === otherCard.id) continue; if (card.value === otherCard.value) score -= 15; if (card.suit === otherCard.suit) { const rankDiff = Math.abs(getRank(card) - getRank(otherCard)); if (rankDiff === 1) score -= 10; else if (rankDiff === 2) score -= 5; } } return { card, score }; });
        scores.sort((a, b) => b.score - a.score); return scores[0].card;
    }
    async function botPlay() {
        const p = players[currentPlayer];
        if (!p || !p.isBot || !p.active) return;
        const botInfoBox = document.getElementById(`info-player${currentPlayer}`);
        await new Promise(r => setTimeout(r, 800));
        let drewFromDiscardPile = false;
        let cardDrawnFromDiscard = null;
        const topDiscard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
        if (topDiscard) {
            const canAddToExisting = p.doneFirstMeld && allMelds.some(m => fitsAtEnds(m, topDiscard));
            let canFormAndMeldNewSet = false;
            const potentialHand = [...p.hand, topDiscard];
            const potentialNewMelds = findOptimalMelds(potentialHand);
            const meldsUsingDiscardCard = potentialNewMelds.filter(m => m.cards.some(c => c.id === topDiscard.id));
            if (meldsUsingDiscardCard.length > 0) {
                if (p.doneFirstMeld) {
                    canFormAndMeldNewSet = true;
                } else {
                    const totalPoints = potentialNewMelds.reduce((sum, meld) => sum + meld.points, 0);
                    if (totalPoints >= requiredMeld) {
                        canFormAndMeldNewSet = true;
                    }
                }
            }
            if (canAddToExisting || canFormAndMeldNewSet) {
                 const cardToDraw = discardPile[discardPile.length - 1];
                if (botInfoBox) {
                    await animateCardMovement({ cardsData: [cardToDraw], startElement: document.getElementById('discard'), endElement: botInfoBox });
                }
                cardDrawnFromDiscard = discardPile.pop();
                p.hand.push(cardDrawnFromDiscard);
                drewFromDiscardPile = true;
                renderDiscard();
            }
        }
        if (!drewFromDiscardPile) {
            if (deck.length > 0) {
                const drawnCard = deck[0];
                if (botInfoBox) {
                    await animateCardMovement({ cardsData: [drawnCard], startElement: document.getElementById('deck'), endElement: botInfoBox, isBack: true });
                }
                p.hand.push(deck.shift());
            }
        }
        renderHands(); 
        await new Promise(r => setTimeout(r, 1200));
        let hasUsedDiscardCard = !drewFromDiscardPile;
        if (p.doneFirstMeld) {
            let cardWasAdded = true;
            while (cardWasAdded) {
                cardWasAdded = false;
                let cardToAdd = null, targetMeldIndex = -1, cardHandIndex = -1;
                for (let i = p.hand.length - 1; i >= 0; i--) {
                    const card = p.hand[i];
                    for (let j = 0; j < allMelds.length; j++) {
                        if (fitsAtEnds(allMelds[j], card)) { cardToAdd = card; targetMeldIndex = j; cardHandIndex = i; break; }
                    }
                    if (cardToAdd) break;
                }
                if (cardToAdd) {
                    const targetMeldElement = document.querySelector(`.meld-group[data-meld-index='${targetMeldIndex}']`);
                    if (botInfoBox && targetMeldElement) {
                       await animateCardMovement({ cardsData: [cardToAdd], startElement: botInfoBox, endElement: targetMeldElement });
                    }
                    if (drewFromDiscardPile && cardToAdd.id === cardDrawnFromDiscard.id) hasUsedDiscardCard = true;
                    p.hand.splice(cardHandIndex, 1);
                    allMelds[targetMeldIndex].cards.push(cardToAdd);
                    if (allMelds[targetMeldIndex].type === 'escalera') {
                        const order=["A","2","3","4","5","6","7","8","9","10","J","Q","K"], hasKing=allMelds[targetMeldIndex].cards.some(c=>c.value==='K');
                        allMelds[targetMeldIndex].cards.sort((a,b)=>{let rA=order.indexOf(a.value),rB=order.indexOf(b.value); if(hasKing&&a.value==='A')rA=13; if(hasKing&&b.value==='A')rB=13; return rA-rB;});
                    }
                    renderHands();
                    renderMelds();
                    const finalCardInMeld = document.querySelector(`.meld-group[data-meld-index='${targetMeldIndex}'] .card[data-card-id='${cardToAdd.id}']`);
                    if(finalCardInMeld) {
                        finalCardInMeld.classList.add('card-illuminated');
                        finalCardInMeld.addEventListener('animationend', () => finalCardInMeld.classList.remove('card-illuminated'), {once: true});
                    }
                    cardWasAdded = true;
                    await new Promise(r => setTimeout(r, 1200));
                }
            }
        }
        const meldsToPlay = findOptimalMelds(p.hand);
        if (meldsToPlay.length > 0) {
            if (!hasUsedDiscardCard && meldsToPlay.some(m => m.cards.some(c => c.id === cardDrawnFromDiscard?.id))) hasUsedDiscardCard = true;
            let totalPoints = meldsToPlay.reduce((sum, meld) => sum + meld.points, 0);
            let currentPoints = p.doneFirstMeld ? 0 : p.sessionPoints;
            let canPlayMelds = true;
            if (!p.doneFirstMeld && (currentPoints + totalPoints < requiredMeld)) canPlayMelds = false;
            if (drewFromDiscardPile && !hasUsedDiscardCard) canPlayMelds = false;
            
            if (canPlayMelds) {
                for (const meld of meldsToPlay) {
                    const meldsDisplay = document.getElementById('melds-display');
                    const placeholder = document.createElement('div');
                    placeholder.className = 'meld-group';
                    placeholder.style.visibility = 'hidden';
                    placeholder.style.flexShrink = '0'; 
                    meld.cards.forEach(() => {
                        const cd = document.createElement('div');
                        cd.className = 'card';
                        placeholder.appendChild(cd);
                    });
                    meldsDisplay.appendChild(placeholder);
                    if (botInfoBox) {
                        await animateCardMovement({ cardsData: meld.cards, startElement: botInfoBox, endElement: placeholder });
                    }
                    meldsDisplay.removeChild(placeholder);
                    p.hand = p.hand.filter(card => !meld.cards.some(mc => mc.id === card.id));
                    allMelds.push(meld);
                    p.sessionPoints += meld.points;
                    renderHands();
                    renderMelds();
                    const newMeldIndex = allMelds.length - 1;
                    const newMeldElement = document.querySelector(`.meld-group[data-meld-index='${newMeldIndex}']`);
                    if(newMeldElement) {
                        newMeldElement.style.transition = 'box-shadow 0.3s ease-out, border-color 0.3s ease-out';
                        requestAnimationFrame(() => {
                            newMeldElement.style.boxShadow = 'inset 0 0 15px #fffb00, 0 0 10px #fffb00';
                            newMeldElement.style.borderColor = '#adff2f';
                        });
                        setTimeout(() => {
                            if(newMeldElement) {
                                newMeldElement.style.transition = 'box-shadow 0.5s ease-out, border-color 0.5s ease-out';
                                newMeldElement.style.boxShadow = '';
                                newMeldElement.style.borderColor = '';
                            }
                        }, 600);
                    }
                    await new Promise(r => setTimeout(r, 1200));
                }
                if (!p.doneFirstMeld && p.sessionPoints >= requiredMeld) p.doneFirstMeld = true;
            }
        }
        if (checkVictory()) { renderHands(); return; }
        await new Promise(r => setTimeout(r, 600));
        if (p.hand.length > 0) {
            if (strictRules && drewFromDiscardPile && !hasUsedDiscardCard) { showBotFault(`Robó del descarte y no usó la carta.`, p.name); return; }
            const cardToDiscard = findWorstCardToDiscard(p.hand, allMelds);
            if (cardToDiscard) {
                if (allMelds.some(meld => fitsAtEnds(meld, cardToDiscard))) { showBotFault(`Intentó descartar una carta jugable.`, p.name); return; }
                const index = p.hand.findIndex(c => c.id === cardToDiscard.id);
                if (index !== -1) {
                    const cardData = p.hand[index];
                    const discardPileEl = document.getElementById('discard');
                    if (botInfoBox && discardPileEl) await animateCardMovement({ cardsData: [cardData], startElement: botInfoBox, endElement: discardPileEl });
                    p.hand.splice(index, 1);
                    discardPile.push(cardData);
                } else if (p.hand.length > 0) { discardPile.push(p.hand.shift()); }
            } else if (p.hand.length > 0) { discardPile.push(p.hand.shift()); }
        }
        renderHands();
        renderDiscard();
        if (checkVictory()) return;
        nextTurn();
    }
    function checkVictory() {
        const p = players[currentPlayer];
        if (!p) return false;
        if (p.hand.length === 0) {
            if (strictRules && p.sessionPoints < requiredMeld && !p.doneFirstMeld) {
                showToast(`${p.name} no puede ganar: no ha cumplido el requisito de puntos.`, 3000);
                return false;
            }
            const winner = p;
            const scoresDiv = document.getElementById('final-scores');
            let totalWinnings = 0;
            let losersInfo = [];
            let humanPlayerLoss = 0;
            players.forEach(loser => {
                if (!loser || loser === winner) return;
                let lossAmount = currentGameSettings.bet;
                let paysPenalty = !loser.doneFirstMeld && loser.active;
                if (paysPenalty) {
                    lossAmount += currentGameSettings.penalty;
                }
                if (loser.active) {
                    totalWinnings += lossAmount;
                     let penaltyText = paysPenalty
                        ? `<span style="color:#ff4444;">Paga la apuesta (${currentGameSettings.bet}) + multa (${currentGameSettings.penalty}) por no bajar.</span>`
                        : `<span style="color:#ffcc00;">Paga la apuesta (${currentGameSettings.bet}).</span>`;
                    losersInfo.push(`<p>${loser.name} | Cartas restantes: ${loser.hand.length} | ${penaltyText}</p>`);
                }
                if (!loser.isBot) {
                    humanPlayerLoss = lossAmount;
                }
            });
            const commission = totalWinnings * 0.10;
            const netWinnings = totalWinnings - commission;
            let currentCredits = parseInt(localStorage.getItem('userCredits')) || 0;
            if (winner.isBot) {
                currentCredits -= humanPlayerLoss;
            } else {
                currentCredits += netWinnings;
            }
            localStorage.setItem('userCredits', currentCredits);
            document.getElementById('victory-message').textContent = `🏆 ${winner.name} ha ganado!`;
            let winningsSummary = `<div style="border-top: 1px solid var(--casino-gold); margin-top: 15px; padding-top: 10px; text-align: left;">
                                    <p><strong>Total Recaudado:</strong> ${totalWinnings.toFixed(2)}</p>
                                    <p><strong>Comisión Admin (10%):</strong> -${commission.toFixed(2)}</p>
                                    <p style="color: #6bff6b; font-size: 1.2rem;"><strong>TOTAL GANADO: ${netWinnings.toFixed(2)}</strong></p>
                                   </div>`;
            scoresDiv.innerHTML = `<div style="text-align: left;"><p style="color:var(--casino-gold); font-weight:bold;">Detalle de la partida:</p>`
                                + losersInfo.join('')
                                + `</div>`
                                + winningsSummary;
            showOverlay('victory-overlay');
            gameStarted = false;
            return true;
        }
        return false;
    }
    window.newGame = function() {
        hideOverlay('victory-overlay');
        allMelds = [];
        const currentCredits = parseInt(localStorage.getItem('userCredits')) || 0;
        const gameCost = currentGameSettings.bet + currentGameSettings.penalty;
        if (gameCost > 0 && currentCredits < gameCost) {
            showToast('Créditos insuficientes para una nueva partida. Volviendo al lobby.', 3000);
            setTimeout(goBackToLobby, 3000);
            return;
        }
        createPlayersWithBots(currentUser.name);
        startGame();
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