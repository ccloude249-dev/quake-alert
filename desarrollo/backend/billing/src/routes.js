import { Router } from 'express';
import { listPlans, subscribe, getSubscription, meter, usageSummary } from './billing.service.js';

const router = Router();

router.get('/plans', (_req, res) => res.json({ plans: listPlans() }));

router.post('/subscriptions', async (req, res, next) => {
  try {
    if (!req.body?.plan) return res.status(400).json({ error: 'plan es obligatorio' });
    res.status(201).json(await subscribe(req.tenantId, req.body));
  } catch (err) { next(err); }
});

router.get('/subscriptions/me', async (req, res, next) => {
  try { res.json(await getSubscription(req.tenantId)); } catch (err) { next(err); }
});

/** POST /usage - { metric, qty } */
router.post('/usage', async (req, res, next) => {
  try {
    if (!req.body?.metric) return res.status(400).json({ error: 'metric es obligatorio' });
    res.status(201).json(await meter(req.tenantId, req.body));
  } catch (err) { next(err); }
});

router.get('/usage/summary', async (req, res, next) => {
  try { res.json(await usageSummary(req.tenantId)); } catch (err) { next(err); }
});

export default router;
