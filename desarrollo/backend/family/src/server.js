import 'dotenv/config';
import express from 'express';
import { connectDb } from './db.js';
import { connectBus } from './bus.js';
import { startAlertConsumer } from './alertConsumer.js';
import routes from './routes.js';

const app = express();
app.use(express.json());

const TENANT_HEADER = process.env.TENANT_HEADER || 'x-tenant-id';
app.use((req, _res, next) => { req.tenantId = req.header(TENANT_HEADER) || 'demo'; next(); });

app.get('/health', (_req, res) => res.json({ service: 'family', status: 'ok' }));
app.use('/', routes);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

const PORT = process.env.PORT || 3002;

async function start() {
  try {
    await connectDb(process.env.MONGODB_URI);
    await connectBus(process.env.AMQP_URL);
    await startAlertConsumer(); // lado consumidor del bus de eventos
  } catch (err) {
    console.error('[bootstrap] modo degradado:', err.message);
  }
  app.listen(PORT, () => console.log(`[family] escuchando en :${PORT}`));
}

start();
