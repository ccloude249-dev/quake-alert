# Corporate - proteccion multi-sede

Monitorea **sedes por sector** (banca, salud, educacion, industria, retail, gobierno) y
aplica el **protocolo** adecuado por sede ante una alerta. Soporta **alerta regional**
(todas las sedes o un sector) y consume `alert.issued` para activarse automaticamente.

## Endpoints
- `GET /sites?sector=` / `POST /sites`
- `GET /status` - agregado por sector
- `POST /alert/regional` - { risk, sector? }
- `POST /alert/clear`
- `GET /health`
