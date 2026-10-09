# Instrucciones de Deploy — para el equipo de desarrollo / DevOps

Este documento explica cómo **publicar todo QUAKE ALERT**. Hay dos entregables distintos:

1. **Sitio de demo (prototipos)** — los `.dc.html` de la raíz, servidos como estático.
2. **Backend + frontend reales** — el código en `desarrollo/`.

---

## A. Deploy del sitio de demo (prototipos) en Heroku

Los `.dc.html` renderizan standalone (cargan React/Babel desde CDN y hacen `fetch` de los
archivos hermanos en el navegador). Se sirven como sitio estático con el `server.js` de la
raíz.

```bash
# Desde la RAÍZ del proyecto (no desde desarrollo/)
git init
git add .
git commit -m "QUAKE ALERT — plataforma"
heroku create quake-alert-demo
git push heroku main          # o master según tu rama
heroku open
```

Heroku detecta Node por el `package.json` de la raíz, instala Express y arranca
`node server.js` (definido en `Procfile`). `PORT` lo inyecta Heroku.
Guía detallada: `../DEPLOY.md`.

---

## B. Deploy del backend (microservicios) en Heroku

**Cada microservicio es una app Heroku independiente.** Para cada uno
(`detection`, `alert-engine`, `family`, `forms`):

```bash
cd desarrollo/backend/alert-engine
git init && git add . && git commit -m "alert-engine"
heroku create quake-alert-engine

# Datos y bus de eventos (add-ons o servicios externos)
heroku addons:create cloudamqp:lemur            # RabbitMQ (los que usan bus)
heroku config:set MONGODB_URI="<tu MongoDB Atlas URI>"
heroku config:set CORS_ORIGIN="https://tu-consola.web.app"

git push heroku main
```

Notas:
- **MongoDB**: usa **MongoDB Atlas** (gratis para empezar) y pega la URI en `MONGODB_URI`.
  Alternativa: add-on de Mongo en Heroku.
- **RabbitMQ**: add-on **CloudAMQP** (`AMQP_URL` se inyecta solo) — lo usan detection,
  alert-engine y family. `forms` no necesita bus.
- Repetir para los 4 servicios (cambia el nombre de la app y el puerto lo maneja Heroku).
- Cada servicio ya trae su `Procfile` (`web: node src/server.js`).

### Alternativa: Docker / contenedores
Cada servicio tiene su `Dockerfile`. Para Heroku Container Registry:
```bash
cd desarrollo/backend/alert-engine
heroku container:push web -a quake-alert-engine
heroku container:release web -a quake-alert-engine
```
O despliega los contenedores en cualquier orquestador (ECS, Cloud Run, Kubernetes).

---

## C. Deploy del frontend (consola Angular)

```bash
cd desarrollo/frontend/console
npm install
npm run build                 # genera dist/console/

# Sirve dist/ como estático (Firebase Hosting, Netlify, S3+CloudFront,
# o un dyno Node con un server estático). Ejemplo con Heroku + buildpack estático:
#   añade un server estático o usa 'serve dist/console'
```

Antes de compilar, ajusta `src/environments/environment.ts` para que `alertEngineUrl` y
`formsUrl` apunten a las URLs públicas de los microservicios (paso B), no a localhost.

---

## D. Orden recomendado y checklist

1. **MongoDB Atlas** creado, URI a la mano.
2. **CloudAMQP** (o RabbitMQ gestionado) creado, `AMQP_URL` a la mano.
3. Deploy de los **4 microservicios** (B) — verifica `/health` de cada uno.
4. Ajusta `environment.ts` del frontend con esas URLs y **deploy del frontend** (C).
5. Deploy del **sitio de demo** (A) para presentaciones.
6. **CORS**: pon en `CORS_ORIGIN` el dominio real del frontend en cada servicio.

### Variables de entorno por servicio
| Variable | Servicios | Ejemplo |
|---|---|---|
| `PORT` | todos | lo inyecta Heroku |
| `MONGODB_URI` | todos | `mongodb+srv://...atlas.../quakealert` |
| `AMQP_URL` | detection, alert-engine, family | `amqps://...cloudamqp.com/...` |
| `CORS_ORIGIN` | alert-engine, forms | `https://consola.quakealert.gt` |
| `TENANT_HEADER` | todos | `x-tenant-id` (default) |

> Para multi-tenant en producción: emitir JWT con claim `tenantId` desde el servicio de
> Identidad (OAuth2/OIDC) y validar en un API Gateway/BFF delante de los microservicios.
> Detalle en `../ARCHITECTURE.md`.

---

## E. Para levantar TODO en local de un golpe (desarrollo)
Ver `LEEME.md` → `docker compose up --build` (Mongo + RabbitMQ + 4 servicios).
