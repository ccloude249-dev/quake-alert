import 'dotenv/config';
import express from 'express';
import { connectDb } from './config/db.js';
import { connectBroker } from './config/broker.js';
import eventsRoutes from './routes/events.routes.js';
import alertsRoutes from './routes/alerts.routes.js';

const app = express();
app.use(express.json());

// ── CORS (consolas Angular / Ionic en otro origen) ──────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Multi-tenant: resuelve el tenant desde el header ─────────────────────────
const TENANT_HEADER = process.env.TENANT_HEADER || 'x-tenant-id';
app.use((req, _res, next) => {
  req.tenantId = req.header(TENANT_HEADER) || 'demo';
  next();
});

// ── Health (Heroku / load balancer) ──────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ service: 'alert-engine', status: 'ok' }));

// ── Rutas de dominio ─────────────────────────────────────────────────────────
app.use('/events', eventsRoutes);
app.use('/alerts', alertsRoutes);

// ── Manejo de errores ────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

// ── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await connectDb(process.env.MONGODB_URI);
    await connectBroker(process.env.AMQP_URL);
  } catch (err) {
    console.error('[bootstrap] dependencia no disponible, continúo en modo degradado:', err.message);
  }
  app.listen(PORT, () => console.log(`[alert-engine] escuchando en :${PORT}`));
}

start();
