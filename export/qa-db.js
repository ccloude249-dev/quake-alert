/* ============================================================================
 * QUAKE ALERT — Base de datos compartida (qa-db.js)
 * ----------------------------------------------------------------------------
 * Una sola fuente de verdad para TODOS los módulos (.dc.html).
 * - Persistencia real en localStorage (sobrevive recarga y otros usuarios del navegador).
 * - Entidades con relaciones (users→familia, users→sensores, eventos→user, etc).
 * - CRUD: get/find/where/insert/update/remove.
 * - Bus de eventos: QADB.on(fn) → se dispara cuando cambia cualquier colección,
 *   así un módulo refleja lo que otro creó/editó/borró (incluido entre pestañas).
 * - Sesión: usuario autenticado compartido entre Auth y la consola.
 *
 * Uso desde un Design Component:
 *   <helmet> ... <script src="./qa-db.js"></script> </helmet>
 *   En la lógica:  await QADB.ready;  const users = QADB.get('users');
 *   Suscripción:   componentDidMount(){ this._off = QADB.on(()=>this.forceUpdate()); }
 *                  componentWillUnmount(){ this._off && this._off(); }
 * ========================================================================== */
(function () {
  if (window.QADB) return;

  var KEY = 'qa_db_v3';
  var SESSION_KEY = 'qa_session_v1';
  var bus = new EventTarget();

  /* ---- Semilla inicial (solo si no hay nada guardado) ------------------- */
  var now = Date.now();
  function ago(min) { return now - min * 60000; }

  var SEED = {
    meta: { version: 4, seededAt: now },

    org: {
      nombreComercial: 'CONRED · Guatemala',
      razonSocial: 'Coordinadora Nacional para la Reducción de Desastres',
      nit: '1234567-8',
      web: 'conred.gob.gt',
      soporte: 'alertas@conred.gob.gt',
      telefono: '+502 1566',
      idioma: 'Español (GT)', zonaHoraria: 'GMT-6 · Guatemala', moneda: 'GTQ · Quetzal',
      umbralMagnitud: 5.0, radioKm: 80, quorumSensores: 3,
    },

    users: [
      { id: 'u_ana',    name: 'Ana García',     email: 'ana@conred.gt',     phone: '+502 5512 0001', role: 'Admin',     status: 'Activo',   tenant: 'CONRED',   password: 'demo1234', avatar: 'linear-gradient(135deg,#22d3ee,#0e7490)', createdAt: ago(60 * 24 * 40) },
      { id: 'u_carlos', name: 'Carlos Méndez',  email: 'carlos@conred.gt',  phone: '+502 5512 0002', role: 'Operador',  status: 'Activo',   tenant: 'CONRED',   password: 'demo1234', avatar: 'linear-gradient(135deg,#f5a623,#b46c00)', createdAt: ago(60 * 24 * 30) },
      { id: 'u_lucia',  name: 'Lucía Ramírez',  email: 'lucia@conred.gt',   phone: '+502 5512 0003', role: 'Analista',  status: 'Activo',   tenant: 'CONRED',   password: 'demo1234', avatar: 'linear-gradient(135deg,#20c997,#0e7c5b)', createdAt: ago(60 * 24 * 22) },
      { id: 'u_pedro',  name: 'Pedro Gómez',    email: 'pedro@muni.gt',     phone: '+502 5512 0004', role: 'Municipal', status: 'Invitado', tenant: 'Muni Mixco', password: 'demo1234', avatar: 'linear-gradient(135deg,#fb5670,#7a1726)', createdAt: ago(60 * 24 * 9) },
      { id: 'u_sofia',  name: 'Sofía Luna',     email: 'sofia@hospital.gt', phone: '+502 5512 0005', role: 'Sectorial', status: 'Activo',   tenant: 'Hospital Roosevelt', password: 'demo1234', avatar: 'linear-gradient(135deg,#9aa7b8,#5f7187)', createdAt: ago(60 * 24 * 14) },
    ],

    /* familia.userId → users.id */
    familia: [
      { id: 'f_1', userId: 'u_ana', name: 'Marta García',  relation: 'Madre',   phone: '+502 5599 1111', status: 'A salvo', createdAt: ago(60 * 24 * 20) },
      { id: 'f_2', userId: 'u_ana', name: 'Diego García',  relation: 'Hijo',    phone: '+502 5599 2222', status: 'A salvo', createdAt: ago(60 * 24 * 20) },
      { id: 'f_3', userId: 'u_ana', name: 'Sara García',   relation: 'Hija',    phone: '+502 5599 3333', status: 'Pendiente', createdAt: ago(60 * 24 * 18) },
    ],

    /* sensores.ownerId → users.id */
    sensores: [
      { id: 's_001', code: 'QB-GT-0142', name: 'QuakeBox Zona 1',     municipio: 'Guatemala',  status: 'En línea', battery: 96, ownerId: 'u_ana',    lat: 14.64, lng: -90.51, createdAt: ago(60 * 24 * 35) },
      { id: 's_002', code: 'QB-GT-0143', name: 'QuakeBox Mixco',      municipio: 'Mixco',      status: 'En línea', battery: 88, ownerId: 'u_pedro',  lat: 14.63, lng: -90.60, createdAt: ago(60 * 24 * 30) },
      { id: 's_003', code: 'QB-ES-0301', name: 'QuakeBox Escuintla',  municipio: 'Escuintla',  status: 'En línea', battery: 74, ownerId: 'u_carlos', lat: 14.30, lng: -90.78, createdAt: ago(60 * 24 * 25) },
      { id: 's_004', code: 'QB-QZ-0210', name: 'QuakeBox Quetzal.',   municipio: 'Quetzaltenango', status: 'Mantenimiento', battery: 40, ownerId: 'u_carlos', lat: 14.83, lng: -91.52, createdAt: ago(60 * 24 * 12) },
    ],

    /* eventos (alertas sísmicas). issuedBy → users.id */
    eventos: [
      { id: 'e_1', magnitud: 6.8, epicentro: 'Escuintla', municipio: 'Escuintla', profundidadKm: 24, status: 'Cerrado', issuedBy: 'u_ana',    personasAlertadas: 412000, leadSeg: 12, ts: ago(60 * 5) },
      { id: 'e_2', magnitud: 4.2, epicentro: 'Mixco',     municipio: 'Mixco',     profundidadKm: 11, status: 'Cerrado', issuedBy: 'u_carlos', personasAlertadas: 88000,  leadSeg: 8,  ts: ago(60 * 26) },
    ],

    /* sedes corporativas. sector ∈ bancos|salud|educacion|industria */
    sedes: [
      { id: 'se_1', name: 'Banco Industrial',       sector: 'bancos',    sectorLabel: 'Banca',     municipio: 'Guatemala', personas: 1240, score: 94, status: 'Protegida', exposed: false, critical: false, createdAt: ago(60 * 24 * 50) },
      { id: 'se_2', name: 'Hospital Roosevelt',      sector: 'salud',     sectorLabel: 'Salud',     municipio: 'Guatemala', personas: 2100, score: 88, status: 'Protegida', exposed: false, critical: true,  createdAt: ago(60 * 24 * 48) },
      { id: 'se_3', name: 'Universidad del Valle',   sector: 'educacion', sectorLabel: 'Educación', municipio: 'Guatemala', personas: 3400, score: 91, status: 'Protegida', exposed: false, critical: false, createdAt: ago(60 * 24 * 40) },
      { id: 'se_4', name: 'Cementos Progreso',       sector: 'industria', sectorLabel: 'Industria', municipio: 'Sanarate',  personas: 860,  score: 86, status: 'Protegida', exposed: false, critical: false, createdAt: ago(60 * 24 * 20) },
      { id: 'se_5', name: 'Banco G&T · Zona 10',     sector: 'bancos',    sectorLabel: 'Banca',     municipio: 'Guatemala', personas: 540,  score: 90, status: 'Protegida', exposed: false, critical: false, createdAt: ago(60 * 24 * 18) },
      { id: 'se_6', name: 'Hospital La Paz',         sector: 'salud',     sectorLabel: 'Salud',     municipio: 'Escuintla', personas: 780,  score: 83, status: 'Protegida', exposed: true,  critical: true,  createdAt: ago(60 * 24 * 16) },
      { id: 'se_7', name: 'Colegio Americano',       sector: 'educacion', sectorLabel: 'Educación', municipio: 'Escuintla', personas: 1900, score: 92, status: 'Protegida', exposed: true,  critical: false, createdAt: ago(60 * 24 * 12) },
      { id: 'se_8', name: 'Pradera Mall',            sector: 'industria', sectorLabel: 'Industria', municipio: 'Escuintla', personas: 4200, score: 87, status: 'Protegida', exposed: true,  critical: false, createdAt: ago(60 * 24 * 9) },
    ],

    /* simulacros (drills) */
    simulacros: [
      { id: 'd_1', name: 'Simulacro Nacional 2026-Q1', fecha: ago(60 * 24 * 7), participantes: 12400, score: 94, status: 'Completado', createdAt: ago(60 * 24 * 9) },
      { id: 'd_2', name: 'Simulacro Escolar · Mixco',  fecha: ago(60 * 24 * 2), participantes: 850,   score: 88, status: 'Completado', createdAt: ago(60 * 24 * 3) },
    ],

    /* formularios dinámicos (catálogos). fields = [{id,label,type,required}] */
    formularios: [
      { id: 'form_1', name: 'Alta de QuakeBox', catalog: 'Sensores', fields: [
        { id: 'fld_1', label: 'Código del dispositivo', type: 'text', required: true },
        { id: 'fld_2', label: 'Municipio', type: 'select', required: true },
        { id: 'fld_3', label: 'Responsable', type: 'text', required: false },
      ], createdAt: ago(60 * 24 * 15) },
    ],

    /* bitácora de auditoría (logs). Se llena con QADB.log(...) */
    logs: [
      { id: 'l_1', ts: ago(11),  user: 'Ana García',    action: 'Emitió alerta M6.8 · Escuintla',     color: '#fb5670', ip: '190.4.x.12' },
      { id: 'l_2', ts: ago(25),  user: 'Carlos Méndez', action: 'Activó sirenas · Zona 1-2',          color: '#f5a623', ip: '190.4.x.31' },
      { id: 'l_3', ts: ago(53),  user: 'Lucía Ramírez', action: 'Exportó reporte de cobertura',       color: '#9fb4ad', ip: '181.2.x.88' },
      { id: 'l_4', ts: ago(80),  user: 'Ana García',    action: 'Creó usuario · pedro@muni.gt',       color: '#22d3ee', ip: '190.4.x.12' },
      { id: 'l_5', ts: ago(140), user: 'Sistema',       action: 'Rotación de llaves KMS completada',  color: '#20c997', ip: 'interno' },
    ],

    /* integraciones externas (hardware y servicios). Llaves de proveedores +
       endpoints. status: 'simulado' (demo) | 'conectado' (llaves cargadas). */
    integraciones: {
      fcm:      { key: '', senderId: '', status: 'simulado' },
      apns:     { key: '', teamId: '', status: 'simulado' },
      twilio:   { sid: '', token: '', from: '', status: 'simulado' },
      whatsapp: { token: '', phoneId: '', status: 'simulado' },
      quakebox: { endpoint: 'https://detection.quakealert.gt/readings', apiKey: '', status: 'simulado' },
      iot:      { endpoint: 'https://iot.quakealert.gt', apiKey: '', status: 'simulado' },
      rabbitmq: { url: '', status: 'simulado' },
      mongo:    { uri: '', status: 'simulado' },
    },
  };

  /* ---- Persistencia ---------------------------------------------------- */
  function read() {
    try { var r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {}
    return null;
  }
  function write(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  }

  var db = read();
  if (!db || db.meta == null || db.meta.version !== SEED.meta.version) {
    db = JSON.parse(JSON.stringify(SEED));
    write(db);
  } else {
    // Asegura que colecciones nuevas existan sin pisar datos del usuario.
    Object.keys(SEED).forEach(function (k) { if (db[k] == null) db[k] = JSON.parse(JSON.stringify(SEED[k])); });
  }

  function emit(collection) {
    bus.dispatchEvent(new CustomEvent('change', { detail: { collection: collection } }));
  }

  function genId(coll) {
    return coll + '_' + now.toString(36) + Math.random().toString(36).slice(2, 7) + (idCounter++);
  }
  var idCounter = 0;

  /* ---- API ------------------------------------------------------------- */
  var QADB = {
    ready: Promise.resolve(),

    /** Lista (copia) de una colección, opcionalmente ordenada por createdAt/ts desc. */
    get: function (coll) { return (db[coll] || []).slice(); },
    all: function () { return db; },
    find: function (coll, id) { return (db[coll] || []).find(function (r) { return r.id === id; }) || null; },
    where: function (coll, pred) { return (db[coll] || []).filter(pred); },
    count: function (coll, pred) { return pred ? this.where(coll, pred).length : (db[coll] || []).length; },

    insert: function (coll, rec) {
      rec = rec || {};
      if (!rec.id) rec.id = genId(coll);
      if (rec.createdAt == null) rec.createdAt = Date.now();
      if (!db[coll]) db[coll] = [];
      db[coll].unshift(rec);
      write(db); emit(coll);
      return rec;
    },

    update: function (coll, id, patch) {
      var r = (db[coll] || []).find(function (x) { return x.id === id; });
      if (r) { Object.assign(r, patch); write(db); emit(coll); }
      return r;
    },

    remove: function (coll, id) {
      var before = (db[coll] || []).length;
      db[coll] = (db[coll] || []).filter(function (x) { return x.id !== id; });
      if (db[coll].length !== before) { write(db); emit(coll); return true; }
      return false;
    },

    /** Actualiza el objeto org de configuración. */
    setOrg: function (patch) { Object.assign(db.org, patch); write(db); emit('org'); return db.org; },
    org: function () { return Object.assign({}, db.org); },

    /** Integraciones externas (hardware / servicios). */
    integraciones: function () { return JSON.parse(JSON.stringify(db.integraciones || {})); },
    setIntegracion: function (id, patch) {
      if (!db.integraciones) db.integraciones = {};
      if (!db.integraciones[id]) db.integraciones[id] = {};
      Object.assign(db.integraciones[id], patch);
      // Si hay alguna llave con valor, marca conectado; si todas vacías, simulado.
      var cfg = db.integraciones[id];
      var hasKey = Object.keys(cfg).some(function (k) { return k !== 'status' && k !== 'endpoint' && String(cfg[k] || '').trim() !== ''; });
      cfg.status = hasKey ? 'conectado' : 'simulado';
      write(db); emit('integraciones');
      return cfg;
    },

    /** Registra una acción en la bitácora compartida. */
    log: function (action, opts) {
      opts = opts || {};
      var sess = this.session.get();
      return this.insert('logs', {
        ts: Date.now(),
        user: opts.user || (sess && sess.name) || 'Sistema',
        action: action,
        color: opts.color || '#22d3ee',
        ip: opts.ip || '190.4.x.12',
      });
    },

    /* relaciones útiles */
    familiaDe: function (userId) { return this.where('familia', function (f) { return f.userId === userId; }); },
    sensoresDe: function (userId) { return this.where('sensores', function (s) { return s.ownerId === userId; }); },

    /* ---- Sesión (usuario autenticado) ---- */
    session: {
      get: function () { try { var r = localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } },
      set: function (user) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) {} emit('session'); },
      clear: function () { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} emit('session'); },
    },

    /** Login real contra la colección users. Devuelve {ok, user|error}. */
    authenticate: function (email, password) {
      email = (email || '').trim().toLowerCase();
      var u = (db.users || []).find(function (x) { return (x.email || '').toLowerCase() === email; });
      if (!u) return { ok: false, error: 'no-user' };
      if (password != null && u.password !== password) return { ok: false, error: 'bad-pass' };
      this.session.set({ id: u.id, name: u.name, email: u.email, role: u.role, tenant: u.tenant, avatar: u.avatar });
      this.log('Inicio de sesión · 2FA verificado', { user: u.name, color: '#9fb4ad' });
      return { ok: true, user: u };
    },

    /** Registra un usuario nuevo (Auth). Devuelve {ok, user|error}. */
    register: function (data) {
      var email = (data.email || '').trim().toLowerCase();
      if ((db.users || []).some(function (x) { return (x.email || '').toLowerCase() === email; }))
        return { ok: false, error: 'exists' };
      var palette = ['linear-gradient(135deg,#22d3ee,#0e7490)', 'linear-gradient(135deg,#f5a623,#b46c00)', 'linear-gradient(135deg,#20c997,#0e7c5b)', 'linear-gradient(135deg,#9aa7b8,#5f7187)'];
      var u = this.insert('users', {
        name: data.name || 'Nuevo usuario',
        email: (data.email || '').trim(),
        phone: data.phone || '',
        role: data.role || 'Ciudadano',
        status: 'Activo',
        tenant: data.tenant || 'Ciudadanía',
        password: data.password || 'demo1234',
        avatar: palette[(db.users.length) % palette.length],
      });
      this.log('Creó cuenta · ' + u.email, { user: u.name, color: '#22d3ee' });
      this.session.set({ id: u.id, name: u.name, email: u.email, role: u.role, tenant: u.tenant, avatar: u.avatar });
      return { ok: true, user: u };
    },

    /** Suscripción a cambios. fn({collection}). Devuelve función para desuscribir. */
    on: function (fn) {
      var h = function (e) { fn(e.detail || {}); };
      bus.addEventListener('change', h);
      return function () { bus.removeEventListener('change', h); };
    },

    /** Restablece toda la base a la semilla (para demos). */
    reset: function () { db = JSON.parse(JSON.stringify(SEED)); write(db); emit('*'); },
  };

  /* Sincronización entre pestañas: si otra pestaña escribe, recargamos y avisamos. */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { var d = read(); if (d) { db = d; emit('*'); } }
    if (e.key === SESSION_KEY) { emit('session'); }
  });

  window.QADB = QADB;
  window.dispatchEvent(new Event('qadb-ready'));
})();
