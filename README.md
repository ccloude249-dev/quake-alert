# QUAKE ALERT — Public Safety Intelligence Platform

Plataforma de inteligencia para **alertas tempranas de sismos, protección civil, ciudades
inteligentes y gestión de emergencias** para Latinoamérica.

Este repositorio contiene **dos capas**:

## 1. Experiencia (prototipos interactivos)
Doce superficies `.dc.html` navegables desde el launcher **`QUAKE ALERT.dc.html`**:
app ciudadana, command center de gobierno, simulacros con IA, protección corporativa,
analytics & BI, asistente IA, smart city, smart home, low-code studio, onboarding de
sensores, asistentes de voz y el deck de visión. Son la referencia de UX/flujo de los
frontends reales (Angular / Ionic).

➡ Deploy estático en Heroku: ver **`DEPLOY.md`**.

## 2. Servicios (backend de referencia) — `desarrollo/backend/`
- **`detection/`** — ingiere lecturas de sensores QuakeBox, detección por **quórum**,
  emite `seismic.detected`.
- **`alert-engine/`** — **consume/ingiere** el evento, calcula llegada/intensidad/riesgo,
  emite `alert.issued`.
- **`family/`** — **consume** `alert.issued`; grupos y check-ins, emite `checkin.received`.

Pipeline: `Detection → Alert Engine → Family`. Plantillas a replicar (Node.js + Express +
MongoDB + RabbitMQ).

## 3. Frontend (consola de referencia) — `desarrollo/frontend/console/`
Consola **Angular 20 (standalone)** conectada al Alert Engine: feed de alertas en vivo +
simulador de evento. La app móvil reutiliza el mismo `AlertService` en **Ionic + Angular**.

## Stack objetivo
Angular (consolas web) · Ionic + Angular/Capacitor (app móvil) · Node.js + Express
(servicios) · MongoDB (datos) · Redis · RabbitMQ (CloudAMQP) · Socket.IO.
Todo en un solo lenguaje (JS/TS) y deployable en Heroku.

➡ Arquitectura completa y mapeo superficie→servicio: ver **`ARCHITECTURE.md`**.

## Inicio rápido
```bash
# Prototipos (web)
npm install && npm start          # sirve el launcher en http://localhost:3000

# Microservicio de referencia
cd desarrollo/backend/alert-engine && npm install && npm run dev
```

> Todo el código de desarrollo (backend + frontend) vive en **`desarrollo/`**.
> Empieza por `desarrollo/LEEME.md` (instalar + levantar) y `desarrollo/DESPLIEGUE-DEVOPS.md` (deploy).

> Las fórmulas sismológicas del Alert Engine son aproximaciones de prototipo;
> calíbrenlas con modelos reales antes de producción.
