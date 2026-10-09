// Service worker QUAKE ALERT: cascarón offline + alertas push en segundo plano.
const CACHE = 'quake-alert-shell-v4';
const SHELL = [
  './Quake Alert Landing.dc.html',
  './Quake Alert App.dc.html',
  './Quake Alert Alarma Móvil.dc.html',
  './Quake Alert Console.dc.html',
  './support.js', './qa-db.js', './qa-push.js', './qa-native.js', './ios-frame.jsx',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/quake-alert-logo.png',
];
const ALARM_URL = './Quake%20Alert%20Alarma%20M%C3%B3vil.dc.html';
const VIBRATE = [500, 150, 500, 150, 500, 150, 500, 150, 900];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/') || url.hostname === 'earthquake.usgs.gov') return; // datos en vivo: nunca desde caché
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok && url.origin === self.location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || (e.request.mode === 'navigate' ? caches.match('./Quake Alert Landing.dc.html') : undefined)))
  );
});

// Push del servidor (vigilante USGS): muestra la notificación aunque la app esté cerrada
// o el teléfono bloqueado, y avisa a las pestañas abiertas para que suenen/flasheen.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { body: e.data ? e.data.text() : '' }; }
  const isTest = data.type === 'test';
  const mag = data.mag != null ? Number(data.mag).toFixed(1) : null;
  const title = data.title || (isTest ? '✓ Prueba en segundo plano' : ('⚠ Sismo · M' + (mag || '?')));
  const body = data.body || ((data.place || 'Sismo') + (data.distanceKm != null ? ' — ' + data.distanceKm + ' km' + (data.bearing ? ', rumbo ' + data.bearing : '') : ''));
  const opts = {
    body, tag: data.id ? 'qa-' + data.id : (isTest ? 'qa-test' : 'qa-alert'), renotify: true, requireInteraction: !isTest,
    vibrate: VIBRATE, icon: './assets/icon-192.png', badge: './assets/icon-192.png', timestamp: data.time || Date.now(),
    data: { url: ALARM_URL, payload: data },
    actions: [{ action: 'open', title: 'Ver mapa' }, { action: 'ok', title: 'Estoy bien' }],
  };
  e.waitUntil(Promise.all([
    self.registration.showNotification(title, opts),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ type: 'qa-push', payload: data }))),
  ]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || ALARM_URL, self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const hit = cs.find((c) => c.url.split('#')[0] === url) || cs[0];
    if (hit) { hit.postMessage({ type: 'qa-push-click', action: e.action }); return hit.focus(); }
    return self.clients.openWindow(url);
  }));
});

// El navegador rotó la suscripción: re-registrarla en el servidor.
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(
    self.registration.pushManager.subscribe(e.oldSubscription ? e.oldSubscription.options : { userVisibleOnly: true })
      .then((sub) => fetch('./api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub }) }))
      .catch(() => {})
  );
});
