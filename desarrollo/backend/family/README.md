# Family Safety — microservicio de referencia (lado consumidor)

Node.js + Express + MongoDB + RabbitMQ. Gestiona **grupos familiares** y **check-ins**
("Estoy bien" / "Necesito ayuda" / "Emergencia médica"), y **consume eventos** del bus:
se suscribe a `alert.issued` (publicado por el Alert Engine) para abrir la ventana de
seguridad. Complementa a `alert-engine` mostrando el patrón **subscribe** además de
**publish**.

## Estructura
```
src/
  server.js          arranque + bootstrap + inicia el consumidor
  db.js              conexión MongoDB (degradable)
  bus.js             publish + subscribe (RabbitMQ topic exchange)
  models.js          esquemas Group y CheckIn
  family.service.js  lógica: crear grupo, check-in, estado agregado
  alertConsumer.js   se suscribe a 'alert.issued'
  routes.js          POST /groups · GET /groups/:id/status · POST /checkins
```

## Correr
```bash
cd services/family
cp .env.example .env
npm install
npm run dev
```

## Probar
```bash
# Crear grupo
curl -X POST localhost:3002/groups -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "name": "Familia García", "members": [{ "name": "Ana", "userId": "u1" }] }'

# Check-in "estoy bien"
curl -X POST localhost:3002/checkins -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "groupId": "<id>", "memberId": "u1", "memberName": "Ana", "status": "bien" }'

# Estado del grupo
curl localhost:3002/groups/<id>/status -H 'x-tenant-id: gt'
```

Con `AMQP_URL` configurado, al recibir un `alert.issued` el servicio loguea la apertura
de la ventana de seguridad. Cada check-in publica `checkin.received`; si es ayuda/médica,
además `assistance.requested` (para brigadas / 911).

## Patrón replicable
`alert-engine` (publisher) + `family` (consumer) son las dos plantillas. Cualquier servicio
nuevo (Smart City, Drills, Corporate, Analytics…) combina ambos lados según necesite.
