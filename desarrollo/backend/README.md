# QUAKE ALERT - Backend (14 microservicios)

Arquitectura **event-driven** sobre un exchange de topicos RabbitMQ (`quakealert.events`).
Todos los servicios comparten el mismo patron: Express + Mongoose + bus, **arranque
degradable** (si falta Mongo/RabbitMQ siguen vivos en memoria/consola) y **multi-tenant**
por header `x-tenant-id`.

## Servicios y puertos

| Servicio | Puerto | Rol | Publica | Consume |
|---|---|---|---|---|
| detection | 3003 | Ingesta de sensores QuakeBox | seismic.detected | - |
| alert-engine | 3001 | Calcula llegada/intensidad/riesgo | alert.issued, seismic.detected | - |
| family | 3002 | Grupos y check-ins | checkin.received, assistance.requested | alert.issued |
| forms | 3004 | Catalogos / formularios dinamicos | - | - |
| notification | 3005 | Fan-out push/sms/whatsapp/email/voz/sirena | notification.sent | alert.issued, assistance.requested |
| voice | 3006 | Anuncios Alexa/Google/Siri/IVR | voice.announced | alert.issued |
| iot-gateway | 3007 | Sirenas, LED, valvulas, cerraduras | device.commanded | alert.issued |
| smart-city | 3008 | Zonas, alerta municipal, panico | city.alert.activated, alert.issued, city.panic | alert.issued |
| corporate | 3009 | Multi-sede por sector | corporate.alert | alert.issued |
| drills | 3010 | Simulacros + scoring | drill.started, drill.finished | - |
| analytics | 3011 | Agrega eventos -> KPIs/series | - | (todos) |
| agent-orchestrator | 3012 | Asistente IA (intenciones) | - | - |
| identity | 3013 | Auth, tenants, 2FA, tokens HMAC | user.registered | - |
| billing | 3014 | Planes, suscripciones, uso | subscription.changed, billing.limit.exceeded | - |

## Flujo de un sismo (cadena de eventos)

```
detection (POST /events)              forms (independiente: catalogos)
      |  seismic.detected             identity (independiente: auth)
      v                               billing (independiente: planes/uso)
alert-engine  --alert.issued-->  +--> family        (abre ventana de check-in)
                                 +--> notification   (push/sms/whatsapp/voz/sirena)
                                 +--> voice          (Alexa/Google/Siri/IVR)
                                 +--> iot-gateway    (sirenas, LED, gas, puertas)
                                 +--> smart-city     (marca zonas en alerta)
                                 +--> corporate      (protocolo por sede)
                                 +--> analytics      (KPIs / series)
family --assistance.requested--> notification (escala a 911/brigadas)
```

## Levantar todo en local

```bash
cd desarrollo
docker compose up --build
```

Sin Docker, cada servicio corre solo (modo degradado):

```bash
cd backend/<servicio> && npm install && npm run dev
```

## Probar la cadena completa

```bash
# 1) Inyecta un sismo M6.8
curl -X POST http://localhost:3001/events -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "magnitude": 6.8, "depthKm": 24, "epicenter": { "lat": 14.305, "lng": -90.785 } }'

# 2) Observa los efectos
curl http://localhost:3005/notifications -H 'x-tenant-id: gt'   # envios
curl http://localhost:3006/announcements -H 'x-tenant-id: gt'   # anuncios de voz
curl http://localhost:3007/commands      -H 'x-tenant-id: gt'   # comandos IoT
curl http://localhost:3011/metrics?period=7d -H 'x-tenant-id: gt' # analitica
```

> Cada servicio tiene su README con endpoints y ejemplos. Las formulas sismologicas
> (`alert-engine/domain`) son una aproximacion del prototipo; calibrarlas antes de produccion.
