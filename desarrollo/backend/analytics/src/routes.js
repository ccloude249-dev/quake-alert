import { Router } from 'express';
import { metrics, recentEvents } from './analytics.service.js';

const router = Router();

/** GET /metrics?period=7d|30d|12m */
router.get('/metrics', async (req, res, next) => {
  try {
    const period = ['7d', '30d', '12m'].includes(req.query.period) ? req.query.period : '30d';
    res.json(await metrics(req.tenantId, period));
  } catch (err) { next(err); }
});

/** GET /events/recent */
router.get('/events/recent', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await recentEvents(req.tenantId, limit);
    res.json({ count: events.length, events });
  } catch (err) { next(err); }
});

export default router;
