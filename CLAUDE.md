# QUAKE ALERT — Plataforma de Inteligencia para Protección Civil

Ecosistema de diseño (HTML / Design Components) para una plataforma de alerta temprana
de sismos, protección civil, smart cities y gestión de emergencias para Latinoamérica.
Todas las piezas son **prototipos interactivos reales** (.dc.html) con estado y disparadores.

## Puerta de entrada
- `QUAKE ALERT.dc.html` — índice / launcher. Enlaza las 12 superficies con tarjetas.
  Abrir esta primero para navegar todo el ecosistema.

## Superficies (12)
| Archivo | Qué es | Interacción clave |
|---|---|---|
| `Quake Alert Vision.dc.html` | Deck de visión, 17 slides (deck-stage) | Navegación de slides, notas de orador |
| `Quake Alert App.dc.html` | App ciudadana (iOS frame) | "Simular alerta" → cuenta regresiva en vivo → ¿Estás bien? → Familia |
| `Quake Alert Command Center.dc.html` | Panel GIS de gobierno (CONRED) | Capas conmutables + "Simular evento" enciende el mapa |
| `Quake Alert Drills.dc.html` | Plataforma de simulacros con IA | 3 fases: config → en vivo (78%) → resultados (score 94) |
| `Quake Alert Corporate.dc.html` | Protección multi-sede (bancos/hospitales/escuelas) | Filtros por sector + "Simular alerta regional" |
| `Quake Alert Analytics.dc.html` | Analytics & BI (gráficos) | Selector de período 7d/30d/12m cambia datos |
| `Quake Alert Assistant.dc.html` | Asistente IA conversacional (iOS frame) | Sugerencias → conversación con auto-scroll |
| `Quake Alert Smart City.dc.html` | Panel municipal (sirenas, LED, pánico) | "Activar alerta municipal" + toggles de sirenas |
| `Quake Alert Smart Home.dc.html` | Automatización del hogar | "Simular sismo" ejecuta protocolo (gas/puertas/luces/sirena) |
| `Quake Alert Studio.dc.html` | Low-Code Integration Studio | "Probar flujo" + toggle de acciones del workflow |
| `Quake Alert Onboarding.dc.html` | Alta de sensor QuakeBox (iOS frame) | Asistente de 4 pasos |
| `Quake Alert Voice.dc.html` | Asistentes de voz (Alexa/Google/Siri) | "Simular anuncio" → escena de voz con onda |
| `Quake Alert Form Builder.dc.html` | Constructor de formularios dinámicos (catálogos) | Arrastra/clic campos → preview en vivo + definición JSON |
| `Quake Alert Alarma Móvil.dc.html` | Alarma de bolsillo (USGS en vivo, Leaflet) | Armar → vigila; "Activar alertas en segundo plano" (Web Push) + "Probar con pantalla bloqueada"; modo guardián (wake lock + audio anti-suspensión) |

## Sistema visual (usar en TODA pieza nueva para mantener coherencia)
- **Fondo:** navy profundo `#070c14` / `#060a12`; superficies `rgba(20,30,48,0.5)`; bordes `rgba(120,160,200,0.14)`.
- **Acentos:** cian `#22d3ee` (primario), rojo alerta `#fb5670`, ámbar `#f5a623`, verde a salvo `#20c997`.
- **Tipografía:** `Space Grotesk` (display/títulos), `IBM Plex Sans` (cuerpo), `IBM Plex Mono` (etiquetas en mayúsculas con letter-spacing 0.12–0.3em).
- **Patrones:** grid de líneas sutiles sobre mapas; ondas de propagación (`@keyframes qaRing`); chips redondeados; tarjetas con borde fino y glow del acento.
- **Idioma:** español (Latinoamérica). **Sin emoji de colores** — usar glifos geométricos monocromos (◉ ▣ ✦ ◆ ▸ ◇) que se tiñen con `color`.

## Convenciones técnicas
- Cada pieza es UN Design Component (`.dc.html`); estilos **inline**; lógica en `class Component extends DCLogic`.
- Dashboards full-viewport: `$preview` ~1512×950. Pantallas móviles: usan `ios-frame.jsx` vía `<x-import component="IOSDevice">`.
- El deck usa `deck-stage.js` vía `<x-import component-from-global-scope="deck-stage">`.
- **Sin `setInterval`** salvo necesidad real (la app usa uno para la cuenta regresiva): los timers JS continuos cuelgan las herramientas de captura/eval. Preferir animaciones CSS y transiciones disparadas por estado.
- Los cambios de estado vía *style-holes* (`background:{{ x }}`) se actualizan en el DOM real pero el renderizador de capturas (html-to-image) no siempre los repinta — verificar con estilo inline si hay duda.

## Deploy (Heroku)
- Código fuente real (backend + frontend) en **`desarrollo/`**: `LEEME.md` (instalar + levantar
  local con `docker compose up`), `DESPLIEGUE-DEVOPS.md` (deploy), `backend/` (14 microservicios Node,
  ver `backend/README.md`), `frontend/console/` (Angular 20). Los prototipos `.dc.html` se quedan en la raíz.
- `server.js` (Express) sirve todo el repo estático; `/` → Landing pública (`/consola`, `/app`, `/alarma` atajos; `/launcher` → `QUAKE ALERT.dc.html` si existe). `/api/quakes` = catálogo USGS cacheado que consumen los clientes.
- `package.json` + `Procfile` (`web: node server.js`) → buildpack de Node automático.
- Los `.dc.html` renderizan standalone: `support.js` carga React/Babel desde CDN y hace
  `fetch` de archivos hermanos en el navegador; el aviso al editor está guardado con
  `if (window.parent === window) return;`, así que sirve por HTTP sin cambios.
- Guía: `DEPLOY.md`. Mapeo a microservicios/frontends: `ARCHITECTURE.md`.
- **Segundo plano:** `server.js` también es el vigilante USGS (poll 30 s) y expone `/api/push/*`
  (Web Push con `web-push`, claves VAPID por config vars). `sw.js` maneja `push`/`notificationclick`;
  `manifest-alarma.webmanifest` es el manifest de la Alarma. `data/` (claves + suscripciones) no se commitea.

## APK Android (App ciudadana + alarma nativa)
- `desarrollo/android-app/` — Capacitor + capa nativa Java (`native/java`): servicio en primer plano que no se duerme,
  alarma por canal ALARM (suena en silencio), vibración, pantalla encendida sobre el bloqueo, flash. Ver `LEEME.md` ahí.
- Generar: `cd desarrollo/android-app && npm run apk -- https://TU-APP.herokuapp.com` → `dist/QuakeAlert-debug.apk`.
  Carga `/app` (= `Quake Alert App.dc.html`); `--path=/alarma` empaqueta solo la alarma.
- `qa-native.js` (`window.QANative`) es el puente web ↔ plugin `QuakeAlarm`. La App ciudadana muestra la tarjeta "Alarma sísmica"
  (activar, permisos, probar) y, tras una alarma real, abre la pantalla de alerta + check-in. `Alarma Móvil` tiene su propia tarjeta
  "Alarma nativa". En navegador se revisan con `?nativedemo=1`.
- Demo: usuario `operador@gmail.com` / `Admin123@@` (se asegura en `qa-db.js`). `Auth Mobile` entra directo a la App; con esa cuenta la App activa
  el vigilante y programa un simulacro a los 30 s con `AlarmManager.setAlarmClock` (suena aunque el teléfono duerma). En el APK, sin sesión la App redirige a `Auth Mobile`. En navegador: cuenta regresiva en la página (suena con pantalla encendida).
- Servidor: `/api/stream` (SSE) + `/api/quakes/recent` los consume el servicio nativo. Fase 2: FCM de prioridad alta.

## Pendientes / próximos pasos posibles
- Exportar `Quake Alert Vision.dc.html` a PPTX o PDF (requiere usuario presente).
- Aplicar logo/marca real de QUAKE ALERT (hoy placeholder ◉).
- Posibles módulos extra: Digital Twin de ciudad, paneles School/Hospital dedicados.
