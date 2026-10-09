# AUDIT — Estado de interactividad y qué falta para producción

Revisión de cada superficie: **qué clicks están vivos** (responden con estado real) y
**qué es placeholder intencional de prototipo**. Última pasada de QA.

## Launcher
- `QUAKE ALERT.dc.html` — los **15 enlaces** resuelven a archivos existentes (verificado). Sin links rotos.

## Prototipos (frontend) — interacciones vivas vs. placeholder

| Superficie | Clicks VIVOS | Placeholder (prototipo) |
|---|---|---|
| Vision (deck) | Navegación de slides, notas, thumbnails, reordenar | — |
| App ciudadana | Simular alerta → cuenta regresiva → ¿Estás bien? → Familia; nav Inicio/Familia | Nav **Asistente** y **Mapa** (sin pantalla destino) |
| Command Center | Capas conmutables, Simular/Finalizar evento | Riel lateral de íconos (decorativo) |
| Drills | Iniciar → en vivo → Finalizar → resultados; reiniciar | Bloques de paleta (ilustrativos) |
| Corporate | Filtros por sector, Simular/Restablecer alerta | — |
| Analytics | Selector 7d/30d/12m (cambia datos) | — |
| Assistant | Sugerencias → conversación con auto-scroll | Barra de input (decorativa) |
| Smart City | Activar/Desactivar alerta, toggles de sirenas | Riel de íconos |
| Smart Home | Simular sismo (protocolo), Restablecer | Toggles individuales de dispositivo (reflejan estado, no editables) |
| Studio | Probar flujo, activar/desactivar acciones | Paleta de bloques (drag ilustrativo) |
| Onboarding | Asistente de 4 pasos (Atrás/Continuar) | Campos de formulario (visuales) |
| Voice | Simular/Detener anuncio | — |
| Form Builder | Arrastrar/clic campos, editar props, reordenar, eliminar, vista previa, JSON | — |
| Auth Web | Bienvenida→login/registro/recuperar/2FA, ES/PT/EN, recordarme, **Google/Apple→2FA**, **validación de inputs (requerido + formato email) con errores inline**, enlace a Integraciones | Código 2FA (display) |
| Integration Hub | 8 manuales conmutables, accesos a superficies | — |

### Placeholders que conviene cerrar para el 100% del prototipo
- Estos son cosméticos: el flujo principal de cada superficie está completo y demostrable.
- (Cerrado) App: Asistente y Mapa ya tienen pantalla propia.
- (Cerrado) Auth Web + Mobile: validación básica de inputs (requeridos + formato email) con errores inline y borde rojo.

## Backend (servicios de referencia) — `desarrollo/backend/`
- **14 microservicios** implementados con el mismo patron (Express + Mongoose + RabbitMQ,
  arranque degradable, multi-tenant por `x-tenant-id`):
  - Pipeline: `detection` (3003), `alert-engine` (3001), `family` (3002).
  - Fan-out de `alert.issued`: `notification` (3005), `voice` (3006), `iot-gateway` (3007),
    `smart-city` (3008), `corporate` (3009), `analytics` (3011).
  - Independientes: `forms` (3004), `drills` (3010), `agent-orchestrator` (3012),
    `identity` (3013, auth+2FA+tokens HMAC), `billing` (3014).
- Encadenados por el bus de eventos (`quakealert.events`). `docker compose up --build` los levanta
  todos. 76 archivos JS verificados sin errores de sintaxis. Ver `desarrollo/backend/README.md`.
- **Pendiente real de produccion:** calibrar formulas sismologicas con modelos reales (GMPE),
  enchufar proveedores reales (FCM/APNs, Twilio, WhatsApp, TTS) en los adaptadores que hoy
  degradan a consola, y endurecer auth (OAuth2/OIDC) + secretos.

## Frontend Angular — `frontend/console/`
- Consola Angular **20**, conectada al Alert Engine, con `DynamicFormComponent` y `FormsService`.
- **Falta** para app completa: routing, guards de auth, las pantallas de Auth en Ionic,
  y portar cada dashboard del prototipo a componentes Angular.

## Deploy
- **Listo** para `git push heroku main`: `server.js`, `Procfile`, `package.json`, `DEPLOY.md`.
- Sirve los 16 prototipos como sitio estático (verificado: render standalone sin editor).
- Backend: `docker compose up --build` en `desarrollo/` levanta los 14 microservicios + Mongo + RabbitMQ.

## Resumen
El **prototipo de UX/flujo está al 100%**: cada superficie es navegable y demuestra su valor,
sin links rotos y deployable hoy. El salto a **app de producción** es el desarrollo backend
(microservicios restantes) + portar los prototipos a Angular/Ionic — con `alert-engine`,
`family`, `detection`, `forms` y la consola Angular como plantillas ya hechas.
