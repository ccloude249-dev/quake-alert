# Detection — microservicio (aguas arriba)

Node.js + Express + MongoDB + RabbitMQ. Ingiere **lecturas de sensores QuakeBox**, aplica
**detección por quórum** (N sensores superan el umbral dentro de una ventana) y publica
`seismic.detected` — que el **Alert Engine** consume para calcular y emitir alertas.

Pipeline completo:
```
QuakeBox → Detection (seismic.detected) → Alert Engine (alert.issued) → Family / Notification
```

## Correr
```bash
cd services/detection && cp .env.example .env && npm install && npm run dev
```

## Probar (simular 3 sensores disparándose)
```bash
for s in s1 s2 s3; do
  curl -s -X POST localhost:3003/readings -H 'Content-Type: application/json' -H 'x-tenant-id: gt' \
    -d "{\"sensorId\":\"$s\",\"peakAmplitude\":0.15,\"location\":{\"lat\":14.31,\"lng\":-90.78}}" ; echo
done
```
Al tercer sensor se alcanza el quórum → se publica `seismic.detected` con magnitud,
profundidad y epicentro estimados (visible en consola o en el bus).

## Notas
- Parámetros de detección en `.env` (`TRIGGER_THRESHOLD`, `QUORUM`, `WINDOW_MS`).
- El buffer de triggers es en memoria (suficiente para 1 instancia / prototipo). En
  producción, usar una ventana compartida (Redis) si el servicio escala horizontalmente.
- El **Alert Engine** debe **suscribirse a `seismic.detected`** (o el gateway llamar a su
  endpoint `/events`) para cerrar el pipeline.
- Magnitud/umbral son aproximaciones de prototipo: calibrar con modelos reales.
