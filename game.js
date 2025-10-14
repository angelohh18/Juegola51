// game.js (Archivo completo y actualizado)

/**
 * Convierte una cantidad de una moneda a otra usando las tasas de cambio.
 * @param {number} amount - La cantidad a convertir.
 * @param {string} fromCurrency - La moneda de origen (ej. 'USD').
 * @param {string} toCurrency - La moneda de destino (ej. 'EUR').
 * @param {object} rates - El objeto de tasas de cambio (clientExchangeRates).
 * @returns {number} - La cantidad convertida.
 */
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
        return amount;
    }
    if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
        return amount * rates[fromCurrency][toCurrency];
    }
    if (rates[toCurrency] && rates[toCurrency][fromCurrency]) {
         return amount / rates[toCurrency][fromCurrency];
    }
    console.warn(`No se encontró tasa de cambio entre ${fromCurrency} y ${toCurrency}.`);
    return amount; 
}

// SOLUCIÓN AL ERROR: El error muestra "convertcurrency" en minúsculas, 
// lo que probablemente es una errata en alguna parte del código. 
// Para solucionarlo de forma segura, creamos un alias que apunta a la función correcta.
const convertcurrency = convertCurrency;


// Nueva función simple para mostrar el modal de fondos insuficientes
function showInsufficientFundsModal(requiredText, missingText) {
    const modal = document.getElementById('simple-funds-modal');
    const messageEl = document.getElementById('simple-funds-message');
    const closeBtn = document.getElementById('simple-funds-close-btn');

    if (!modal || !messageEl || !closeBtn) {
        console.error("No se encontraron los elementos del nuevo modal de fondos.");
        alert(`Fondos Insuficientes:\nNecesitas: ${requiredText}\nTe faltan: ${missingText}`);
        return;
    }

    messageEl.innerHTML = `Necesitas <strong>${requiredText}</strong> para unirte.<br>Te faltan <strong style="color: #ff4444;">${missingText}</strong>.`;

    closeBtn.textContent = 'Aceptar'; // Aseguramos el texto por defecto
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    modal.style.display = 'flex';
}

function showRematchFundsModal(requiredText, missingText) {
    const modal = document.getElementById('simple-funds-modal');
    const messageEl = document.getElementById('simple-funds-message');
    const actionBtn = document.getElementById('simple-funds-close-btn');

    if (!modal || !messageEl || !actionBtn) return;

    messageEl.innerHTML = `No tienes fondos suficientes para la revancha.<br>Necesitas <strong>${requiredText}</strong>.<br>Te faltan <strong style="color: #ff4444;">${missingText}</strong>.`;

    // Cambiamos el texto y la acción del botón
    actionBtn.textContent = 'Volver al Lobby';
    actionBtn.onclick = () => {
        modal.style.display = 'none';
        goBackToLobby(); // Esta función ya se encarga de sacar al jugador de la mesa
    };

    modal.style.display = 'flex';
}

// --- INICIO: SCRIPT DE PUENTE (BRIDGE) ---

// ▼▼▼ PEGA LA FUNCIÓN COMPLETA AQUÍ ▼▼▼
function showToast(msg, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error("Elemento 'toast' no encontrado en el DOM.");
        return;
    }
    toast.textContent = msg;
    toast.classList.add('show');
    // Usamos un temporizador para ocultar el toast después de la duración
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}
// ▲▲▲ FIN DEL CÓDIGO A PEGAR ▲▲▲

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

// ▼▼▼ NUEVAS FUNCIONES DE AYUDA PARA EL MODAL DE FUNCIONES ▼▼▼
function showFunctionsModal() {
    showOverlay('functions-modal');
}
function hideFunctionsModal() {
    hideOverlay('functions-modal');
}
// ▼▼▼ FUNCIÓN showFunctionsModalOnce CON SEGURIDAD ▼▼▼
function showFunctionsModalOnce() {
    // LÍNEA DE SEGURIDAD: Si el usuario no ha iniciado sesión, esta función no hace nada.
    if (!document.body.classList.contains('is-logged-in')) {
        return;
    }

    // El resto de la lógica se mantiene igual
    if (localStorage.getItem('la51_functions_modal_shown') !== 'true') {
        showFunctionsModal();
        localStorage.setItem('la51_functions_modal_shown', 'true');
    }
}

// ▼▼▼ NUEVAS FUNCIONES PARA EL MODAL DE INFORMACIÓN DE BOTS ▼▼▼
function showBotInfoModal() {
    showOverlay('bot-info-modal');
}
function hideBotInfoModal() {
    hideOverlay('bot-info-modal');
}
function showBotInfoModalOnce() {
    if (localStorage.getItem('la51_bot_info_shown') !== 'true') {
        showBotInfoModal();
        localStorage.setItem('la51_bot_info_shown', 'true');
    }
}
// ▲▲▲ FIN DE LAS NUEVAS FUNCIONES ▲▲▲
// ▲▲▲ FIN DEL CÓDIGO A PEGAR ▲▲▲

const socket = io(window.location.origin, { autoConnect: false });

let spectatorMode = 'wantsToPlay'; // Variable global para controlar el modo espectador
let clientExchangeRates = {}; // Para guardar las tasas
let lastKnownRooms = []; // <-- AÑADE ESTA LÍNEA


// Variables globales para el estado del usuario (migración segura)
let currentUser = {
    username: '',
    userAvatar: '',
    userId: '',
    credits: 1000
};

socket.on('connect', () => {
    console.log('🔌 Conexión global con el servidor establecida. ID:', socket.id);
    socket.emit('requestInitialData'); // Un nuevo evento que crearemos en el servidor
});


// ▼▼▼ FUNCIÓN PWA INSTALL MODAL (GLOBAL) ▼▼▼
function showPwaInstallModal() {
    // 1. Comprueba si ya se mostró en esta sesión.
    if (sessionStorage.getItem('pwaModalShown')) {
        return;
    }

    // 2. Detecta si el usuario está en un dispositivo móvil.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        const modal = document.getElementById('pwa-install-modal');
        const closeBtn = document.getElementById('btn-close-pwa-modal');
        const installBtn = document.getElementById('btn-install-pwa');

        if (modal && closeBtn) {
            // 3. Muestra el modal.
            modal.style.display = 'flex';

            // 4. Si la app es instalable (deferredPrompt existe), muestra el botón de instalar.
            if (installBtn && window.deferredPrompt) {
                installBtn.style.display = 'block';

                installBtn.onclick = async () => {
                    // Muestra el prompt de instalación nativo.
                    window.deferredPrompt.prompt();

                    // Espera a que el usuario responda.
                    const { outcome } = await window.deferredPrompt.userChoice;
                    console.log(`Respuesta del usuario al prompt de instalación: ${outcome}`);

                    // Limpiamos el prompt, ya que solo se puede usar una vez.
                    window.deferredPrompt = null;

                    // Ocultamos el modal y el botón de instalar después de la acción.
                    modal.style.display = 'none';
                };
            }

            // 5. El botón "Aceptar" simplemente cierra el modal.
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };

            // 6. Guarda una bandera para que no vuelva a aparecer en esta sesión.
            sessionStorage.setItem('pwaModalShown', 'true');
        }
    }
}
// ▲▲▲ FIN DE LA FUNCIÓN PWA INSTALL MODAL ▲▲▲

// --- INICIO: SCRIPT DEL LOBBY ---
(function(){

    socket.on('updateRoomList', (serverRooms) => {
        lastKnownRooms = serverRooms || [];
        renderRoomsOverview(lastKnownRooms);
    });

    socket.on('userStateUpdated', (userState) => {
        console.log('Estado de usuario actualizado:', userState);
        currentUser.credits = userState.credits;
        currentUser.currency = userState.currency;

        if (typeof updateLobbyCreditsDisplay === 'function') {
            updateLobbyCreditsDisplay();
        }
        
        renderRoomsOverview(lastKnownRooms); 
    });

    // ▼▼▼ FUNCIÓN PARA RENDERIZAR LISTA DE JUGADORES ▼▼▼
    function renderOnlineUsers(userList = []) {
        const listElement = document.getElementById('online-users-list');
        if (!listElement) return;

        listElement.innerHTML = ''; // Limpia la lista actual

        // Ordena la lista alfabéticamente por nombre de usuario
        userList.sort((a, b) => a.username.localeCompare(b.username));

        userList.forEach(user => {
            const li = document.createElement('li');
            const statusClass = user.status.includes('Jugando') ? 'status-playing' : 'status-lobby';
            li.innerHTML = `
                <span>${user.username}</span>
                <span class="user-status ${statusClass}">${user.status}</span>
            `;
            listElement.appendChild(li);
        });
    }
    // ▲▲▲ FIN: FUNCIÓN AÑADIDA ▲▲▲

    // ▼▼▼ LISTENER PARA ACTUALIZAR LISTA DE USUARIOS ▼▼▼
    socket.on('updateUserList', (userList) => {
        renderOnlineUsers(userList);
    });
    // ▲▲▲ FIN: LISTENER AÑADIDO ▲▲▲

    // ▼▼▼ AÑADE ESTOS DOS LISTENERS DENTRO DE LA LÓGICA DEL LOBBY ▼▼▼
    socket.on('lobbyChatHistory', (history) => {
        console.log('Historial del chat del lobby recibido.');
        renderLobbyChat(history);
    });

    socket.on('lobbyChatUpdate', (newMessage) => {
        addLobbyChatMessage(newMessage);
    });
    // ▲▲▲ FIN DE LOS NUEVOS LISTENERS ▲▲▲

    socket.on('exchangeRatesUpdate', (rates) => {
        console.log('Tasas de cambio actualizadas:', rates);
        clientExchangeRates = rates;
        renderRoomsOverview(lastKnownRooms);
    });

    socket.on('roomCreatedSuccessfully', (roomData) => {
        showGameView({ ...roomData, isPractice: false });
    });
    
    socket.on('joinedRoomSuccessfully', (roomData) => {
        showGameView({ ...roomData, isPractice: false });
    });

    socket.on('joinError', (message) => {
        console.error('Error al unirse a la sala:', message);
        showToast(`Error: ${message}`, 4000);
    });

    // ▼▼▼ AÑADE ESTE LISTENER COMPLETO ▼▼▼
    socket.on('potUpdated', (data) => {
        const potContainer = document.getElementById('game-pot-container');
        if (!potContainer) return;

        const potValueEl = potContainer.querySelector('.pot-value');
        if (!potValueEl) return;

        potValueEl.textContent = data.newPotValue;

        // Aplicamos la nueva animación de pulso al valor numérico
        if (data.isPenalty) {
            potValueEl.classList.add('pot-updated');

            setTimeout(() => {
                potValueEl.classList.remove('pot-updated');
            }, 600); // Coincide con la duración de la nueva animación
        }
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

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
        { name: "Cuba", code: "CU", phone: "+53" }, { name: "Puerto Rico", code: "PR", phone: "+1" },
        { name: "Estados Unidos", code: "US", phone: "+1" }
    ];
    const defaultAvatars = [ 'https://i.pravatar.cc/150?img=1', 'https://i.pravatar.cc/150?img=2', 'https://i.pravatar.cc/150?img=3', 'https://i.pravatar.cc/150?img=4', 'https://i.pravatar.cc/150?img=5', 'https://i.pravatar.cc/150?img=6', 'https://i.pravatar.cc/150?img=7', 'https://i.pravatar.cc/150?img=8', 'https://i.pravatar.cc/150?img=9', 'https://i.pravatar.cc/150?img=10' ];
    let selectedAvatar = null;
    let currentPhonePrefix = '';
    let onCropCompleteCallback = null; // <-- AÑADE ESTA LÍNEA

    function scaleAndCenterLobby() {
        // ▼▼▼ PEGA ESTE BLOQUE COMPLETO AQUÍ DENTRO ▼▼▼
        // Este código desactiva el escalado en móviles y deja que el CSS funcione
        if (window.innerWidth <= 992) {
            const overlayContent = document.querySelector('.overlay-content');
            if (overlayContent) { // Añadimos una comprobación por si acaso
                overlayContent.style.transform = '';
                overlayContent.style.left = '';
                overlayContent.style.top = '';
                overlayContent.style.position = 'relative';
            }
            return; // <-- ESTA LÍNEA ES LA MÁS IMPORTANTE
        }
        // ▲▲▲ FIN DEL BLOQUE A PEGAR ▲▲▲

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
        const credits = currentUser.credits ?? 0;
        const currency = currentUser.currency || 'USD'; // Usamos USD como fallback
        let formattedText = 'Créditos ';

        // Usamos un formato especial para cada moneda
        if (currency === 'EUR') {
            // Ejemplo: Créditos 10€
            formattedText += credits.toLocaleString('es-ES') + '€';
        } else if (currency === 'COP') {
            // Ejemplo: Créditos 100.000 COP
            formattedText += credits.toLocaleString('es-CO') + ' ' + currency;
        } else {
            // Ejemplo para USD y otras futuras monedas: Créditos 20 USD
            formattedText += credits.toLocaleString() + ' ' + currency;
        }

        userCreditsEl.textContent = formattedText;
    }
    window.updateLobbyCreditsDisplay = updateCreditsDisplay;
    
    // ▼▼▼ REEMPLAZA EL LISTENER DEL avatarInput CON ESTE ▼▼▼
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                // Llamamos al modal de recorte y le decimos qué hacer cuando se guarde
                openCropModal(evt.target.result, (croppedDataUrl) => {
                    // Lógica existente (actualización visual inmediata)
                    userAvatarEl.src = croppedDataUrl;
                    currentUser.userAvatar = croppedDataUrl;
                    localStorage.setItem('userAvatar', croppedDataUrl);
                    
                    // --- INICIO DE LA MODIFICACIÓN ---
                    // Enviamos el nuevo avatar al servidor para guardarlo en la BD
                    fetch('/update-avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: currentUser.username, // Usamos el nombre del usuario logueado
                            avatarUrl: croppedDataUrl
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            console.log('Avatar guardado permanentemente en la base de datos.');
                            showToast('Avatar actualizado con éxito.', 2500);
                        } else {
                            console.error('Error del servidor al guardar el avatar:', data.message);
                            showToast('Error al guardar el avatar.', 3000);
                        }
                    })
                    .catch(err => {
                        console.error('Error de red al actualizar el avatar:', err);
                        showToast('Error de red. No se pudo guardar el avatar.', 3000);
                    });
                    // --- FIN DE LA MODIFICACIÓN ---
                });
            };
            reader.readAsDataURL(file);
        }
    });
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

    btnReloadCredits.addEventListener('click', () => {
        // 1. Obtiene el nombre de usuario actual de la variable global.
        const username = currentUser.username || 'Usuario no identificado';

        // 2. Prepara el mensaje y lo codifica para una URL.
        const message = `Hola, mi nombre de usuario es ${username} y quiero recargar/retirar los créditos EN EL JUEGO LA 51. Me das información por favor. Gracias.`;
        const encodedMessage = encodeURIComponent(message);

        // 3. Selecciona los dos enlaces por su ID.
        const primaryLink = document.getElementById('whatsapp-link-primary');
        const secondaryLink = document.getElementById('whatsapp-link-secondary');

        // 4. Construye y asigna las URLs completas a los enlaces.
        if (primaryLink) {
            primaryLink.href = `https://wa.me/34665530984?text=${encodedMessage}`;
        }
        if (secondaryLink) {
            secondaryLink.href = `https://wa.me/573004280833?text=${encodedMessage}`;
        }

        // 5. Finalmente, muestra el modal ya con los enlaces listos.
        creditModal.style.display = 'flex';
    });
    btnCloseCreditModal.addEventListener('click', () => { creditModal.style.display = 'none'; });
    
    // ▼▼▼ LISTENERS PARA MODAL "OLVIDÉ MI CONTRASEÑA" ▼▼▼
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const btnCloseForgotModal = document.getElementById('btn-close-forgot-modal');

    if (btnForgotPassword && forgotPasswordModal && btnCloseForgotModal) {
        btnForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordModal.style.display = 'flex';
        });

        btnCloseForgotModal.addEventListener('click', () => {
            forgotPasswordModal.style.display = 'none';
        });
    }
    // ▲▲▲ FIN LISTENERS "OLVIDÉ MI CONTRASEÑA" ▲▲▲
    
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
        
        // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
        const currency = document.getElementById('create-room-currency').value;

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
        const totalCostInRoomCurrency = bet + penalty; // El coste total es apuesta + multa.

        // Obtenemos los datos del usuario y la moneda de la mesa
        const userCredits = currentUser.credits ?? 0;
        const userCurrency = currentUser.currency || 'USD';
        const roomCurrency = document.getElementById('create-room-currency').value;

        let requiredAmountInUserCurrency = totalCostInRoomCurrency;

        // Hacemos la conversión solo si las monedas son diferentes
        if (roomCurrency !== userCurrency && clientExchangeRates[userCurrency] && clientExchangeRates[userCurrency][roomCurrency]) {
            requiredAmountInUserCurrency = totalCostInRoomCurrency / clientExchangeRates[userCurrency][roomCurrency];
        } else if (roomCurrency !== userCurrency && clientExchangeRates[roomCurrency] && clientExchangeRates[roomCurrency][userCurrency]) {
            requiredAmountInUserCurrency = totalCostInRoomCurrency * clientExchangeRates[roomCurrency][userCurrency];
        }

        // Comparamos los créditos del usuario con el coste convertido a su moneda
        if (userCredits < requiredAmountInUserCurrency) {
            const friendlyBet = bet.toLocaleString('es-ES');
            const friendlyPenalty = penalty.toLocaleString('es-ES');

            createRoomError.innerHTML = `Créditos insuficientes. <br>Para crear la mesa (${friendlyBet} + ${friendlyPenalty} de multa) necesitas el equivalente a <strong>${requiredAmountInUserCurrency.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${userCurrency}</strong>.`;
            createRoomError.style.display = 'block';
            return;
        }
        
        // MIGRACIÓN SEGURA: Usar variables globales con fallback a localStorage
        const username = currentUser.username || localStorage.getItem('username') || 'Jugador';
        const userAvatar = currentUser.userAvatar || localStorage.getItem('userAvatar') || defaultAvatars[0];
        const userId = currentUser.userId || localStorage.getItem('userId');
        
        const roomSettings = {
            username: username,
            userAvatar: userAvatar,
            userId: userId, // MIGRACIÓN SEGURA: Usar variables globales
            tableName: `Mesa de ${username}`,
            bet: bet,
            penalty: penalty,
            betCurrency: currency // <-- AÑADE ESTA LÍNEA
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
        
        // MIGRACIÓN SEGURA: Limpiar tanto variables globales como localStorage
        currentUser = {
            username: '',
            userAvatar: '',
            userId: '',
            credits: 1000
        };
        
        localStorage.removeItem('username');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('userCredits');
        localStorage.removeItem('userId');
        
        
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
        spectatorMode = mode;
        
        // MIGRACIÓN SEGURA: Usar variables globales con fallback a localStorage
        const user = {
            username: currentUser.username || localStorage.getItem('username') || 'Invitado',
            userAvatar: currentUser.userAvatar || localStorage.getItem('userAvatar') || defaultAvatars[0],
            userId: currentUser.userId || localStorage.getItem('userId') // MIGRACIÓN SEGURA: Usar variables globales
        };
        
        console.log(`[JoinRoom] Usuario: ${user.username} (ID: ${user.userId}) - Migración segura`);
        socket.emit('joinRoom', { roomId, user });
    }

// REEMPLAZA LA FUNCIÓN renderRoomsOverview ENTERA CON ESTO:
// REEMPLAZA LA FUNCIÓN renderRoomsOverview ENTERA CON ESTA VERSIÓN MEJORADA
function renderRoomsOverview(rooms = []) {
    if (!roomsOverviewEl) return;
    roomsOverviewEl.innerHTML = ''; // Limpiar la vista

    // --- MESA DE PRÁCTICA (Sin cambios) ---
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

    // --- BOTÓN DE CREAR MESA (Sin cambios) ---
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

    // --- INICIO DE LAS MODIFICACIONES ---

    // 1. CREAMOS UNA FUNCIÓN AUXILIAR REUTILIZABLE PARA LAS CONVERSIONES
    // Esto nos permitirá usarla tanto para la apuesta como para la multa.
    const getConvertedValueHTML = (amount, fromCurrency) => {
        if (!currentUser.currency || fromCurrency === currentUser.currency || !clientExchangeRates) {
            return ''; // No se necesita conversión
        }
        
        let convertedAmount = 0;
        if (clientExchangeRates[fromCurrency] && clientExchangeRates[fromCurrency][currentUser.currency]) {
            convertedAmount = amount * clientExchangeRates[fromCurrency][currentUser.currency];
        } else if (clientExchangeRates[currentUser.currency] && clientExchangeRates[currentUser.currency][fromCurrency]) {
            convertedAmount = amount / clientExchangeRates[currentUser.currency][fromCurrency];
        }

        if (convertedAmount > 0) {
            const formattedAmount = convertedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `<span style="font-size: 0.75rem; color: #aaa;"> (Aprox. ${formattedAmount} ${currentUser.currency})</span>`;
        }
        return '';
    };

    // --- FIN DE LA MODIFICACIÓN 1 ---

    rooms.sort((a, b) => getRoomStatePriority(a) - getRoomStatePriority(b));

    rooms.forEach(roomData => {
        // ▼▼▼ AÑADE ESTA LÍNEA AQUÍ ▼▼▼
        if (roomData.isPractice) return; // Si la mesa es de práctica, no la mostramos y pasamos a la siguiente.
        // ▲▲▲ FIN DE LA LÍNEA A AÑADIR ▲▲▲

        try {
            const div = document.createElement('div');
            div.className = 'table-item';

            const seated = (roomData.seats || []).filter(Boolean).length;
            const bet = parseInt(roomData.settings?.bet || 0);
            const penalty = parseInt(roomData.settings?.penalty || 0); // Obtenemos la multa
            const hostUsername = roomData.settings?.username || 'Desconocido';
            const isEffectivelyPlaying = roomData.state === 'playing' || roomData.state === 'post-game';
            const betCurrency = roomData.settings?.betCurrency || 'USD';

            // --- INICIO DE LA MODIFICACIÓN 2 ---
            // 2. USAMOS LA FUNCIÓN AUXILIAR PARA APUESTA Y MULTA
            const convertedBetHTML = getConvertedValueHTML(bet, betCurrency);
            const convertedPenaltyHTML = getConvertedValueHTML(penalty, betCurrency);
            // --- FIN DE LA MODIFICACIÓN 2 ---

            let stateText = isEffectivelyPlaying ? `Jugando (${seated} / 4)` : `En espera (${seated} / 4)`;
            const seatedPlayerNames = (roomData.seats || []).map(seat => seat ? seat.playerName : null).filter(Boolean);

            // Se actualiza el innerHTML para mostrar la multa con su conversión
            div.innerHTML = `
                <div class="info">
                    <div><strong>Mesa de:</strong> ${hostUsername}</div>
                    <div><strong>Estado:</strong> ${stateText}</div>
                    <div><strong>Apuesta:</strong> ${bet.toLocaleString('es-ES')} ${betCurrency}${convertedBetHTML}</div>
                    <div><strong>Multa:</strong> ${penalty.toLocaleString('es-ES')} ${betCurrency}${convertedPenaltyHTML}</div>
                    <div class="player-list"><strong>Jugadores:</strong> ${seatedPlayerNames.length > 0 ? seatedPlayerNames.join(', ') : '-'}</div>
                </div>
                <div class="actions"></div>
            `;

            const actionsContainer = div.querySelector('.actions');
            const btnEnter = document.createElement('button');
            btnEnter.textContent = 'Entrar';
            btnEnter.className = 'play-button';

            const isFull = seated >= 4;
            const requirementInRoomCurrency = bet + penalty;

            // Calculamos el coste en la moneda del jugador
            let requiredAmountInPlayerCurrency = requirementInRoomCurrency;
            if (currentUser.currency && betCurrency !== currentUser.currency) {
                 if (clientExchangeRates[currentUser.currency] && clientExchangeRates[currentUser.currency][betCurrency]) {
                    requiredAmountInPlayerCurrency = requirementInRoomCurrency / clientExchangeRates[currentUser.currency][betCurrency];
                }
            }
            
            const hasEnoughCredits = (currentUser.credits ?? 0) >= requiredAmountInPlayerCurrency;

            // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
            if (isFull) {
                btnEnter.disabled = true;
                btnEnter.title = 'Mesa llena.';
            } else {
                btnEnter.disabled = false;

                // Asignamos una única y nueva función onclick que valida todo en el momento.
                btnEnter.onclick = () => {
                    // 1. Obtenemos los datos más frescos en el instante del clic.
                    const userCreditsNow = currentUser.credits ?? 0;
                    const userCurrencyNow = currentUser.currency || 'USD';

                    const bet = parseInt(roomData.settings?.bet || 0);
                    const penalty = parseInt(roomData.settings?.penalty || 0);
                    const betCurrency = roomData.settings?.betCurrency || 'USD';

                    const requirementInRoomCurrency = bet + penalty;
                    let requiredInUserCurrency = requirementInRoomCurrency;

                    // 2. Realizamos la conversión de moneda.
                    if (userCurrencyNow !== betCurrency && clientExchangeRates) {
                         if (clientExchangeRates[betCurrency] && clientExchangeRates[betCurrency][userCurrencyNow]) {
                            requiredInUserCurrency = requirementInRoomCurrency * clientExchangeRates[betCurrency][userCurrencyNow];
                        } else if (clientExchangeRates[userCurrencyNow] && clientExchangeRates[userCurrencyNow][betCurrency]) {
                            requiredInUserCurrency = requirementInRoomCurrency / clientExchangeRates[userCurrencyNow][betCurrency];
                        }
                    }

                    // 3. Comparamos los créditos del usuario con el requisito.
                    console.log(`VALIDANDO: Créditos=${userCreditsNow} ${userCurrencyNow} vs Requerido=${requiredInUserCurrency.toFixed(2)} ${userCurrencyNow}`);

                    if (userCreditsNow >= requiredInUserCurrency) {
                        // Si tiene créditos, se une a la mesa.
                        handleJoinRoom(roomData.roomId);
                    } else {
                        // Si NO tiene créditos, llamamos a nuestra nueva función de modal.
                        const missingAmount = requiredInUserCurrency - userCreditsNow;

                        const friendlyRequired = `${requiredInUserCurrency.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${userCurrencyNow}`;
                        const friendlyMissing = `${missingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${userCurrencyNow}`;

                        showInsufficientFundsModal(friendlyRequired, friendlyMissing);
                    }
                };
            }

            if (isEffectivelyPlaying && isFull) {
                 btnEnter.title = 'La mesa está llena.';
            }

            actionsContainer.appendChild(btnEnter);
            // --- FIN DE LA CORRECCIÓN DEFINITIVA ---
            
            roomsOverviewEl.appendChild(div);

        } catch (error) {
            console.error(`ERROR al renderizar la mesa:`, error, roomData);
        }
    });
}
    
    // ▼▼▼ REEMPLAZA TU FUNCIÓN sendChat ENTERA CON ESTA ▼▼▼
    function sendChat(text) {
        if (!text) return;

        // Obtenemos el nombre del usuario actual de la variable global
        const senderName = currentUser.username || 'Invitado';

        // Enviamos el mensaje al servidor en lugar de a localStorage
        socket.emit('sendLobbyChat', { text: text, sender: senderName });

        // Limpiamos el input localmente
        chatInput.value = '';
    }
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲

    // ▼▼▼ REEMPLAZA TU FUNCIÓN renderGlobalChat ENTERA CON ESTAS DOS FUNCIONES ▼▼▼

    // Función 1: Añade un solo mensaje al DOM
    function addLobbyChatMessage(msg) {
        const m = document.createElement('div');
        m.style.marginBottom = '6px';

        const who = document.createElement('div');
        who.style.fontSize = '12px';
        who.style.color = '#6D2932';
        who.style.textDecoration = 'underline'; // <-- LÍNEA AÑADIDA
        who.textContent = msg.from;

        const txt = document.createElement('div');
        txt.textContent = msg.text;

        const ts = document.createElement('div');
        ts.style.fontSize = '11px';
        ts.style.color = '#888';
        ts.textContent = new Date(msg.ts).toLocaleTimeString();

        m.appendChild(who);
        m.appendChild(txt);
        m.appendChild(ts);

        chatEl.appendChild(m);
        chatEl.scrollTop = chatEl.scrollHeight; // Auto-scroll
    }

    // Función 2: Renderiza un array completo de mensajes (para el historial)
    function renderLobbyChat(messages = []) {
        chatEl.innerHTML = ''; // Limpiamos el chat
        if (messages.length === 0) {
            // ▼▼▼ BLOQUE MODIFICADO ▼▼▼
            const welcomeDiv = document.createElement('div');
            welcomeDiv.style.fontStyle = 'italic';
            welcomeDiv.style.color = '#888';
            welcomeDiv.style.textAlign = 'center';
            welcomeDiv.style.padding = '10px 0';
            welcomeDiv.textContent = '¡Bienvenido al lobby de LA 51! Sé respetuoso y disfruta del juego.';
            chatEl.appendChild(welcomeDiv);
            // ▲▲▲ FIN DEL BLOQUE ▲▲▲
        } else {
            messages.forEach(msg => addLobbyChatMessage(msg));
        }
    }
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
    
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


    function doLogin() {
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();
        loginError.style.display = 'none';

        if (!username || !password) {
            loginError.textContent = 'Por favor, ingresa nombre y contraseña.';
            loginError.style.display = 'block';
            return;
        }

        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const user = data.user;
                
                socket.connect(); 
                socket.emit('userLoggedIn', { username: user.name, currency: user.currency });

                // Guardar datos en la variable global para la sesión
                currentUser = {
                    username: user.name,
                    userAvatar: user.avatar,
                    userId: 'user_' + user.name.toLowerCase(),
                };
                
                // Guardar en localStorage solo para la sesión actual (avatar, etc.)
                localStorage.setItem('username', user.name);
                localStorage.setItem('userAvatar', user.avatar);
                
                loginModal.style.display = 'none';
                document.getElementById('user-name').textContent = user.name;
                userAvatarEl.src = user.avatar;
                
                body.classList.add('is-logged-in');
                lobbyOverlay.style.display = 'flex';

                // ▼▼▼ AÑADE ESTA LÍNEA AQUÍ ▼▼▼
                showPwaInstallModal(); 
                // ▲▲▲ FIN DE LA LÍNEA A AÑADIR ▲▲▲

                setTimeout(scaleAndCenterLobby, 0);
                window.addEventListener('resize', scaleAndCenterLobby);

            } else {
                loginError.textContent = data.message;
                loginError.style.display = 'block';
            }
        })
        .catch(err => {
            console.error('Error de red en el login:', err);
            loginError.textContent = 'Error de conexión. Inténtalo de nuevo.';
            loginError.style.display = 'block';
        });
    }

    function doRegister() {
        registerError.style.display = 'none';
        registerSuccess.style.display = 'none';

        const name = registerNameInput.value.trim();
        const country = registerCountrySelect.value;
        const whatsapp = registerWhatsAppInput.value.trim();
        const password = registerPasswordInput.value;
        const confirmPassword = registerConfirmPasswordInput.value;
        const currency = document.getElementById('register-currency').value;

        if (!name || !country || !whatsapp || !password || !currency) {
            registerError.textContent = 'Por favor, completa todos los campos.';
            registerError.style.display = 'block';
            return;
        }
        if (password !== confirmPassword) {
            registerError.textContent = 'Las contraseñas no coinciden.';
            registerError.style.display = 'block';
            return;
        }
        if (!selectedAvatar) {
            registerError.textContent = 'Por favor, selecciona un avatar.';
            registerError.style.display = 'block';
            return;
        }

        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, country, whatsapp, password, avatar: selectedAvatar, currency })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                registerSuccess.textContent = data.message + ' Serás redirigido al login.';
                registerSuccess.style.display = 'block';
                setTimeout(() => {
                    registerModal.style.display = 'none';
                    showLoginModal();
                    loginUsernameInput.value = name; // Autocompletar el nombre
                }, 2500);
            } else {
                registerError.textContent = data.message;
                registerError.style.display = 'block';
            }
        })
        .catch(err => {
            console.error('Error de red en el registro:', err);
            registerError.textContent = 'Error de conexión. Inténtalo de nuevo.';
            registerError.style.display = 'block';
        });
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
    function openCropModal(imageDataUrl, callback) { // <-- Añade 'callback'
        onCropCompleteCallback = callback; // <-- AÑADE ESTA LÍNEA
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

        // ▼▼▼ REEMPLAZA LAS LÍNEAS FINALES CON ESTE BLOQUE ▼▼▼
        if (typeof onCropCompleteCallback === 'function') {
            onCropCompleteCallback(dataUrl); // Ejecutamos la acción guardada
        }
        onCropCompleteCallback = null; // Limpiamos la acción para futuros usos
        closeCropModal();
        // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
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
    // ▼▼▼ REEMPLAZA EL LISTENER DEL registerAvatarUpload CON ESTE ▼▼▼
    registerAvatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                // Llamamos al modal y le pasamos la acción específica para el registro
                openCropModal(evt.target.result, (croppedDataUrl) => {
                    selectedAvatar = croppedDataUrl;
                    avatarPreview.src = croppedDataUrl;
                    avatarPreviewContainer.style.display = 'block';
                    const current = avatarGallery.querySelector('.selected');
                    if (current) current.classList.remove('selected');
                    // Asumimos que el primer item es la opción de 'Subir Foto'
                    avatarGallery.firstChild.classList.add('selected');
                });
            };
            reader.readAsDataURL(file);
        }
    });
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
    
    (function init() {
        console.log('--- INICIANDO VERSIÓN CON LOGIN EN SERVIDOR ---');
        initCountries();
        
        // Como la sesión ya no se guarda en el navegador,
        // siempre mostramos el modal de login al iniciar.
        body.classList.remove('is-logged-in');
        lobbyOverlay.style.display = 'none';
        showLoginModal();
        
        // ▼▼▼ INICIO DEL BLOQUE DE CÓDIGO PARA CAMBIAR CONTRASEÑA ▼▼▼
        console.log('TEST: JavaScript actualizado - Modal cambiar contraseña');
        const btnChangePassword = document.getElementById('btn-change-password');
        const changePasswordModal = document.getElementById('change-password-modal');

        if (btnChangePassword && changePasswordModal) {
            const currentPassInput = document.getElementById('current-password');
            const newPassInput = document.getElementById('new-password');
            const confirmNewPassInput = document.getElementById('confirm-new-password');
            const errorDiv = document.getElementById('change-password-error');
            const successDiv = document.getElementById('change-password-success');
            const btnConfirm = document.getElementById('btn-confirm-change-password');
            const btnCancel = document.getElementById('btn-cancel-change-password');

            // Función para abrir el modal y resetearlo
            const openChangePasswordModal = () => {
                currentPassInput.value = '';
                newPassInput.value = '';
                confirmNewPassInput.value = '';
                errorDiv.style.display = 'none';
                successDiv.style.display = 'none';
                btnConfirm.disabled = false;
                changePasswordModal.style.display = 'flex';
            };

            // Función para cerrar el modal
            const closeChangePasswordModal = () => {
                changePasswordModal.style.display = 'none';
            };

            // Función para enviar los datos al servidor
            const submitPasswordChange = () => {
                errorDiv.style.display = 'none';
                successDiv.style.display = 'none';

                const currentPassword = currentPassInput.value;
                const newPassword = newPassInput.value;
                const confirmNewPassword = confirmNewPassInput.value;

                if (!currentPassword || !newPassword) {
                    errorDiv.textContent = 'Todos los campos son obligatorios.';
                    errorDiv.style.display = 'block';
                    return;
                }
                if (newPassword.length < 4) {
                    errorDiv.textContent = 'La nueva contraseña debe tener al menos 4 caracteres.';
                    errorDiv.style.display = 'block';
                    return;
                }
                if (newPassword !== confirmNewPassword) {
                    errorDiv.textContent = 'Las nuevas contraseñas no coinciden.';
                    errorDiv.style.display = 'block';
                    return;
                }

                btnConfirm.disabled = true;
                btnConfirm.textContent = 'Guardando...';

                // Usamos la variable global 'currentUser' para obtener el nombre de usuario
                const username = currentUser.username;

                socket.emit('user:changePassword', { username, currentPassword, newPassword });
            };

            // Asignar eventos a los botones
            btnChangePassword.addEventListener('click', openChangePasswordModal);
            btnCancel.addEventListener('click', closeChangePasswordModal);
            btnConfirm.addEventListener('click', submitPasswordChange);

            // Listener para la respuesta del servidor
            socket.on('user:changePasswordResponse', (response) => {
                btnConfirm.disabled = false;
                btnConfirm.textContent = 'Guardar Cambios';

                if (response.success) {
                    successDiv.textContent = response.message;
                    successDiv.style.display = 'block';
                    setTimeout(closeChangePasswordModal, 2500); // Cierra el modal tras el éxito
                } else {
                    errorDiv.textContent = response.message;
                    errorDiv.style.display = 'block';
                }
            });
        }
        // ▲▲▲ FIN DEL BLOQUE DE CÓDIGO ▲▲▲
    })();
})();
// --- FIN: SCRIPT DEL LOBBY ---


// --- INICIO: SCRIPT DEL JUEGO ---
(function() {

    socket.on('chatHistory', (history) => {
        console.log('Recibiendo historial del chat con', history.length, 'mensajes.');
        const messagesInner = document.getElementById('chat-messages-inner');
        if (messagesInner) {
            messagesInner.innerHTML = ''; // Limpiamos la vista actual
            // Llenamos el chat con el historial recibido
            history.forEach(msg => {
                const role = msg.sender === 'Sistema' ? 'system' : 'player';
                addChatMessage(msg.sender, msg.message, role);
            });
        }
    });

    socket.on('oponenteDescarto', (data) => {
        console.log(`El oponente (${data.playerId}) descartó la carta:`, data.card);
        discardPile.push(data.card);
        renderDiscard();
    });

    socket.on('playerSatDownToWait', (data) => {
        console.log('Un jugador se ha sentado para esperar. Actualizando vista de jugadores.');
        
        const newSeats = data.seats;
        updatePlayersView(newSeats, true); 


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
        const userCredits = currentUser.credits ?? parseInt(localStorage.getItem('userCredits')) ?? 1000; // MIGRACIÓN SEGURA

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

        // ▼▼▼ LIMPIEZA DE TEMPORIZADORES AL CAMBIAR TURNO ▼▼▼
        document.querySelectorAll('.timer-countdown').forEach(el => {
            el.textContent = '';
        });
        // ▲▲▲ FIN DE LA LIMPIEZA ▲▲▲
    
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

        // Sincronizamos el estado oficial del servidor en nuestras variables locales
        allMelds = data.newMelds || [];
        turnMelds = data.turnMelds || [];

        if (data.playerHandCounts) {
            updatePlayerHandCounts(data.playerHandCounts);
        }

        // Si la animación de nuestra propia bajada está en curso, no hacemos nada más.
        // La animación se encargará de redibujar la mesa cuando termine.
        if (isAnimatingLocalMeld) {
            console.log("Ignorando renderizado de 'meldUpdate' por animación local en curso.");
            return;
        }

        // 1. Primero, renderizamos la mesa con el nuevo estado oficial (para otros jugadores).
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
                    }, 4000);
                }
            }
        }
    });

    // Reemplaza el listener socket.on('playerEliminated',...)
    socket.on('playerEliminated', (data) => {
        console.log('Jugador eliminado:', data);
        showEliminationMessage(data.playerName, data.faultData); // Pasamos el objeto faultData

        const playerViewIndex = orderedSeats.findIndex(s => s && s.playerId === data.playerId);
        if (playerViewIndex !== -1) {
            const p = players[playerViewIndex];
            if (p) {
                p.active = false;
                p.hand = [];
            }
            const infoBotEl = document.getElementById(`info-player${playerViewIndex}`);
            if (infoBotEl) {
                const counterEl = infoBotEl.querySelector('.card-counter');
                if (counterEl) {
                    counterEl.textContent = '❌ Eliminado';
                }
            }
            if (playerViewIndex === 0) {
                const humanHandEl = document.getElementById('human-hand');
                if (humanHandEl) {
                    humanHandEl.innerHTML = '';
                }
            }
        }
    });

    // ▼▼▼ LISTENERS DEL TEMPORIZADOR DE TURNOS ▼▼▼
    socket.on('timerUpdate', ({ playerId, timeLeft, totalDuration }) => {
        // Limpiar todos los contadores primero
        document.querySelectorAll('.timer-countdown').forEach(el => el.textContent = '');

        if (timeLeft <= 0) return;

        // ▼▼▼ LÓGICA CORREGIDA PARA ENCONTRAR EL JUGADOR CORRECTO ▼▼▼
        // Buscar el jugador en orderedSeats (que está ordenado para cada cliente)
        const playerViewIndex = orderedSeats.findIndex(s => s && s.playerId === playerId);
        if (playerViewIndex !== -1) {
            const playerInfoEl = document.getElementById(`info-player${playerViewIndex}`);
            if (playerInfoEl) {
                const countdownEl = playerInfoEl.querySelector('.timer-countdown');
                if (countdownEl) {
                    countdownEl.textContent = timeLeft;
                    
                    // ▼▼▼ INICIO DEL CÓDIGO A AÑADIR ▼▼▼
                    // Limpia clases de color anteriores
                    countdownEl.classList.remove('timer-green', 'timer-yellow', 'timer-red');

                    // Calcula el porcentaje y aplica la clase nueva
                    if (totalDuration > 0) {
                        const percentage = (timeLeft / totalDuration) * 100;
                        if (percentage <= 25) {
                            countdownEl.classList.add('timer-red');
                        } else if (percentage <= 50) {
                            countdownEl.classList.add('timer-yellow');
                        } else {
                            countdownEl.classList.add('timer-green');
                        }
                    }
                    // ▲▲▲ FIN DEL CÓDIGO A AÑADIR ▲▲▲
                }
            }
        } else {
            // ▼▼▼ FALLBACK: Si no se encuentra en orderedSeats, buscar en todos los elementos ▼▼▼
            // Esto puede pasar si hay problemas de sincronización
            console.log(`[Timer] No se encontró el jugador ${playerId} en orderedSeats, usando fallback`);
            
            // Buscar en todos los elementos info-player
            for (let i = 0; i < 4; i++) {
                const playerInfoEl = document.getElementById(`info-player${i}`);
                if (playerInfoEl) {
                    // Verificar si este elemento contiene el jugador correcto
                    const playerNameEl = playerInfoEl.querySelector('.player-name');
                    if (playerNameEl) {
                        // Buscar en orderedSeats para ver si este índice corresponde al jugador
                        const seatAtIndex = orderedSeats[i];
                        if (seatAtIndex && seatAtIndex.playerId === playerId) {
                            const countdownEl = playerInfoEl.querySelector('.timer-countdown');
                            if (countdownEl) {
                                countdownEl.textContent = timeLeft;
                                
                                // ▼▼▼ COLORES DINÁMICOS EN FALLBACK ▼▼▼
                                // Limpia clases de color anteriores
                                countdownEl.classList.remove('timer-green', 'timer-yellow', 'timer-red');

                                // Calcula el porcentaje y aplica la clase nueva
                                if (totalDuration > 0) {
                                    const percentage = (timeLeft / totalDuration) * 100;
                                    if (percentage <= 25) {
                                        countdownEl.classList.add('timer-red');
                                    } else if (percentage <= 50) {
                                        countdownEl.classList.add('timer-yellow');
                                    } else {
                                        countdownEl.classList.add('timer-green');
                                    }
                                }
                                // ▲▲▲ FIN DE COLORES DINÁMICOS EN FALLBACK ▲▲▲
                                
                                break;
                            }
                        }
                    }
                }
            }
        }
        // ▲▲▲ FIN DE LA LÓGICA CORREGIDA ▲▲▲
    });

    socket.on('kickedForInactivity', ({ reason }) => {
        showEliminationMessage(currentUser.username, { reason });
        // Usamos un timeout para que el jugador pueda leer el mensaje antes de volver al lobby.
        setTimeout(() => {
            goBackToLobby();
        }, 4000);
    });
    // ▲▲▲ FIN DE LOS LISTENERS DEL TEMPORIZADOR ▲▲▲

    // ▼▼▼ REEMPLAZA TU LISTENER socket.on('gameEnd', ...) CON ESTE ▼▼▼
    socket.on('gameEnd', (data) => {
        console.log('PARTIDA FINALIZADA.', data);

        resetClientGameState(); 

        if (data.finalRoomState) {
            updatePlayersView(data.finalRoomState.seats, true); 
        }

        const wasPlayerInGame = data.finalRoomState.seats.some(s => s && s.playerId === socket.id);

        const victoryOverlay = document.getElementById('victory-overlay');
        const victoryMessage = document.getElementById('victory-message');
        const finalScores = document.getElementById('final-scores');
        const setupRematchBtn = document.getElementById('btn-setup-rematch');

        let headerText = `¡${data.winnerName} ha ganado la partida!`;
        if (data.abandonment && data.abandonment.name) {
            headerText += `<br><span style="font-size: 0.9rem; color: #ffdddd;">(Por abandono de ${data.abandonment.name})</span>`;
        }
        victoryMessage.innerHTML = headerText;

        // --- INICIO DE LA LÓGICA DE EQUIVALENCIA ---
        let finalHTML = data.scoresHTML || '<p>No hay detalles de la partida.</p>';

        if (data.potData && currentUser.currency && data.potData.currency !== currentUser.currency) {
            const potInfo = data.potData;
            const convertedPot = convertCurrency(potInfo.pot, potInfo.currency, currentUser.currency, clientExchangeRates);
            const convertedCommission = convertCurrency(potInfo.commission, potInfo.currency, currentUser.currency, clientExchangeRates);
            const convertedWinnings = convertCurrency(potInfo.winnings, potInfo.currency, currentUser.currency, clientExchangeRates);
            const symbol = currentUser.currency === 'EUR' ? '€' : currentUser.currency;

            const equivalencyHTML = `
                <div style="border-top: 1px solid #555; margin-top: 15px; padding-top: 10px; text-align: left; font-size: 0.9rem; color: #aaa;">
                    <p><strong>Equivalencia en tu moneda (${symbol}):</strong></p>
                    <p>Bote Total: ~${convertedPot.toFixed(2)} ${symbol}</p>
                    <p>Comisión: ~${convertedCommission.toFixed(2)} ${symbol}</p>
                    <p style="color: #6bff6b; font-weight: bold;">Ganancia: ~${convertedWinnings.toFixed(2)} ${symbol}</p>
                </div>
            `;
            finalHTML += equivalencyHTML;
        }

        finalScores.innerHTML = finalHTML;
        // --- FIN DE LA LÓGICA DE EQUIVALENCIA ---

        if (wasPlayerInGame) {
            setupRematchBtn.style.display = 'inline-block';
            setupRematchBtn.onclick = setupRematchScreen;
        } else {
             setupRematchBtn.style.display = 'none';
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

        // El botón solo aparece si: se puede iniciar, el jugador es el host Y YA HA CONFIRMADO
        if (data.canStart && socket.id === data.hostId && mainButton.disabled) {
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

        // Ya no es necesario que el cliente pida una actualización,
        // el servidor la enviará automáticamente gracias al cambio en el Paso 1.

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

        // Actualizar el estado del descarte para todos los jugadores
        if (data.source === 'discard' && data.newDiscardPile) {
            discardPile = data.newDiscardPile;
            renderDiscard(); // Actualizar la vista del descarte
        }

        // Actualizar los conteos de cartas (tanto para robar del mazo como del descarte)
        if (data.playerHandCounts) {
            updatePlayerHandCounts(data.playerHandCounts);
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

    // ▼▼▼ AÑADE ESTE LISTENER COMPLETO AQUÍ ▼▼▼
    socket.on('practiceGameFaultEnd', () => {
        // Activamos la bandera que indica que el juego de práctica terminó por una falta.
        // El modal de eliminación se mostrará gracias al evento 'playerEliminated' que se recibe primero.
        practiceGameEndedByFault = true;
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

    // ▼▼▼ AÑADE ESTE LISTENER COMPLETO AQUÍ ▼▼▼
    // ▼▼▼ REEMPLAZA TUS LISTENERS 'practiceGameHumanWin' y 'practiceGameEnded' CON ESTOS DOS ▼▼▼

    socket.on('practiceGameHumanWin', () => {
        // Obtenemos los elementos del modal de victoria
        const victoryModal = document.getElementById('practice-victory-modal');
        const title = victoryModal.querySelector('h2');
        const message = victoryModal.querySelector('p');

        // Cambiamos el texto para la victoria del jugador
        title.textContent = '¡Victoria!';
        message.textContent = '¡Felicidades, has ganado la partida de práctica!';

        // Mostramos el modal ya actualizado
        showOverlay('practice-victory-modal');
    });

    socket.on('practiceGameBotWin', (data) => {
        // Obtenemos los mismos elementos del modal de victoria
        const victoryModal = document.getElementById('practice-victory-modal');
        const title = victoryModal.querySelector('h2');
        const message = victoryModal.querySelector('p');

        // Cambiamos el texto para mostrar qué bot ganó
        title.textContent = 'Partida Terminada';
        message.textContent = `El jugador ${data.winnerName} ha ganado la partida.`;

        // Mostramos el modal ya actualizado
        showOverlay('practice-victory-modal');
    });

    // ▲▲▲ FIN DEL CÓDIGO DE REEMPLAZO ▲▲▲

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
    let players = [];
    let gameStarted = false;
    let deck = [], discardPile = [], currentPlayer = 0, allMelds = [], turnMelds = []; // Añadir turnMelds
    let unreadMessages = 0;
    let isWaitingForNextTurn = false;
    let isAnimatingLocalMeld = false; // <<-- AÑADE ESTA LÍNEA
    let practiceGameEndedByFault = false; // <<-- AÑADE ESTA LÍNEA
    let penaltyAmount, requiredMeld, hasDrawn, drewFromDiscard, discardCardUsed, mustDiscard, strictRules, drewFromDeckToWin, selectedCards, isDrawing;

    // ▼▼▼ PEGA EL BLOQUE COMPLETO AQUÍ ▼▼▼
    // Configuración de los botones del modal de reinicio de práctica (Ubicación corregida)
    document.addEventListener('DOMContentLoaded', () => {
        const btnRestart = document.getElementById('btn-restart-practice');
        const btnExit = document.getElementById('btn-exit-practice');

        if (btnRestart) {
            btnRestart.onclick = () => {
                hideOverlay('practice-restart-modal');
                // Asegurarnos que currentGameSettings exista antes de usarlo
                if (currentGameSettings && currentGameSettings.roomId) {
                    socket.emit('requestPracticeRematch', { roomId: currentGameSettings.roomId });
                } else {
                    console.error("No se pudo reiniciar la partida: roomId no encontrado.");
                    goBackToLobby(); // Fallback seguro
                }
            };
        }

        if (btnExit) {
            btnExit.onclick = () => {
                hideOverlay('practice-restart-modal');
                goBackToLobby();
            };
        }

        // ▼▼▼ AÑADIR EVENT LISTENERS PARA EL MODAL DE FUNCIONES ▼▼▼
        const btnShowFunctions = document.getElementById('btn-show-functions');
        const btnCloseFunctions = document.getElementById('btn-close-functions-modal');

        if (btnShowFunctions) {
            btnShowFunctions.onclick = showFunctionsModal;
        }
        if (btnCloseFunctions) {
            btnCloseFunctions.onclick = () => {
                hideFunctionsModal();
                // Si estamos en una partida de práctica, mostramos el siguiente modal.
                if (currentGameSettings && currentGameSettings.isPractice) {
                    showBotInfoModalOnce();
                }
            };
        }
        // Añade el handler para el botón del nuevo modal
        const btnCloseBotInfo = document.getElementById('btn-close-bot-info');
        if (btnCloseBotInfo) {
            btnCloseBotInfo.onclick = hideBotInfoModal;
        }

        // ▼▼▼ LÓGICA GLOBAL PARA LOS BOTONES DE CERRAR (X) ▼▼▼
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.onclick = () => {
                // Busca el modal padre más cercano y lo oculta
                const modal = btn.closest('.overlay, [role="dialog"]');
                if (modal) {
                    modal.style.display = 'none';
                }
            };
        });
        // ▲▲▲ FIN DEL CÓDIGO AÑADIDO ▲▲▲

        // ▼▼▼ AÑADE ESTE BLOQUE DE CÓDIGO AQUÍ DENTRO ▼▼▼
        const btnAcceptVictory = document.getElementById('btn-accept-practice-victory');
        if (btnAcceptVictory) {
            btnAcceptVictory.onclick = () => {
                // 1. Oculta el modal de victoria
                hideOverlay('practice-victory-modal');
                // 2. Muestra el modal de reinicio
                showOverlay('practice-restart-modal');
            };
        }
        // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲
    });
    // ▲▲▲ FIN DEL BLOQUE A PEGAR ▲▲▲

    // ▼▼▼ AÑADE ESTE LISTENER COMPLETO ▼▼▼
    socket.on('resetForNewGame', (data) => {
        // No hacer nada aquí para no borrar el chat.
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲

    // ▼▼▼ AÑADE ESTE NUEVO LISTENER COMPLETO ▼▼▼

// ▼▼▼ REEMPLAZO COMPLETO Y DEFINITIVO ▼▼▼
socket.on('gameStarted', (initialState) => {
    
    // CORRECCIÓN CLAVE: Si es una partida de práctica, inicializamos manualmente
    // las configuraciones que las mesas reales inicializan por otra vía.
    if (initialState.isPractice) {
        
        // 1. Creamos el objeto de configuración que estaba ausente y causaba el error.
        currentGameSettings = {
            isPractice: true,
            roomId: `practice-${socket.id}`,
            settings: {
                username: 'Práctica', // Nombre placeholder para la mesa
                bet: 0,
                penalty: 0
            }
        };

        // 2. Ahora que la configuración existe, podemos mostrar la vista y activar los botones sin errores.
        document.body.classList.add('game-active');
        document.getElementById('lobby-overlay').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        setupChat();
        setupInGameLeaveButton();
        
        // ▼▼▼ AÑADIR ESTA LÍNEA PARA MOSTRAR EL MODAL EN PRÁCTICA ▼▼▼
        showFunctionsModalOnce();
    }

    // El resto del código es el que ya tenías y es correcto para AMBOS tipos de partida.
    document.querySelector('.player-actions').style.display = 'flex';
    resetClientGameState();
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
    
    // ▼▼▼ CORRECCIÓN ▼▼▼
    // Asignamos la mano directamente al jugador local, que la lógica de la UI 
    // siempre posiciona en el índice 0 del array 'players'.
    if (players[0]) {
        players[0].hand = initialState.hand;
    }
    // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲
    
    discardPile = initialState.discardPile;
    
    const startingPlayer = initialState.seats.find(sp => sp && sp.playerId === initialState.currentPlayerId);
    if (startingPlayer) {
        currentPlayer = orderedSeats.findIndex(s => s && s.playerId === startingPlayer.playerId);
    } else {
        currentPlayer = 0;
    }
    
    // ▼▼▼ CORRECCIÓN ▼▼▼
    // Reemplazamos la referencia a 'myPlayerData' por 'players[0]', que es la correcta.
    const myPlayerData = players[0]; // Definimos la variable para que el código sea más legible.
    // El primer jugador puede tener 15 o 16 cartas al inicio (16 si es el que empieza)
    if (myPlayerData && myPlayerData.hand && (myPlayerData.hand.length === 15 || myPlayerData.hand.length === 16)) {
        hasDrawn = true;
        mustDiscard = true;
        showToast("Empiezas tú. Puedes descartar para iniciar el juego.", 4000);
    } else {
        hasDrawn = false;
        mustDiscard = false;
    }
    // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲

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
        updatePlayersView(roomData.seats, gameStarted);
        renderGameControls();
    });

    socket.on('playerLeft', (roomData) => {
        console.log('Un jugador ha abandonado la sala:', roomData);
        currentGameSettings = { ...currentGameSettings, ...roomData };
        updatePlayersView(roomData.seats, gameStarted); // Pasamos el estado actual del juego
        renderGameControls();
    });

    // ▼▼▼ AÑADE ESTE NUEVO LISTENER COMPLETO ▼▼▼
    socket.on('playerConnectionUpdate', (data) => {
        console.log('Actualización de estado de conexión:', data);
        
        // Buscamos el índice visual del jugador afectado (puede ser el ID viejo o el nuevo)
        let playerViewIndex = orderedSeats.findIndex(s => s && (s.playerId === data.playerId || s.playerId === data.newPlayerId));

        if (playerViewIndex !== -1) {
            const infoBotEl = document.getElementById(`info-player${playerViewIndex}`);
            if (!infoBotEl) return;
            
            // Quitamos cualquier estado visual anterior
            infoBotEl.classList.remove('player-reconnecting');
            
            if (data.status === 'reconnecting') {
                infoBotEl.classList.add('player-reconnecting');
                showToast(data.message, 5000); // Mostramos el aviso
            } else if (data.status === 'reconnected') {
                // El jugador ha vuelto, actualizamos su ID de socket en la UI
                if (orderedSeats[playerViewIndex]) {
                    orderedSeats[playerViewIndex].playerId = data.newPlayerId;
                }
                showToast(data.message, 3000);
            }
        }
    });
    // ▲▲▲ FIN DEL NUEVO LISTENER ▲▲▲
    
    function resetClientGameState() {
        console.log('CLIENTE: Reseteando estado del juego para nueva partida.');

        // ▼▼▼ LIMPIEZA DE TEMPORIZADORES VISUALES ▼▼▼
        document.querySelectorAll('.timer-countdown').forEach(el => {
            el.textContent = '';
        });
        // ▲▲▲ FIN DE LA LIMPIEZA ▲▲▲

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
        
        // ▼▼▼ AÑADE ESTE BLOQUE JUSTO AL PRINCIPIO DE la función initializeGame ▼▼▼
        // Reseteo robusto y explícito del estado de la UI del chat.
        const chatWindowForReset = document.getElementById('chat-window');
        if (chatWindowForReset) {
            chatWindowForReset.classList.remove('visible');
        }
        const badgeForReset = document.getElementById('chat-notification-badge');
        if (badgeForReset) {
            badgeForReset.style.display = 'none';
            badgeForReset.textContent = '0';
        }
        unreadMessages = 0;
        // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲
        // MIGRACIÓN SEGURA: Mantener datos originales del usuario
        currentUser.name = currentUser.username || localStorage.getItem('username');
        currentUser.id = socket.id;

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

        setupChat();
        document.getElementById('melds-display').innerHTML = '';
        renderDiscard();
        setupInGameLeaveButton();
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
            
            // Se añade la comprobación "&& gameStarted"
            if (isActivePlayer && gameStarted) {
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

    
    function handleSitDown() {
        hideOverlay('ready-overlay');
        
        // ▼▼▼ AÑADIR ESTA LÍNEA PARA MOSTRAR EL MODAL EN MESAS REALES ▼▼▼
        showFunctionsModalOnce();
        
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
// ▼▼▼ REEMPLAZA LA FUNCIÓN updatePlayersView ENTERA CON ESTE CÓDIGO ▼▼▼
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

        // ▼▼▼ AÑADE ELEMENTO DEL TEMPORIZADOR ▼▼▼
        const timerEl = document.createElement('div');
        timerEl.className = 'turn-timer';
        // Limpiar temporizador viejo si existe
        const oldTimer = playerInfoEl.querySelector('.turn-timer');
        if(oldTimer) oldTimer.remove();
        playerInfoEl.appendChild(timerEl);
        // ▲▲▲ FIN DE LA ADICIÓN ▲▲▲
        
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

    // ▼▼▼ REEMPLAZA TU FUNCIÓN window.goBackToLobby ENTERA CON ESTA VERSIÓN SIMPLIFICADA ▼▼▼
    window.goBackToLobby = function() {
        if (currentGameSettings && currentGameSettings.roomId) {
            console.log('Notificando al servidor la salida de la sala para limpieza...');
            socket.emit('leaveGame', { roomId: currentGameSettings.roomId });
        }

        // --- EL BLOQUE DE "NUEVA IDENTIDAD" HA SIDO ELIMINADO ---
        // Ya no se genera un nuevo userId cada vez. La identidad del jugador
        // se mantiene estable desde que inicia sesión hasta que la cierra.

        // Limpiamos las variables de la partida anterior
        resetClientGameState();
        currentGameSettings = null; // Limpiar configuración de la partida anterior

        // ▼▼▼ AÑADE ESTE BLOQUE ▼▼▼
        // Reseteamos visualmente el bote al salir de la partida
        const potValueEl = document.querySelector('#game-pot-container .pot-value');
        if (potValueEl) {
            potValueEl.textContent = '0';
        }
        // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲
        
        // Mostramos la vista del lobby
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

    // ▼▼▼ AÑADE ESTE BLOQUE COMPLETO ANTES DE la función setupChat ▼▼▼

    // 1. Funciones que manejarán los eventos del chat. Las separamos para poder
    //    añadir y quitar los listeners de forma controlada.

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
                sender: currentUser.name || 'Jugador'
            });
            input.value = '';
        }
    }

    function handleChatKeypress(e) {
        if (e.key === 'Enter') {
            handleChatSend();
        }
    }
    // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲

    // ▼▼▼ REEMPLAZA TU FUNCIÓN setupChat ENTERA CON ESTA VERSIÓN ▼▼▼
    function setupChat() {
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');

        if (!toggleBtn || !sendBtn || !input) {
            console.error("No se encontraron los elementos de la UI del chat.");
            return;
        }

        // --- LA MAGIA ESTÁ AQUÍ ---
        // Eliminamos los listeners antiguos antes de añadir los nuevos.
        // Esto previene la acumulación de eventos y soluciona el bug de raíz.
        toggleBtn.removeEventListener('click', handleChatToggle);
        toggleBtn.addEventListener('click', handleChatToggle);

        sendBtn.removeEventListener('click', handleChatSend);
        sendBtn.addEventListener('click', handleChatSend);

        input.removeEventListener('keypress', handleChatKeypress);
        input.addEventListener('keypress', handleChatKeypress);

        // El resto de la lógica que tenías (como el botón de reglas) puede permanecer si lo deseas.
        const rulesBtn = document.getElementById('game-rules-btn');
        const rulesModal = document.getElementById('rules-modal');
        if (rulesBtn && rulesModal) {
            // Hacemos lo mismo por seguridad
            rulesBtn.removeEventListener('click', () => rulesModal.style.display = 'flex');
            rulesBtn.addEventListener('click', () => {
                rulesModal.style.display = 'flex';
            });
        }

        // Mantener la lógica del chat UI content
        const chatUiContent = document.getElementById('chat-ui-content');
        if (chatUiContent) {
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
            } else if (currentUser.role === 'host') { 
                renderSpectatorListForHost(); 
            }
            addChatMessage(null, `Bienvenido a la mesa de ${currentGameSettings.settings.username}.`, 'system');
        }
    }
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
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
    
    // ▼▼▼ LÓGICA UNIFICADA PARA SOLTAR CARTA (DROP) ▼▼▼
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const targetElement = e.currentTarget; // Puede ser una carta o el contenedor de la mano
        targetElement.classList.remove('drag-over', 'drop-zone');

        try {
            const droppedIndices = JSON.parse(e.dataTransfer.getData('application/json'));
            const player = players[0];
            if (!player) return;

            let targetIndex;

            // CASO 1: Se suelta sobre OTRA CARTA
            if (targetElement.classList.contains('card')) {
                const rect = targetElement.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                const originalIndex = parseInt(targetElement.dataset.index);

                targetIndex = (e.clientX > midpoint) ? originalIndex + 1 : originalIndex;
            } 
            // CASO 2: Se suelta en un espacio vacío del CONTENEDOR de la mano
            else if (targetElement.id === 'human-hand') {
                const firstCard = targetElement.firstElementChild;
                const lastCard = targetElement.lastElementChild;
                targetIndex = player.hand.length; // Por defecto, va al final

                if (firstCard && lastCard) {
                    const firstCardRect = firstCard.getBoundingClientRect();
                    const lastCardRect = lastCard.getBoundingClientRect();

                    if (e.clientX < firstCardRect.left + (firstCardRect.width / 2)) {
                        targetIndex = 0; // Se suelta al principio
                    } else if (e.clientX > lastCardRect.left + (lastCardRect.width / 2)) {
                        targetIndex = player.hand.length; // Se suelta al final
                    }
                }
            }

            if (targetIndex !== undefined) {
                reorderHand(droppedIndices, targetIndex);
            }

        } catch (error) {
            console.error("Error al procesar el drop:", error);
            renderHands(); // Restaura la mano si algo falla
        }
    };
    // ▲▲▲ FIN LÓGICA UNIFICADA DROP ▲▲▲
    
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
        // ▼▼▼ FUNCIÓN TOUCH CON LÓGICA DE PRECISIÓN Y EXTREMOS ▼▼▼
        const handleTouchDrag = (initialTouch, dragData) => {
            const cloneContainer = document.getElementById('drag-clone-container');
            cloneContainer.innerHTML = '';

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
            const dropTargets = [...document.querySelectorAll('#human-hand .card'), document.getElementById('human-hand'), document.getElementById('discard'), ...document.querySelectorAll('.meld-group'), document.querySelector('.center-area')];

            const onTouchMove = (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                updatePosition(touch);

                cloneContainer.style.display = 'none';
                const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                cloneContainer.style.display = 'block';
                
                let currentTarget = elementUnder ? dropTargets.find(dt => dt.contains(elementUnder)) : null;

                if (lastTarget && lastTarget !== currentTarget) {
                    lastTarget.classList.remove('drag-over', 'drop-zone'); // Se elimina 'drop-zone-hand'
                }
                if (currentTarget && currentTarget !== lastTarget) {
                    let className = 'drop-zone';
                    if (currentTarget.classList.contains('card')) {
                        className = 'drag-over';
                    }
                    // Ya no se necesita la clase 'drop-zone-hand'
                    currentTarget.classList.add(className);
                }
                lastTarget = currentTarget;
            };

            const onTouchEnd = (e) => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                cloneContainer.innerHTML = '';
                
                if (lastTarget) {
                    lastTarget.classList.remove('drag-over', 'drop-zone');
                }
                
                document.querySelectorAll('#human-hand .card.dragging').forEach(c => c.classList.remove('dragging'));

                try {
                    const droppedIndices = JSON.parse(dragData);
                    if (!lastTarget) return;

                    if (lastTarget.classList.contains('card')) {
                        const finalTouch = e.changedTouches[0];
                        const rect = lastTarget.getBoundingClientRect();
                        const midpoint = rect.left + rect.width / 2;
                        
                        let originalIndex = parseInt(lastTarget.dataset.index);
                        let targetIndex = originalIndex;

                        if (finalTouch.clientX > midpoint) {
                            targetIndex = originalIndex + 1;
                        }
                        reorderHand(droppedIndices, targetIndex);

                    } 
                    // ▼▼▼ INICIO DEL BLOQUE MODIFICADO PARA MÓVIL ▼▼▼
                    else if (lastTarget.id === 'human-hand') {
                        const player = players[0];
                        if (!player) return;

                        const finalTouch = e.changedTouches[0];
                        const firstCard = lastTarget.firstElementChild;
                        const lastCard = lastTarget.lastElementChild;
                        let targetIndex = player.hand.length;

                        if (firstCard && lastCard) {
                            const firstCardRect = firstCard.getBoundingClientRect();
                            const lastCardRect = lastCard.getBoundingClientRect();

                            if (finalTouch.clientX < firstCardRect.left + (firstCardRect.width / 2)) {
                                targetIndex = 0;
                            } else if (finalTouch.clientX > lastCardRect.left + (lastCardRect.width / 2)) {
                                targetIndex = player.hand.length;
                            }
                        }
                        reorderHand(droppedIndices, targetIndex);
                    } 
                    // ▲▲▲ FIN DEL BLOQUE MODIFICADO ▲▲▲
                    else if (lastTarget.id === 'discard') {
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
                    renderHands();
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

        // ▼▼▼ RESTAURADO: Drag & drop nativo para PC ▼▼▼
        d.addEventListener('dragstart', startDrag);
        d.addEventListener('dragend', endDrag);
        // ▲▲▲ FIN RESTAURADO ▲▲▲

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

        // ▼▼▼ LÓGICA UNIFICADA PARA SOLTAR CARTA ▼▼▼
        d.addEventListener('drop', handleDrop);

        fragment.appendChild(d);
    });
    
    human.appendChild(fragment);

    // ▼▼▼ LISTENERS DEL CONTENEDOR DE LA MANO (PC) ▼▼▼
    human.addEventListener('dragover', (e) => {
        e.preventDefault(); // Crucial para permitir el 'drop'.
    });

    human.addEventListener('drop', handleDrop);
    // ▲▲▲ FIN LISTENERS DEL CONTENEDOR ▲▲▲

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
        // ▼▼▼ LÍNEA AÑADIDA PARA COMPATIBILIDAD MÓVIL ▼▼▼
        g.addEventListener('touchend', handleMeldGroupClick);
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
    // ▼▼▼ REEMPLAZA TU FUNCIÓN animateCardMovement ENTERA CON ESTA VERSIÓN CORREGIDA ▼▼▼
    function animateCardMovement({
        cardsData = [],
        startElement,
        endElement,
        isBack = false,
        duration = 1200,
        rotation = 5
    }) {
        return new Promise(resolve => {
            if (!startElement || !endElement) {
                console.warn("Animación omitida: falta el elemento de inicio o fin.");
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

            // --- INICIO DE LA CORRECCIÓN ---
            // Se utiliza un único bucle que empieza en i=0 para crear TODAS las cartas.
            // Esto elimina cualquier código previo que creara la primera carta por separado.
            for (let i = 0; i < cardCount; i++) {
                const cardData = cardsData[i];
                const innerCard = document.createElement('div');
                innerCard.className = 'card';
                innerCard.style.width = `${cardWidth}px`;
                innerCard.style.height = `${cardHeight}px`;
                innerCard.style.position = 'relative';
                innerCard.style.zIndex = '1000';

                if (isBack) {
                    innerCard.classList.add('card-back');
                } else if (cardData) {
                    innerCard.innerHTML = `<img src="${getCardImageUrl(cardData)}" alt="${cardData.value}" style="width: 100%; height: 100%; border-radius: inherit; display: block;">`;
                }

                // Se aplica el margen de superposición solo a partir de la segunda carta (cuando i > 0).
                if (i > 0) {
                    innerCard.style.marginLeft = `-${cardWidth / 2}px`;
                }

                animContainer.appendChild(innerCard);
            }
            // --- FIN DE LA CORRECCIÓN ---

            const totalAnimWidth = cardWidth + (cardCount - 1) * (cardWidth / 2);
            animContainer.style.left = `${startRect.left + (startRect.width / 2) - (totalAnimWidth / 2)}px`;
            animContainer.style.top = `${startRect.top + (startRect.height / 2) - (cardHeight / 2)}px`;
            animContainer.style.position = 'fixed';
            animContainer.style.zIndex = '9999';
            document.body.appendChild(animContainer);

            requestAnimationFrame(() => {
                animContainer.style.transition = `all ${duration}ms cubic-bezier(0.65, 0, 0.35, 1)`;
                const targetLeft = endRect.left + (endRect.width / 2) - (totalAnimWidth / 2);
                const targetTop = endRect.top + (endRect.height / 2) - (cardHeight / 2);
                const finalScale = (endElement.querySelector('.card')?.offsetWidth || 60) / cardWidth;
                animContainer.style.transform = `translate(${targetLeft - parseFloat(animContainer.style.left)}px, ${targetTop - parseFloat(animContainer.style.top)}px) scale(${finalScale}) rotate(0deg)`;
            });

            setTimeout(() => {
                if (animContainer.parentNode) {
                    animContainer.remove();
                }
                resolve();
            }, duration);
        });
    }
    // ▲▲▲ FIN DEL CÓDIGO DE REEMPLAZO ▲▲▲
    function getSuitName(s) { if(s==='hearts')return'Corazones'; if(s==='diamonds')return'Diamantes'; if(s==='clubs')return'Tréboles'; if(s==='spades')return'Picas'; return ''; }
    function getSuitIcon(s) { if(s==='hearts')return'♥'; if(s==='diamonds')return'♦'; if(s==='clubs')return'♣'; if(s==='spades')return'♠'; return ''; }
    function updateTurnIndicator() { 
        for (let i = 0; i < 4; i++) { 
            const e = document.getElementById(`info-player${i}`); 
            if(e) e.classList.remove('current-turn-glow'); 
        } 
        const e = document.getElementById(`info-player${currentPlayer}`); 
        if(e) e.classList.add('current-turn-glow'); 
    }
    function updatePointsIndicator() { } function updateDebugInfo() { } let hidePlayerActionToasts = true; function showPlayerToast(msg, duration=3000) { if (hidePlayerActionToasts) return; showToast(msg, duration); } function showOverlay(id) { document.getElementById(id).style.display = 'flex'; } function hideOverlay(id) { document.getElementById(id).style.display = 'none'; }
    // Pega esta función completa en tu game.js
    function createCardDisplayHTML(cards) {
        if (!cards || cards.length === 0) return '';
        return cards.map(card => `
            <div class="card" style="position: relative; display: inline-block;">
                <img src="${getCardImageUrl(card)}" alt="${card.value}" style="width: 100%; height: 100%; display: block;">
            </div>
        `).join('');
    }

    // Reemplaza la función showEliminationMessage entera
    function showEliminationMessage(playerName, faultData) {
        // ▼▼▼ LÍNEA DE SEGURIDAD PARA FAULTDATA ▼▼▼
        faultData = faultData || {};
        // ▲▲▲ FIN DE LA LÍNEA DE SEGURIDAD ▲▲▲

        const el = document.getElementById('elimination-message');
        const faultDetailsContainer = document.getElementById('fault-details-container');
        const invalidComboContainer = document.getElementById('invalid-combo-container');
        const correctComboContainer = document.getElementById('correct-combo-container');
        const invalidDisplay = document.getElementById('invalid-combo-display');
        const correctDisplay = document.getElementById('correct-combo-display');

        if (!el || !faultDetailsContainer) return;

        // 1. Mostrar el mensaje de texto principal
        const penalty = currentGameSettings?.settings?.penalty || 0;
        const tableCurrency = currentGameSettings?.settings?.betCurrency || 'USD';
        let penaltyText = `${penalty.toLocaleString('es-CO')} ${tableCurrency}`;

        if (currentUser.currency && tableCurrency !== currentUser.currency) {
            const convertedPenalty = convertCurrency(penalty, tableCurrency, currentUser.currency, clientExchangeRates);
            const symbol = currentUser.currency === 'EUR' ? '€' : currentUser.currency;
            penaltyText += ` <span style="font-size: 0.9rem; color: #aaa;">(Aprox. ${convertedPenalty.toFixed(2)} ${symbol})</span>`;
        }

        el.innerHTML = `Jugador <strong>${playerName}</strong> ha sido eliminado y pagará la multa adicional de <strong>${penaltyText}</strong> por la siguiente falta:
            <div style="background: rgba(255,0,0,0.1); border: 1px solid #ff4444; padding: 10px; border-radius: 8px; margin-top: 15px; font-size: 1.1em; color: #ffdddd; text-align: center;">
                ${faultData.reason}
            </div>`;

        // 2. Lógica para mostrar las cartas
        faultDetailsContainer.style.display = 'none';
        invalidComboContainer.style.display = 'none';
        correctComboContainer.style.display = 'none';

        // PEGA ESTA VERSIÓN CORREGIDA EN SU LUGAR
        if (faultData.invalidCards) {
            if (faultData.contextCards) { // CASO: Descarte Ilegal
                // Contenedor 1: Muestra LA CARTA que se intentó descartar.
                invalidComboContainer.querySelector('h4').textContent = 'Carta Descartada Ilegalmente:';
                invalidDisplay.innerHTML = createCardDisplayHTML(faultData.invalidCards);
                invalidComboContainer.style.display = 'block';

                // Contenedor 2: Muestra EL JUEGO en mesa donde se podía añadir.
                correctComboContainer.querySelector('h4').textContent = 'Se Podía Añadir a este Juego:';
                correctDisplay.innerHTML = createCardDisplayHTML(faultData.contextCards);
                correctComboContainer.style.display = 'block';

            } else { // CASO: Bajada Inválida (lógica anterior se mantiene)
                invalidComboContainer.querySelector('h4').textContent = 'Combinación Inválida Presentada:';
                invalidDisplay.innerHTML = createCardDisplayHTML(faultData.invalidCards);
                invalidComboContainer.style.display = 'block';

                if (faultData.correctCards) {
                    correctComboContainer.querySelector('h4').textContent = 'Forma Correcta Sugerida:';
                    correctDisplay.innerHTML = createCardDisplayHTML(faultData.correctCards);
                    correctComboContainer.style.display = 'block';
                }
            }
            faultDetailsContainer.style.display = 'block';
        }

        showOverlay('elimination-overlay');
    }
    // ▼▼▼ REEMPLAZA LA FUNCIÓN ENTERA CON ESTA VERSIÓN ▼▼▼
    window.closeEliminationOverlay = function() { 
        hideOverlay('elimination-overlay'); 
        
        // Si la partida de práctica terminó por una falta, mostramos el modal de reinicio.
        if (practiceGameEndedByFault) {
            practiceGameEndedByFault = false; // Reseteamos la bandera
            showOverlay('practice-restart-modal');
        }
    }
    // ▲▲▲ FIN DEL REEMPLAZO ▲▲▲
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
            isAnimatingLocalMeld = true; // <-- 1. Activamos la bandera
            const placeholder = document.createElement('div');
            placeholder.className = 'meld-group';
            placeholder.style.visibility = 'hidden';
            meldsContainer.appendChild(placeholder);

            animateCardMovement({
                cardsData: cardsData,
                startElement: document.getElementById('human-hand'),
                endElement: placeholder,
                duration: 1200
            }).then(() => {
                // <-- 3. Esto se ejecuta DESPUÉS de la animación
                if (meldsContainer.contains(placeholder)) {
                    meldsContainer.removeChild(placeholder);
                }
                isAnimatingLocalMeld = false; // Desactivamos la bandera
                // renderHands(); // <<-- LÍNEA ELIMINADA. AHORA EL REDIBUJADO DEPENDE DEL SERVIDOR.
            });
        }

        // <-- 2. Enviamos la acción al servidor INMEDIATAMENTE
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
                    const p = players[0];
                    if (!p) return;

                    const cardIds = indices.map(index => p.hand[index]?.id).filter(Boolean);
                    if (cardIds.length !== indices.length) return;

                    // --- INICIO DE LA LÓGICA DE ANIMACIÓN AÑADIDA ---
                    const cardsData = cardIds.map(id => p.hand.find(c => c.id === id)).filter(Boolean);
                    const meldsContainer = document.getElementById('melds-display');

                    if (cardsData.length === cardIds.length && meldsContainer) {
                        isAnimatingLocalMeld = true;
                        const placeholder = document.createElement('div');
                        placeholder.className = 'meld-group';
                        placeholder.style.visibility = 'hidden';
                        meldsContainer.appendChild(placeholder);

                        animateCardMovement({
                            cardsData: cardsData,
                            startElement: document.getElementById('human-hand'),
                            endElement: placeholder,
                            duration: 1200
                        }).then(() => {
                            if (meldsContainer.contains(placeholder)) {
                                meldsContainer.removeChild(placeholder);
                            }
                            isAnimatingLocalMeld = false;
                            renderHands();
                        });
                    }
                    // --- FIN DE LA LÓGICA DE ANIMACIÓN AÑADIDA ---

                    socket.emit('meldAction', {
                        roomId: currentGameSettings.roomId,
                        cardIds: cardIds
                    });

                } else {
                    showToast("Arrastra un grupo de 3 o más cartas para bajar.", 2000);
                }
            } catch (err) {
                console.error("Error al soltar para combinar:", err);
            }
        });
        const handleMeldZoneClick = (event) => {
            event.preventDefault();
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
                // 1. Calcular créditos necesarios con conversión de moneda
                const roomSettings = currentGameSettings.settings;
                const requirementInRoomCurrency = (roomSettings.bet || 0) + (roomSettings.penalty || 0);
                const roomCurrency = roomSettings.betCurrency || 'USD';
                const userCredits = currentUser.credits ?? 0;
                const userCurrency = currentUser.currency || 'USD';

                let requiredInUserCurrency = convertCurrency(requirementInRoomCurrency, roomCurrency, userCurrency, clientExchangeRates);

                // 2. Validar si los créditos son suficientes
                if (userCredits >= requiredInUserCurrency) {
                    // SI TIENE CRÉDITOS: Se une a la revancha
                    mainButton.disabled = true;
                    mainButton.textContent = 'Esperando a los demás...';
                    addChatMessage(null, 'Has confirmado la revancha. Esperando...', 'system');
                    socket.emit('requestRematch', { roomId: currentGameSettings.roomId });
                } else {
                    // NO TIENE CRÉDITOS: Muestra el modal de error
                    hideOverlay('ready-overlay'); // Ocultar el modal de revancha
                    const missingAmount = requiredInUserCurrency - userCredits;
                    const friendlyRequired = `${requiredInUserCurrency.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${userCurrency}`;
                    const friendlyMissing = `${missingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${userCurrency}`;

                    showRematchFundsModal(friendlyRequired, friendlyMissing);
                }
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
// --- FIN: SCRIPT DEL JUEGO ---// Cache bust: Tue Oct  7 11:46:02 WEST 2025
