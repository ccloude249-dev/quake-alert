# Analytics & BI

Consume los eventos del bus (`seismic.detected`, `alert.issued`, `checkin.received`,
`notification.sent`, `drill.finished`, ...) y los agrega en **KPIs, distribucion de riesgo
y series temporales** para los paneles 7d / 30d / 12m.

## Endpoints
- `GET /metrics?period=7d|30d|12m`
- `GET /events/recent`
- `GET /health`
