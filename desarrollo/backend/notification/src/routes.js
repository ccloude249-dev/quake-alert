import { Router } from 'express';
import { sendTest, recent, channelStatus } from './notification.service.js';

const router = Router();

/** GET /notifications - ultimos envios del tenant. */
router.get('/notifications', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const items = await recent(req.tenantId, limit);
    res.json({ count: items.length, notifications: items });
  } catch (err) { next(err); }
});

/** GET /channels - proveedores configurados por canal. */
router.get('/channels', (_req, res) => res.json({ channels: channelStatus() }));

/** POST /test - dispara una notificacion de prueba. */
router.post('/test', async (req, res, next) => {
  try { res.status(202).json(await sendTest(req.tenantId, req.body || {})); }
  catch (err) { next(err); }
});

export default router;
