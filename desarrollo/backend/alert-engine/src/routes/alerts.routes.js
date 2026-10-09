import { Router } from 'express';
import { recentAlerts } from '../services/alert.service.js';

const router = Router();

/** GET /alerts — últimas alertas del tenant. */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const alerts = await recentAlerts(req.tenantId, limit);
    res.json({ count: alerts.length, alerts });
  } catch (err) {
    next(err);
  }
});

export default router;
