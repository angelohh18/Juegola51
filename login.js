// login.js - Lógica de autenticación para la plataforma La 51

document.addEventListener('DOMContentLoaded', () => {
    console.log('Login.js cargado correctamente');

    // --- Referencias a elementos del DOM ---
    const btnLogin = document.getElementById('btn-login');
    const btnShowRegister = document.getElementById('btn-register');
    const btnRegisterBack = document.getElementById('btn-register-back');
    const btnRegisterSubmit = document.getElementById('btn-register-submit');
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const btnCloseForgotModal = document.getElementById('btn-close-forgot-modal');
    
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const avatarCropModal = document.getElementById('avatar-crop-modal');

    // --- Lógica de Login ---
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const loginError = document.getElementById('login-error');

            if (!username || !password) {
                loginError.textContent = 'Por favor, completa todos los campos.';
                loginError.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    console.log('✅ Login exitoso, guardando token y redirigiendo...');
                    // Guardar el token y los datos del usuario
                    localStorage.setItem('la51_token', data.token);
                    localStorage.setItem('la51_user', JSON.stringify(data.user));

                    // Redirigir al menú de juegos
                    window.location.href = '/menu.html';
                } else {
                    loginError.textContent = data.message;
                    loginError.style.display = 'block';
                }
            } catch (err) {
                console.error('Error en el login:', err);
                loginError.textContent = 'Error de conexión con el servidor.';
                loginError.style.display = 'block';
            }
        });
    }

    // --- Lógica para mostrar/ocultar modales ---
    if (btnShowRegister) {
        btnShowRegister.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'flex';
            initializeAvatarGallery();
            initCountries();
        });
    }

    if (btnRegisterBack) {
        btnRegisterBack.addEventListener('click', () => {
            registerModal.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'none';
            forgotPasswordModal.style.display = 'flex';
        });
    }

    if (btnCloseForgotModal) {
        btnCloseForgotModal.addEventListener('click', () => {
            forgotPasswordModal.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }

    // --- Lógica de Registro ---
    if (btnRegisterSubmit) {
        btnRegisterSubmit.addEventListener('click', async () => {
            const name = document.getElementById('register-name').value.trim();
            const country = document.getElementById('register-country').value;
            const whatsapp = document.getElementById('register-whatsapp').value.trim();
            const currency = document.getElementById('register-currency').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const registerError = document.getElementById('register-error');
            const registerSuccess = document.getElementById('register-success');

            // Validaciones
            if (!name || !country || !whatsapp || !currency || !password || !confirmPassword) {
                registerError.textContent = 'Por favor, completa todos los campos obligatorios.';
                registerError.style.display = 'block';
                registerSuccess.style.display = 'none';
                return;
            }

            if (password !== confirmPassword) {
                registerError.textContent = 'Las contraseñas no coinciden.';
                registerError.style.display = 'block';
                registerSuccess.style.display = 'none';
                return;
            }

            if (password.length < 4) {
                registerError.textContent = 'La contraseña debe tener al menos 4 caracteres.';
                registerError.style.display = 'block';
                registerSuccess.style.display = 'none';
                return;
            }

            // Obtener avatar seleccionado
            const selectedAvatar = document.querySelector('.avatar-gallery .avatar-option.selected');
            const avatar = selectedAvatar ? selectedAvatar.src : defaultAvatars[0];

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, country, whatsapp, password, avatar, currency })
                });

                const data = await response.json();

                if (data.success) {
                    registerSuccess.textContent = '¡Registro exitoso! Redirigiendo al login...';
                    registerSuccess.style.display = 'block';
                    registerError.style.display = 'none';

                    setTimeout(() => {
                        registerModal.style.display = 'none';
                        loginModal.style.display = 'flex';
                        document.getElementById('login-username').value = name;
                    }, 2000);
                } else {
                    registerError.textContent = data.message;
                    registerError.style.display = 'block';
                    registerSuccess.style.display = 'none';
                }
            } catch (err) {
                console.error('Error en el registro:', err);
                registerError.textContent = 'Error de conexión con el servidor.';
                registerError.style.display = 'block';
                registerSuccess.style.display = 'none';
            }
        });
    }

    // --- Avatares por defecto ---
    const defaultAvatars = [
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%23F680A8"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%23F680A8" text-anchor="middle">1</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%230084FF"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%230084FF" text-anchor="middle">2</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%23FF6C00"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%23FF6C00" text-anchor="middle">3</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%23FF4444"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%23FF4444" text-anchor="middle">4</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%239A25D5"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%239A25D5" text-anchor="middle">5</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%2340B379"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%2340B379" text-anchor="middle">6</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%23FF9500"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%23FF9500" text-anchor="middle">7</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%23E5B61B"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%23E5B61B" text-anchor="middle">8</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%239CA25A"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%239CA25A" text-anchor="middle">9</text></svg>',
        'data:image/svg+xml;charset=utf-8,<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="%23FFB700"/><circle cx="75" cy="75" r="40" fill="white"/><text x="75" y="85" font-family="Arial" font-size="24" font-weight="bold" fill="%23FFB700" text-anchor="middle">10</text></svg>'
    ];

    // --- Función para inicializar la galería de avatares ---
    function initializeAvatarGallery() {
        const gallery = document.getElementById('avatar-gallery');
        if (!gallery) return;

        gallery.innerHTML = '';
        defaultAvatars.forEach((avatarSrc, index) => {
            const img = document.createElement('img');
            img.src = avatarSrc;
            img.classList.add('avatar-option');
            if (index === 0) img.classList.add('selected');
            img.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                img.classList.add('selected');
            });
            gallery.appendChild(img);
        });
    }

    // --- Función para inicializar países ---
    function initCountries() {
        const countrySelect = document.getElementById('register-country');
        if (!countrySelect || countrySelect.options.length > 1) return;

        const countries = [
            "España", "Colombia", "México", "Argentina", "Venezuela", "Perú", "Chile",
            "Ecuador", "Guatemala", "Cuba", "Bolivia", "República Dominicana",
            "Honduras", "Paraguay", "El Salvador", "Nicaragua", "Costa Rica",
            "Puerto Rico", "Panamá", "Uruguay", "Guinea Ecuatorial"
        ];

        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    }

    // --- Listeners para cerrar modales con la X ---
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('[role="dialog"]');
            if (modal) modal.style.display = 'none';
            if (modal.id === 'forgot-password-modal') {
                loginModal.style.display = 'flex';
            }
        });
    });

    // --- Permitir login con Enter ---
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnLogin.click();
        }
    });
});


