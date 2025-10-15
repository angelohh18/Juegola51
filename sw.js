// sw.js (Service Worker para PWA - La 51)

const NOMBRE_DE_CACHE = 'la51-v1.0.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/juego.js',
  '/estilo.css',
  '/admin.html',
  '/icono-192.png',
  '/icono-512.png',
  '/icono-144.png'
];

// Instalar Service Worker
self.addEventListener('install', (evento) => {
  console.log('Service Worker: Instalando...');
  evento.waitUntil(
    caches.open(NOMBRE_DE_CACHE)
      .then((cache) => {
        console.log('Service Worker: Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Error al almacenar archivos:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (evento) => {
  console.log('Trabajador de servicio: Activando...');
  evento.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== NOMBRE_DE_CACHE) {
            console.log('Service Worker: Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar solicitudes
self.addEventListener('fetch', (evento) => {
  // Solicitudes de interceptación en solitario GET
  if (evento.request.method !== 'GET') {
    return;
  }

  // Para archivos estáticos, usar caché primero
  if (evento.request.destination === 'document' ||
      evento.request.destination === 'script' ||
      evento.request.destination === 'style' ||
      evento.request.destination === 'image') {
    
    evento.respondWith(
      caches.match(evento.request)
        .then((response) => {
          // Si está en caché, devuélvelo
          if (response) {
            return response;
          }
          
          // Si no está en caché, hacer fetch y cachear
          return fetch(evento.request).then((response) => {
            // Verificar que la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta
            const responseToCache = response.clone();

            caches.open(NOMBRE_DE_CACHE)
              .then((cache) => {
                cache.put(evento.request, responseToCache);
              });

            return response;
          }).catch(() => {
            // Si falla el fetch y es un documento, devolver index.html
            if (evento.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
        })
    );
  }
});

// Manejar mensajes del cliente
self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notificar actualizaciones
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  
  evento.waitUntil(
    clients.openWindow('/')
  );
});
