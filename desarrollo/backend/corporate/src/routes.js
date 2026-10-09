import { Router } from 'express';
import { upsertSite, listSites, regionalAlert, clearAll, corporateStatus } from './corporate.service.js';

const router = Router();

/** GET /sites?sector= */
router.get('/sites', async (req, res, next) => {
  try { const sites = await listSites(req.tenantId, req.query.sector); res.json({ count: sites.length, sites }); }
  catch (err) { next(err); }
});

router.post('/sites', async (req, res, next) => {
  try {
    const { siteId, name, sector } = req.body || {};
    if (!siteId || !name || !sector) return res.status(400).json({ error: 'siteId, name y sector son obligatorios' });
    res.status(201).json(await upsertSite(req.tenantId, req.body));
  } catch (err) { next(err); }
});

router.get('/status', async (req, res, next) => {
  try { res.json(await corporateStatus(req.tenantId)); } catch (err) { next(err); }
});

/** POST /alert/regional - { risk, sector? } */
router.post('/alert/regional', async (req, res, next) => {
  try { res.status(202).json(await regionalAlert(req.tenantId, req.body || {})); } catch (err) { next(err); }
});

router.post('/alert/clear', async (req, res, next) => {
  try { res.json(await clearAll(req.tenantId)); } catch (err) { next(err); }
});

export default router;
