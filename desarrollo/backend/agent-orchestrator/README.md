# Agent Orchestrator - asistente de emergencias

Detecta la **intencion** del mensaje (evacuacion, que hacer, familia, reportar, preparacion)
y la rutea a una **habilidad** que devuelve respuesta + acciones + sugerencias. El ruteo es
por reglas y se puede encadenar con un LLM sin cambiar la interfaz.

## Endpoints
- `POST /chat` - { message, userId? }
- `GET /conversations/:userId`
- `GET /health`

## Probar
```bash
curl -X POST http://localhost:3012/chat -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
  -d '{ "message": "cual es la ruta de evacuacion?" }'
```
