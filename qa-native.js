// qa-native.js — puente con la capa nativa Android (APK Capacitor) de QUAKE ALERT.
// El servicio nativo (GuardService) no se duerme y hace sonar/vibrar/encender la pantalla aunque el teléfono esté en
// silencio, dormido o bloqueado. Esta capa solo lo activa, programa simulacros (AlarmManager: a la hora exacta aunque el
// teléfono duerma), muestra su estado y avisa de las alarmas para abrir la pantalla de alerta.
// En un navegador `available()` es false (la web usa qa-push.js). Revisar la UI sin teléfono: ?nativedemo=1
// Uso: QANative.init(prefs) → on(cb) estado · onAlarm(cb) alarma · start() / stop() / test(seg) / cancel() / demo(seg) / silence() / fix(tipo).
(function () {
  if (window.QANative) return;
  const KEY = 'qa_native_handled';
  const st = {
    available: false, loaded: false, busy: false, error: '', testAt: 0,
    running: false, connected: false, enabled: false, notifications: true, fullScreen: true, battery: true,
    dnd: false, dndActive: false, ringer: 'normal', alarmVolPct: 0, alarmActive: false, manufacturer: '', sdk: 0, lastAlarm: '', scheduledAt: 0,
  };
  const prefs = { radiusKm: 320, minMag: 4.5, lat: 14.6349, lng: -90.5069 };
  // Carpeta de la página, no la raíz del dominio: así funciona servido en / o dentro de una subcarpeta (/demos/…).
  const SERVER = location.origin + location.pathname.replace(/\/[^/]*$/, '');
  const L = { state: new Set(), alarm: new Set() };
  let P = null, inited = false, pollT = null, testT = null, handled = 0;
  try { handled = Number(localStorage.getItem(KEY)) || 0; } catch (e) {}

  const fire = (set, arg) => set.forEach((f) => { try { f(arg); } catch (e) {} });
  const emit = () => fire(L.state, st);
  const listen = (set) => (f) => { set.add(f); return () => set.delete(f); };
  const msg = (e) => (e && e.message) || String(e);

  // Cuenta regresiva del simulacro programado (la hora real la fija el sistema nativo: status.scheduledAt).
  function countdown() {
    clearTimeout(testT); testT = null;
    if (!st.testAt) return;
    const step = () => {
      if (Date.now() >= st.testAt) { st.testAt = 0; emit(); setTimeout(refresh, 1500); return; }
      emit(); testT = setTimeout(step, 1000);
    };
    testT = setTimeout(step, 1000);
  }
  const merge = (s) => {
    if (!s || typeof s !== 'object') return;
    Object.assign(st, s); st.loaded = true; st.available = true;
    if (typeof s.scheduledAt === 'number') { st.testAt = s.scheduledAt > Date.now() ? s.scheduledAt : 0; countdown(); }
  };

  const demoOn = () => {
    const q = /[?&]nativedemo=1/.test(location.search);
    try { if (q) sessionStorage.setItem('qa_nativedemo', '1'); return q || sessionStorage.getItem('qa_nativedemo') === '1'; } catch (e) { return q; }
  };
  // Plugin simulado para revisar la interfaz desde un navegador (?nativedemo=1).
  function demoPlugin() {
    let s = { running: false, connected: false, enabled: false, notifications: false, fullScreen: false, battery: false, dnd: false, dndActive: true, ringer: 'silent', alarmVolPct: 60, alarmActive: false, sdk: 34, manufacturer: 'xiaomi', lastAlarm: '', scheduledAt: 0 };
    let timer = null;
    const set = (o) => { s = Object.assign({}, s, o); return Promise.resolve(Object.assign({}, s)); };
    return {
      status: () => set({}),
      configure: () => set({}),
      requestNotifications: () => set({ notifications: true }),
      start: () => set({ running: true, connected: true, enabled: true }),
      stop: () => { clearTimeout(timer); return set({ running: false, connected: false, enabled: false, scheduledAt: 0 }); },
      silence: () => set({ alarmActive: false }),
      cancelTest: () => { clearTimeout(timer); return set({ scheduledAt: 0 }); },
      test: (o) => {
        const d = ((o && o.delaySec) != null ? o.delaySec : 30) * 1000;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const now = Date.now();
          set({ scheduledAt: 0, alarmActive: true, lastAlarm: JSON.stringify({ id: 'sim-' + now, mag: 6.2, place: 'Simulacro · Escuintla, Guatemala', km: 48, bearing: 'SO', time: now, at: now, test: true }) });
          setTimeout(() => set({ alarmActive: false }), 6000);
        }, d);
        return set({ scheduledAt: Date.now() + d });
      },
      openSettings: (o) => set(o.kind === 'fullscreen' ? { fullScreen: true } : o.kind === 'battery' ? { battery: true } : o.kind === 'dnd' ? { dnd: true, dndActive: false } : {}),
    };
  }

  function detect() {
    if (P) return P;
    const C = window.Capacitor;
    if (!C) { if (demoOn()) { P = demoPlugin(); st.available = true; } return P; }
    const native = C.isNativePlatform ? C.isNativePlatform() : (C.getPlatform ? C.getPlatform() !== 'web' : false);
    if (!native) return null;
    if (C.Plugins && C.Plugins.QuakeAlarm) P = C.Plugins.QuakeAlarm;
    else if (C.nativePromise) {
      const call = (m) => (o) => C.nativePromise('QuakeAlarm', m, o || {});
      P = { status: call('status'), start: call('start'), stop: call('stop'), configure: call('configure'), test: call('test'), cancelTest: call('cancelTest'), silence: call('silence'), requestNotifications: call('requestNotifications'), openSettings: call('openSettings') };
    }
    if (P) st.available = true;
    return P;
  }

  // Una alarma disparada por el servicio nativo (también con la app cerrada o el teléfono dormido): se avisa una sola vez a la página.
  function checkAlarm(raw) {
    if (!raw) return;
    let a = null;
    try { a = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
    if (!a || !a.at || a.at <= handled) return;
    handled = a.at;
    try { localStorage.setItem(KEY, String(a.at)); } catch (e) {}
    if (Date.now() - a.at > 30 * 60 * 1000) return;
    fire(L.alarm, a);
  }

  async function refresh() {
    const p = detect(); if (!p) return;
    try { merge(await p.status()); checkAlarm(st.lastAlarm); } catch (e) {}
    emit();
  }
  function loop() {
    clearTimeout(pollT);
    pollT = setTimeout(() => { (document.visibilityState === 'visible' ? refresh() : Promise.resolve()).then(loop, loop); }, 5000);
  }
  function init(p) {
    if (p) Object.assign(prefs, p);
    if (inited) return; inited = true;
    const go = () => {
      if (!detect()) return false;
      refresh().then(() => { if (st.running) configure(); });
      loop();
      return true;
    };
    if (!go()) { let n = 0; const retry = () => { if (go() || ++n > 8) return; setTimeout(retry, 400); }; setTimeout(retry, 400); } // el puente nativo puede tardar unos ms
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); }); // al volver de un ajuste del sistema o de la pantalla de alarma
  }

  async function start(p) {
    if (p) Object.assign(prefs, p);
    const pl = detect(); if (!pl) return false;
    st.error = ''; st.busy = true; emit();
    try {
      try { await pl.requestNotifications(); } catch (e) {}
      merge(await pl.start({ serverUrl: SERVER, radiusKm: prefs.radiusKm, minMag: prefs.minMag, lat: prefs.lat, lng: prefs.lng }));
      st.busy = false; emit(); return true;
    } catch (e) { st.busy = false; st.error = 'No se pudo activar la alarma: ' + msg(e); emit(); return false; }
  }
  async function stop() {
    const pl = detect(); if (!pl) return;
    try { merge(await pl.stop()); } catch (e) { st.error = 'No se pudo desactivar: ' + msg(e); }
    emit();
  }
  async function configure(p) {
    if (p) Object.assign(prefs, p);
    const pl = detect(); if (!pl) return;
    try { merge(await pl.configure({ serverUrl: SERVER, radiusKm: prefs.radiusKm, minMag: prefs.minMag, lat: prefs.lat, lng: prefs.lng })); emit(); } catch (e) {}
  }
  // Simulacro completo (mismo camino que una alarma real). Lo programa el sistema (AlarmManager): salta a la hora exacta
  // aunque la app esté en segundo plano, cerrada o el teléfono dormido. `sec` = segundos para bloquear el teléfono.
  async function test(sec) {
    const pl = detect(); if (!pl) return false;
    const d = Math.min(300, Math.max(0, sec == null ? 30 : sec));
    st.error = ''; emit();
    try {
      try { await pl.requestNotifications(); } catch (e) {}
      merge(await pl.test({ delaySec: d }));
      if (!st.testAt) { st.testAt = Date.now() + d * 1000; countdown(); }
      emit(); return true;
    } catch (e) { st.error = 'No se pudo programar el simulacro: ' + msg(e); emit(); return false; }
  }
  async function cancel() {
    const pl = detect(); if (!pl) return;
    try { merge(await pl.cancelTest()); } catch (e) {}
    st.testAt = 0; countdown(); emit();
  }
  // Demostración: activa el vigilante (pide los permisos) y programa el simulacro.
  async function demo(sec) {
    if (!detect()) return false;
    if (!st.running) { const ok = await start(); if (!ok) return false; }
    return test(sec == null ? 30 : sec);
  }
  async function silence() {
    const pl = detect(); if (!pl) return;
    try { merge(await pl.silence()); } catch (e) {}
    emit();
  }
  // tipo: notifications | fullscreen | battery | dnd | app → pide el permiso o abre el ajuste exacto del sistema.
  async function fix(kind) {
    const pl = detect(); if (!pl) return;
    try {
      if (kind === 'notifications') {
        merge(await pl.requestNotifications());
        if (!st.notifications) await pl.openSettings({ kind: 'notifications' });
      } else await pl.openSettings({ kind });
    } catch (e) {}
    refresh();
  }

  window.QANative = { init, refresh, start, stop, configure, test, cancel, demo, silence, fix, available: () => !!detect(), on: listen(L.state), onAlarm: listen(L.alarm), state: st };
  try { window.dispatchEvent(new CustomEvent('qanative-ready')); } catch (e) {}
})();
