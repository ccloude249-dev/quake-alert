# IoT Gateway - dispositivos y comandos

Registro de **sirenas, paneles LED, valvulas de gas, cerraduras y luces** por zona.
Ante `alert.issued` ejecuta un **playbook** segun el riesgo (sirena ON, LED 'EVACUAR',
cerrar gas, abrir cerraduras...) y publica `device.commanded`.

## Endpoints
- `GET /devices?zoneId=` / `POST /devices`
- `POST /devices/:id/command` - { action, params }
- `GET /commands` - historial
- `GET /health`

## Probar
```bash
curl -X POST http://localhost:3007/devices -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "deviceId": "sir-001", "kind": "sirena", "zoneId": "gt-centro", "name": "Sirena Plaza" }'
curl -X POST http://localhost:3007/devices/sir-001/command -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "action": "on", "params": { "seconds": 30 } }'
```
