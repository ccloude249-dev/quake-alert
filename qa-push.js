// qa-push.js — capa compartida de "segundo plano" de QUAKE ALERT (consola web, app ciudadana y alarma).
// · Web Push: suscribe este navegador al vigilante USGS de server.js (/api/push/*) → la alerta llega con la
//   pantalla bloqueada o la app cerrada (Android; iPhone si está instalada en la pantalla de inicio, iOS 16.4+).
// · Tiempo real: estado del servidor por SSE (/api/stream) con respaldo por sondeo cada 20 s.
// · Modo guardián: Wake Lock + audio inaudible para que el teléfono no suspenda la página al bloquearse.
// · Sirena como <audio> (en iPhone los elementos multimedia suenan aunque el switch lateral esté en silencio).
// Uso: QAPush.init(prefs) → QAPush.on(cb) recibe el estado · enable()/disable()/test(ms) · guard(true|false).
(function () {
  if (window.QAPush) return;
  const API = './api/push';
  const st = {
    supported: null, permission: (window.Notification && Notification.permission) || 'default', subscribed: false, endpoint: null,
    serverOk: null, server: null, live: false, busy: false, error: null, testAt: 0, guard: false, wakeLock: false, keepAlive: false,
    ios: /iPhone|iPad|iPod/i.test(navigator.userAgent),
    standalone: !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true),
  };
  const prefs = { radiusKm: 320, minMag: 4.5, lat: 14.6349, lng: -90.5069 };
  const L = { state: new Set(), push: new Set(), quake: new Set(), click: new Set(), visible: new Set() };
  let reg = null, initP = null, es = null, esFails = 0, pollT = null, wl = null, ka = null, siren = null, syncT = null, testT = null, testTick = null;

  const fire = (set, arg) => set.forEach((f) => { try { f(arg); } catch (e) {} });
  const emit = () => fire(L.state, st);
  const listen = (set) => (f) => { set.add(f); return () => set.delete(f); };
  const b64ToU8 = (b64) => { const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function api(path, opts) {
    const r = await fetch(API + path, Object.assign({ cache: 'no-store' }, opts || {}));
    if (!r.ok) { const err = new Error('HTTP ' + r.status); err.status = r.status; throw err; }
    return r.json();
  }
  const post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  // ---------- estado del servidor: SSE + sondeo de respaldo ----------
  function applyStatus(data) {
    if (!data || typeof data.enabled === 'undefined') throw new Error('sin api');
    st.serverOk = true; st.server = data;
    if (st.subscribed && st.endpoint && data.subscribed === false) resub(); // el servidor se reinició y perdió la suscripción: re-registrar
    emit();
  }
  async function refresh() {
    try {
      applyStatus(await api('/status' + (st.endpoint ? '?endpoint=' + encodeURIComponent(st.endpoint) : '')));
      if (!es && window.EventSource) connectLive();
    } catch (e) { st.serverOk = false; st.live = false; emit(); }
  }
  function connectLive() {
    if (es || !window.EventSource) return;
    try {
      es = new EventSource('./api/stream');
      es.onopen = () => { esFails = 0; st.live = true; emit(); };
      es.addEventListener('status', (e) => { try { st.live = true; applyStatus(JSON.parse(e.data)); } catch (err) {} });
      es.addEventListener('quake', (e) => { try { fire(L.quake, Object.assign({ via: 'stream' }, JSON.parse(e.data))); } catch (err) {} });
      es.onerror = () => {
        st.live = false;
        if (++esFails >= 2) { try { es.close(); } catch (e) {} es = null; } // sin servidor: no insistir; queda el sondeo cada 20 s
        emit();
      };
    } catch (e) { es = null; }
  }
  function startPolling() { if (pollT) return; pollT = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 20000); }

  // ---------- Web Push ----------
  async function init(p) {
    if (p) Object.assign(prefs, p);
    if (initP) return initP;
    initP = (async () => {
      refresh(); startPolling();
      if (!('serviceWorker' in navigator) || !window.isSecureContext) { st.supported = false; emit(); return; }
      navigator.serviceWorker.addEventListener('message', (e) => onMessage(e.data || {}));
      try { await navigator.serviceWorker.register('./sw.js'); reg = await navigator.serviceWorker.ready; }
      catch (e) { st.supported = false; emit(); return; }
      st.supported = !!(window.PushManager && window.Notification);
      try { const s = await reg.pushManager.getSubscription(); st.subscribed = !!s; st.endpoint = s ? s.endpoint : null; } catch (e) {}
      emit();
      if (st.subscribed) refresh();
    })();
    return initP;
  }
  async function ensureSub(publicKey) {
    if (!reg) reg = await navigator.serviceWorker.ready;
    let s = await reg.pushManager.getSubscription();
    const want = b64ToU8(publicKey);
    if (s && s.options && s.options.applicationServerKey) {
      const have = new Uint8Array(s.options.applicationServerKey);
      const same = have.length === want.length && have.every((b, i) => b === want[i]);
      if (!same) { try { await s.unsubscribe(); } catch (e) {} s = null; } // cambió la clave VAPID del servidor
    }
    if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want });
    return s;
  }
  const postSub = (s) => post('/subscribe', { subscription: s.toJSON ? s.toJSON() : s, radiusKm: prefs.radiusKm, minMag: prefs.minMag, lat: prefs.lat, lng: prefs.lng, ua: navigator.userAgent });
  async function resub() {
    try { const cfg = await api('/config'); if (!cfg.publicKey) return; const s = await ensureSub(cfg.publicKey); await postSub(s); st.endpoint = s.endpoint; st.subscribed = true; emit(); } catch (e) {}
  }
  async function enable(p) {
    if (p) Object.assign(prefs, p);
    st.error = null; st.busy = true; emit();
    try {
      if (!('serviceWorker' in navigator) || !window.PushManager || !window.Notification) throw new Error(st.ios ? 'En iPhone las notificaciones push solo funcionan con la app instalada: Compartir ▸ "Agregar a inicio", y abrila desde el ícono (iOS 16.4+).' : 'Este navegador no soporta notificaciones push.');
      const perm = await Notification.requestPermission(); // primero y dentro del toque del usuario (iOS lo exige)
      st.permission = perm;
      if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado: habilitalo para este sitio en los ajustes del navegador.');
      let cfg = null; try { cfg = await api('/config'); } catch (e) { cfg = null; }
      if (!cfg) throw new Error('No hay servidor en este origen. Publicá server.js (Heroku) y abrí la app desde esa dirección.');
      if (!cfg.publicKey) throw new Error('El servidor no tiene web-push instalado (npm install y redesplegar).');
      await init();
      const s = await ensureSub(cfg.publicKey);
      await postSub(s);
      st.subscribed = true; st.endpoint = s.endpoint; st.busy = false; emit(); refresh();
      return true;
    } catch (e) { st.error = (e && e.message) || String(e); st.busy = false; emit(); return false; }
  }
  async function disable() {
    try {
      if (!reg) reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.getSubscription();
      if (s) { try { await post('/unsubscribe', { endpoint: s.endpoint }); } catch (e) {} await s.unsubscribe(); }
    } catch (e) {}
    st.subscribed = false; st.endpoint = null; st.testAt = 0; emit(); refresh();
  }
  // Prueba: el servidor manda un push a ESTE dispositivo tras `delayMs` (tiempo para bloquear la pantalla).
  async function test(delayMs) {
    st.error = null;
    const d = Math.min(60000, Math.max(0, delayMs == null ? 10000 : delayMs));
    try {
      if (!st.endpoint) throw new Error('primero activá las alertas en segundo plano');
      try { await post('/test', { endpoint: st.endpoint, delayMs: d }); }
      catch (e) { if (e.status === 404) { await resub(); await post('/test', { endpoint: st.endpoint, delayMs: d }); } else throw e; }
      st.testAt = Date.now() + d; emit();
      clearTimeout(testT); clearInterval(testTick);
      testTick = setInterval(() => { if (Date.now() >= st.testAt) { clearInterval(testTick); testTick = null; } emit(); }, 1000);
      testT = setTimeout(() => { st.testAt = 0; emit(); }, d + 3000);
      return true;
    } catch (e) { st.error = 'No se pudo programar la prueba: ' + ((e && e.message) || e); emit(); return false; }
  }
  function updatePrefs(p) {
    Object.assign(prefs, p || {});
    if (!st.subscribed) return;
    clearTimeout(syncT);
    syncT = setTimeout(async () => { try { if (!reg) reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); if (s) await postSub(s); } catch (e) {} }, 900);
  }
  function onMessage(d) {
    if (d.type === 'qa-push' && d.payload) {
      const p = d.payload;
      if (p.type === 'test') { st.testAt = 0; clearTimeout(testT); clearInterval(testTick); testTick = null; emit(); }
      fire(L.push, Object.assign({ via: 'push' }, p));
    } else if (d.type === 'qa-push-click') fire(L.click, d);
  }

  // ---------- modo guardián: pantalla encendida + audio anti-suspensión + sirena ----------
  function wav(rate, gen, secs) {
    const n = Math.floor(rate * secs), buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.round(gen(i / rate) * 32767))), true);
    let bin = ''; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  function audioEl(src, loop) { const a = document.createElement('audio'); a.src = src; a.loop = !!loop; a.preload = 'auto'; a.setAttribute('playsinline', ''); return a; }
  function playSiren() {
    try {
      if (!siren) {
        const step = 0.16;
        siren = audioEl(wav(16000, (t) => {
          const f = (Math.floor(t / (step * 2)) % 2 === 0) ? 1000 : 720, k = (t % step) / step;
          const env = k < 0.06 ? k / 0.06 : (k > 0.95 ? 0 : 1 - ((k - 0.06) / 0.89) * 0.6);
          return 0.85 * env * (2 * ((t * f) % 1) - 1);
        }, 3.2), false);
        siren.onended = () => { if (st.guard) startKeepAlive(); };
      }
      siren.currentTime = 0;
      const p = siren.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  // Tono de 40 Hz a -50 dBFS en bucle (inaudible en un parlante de teléfono): mientras "suena", Chrome/Android no
  // congela la pestaña al bloquear la pantalla y Safari mantiene vivos los temporizadores. Requiere un toque previo.
  function startKeepAlive() {
    try {
      if (!ka) ka = audioEl(wav(8000, (t) => 0.003 * Math.sin(2 * Math.PI * 40 * t), 2), true);
      const p = ka.play();
      if (p && p.then) p.then(() => {
        st.keepAlive = true;
        try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: 'Alarma sísmica vigilando', artist: 'QUAKE ALERT' }); } catch (e) {}
        emit();
      }).catch(() => { st.keepAlive = false; emit(); });
    } catch (e) { st.keepAlive = false; }
  }
  function stopKeepAlive() { if (ka) { try { ka.pause(); } catch (e) {} } st.keepAlive = false; }
  function acquireWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then((lock) => {
      wl = lock; st.wakeLock = true; emit();
      lock.addEventListener('release', () => { if (wl === lock) { wl = null; st.wakeLock = false; emit(); } });
    }).catch(() => {});
  }
  function releaseWakeLock() { if (wl) { try { wl.release(); } catch (e) {} wl = null; } st.wakeLock = false; }
  function guard(on) { st.guard = !!on; if (on) { acquireWakeLock(); startKeepAlive(); } else { releaseWakeLock(); stopKeepAlive(); } emit(); }
  function vibrate(pattern) { if (navigator.vibrate) { try { navigator.vibrate(pattern || [500, 150, 500, 150, 500, 150, 500, 150, 900]); } catch (e) {} } }

  // Al volver del bloqueo / segundo plano: recuperar wake lock, refrescar estado y avisar a la página.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (st.guard) acquireWakeLock();
    refresh();
    fire(L.visible, st);
  });

  window.QAPush = { init, refresh, enable, disable, test, updatePrefs, guard, playSiren, vibrate, on: listen(L.state), onPush: listen(L.push), onQuake: listen(L.quake), onClick: listen(L.click), onVisible: listen(L.visible), state: st, prefs };
  try { window.dispatchEvent(new CustomEvent('qapush-ready')); } catch (e) {}
})();
