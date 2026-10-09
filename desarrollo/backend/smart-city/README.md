# Smart City - panel municipal

Registro de **zonas/distritos** y sus activos (sirenas, paneles LED, botones de panico).
Activa la **alerta municipal** (que ademas reinyecta `alert.issued` para difusion multicanal),
gestiona el **boton de panico** ciudadano y consume alertas sismicas externas.

## Endpoints
- `GET /zones` / `POST /zones`
- `GET /status` - resumen agregado
- `POST /alert` - activar { zoneId?, risk, message }
- `POST /alert/clear` - finalizar
- `POST /panic` - boton de panico
- `GET /health`
