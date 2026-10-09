/**
 * QUAKE ALERT — servidor (Heroku)
 * -------------------------------------------------------------
 * 1) Sirve el ecosistema (.dc.html + support.js + assets). `/` → Landing pública.
 * 2) Vigilante 24/7: consulta el feed del USGS cada POLL_MS y
 *    · manda Web Push a los teléfonos suscritos cuando hay un sismo dentro de su
 *      radio/magnitud (llega con la pantalla bloqueada o la app cerrada),
 *    · transmite estado + sismos regionales en tiempo real por SSE (/api/stream),
 *    · expone el catálogo cacheado en /api/quakes (una sola consulta al USGS
 *      para todos los clientes, en vez de que cada teléfono lo consulte).
 *
 * Variables: PORT, POLL_MS (30000), USGS_FEED, DATA_DIR,
 *            VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (ver DEPLOY.md).
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

let webpush = null;
try { webpush = require('web-push'); } catch (e) { console.warn('[push] web-push no instalado (npm install). El servidor sirve archivos y datos en vivo, pero no manda push.'); }

const app = express();
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const GUATE = { lat: 14.6349, lng: -90.5069 };
const FEED = process.env.USGS_FEED || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const POLL_MS = Math.max(10000, Number(process.env.POLL_MS) || 30000);
const MAX_AGE_MS = 45 * 60 * 1000; // solo alerta eventos de los últimos 45 min (no re-alertar historial al arrancar)
const REGION_KM = 700;             // Centroamérica + sur de México + Caribe occidental
const LANDING = 'Quake Alert Landing.dc.html';
const LAUNCHER = 'QUAKE ALERT.dc.html';

app.set('trust proxy', true);
app.disable('x-powered-by');
// Push y service worker exigen HTTPS: en Heroku redirigimos http → https.
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'http') return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
  next();
});
app.use(express.json({ limit: '64kb' }));

// ---------- persistencia mínima (JSON en disco; en Heroku es efímera → Postgres/Redis en producción) ----------
const readJSON = (f, fb) => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch (e) { return fb; } };
const writeJSON = (f, d) => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2)); } catch (e) { console.warn('[data] no se pudo escribir ' + f + ': ' + e.message); } };

// ---------- claves VAPID ----------
let vapid = null;
if (webpush) {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    vapid = readJSON('vapid.json', null);
    if (!vapid) {
      vapid = webpush.generateVAPIDKeys();
      writeJSON('vapid.json', vapid);
      console.log('[push] Claves VAPID generadas. Para que sobrevivan reinicios del dyno fijalas como config vars:\n  heroku config:set VAPID_PUBLIC_KEY=' + vapid.publicKey + ' VAPID_PRIVATE_KEY=' + vapid.privateKey);
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:alertas@quakealert.gt', vapid.publicKey, vapid.privateKey);
}

// ---------- suscripciones ----------
const subs = new Map(); // endpoint → { subscription, radiusKm, minMag, lat, lng, ua, createdAt }
readJSON('subscriptions.json', []).forEach((s) => { if (s && s.subscription && s.subscription.endpoint) subs.set(s.subscription.endpoint, s); });
const persistSubs = () => writeJSON('subscriptions.json', Array.from(subs.values()));

const status = { startedAt: Date.now(), polls: 0, lastPollAt: null, lastPollOk: null, lastError: null, eventsInFeed: 0, regionalInFeed: 0, alertsSent: 0, lastAlert: null, lastEvent: null };
let lastEvents = []; // catálogo cacheado del último sondeo (con distancia/rumbo a Guatemala)
function publicStatus() {
  return {
    enabled: true, pushEnabled: !!webpush, pollMs: POLL_MS, regionKm: REGION_KM, subscribers: subs.size, polls: status.polls,
    lastPollAt: status.lastPollAt, lastPollOk: status.lastPollOk, lastError: status.lastError, eventsInFeed: status.eventsInFeed, regionalInFeed: status.regionalInFeed,
    alertsSent: status.alertsSent, lastAlert: status.lastAlert, lastEvent: status.lastEvent, uptimeSec: Math.round((Date.now() - status.startedAt) / 1000),
  };
}

const toRad = (d) => d * Math.PI / 180;
function distKm(aLat, aLng, bLat, bLng) {
  const R = 6371, dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
function bearing(aLat, aLng, bLat, bLng) {
  const y = Math.sin(toRad(bLng - aLng)) * Math.cos(toRad(bLat));
  const x = Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) - Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLng - aLng));
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(((Math.atan2(y, x) * 180 / Math.PI + 360) % 360) / 45) % 8];
}

// ---------- tiempo real (SSE) ----------
const sseClients = new Set();
function sseSend(res, event, data) { try { res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n'); } catch (e) {} }
function broadcast(event, data) { sseClients.forEach((res) => sseSend(res, event, data)); }
app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  sseClients.add(res);
  sseSend(res, 'status', publicStatus());
  const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch (e) {} }, 25000); // < 55 s (router de Heroku)
  req.on('close', () => { clearInterval(hb); sseClients.delete(res); });
});

// ---------- push ----------
async function sendPush(entry, payload) {
  if (!webpush) return false;
  try {
    await webpush.sendNotification(entry.subscription, JSON.stringify(payload), { TTL: 600, urgency: 'high' });
    return true;
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) { subs.delete(entry.subscription.endpoint); persistSubs(); }
    else console.warn('[push] fallo al enviar: ' + (err.statusCode || err.message));
    return false;
  }
}

// ---------- vigilante USGS ----------
const seen = new Map(); // id → hora del evento
async function poll() {
  status.polls += 1;
  try {
    const res = await fetch(FEED, { headers: { 'User-Agent': 'QuakeAlert/1.0 (+heroku)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const now = Date.now();
    const events = (data.features || []).map((f) => {
      const c = (f.geometry && f.geometry.coordinates) || [0, 0, 0], p = f.properties || {};
      return { id: f.id, mag: p.mag, place: p.place || 'Sismo', time: p.time, depth: c[2], lat: c[1], lng: c[0], url: p.url };
    }).filter((e) => typeof e.mag === 'number' && typeof e.lat === 'number')
      .map((e) => Object.assign(e, { distanceKm: distKm(GUATE.lat, GUATE.lng, e.lat, e.lng), bearing: bearing(GUATE.lat, GUATE.lng, e.lat, e.lng) }));
    events.sort((a, b) => b.time - a.time);
    lastEvents = events;
    const regional = events.filter((e) => e.distanceKm <= REGION_KM);
    status.eventsInFeed = events.length; status.regionalInFeed = regional.length; status.lastPollAt = now; status.lastPollOk = true; status.lastError = null;
    if (regional[0]) status.lastEvent = { id: regional[0].id, mag: regional[0].mag, place: regional[0].place, time: regional[0].time, distanceKm: regional[0].distanceKm, bearing: regional[0].bearing };
    const fresh = [];
    for (const ev of events) {
      if (seen.has(ev.id)) continue;
      seen.set(ev.id, ev.time);
      if (now - ev.time <= MAX_AGE_MS) fresh.push(ev);
    }
    for (const [id, t] of seen) if (now - t > 3 * 86400000) seen.delete(id);
    for (const ev of fresh) {
      if (ev.distanceKm <= REGION_KM) broadcast('quake', ev); // consolas/apps abiertas lo ven al instante
      for (const entry of Array.from(subs.values())) {
        const lat = entry.lat || GUATE.lat, lng = entry.lng || GUATE.lng;
        const d = distKm(lat, lng, ev.lat, ev.lng);
        if (ev.mag < (entry.minMag || 4) || d > (entry.radiusKm || 320)) continue;
        const ok = await sendPush(entry, { type: 'quake', id: ev.id, mag: ev.mag, place: ev.place, time: ev.time, depth: ev.depth, distanceKm: d, bearing: bearing(lat, lng, ev.lat, ev.lng), url: ev.url });
        if (ok) { status.alertsSent += 1; status.lastAlert = { id: ev.id, mag: ev.mag, place: ev.place, distanceKm: d, at: Date.now() }; }
      }
    }
  } catch (err) {
    status.lastPollOk = false; status.lastError = err.message;
  }
  broadcast('status', publicStatus());
}
poll();
setInterval(poll, POLL_MS);

// ---------- API ----------
const noStore = (res) => res.set('Cache-Control', 'no-store');
app.get('/api/health', (_req, res) => { noStore(res); res.json({ ok: true, ...publicStatus() }); });
app.get('/api/quakes', (_req, res) => { noStore(res); res.json({ fetchedAt: status.lastPollAt, pollMs: POLL_MS, regionKm: REGION_KM, origin: GUATE, events: lastEvents }); });
// APK Android (servicio vigilante): solo sismos recientes de la región, en pocos KB (no el catálogo de 2,5 días).
app.get('/api/quakes/recent', (req, res) => {
  noStore(res);
  const minutes = Math.min(180, Math.max(1, Number(req.query.minutes) || 20));
  const minMag = Number(req.query.minMag) || 0;
  const since = Date.now() - minutes * 60000;
  res.json({ fetchedAt: status.lastPollAt, pollMs: POLL_MS, events: lastEvents.filter((e) => e.time >= since && e.mag >= minMag && e.distanceKm <= REGION_KM) });
});
app.get('/api/push/config', (_req, res) => { noStore(res); res.json({ publicKey: vapid ? vapid.publicKey : null, ...publicStatus() }); });
app.get('/api/push/status', (req, res) => {
  noStore(res);
  const ep = req.query.endpoint;
  res.json({ ...publicStatus(), subscribed: ep ? subs.has(String(ep)) : undefined });
});
app.post('/api/push/subscribe', (req, res) => {
  const b = req.body || {}, sub = b.subscription;
  if (!sub || !sub.endpoint || !sub.keys) return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
  const prev = subs.get(sub.endpoint) || {};
  subs.set(sub.endpoint, {
    subscription: sub, radiusKm: Number(b.radiusKm) || prev.radiusKm || 320, minMag: Number(b.minMag) || prev.minMag || 4,
    lat: Number(b.lat) || prev.lat || GUATE.lat, lng: Number(b.lng) || prev.lng || GUATE.lng,
    ua: b.ua || prev.ua || req.get('user-agent') || '', createdAt: prev.createdAt || Date.now(), updatedAt: Date.now(),
  });
  persistSubs();
  broadcast('status', publicStatus());
  res.json({ ok: true, subscribers: subs.size });
});
app.post('/api/push/unsubscribe', (req, res) => {
  const ep = req.body && req.body.endpoint;
  if (ep && subs.delete(ep)) { persistSubs(); broadcast('status', publicStatus()); }
  res.json({ ok: true, subscribers: subs.size });
});
// Prueba: manda un push a ESTE dispositivo tras delayMs (tiempo para bloquear la pantalla antes de que llegue).
app.post('/api/push/test', (req, res) => {
  if (!webpush) return res.status(503).json({ ok: false, error: 'web-push no instalado' });
  const ep = req.body && req.body.endpoint;
  const entry = ep ? subs.get(ep) : null;
  if (!entry) return res.status(404).json({ ok: false, error: 'Este dispositivo no está suscrito' });
  const delayMs = Math.min(60000, Math.max(0, Number(req.body.delayMs) || 0));
  setTimeout(() => sendPush(entry, { type: 'test', time: Date.now(), body: 'Tu dispositivo recibe alertas aunque la pantalla esté bloqueada.' }), delayMs);
  res.json({ ok: true, scheduledInMs: delayMs });
});

// ---------- estáticos ----------
app.use('/data', (_req, res) => res.status(404).end()); // nunca exponer claves ni suscripciones
app.use('/desarrollo', (_req, res) => res.status(404).end()); // código fuente del backend real: no se sirve
const staticOpts = {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.jsx')) res.setHeader('Content-Type', 'text/jsx; charset=utf-8');
    if (filePath.endsWith('.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    if (/\.(html|js|jsx|webmanifest)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache'); // siempre revalidar código y SW
    else res.setHeader('Cache-Control', 'public, max-age=86400');
  },
};
const sendPage = (file) => (_req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(ROOT, file)); };
app.get('/', sendPage(LANDING));
app.get(['/index', '/landing'], sendPage(LANDING));
app.get('/app', sendPage('Quake Alert App.dc.html'));
app.get('/alarma', sendPage('Quake Alert Alarma Móvil.dc.html'));
app.get(['/consola', '/plataforma'], sendPage('Quake Alert Console.dc.html'));
if (fs.existsSync(path.join(ROOT, LAUNCHER))) app.get('/launcher', sendPage(LAUNCHER));
app.use(express.static(ROOT, staticOpts));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('QUAKE ALERT escuchando en el puerto ' + port + ' · vigilante USGS cada ' + POLL_MS / 1000 + ' s · push ' + (webpush ? 'activo (' + subs.size + ' suscripciones)' : 'INACTIVO: falta web-push'));
});
