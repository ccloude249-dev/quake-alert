# Arquitectura — dónde encaja cada prototipo

Este repo es la **capa de experiencia (frontend / prototipos)** de QUAKE ALERT.
Cada superficie `.dc.html` es la referencia visual e interactiva de una app o consola
real. Abajo se mapea cada una a su **frontend destino** y a los **microservicios**
(Node.js + Express, Event-Driven, CQRS, DDD, multi-tenant) con los que dialoga.

**Stack elegido:** Angular (consolas web) · Ionic + Angular/Capacitor (app móvil) ·
Node.js + Express (servicios) · MongoDB (datos). Un solo lenguaje (JS/TS) end-to-end.

> Nota de alcance: el backend (Node.js + Express / microservicios) vive en `desarrollo/backend/`.
> Los **14 microservicios** ya estan implementados con el mismo patron (Express + Mongoose + bus,
> arranque degradable, multi-tenant). Ver `desarrollo/backend/README.md` para la tabla completa
> de puertos, eventos y el flujo de la cadena.

## 1. Mapeo superficie → frontend → servicios

| Prototipo (.dc.html) | Frontend destino | Microservicios / dominios |
|---|---|---|
| `QUAKE ALERT` (índice) | Portal / launcher web | — (estático) |
| `Quake Alert Vision` | Sitio marketing / sala de ventas | CMS |
| `Quake Alert App` | **App ciudadana** (Ionic + Angular) | Detection, Alert Engine, Family Safety, Identity |
| `Quake Alert Assistant` | App ciudadana (módulo IA) | AI Emergency Assistant, Agent Orchestrator |
| `Quake Alert Onboarding` | App ciudadana (alta) | IoT Gateway (QuakeBox), Identity |
| `Quake Alert Voice` | Skills/Actions/Shortcuts | Voice Integration, Alert Engine |
| `Quake Alert Command Center` | **Consola Gobierno** (web) | Detection, Alert Engine, GIS, Analytics |
| `Quake Alert Drills` | Consola Gobierno / Institucional | Drill Management, Drill AI Coordinator, Analytics |
| `Quake Alert Smart City` | Consola Municipal (web) | Smart City, IoT Gateway |
| `Quake Alert Corporate` | **Consola Empresarial** (web, multi-tenant) | Corporate Protection, Alert Engine, Analytics |
| `Quake Alert Analytics` | Consola Gobierno/Empresarial (BI) | Analytics & BI, Agent Orchestrator |
| `Quake Alert Smart Home` | App ciudadana / Home hub | Smart Home, IoT Gateway |
| `Quake Alert Studio` | Consola Admin (low-code) | Low-Code Integration, Agent Orchestrator |

## 2. Capas

```
EXPERIENCIA (este repo = prototipos)
  · App ciudadana ........ Ionic + Angular (Capacitor)
  · Consolas web ......... Angular
    Gobierno · Empresarial · Municipal · Studio · Voz
        |   HTTPS / REST · WebSocket (Socket.IO)
        v
BFF / API GATEWAY ........ Node.js + Express  (auth, agregación, rate-limit)
        |   comandos (CQRS) / eventos (EDA)
        v
MICROSERVICIOS ........... Node.js + Express  (DDD, multi-tenant)
  Detection · Alert Engine · Family · AI Assistant · Voice ·
  Smart Home · IoT Gateway · Smart City · Corporate · Drills ·
  Analytics · Agent Orchestrator · Low-Code · Identity
        |   event bus: CloudAMQP (RabbitMQ) · Mongo Change Streams
        v
DATOS .................... MongoDB Atlas (multi-tenant) · Redis · S3
```

## 3. Eventos clave (Event-Driven)
`SeismicEventDetected` → `AlertIssued` → `AlertDelivered` ·
`CheckInReceived` · `PanicButtonPressed` · `DrillStarted` / `DrillCompleted` ·
`DeviceStateChanged` (IoT) · `SirenActivated` · `WorkflowExecuted`.

## 4. Topología de despliegue en Heroku
- **Este repo** → 1 dyno web (estático, ver `DEPLOY.md`). Ideal para demos y revisión.
- **Cada microservicio** → app Heroku independiente (Node.js + Express), o monorepo con
  subdirectorios. Datos en **MongoDB Atlas** (add-on o cluster externo), **Heroku Data
  for Redis** y **CloudAMQP (RabbitMQ)** como bus de eventos.
- **API Gateway/BFF** (Node.js + Express) → enruta a los servicios internos.
- **Tiempo real**: Socket.IO + **MongoDB Change Streams** para alertas y mapas en vivo.
- **Multi-tenant**: base/colección por tenant (aislamiento fuerte) o campo `tenantId`
  con índices (más simple), según el cliente.
- **Identidad**: OAuth2 / OIDC (Heroku + proveedor externo, p. ej. Auth0/Cognito).

## 5. Móvil
La `App ciudadana` se implementa en **Ionic + Angular (Capacitor)** (push con FCM/APNs,
ejecución en segundo plano y pantalla bloqueada vía plugins de Capacitor). Los prototipos `Quake Alert App`,
`Assistant`, `Onboarding` y `Voice` son la referencia de UX/flujo para esa app.

## 6. Implementación de referencia
`desarrollo/backend/` contiene los **14 microservicios reales** (Node.js + Express + MongoDB +
RabbitMQ), encadenados por el bus de eventos. El pipeline critico:
- **`detection/`** (3003) — sensores QuakeBox → detección por quórum → `seismic.detected`.
- **`alert-engine/`** (3001) — calcula llegada/intensidad/riesgo → `alert.issued`.
- **`family/`** (3002) — consume `alert.issued` → grupos y check-ins → `checkin.received`.

Y los **fan-out** que reaccionan a `alert.issued`: `notification/` (3005), `voice/` (3006),
`iot-gateway/` (3007), `smart-city/` (3008), `corporate/` (3009), `analytics/` (3011).
Independientes: `forms/` (3004), `drills/` (3010), `agent-orchestrator/` (3012),
`identity/` (3013), `billing/` (3014). Todos comparten estructura DDD, arranque degradable
y el mismo bus — ver la tabla y el diagrama en `desarrollo/backend/README.md`.

`desarrollo/frontend/console/` es la **consola Angular 20** de referencia conectada al Alert Engine
(feed en vivo + simulador). La app móvil clona su `core/` en **Ionic + Angular**.

## 7. Formularios dinámicos (catálogos)
Todos los catálogos se definen con el **Constructor de Formularios**
(`Quake Alert Form Builder.dc.html`): se **arrastran campos** y se obtiene una
**definición JSON** → `{ catalog, fields:[{ type, label, name, required, options? }] }`.
- **Almacenamiento (MongoDB):** colección `formDefinitions` guarda cada definición; los
  registros del catálogo van en `formSubmissions` (documentos flexibles, sin esquema fijo
  — encaja natural con Mongo).
- **Render (Angular/Ionic):** `DynamicFormComponent` recibe la definición y genera un
  Reactive Form (un control por campo; validadores desde `required`/tipo). La misma
  definición renderiza en web e Ionic. Ver `desarrollo/frontend/console/src/app/shared/dynamic-form/`.
- **Servicio:** `desarrollo/backend/forms/` (Node + Express) — CRUD de definiciones y submissions,
  multi-tenant. Mismo patrón que los demás servicios.
