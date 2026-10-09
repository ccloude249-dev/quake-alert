# Notification - fan-out multicanal

Consume `alert.issued` (y `assistance.requested`) y difunde por **push, SMS, WhatsApp,
email, voz y sirena**. Los proveedores degradan a consola en modo demo pero exponen la
misma interfaz `send()` para enchufar FCM/APNs, Twilio, WhatsApp Cloud, SendGrid, etc.

## Endpoints
- `GET /notifications` - ultimos envios
- `GET /channels` - proveedores por canal
- `POST /test` - notificacion de prueba { risk, channels[], targetName }
- `GET /health`

## Probar
```bash
curl -X POST http://localhost:3005/test -H 'Content-Type: application/json' \
  -H 'x-tenant-id: gt' -d '{ "risk": "rojo", "channels": ["push","sms","voz"] }'
curl http://localhost:3005/notifications -H 'x-tenant-id: gt'
```
