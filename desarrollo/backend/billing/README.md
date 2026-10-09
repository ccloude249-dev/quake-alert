# Billing

Catalogo de **planes** (Free / Ciudad / Empresa / Nacional), **suscripciones** por tenant y
**medicion de uso** (alertas, sensores, sedes, SMS, voz). Avisa por el bus cuando se supera
un limite (`billing.limit.exceeded`).

## Endpoints
- `GET /plans`
- `POST /subscriptions` - { plan, seats }
- `GET /subscriptions/me`
- `POST /usage` - { metric, qty }
- `GET /usage/summary`
- `GET /health`
