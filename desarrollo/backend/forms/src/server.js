import 'dotenv/config';
import express from 'express';
import { connectDb } from './db.js';
import routes from './routes.js';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const TENANT_HEADER = process.env.TENANT_HEADER || 'x-tenant-id';
app.use((req, _res, next) => { req.tenantId = req.header(TENANT_HEADER) || 'demo'; next(); });

app.get('/health', (_req, res) => res.json({ service: 'forms', status: 'ok' }));
app.use('/forms', routes);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

const PORT = process.env.PORT || 3004;
async function start() {
  try { await connectDb(process.env.MONGODB_URI); }
  catch (err) { console.error('[bootstrap] modo degradado:', err.message); }
  app.listen(PORT, () => console.log(`[forms] escuchando en :${PORT}`));
}
start();
