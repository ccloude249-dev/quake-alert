# QUAKE ALERT — Guía de Desarrollo

Esta carpeta contiene **todo el código fuente** para que un desarrollador levante la
plataforma: el **backend** (microservicios Node.js + Express + MongoDB + RabbitMQ) y el
**frontend** (consola Angular 20). Los **prototipos** (`.dc.html`) viven en la raíz del
proyecto y son la referencia visual/UX de cada pantalla.

```
desarrollo/
  LEEME.md              ← este archivo (empieza aquí)
  DESPLIEGUE-DEVOPS.md  ← instrucciones de DEPLOY (para el equipo de desarrollo / DevOps)
  docker-compose.yml    ← levanta TODO el backend local con un comando
  backend/              ← microservicios (Node.js + Express)
    detection/          ← sensores QuakeBox → seismic.detected         :3003
    alert-engine/       ← calcula alertas → alert.issued               :3001
    family/             ← grupos y check-ins (consume alert.issued)    :3002
    forms/              ← catálogos / formularios dinámicos            :3004
  frontend/
    console/            ← consola web Angular 20 (conecta al backend)  :4200
```

> El pipeline crítico es **Detection → Alert Engine → Family**, comunicados por el bus de
> eventos (RabbitMQ). `forms` da soporte a todos los catálogos dinámicos.

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| **Node.js** | 20.x LTS | Backend y frontend |
| **npm** | 10.x (viene con Node) | Dependencias |
| **Docker + Docker Compose** | reciente | Levantar todo el backend de un golpe (recomendado) |
| **MongoDB** | 7.x | Solo si NO usas Docker |
| **RabbitMQ** | 3.x | Solo si NO usas Docker |
| **Angular CLI** | 20.x (`npm i -g @angular/cli`) | Frontend |

> Sin Mongo/RabbitMQ los servicios **igual arrancan** en modo degradado (sin persistencia;
> los eventos se imprimen en consola). Útil para una prueba rápida.

---

## 2. Opción A — Todo el backend con Docker (recomendado)

```bash
cd desarrollo
docker compose up --build
```

Esto levanta **MongoDB, RabbitMQ y los 4 microservicios** ya cableados entre sí:

| Servicio | URL |
|---|---|
| Detection | http://localhost:3003/health |
| Alert Engine | http://localhost:3001/health |
| Family | http://localhost:3002/health |
| Forms | http://localhost:3004/health |
| RabbitMQ (panel admin) | http://localhost:15672 (guest / guest) |

Para apagar: `Ctrl+C` y luego `docker compose down` (añade `-v` para borrar datos).

---

## 3. Opción B — Backend a mano (sin Docker)

Cada servicio es idéntico de operar. Por cada uno:

```bash
cd desarrollo/backend/alert-engine     # (o detection / family / forms)
cp .env.example .env                   # ajusta MONGODB_URI / AMQP_URL si quieres
npm install
npm run dev                            # recarga en caliente
```

Repite en una terminal por servicio. Puertos: alert-engine 3001, family 3002,
detection 3003, forms 3004.

### Probar el pipeline end-to-end
```bash
# 1) Simular lecturas de 3 sensores (alcanza quórum → seismic.detected)
for s in s1 s2 s3; do
  curl -s -X POST http://localhost:3003/readings \
    -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
    -d "{\"sensorId\":\"$s\",\"peakAmplitude\":0.15,\"location\":{\"lat\":14.31,\"lng\":-90.78}}"; echo
done

# 2) Ingresar un evento directo al Alert Engine (calcula alertas por zona)
curl -s -X POST http://localhost:3001/events \
  -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "magnitude":6.8, "depthKm":24, "epicenter":{"lat":14.305,"lng":-90.785} }'

# 3) Ver alertas
curl http://localhost:3001/alerts -H 'x-tenant-id: gt'
```

Cada servicio tiene su propio `README.md` con endpoints y ejemplos.

---

## 4. Frontend — consola Angular 20

```bash
cd desarrollo/frontend/console
npm install
npm start            # http://localhost:4200
```

- Apunta al Alert Engine (`:3001`) y a Forms (`:3004`); configurable en
  `src/environments/environment.ts`.
- Trae `DynamicFormComponent` (renderiza cualquier catálogo del Form Builder) y los
  servicios HTTP (`AlertService`, `FormsService`).
- **App móvil:** se construye con **Ionic + Angular (Capacitor)** reutilizando el mismo
  `src/app/core/` y `shared/dynamic-form/`. Ver `frontend/console/README.md`.

---

## 5. Prototipos de referencia (UX/flujo)

Los `.dc.html` en la raíz del proyecto son el **diseño de cada pantalla** (alta fidelidad,
interactivos). El desarrollador los usa como **referencia visual** para implementar en
Angular/Ionic — no se despliegan como producto final, pero **sí** se publican como sitio
de demo (ver `DESPLIEGUE-DEVOPS.md`). Empieza por `QUAKE ALERT.dc.html` (índice de las 16
superficies).

---

## 6. Qué falta para producción (mapa para el desarrollador)

- **Microservicios por clonar** (mismo patrón que los 4 existentes): Notification, Voice,
  IoT Gateway, Smart City, Corporate, Drills, Analytics, Identity/Auth, Billing.
- **Frontend**: routing + guards de auth, portar cada dashboard del prototipo a componentes
  Angular, y la app Ionic con biometría/push.
- **Infra**: API Gateway/BFF, Identidad OAuth2/OIDC, observabilidad.

La arquitectura completa y el mapeo superficie→servicio está en `../ARCHITECTURE.md`.
El estado de interactividad de cada prototipo está en `../AUDIT.md`.
