import { Router } from 'express';
import { upsertZone, listZones, activateAlert, deactivate, panic, cityStatus } from './smartcity.service.js';

const router = Router();

router.get('/zones', async (req, res, next) => {
  try { const zones = await listZones(req.tenantId); res.json({ count: zones.length, zones }); }
  catch (err) { next(err); }
});

router.post('/zones', async (req, res, next) => {
  try {
    const { zoneId, name } = req.body || {};
    if (!zoneId || !name) return res.status(400).json({ error: 'zoneId y name son obligatorios' });
    res.status(201).json(await upsertZone(req.tenantId, req.body));
  } catch (err) { next(err); }
});

router.get('/status', async (req, res, next) => {
  try { res.json(await cityStatus(req.tenantId)); } catch (err) { next(err); }
});

/** POST /alert - activa alerta municipal { zoneId?, risk, message }. */
router.post('/alert', async (req, res, next) => {
  try { res.status(202).json(await activateAlert(req.tenantId, req.body || {})); } catch (err) { next(err); }
});

/** POST /alert/clear - finaliza { zoneId? }. */
router.post('/alert/clear', async (req, res, next) => {
  try { res.json(await deactivate(req.tenantId, (req.body || {}).zoneId)); } catch (err) { next(err); }
});

/** POST /panic - boton de panico { citizenId?, zoneId?, location? }. */
router.post('/panic', async (req, res, next) => {
  try { res.status(202).json(await panic(req.tenantId, req.body || {})); } catch (err) { next(err); }
});

export default router;
