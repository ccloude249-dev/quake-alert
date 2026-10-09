# Alert Engine — microservicio de referencia

Servicio de **Node.js + Express + MongoDB (Mongoose) + RabbitMQ** que implementa el
corazón de QUAKE ALERT: recibe un evento sísmico, calcula **tiempo de llegada**,
**intensidad** y **nivel de riesgo** por zona, y publica `alert.issued` al bus de eventos.

Es el **patrón a replicar** para los demás microservicios (Detection, Family, Smart City,
Corporate, Drills, Analytics, …): misma estructura DDD, mismo arranque degradable, mismo bus.

## Estructura

```
src/
  server.js               arranque Express + bootstrap (db, broker, rutas)
  config/
    db.js                 conexión MongoDB (degrada si no hay URI)
    broker.js             publisher RabbitMQ (degrada a consola si no hay AMQP)
  domain/
    alertCalculator.js    LÓGICA PURA: haversine, llegada, intensidad, riesgo
  models/
    seismicEvent.model.js  esquema Mongoose del evento sísmico
    alert.model.js         esquema Mongoose de la alerta
  services/
    alert.service.js       orquesta: persiste evento → calcula alertas → publica
  routes/
    events.routes.js       POST /events  (ingesta)
    alerts.routes.js       GET  /alerts   (consulta)
```

## Correr en local

```bash
cd services/alert-engine
cp .env.example .env       # ajusta MONGODB_URI / AMQP_URL (opcionales)
npm install
npm run dev
```

Sin MongoDB ni RabbitMQ el servicio **igual arranca** (modo degradado: sin persistencia,
eventos a consola) — ideal para probar la lógica de inmediato.

## Probar

```bash
# Ingresar un sismo M6.8 con epicentro en Escuintla
curl -X POST http://localhost:3001/events \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: gt' \
  -d '{ "magnitude": 6.8, "depthKm": 24, "epicenter": { "lat": 14.305, "lng": -90.785 } }'

# Ver alertas recientes
curl http://localhost:3001/alerts -H 'x-tenant-id: gt'
```

La respuesta del POST trae, por cada zona, `arrivalSeconds`, `intensity`, `risk` y los
`channels` de difusión. Cada alerta se publica como evento `alert.issued`.

## Deploy en Heroku

```bash
cd services/alert-engine
heroku create quake-alert-engine
heroku addons:create cloudamqp:lemur          # RabbitMQ (opcional)
heroku config:set MONGODB_URI="<tu Atlas URI>"
git init && git add . && git commit -m "alert-engine"
git push heroku main
```

> Las fórmulas de `alertCalculator.js` son una aproximación para el prototipo;
> calíbrenlas con modelos sismológicos reales antes de producción.
