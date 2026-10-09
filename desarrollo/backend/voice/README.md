# Voice - anuncios por voz

Consume `alert.issued` y genera el **guion + SSML + duracion** para Alexa, Google Assistant,
Siri e IVR telefonico. El SSML se entrega al motor TTS de cada asistente.

## Endpoints
- `GET /announcements` - ultimos anuncios
- `GET /voices` - asistentes soportados
- `POST /announce` - anuncio manual { risk, lang, assistants[] }
- `GET /health`

## Probar
```bash
curl -X POST http://localhost:3006/announce -H 'Content-Type: application/json' \
  -H 'x-tenant-id: gt' -d '{ "risk": "rojo", "lang": "es" }'
```
