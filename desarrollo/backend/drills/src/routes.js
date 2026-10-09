import { Router } from 'express';
import { createDrill, listDrills, startDrill, checkIn, finishDrill, results } from './drills.service.js';

const router = Router();

router.get('/drills', async (req, res, next) => {
  try { const drills = await listDrills(req.tenantId); res.json({ count: drills.length, drills }); }
  catch (err) { next(err); }
});

router.post('/drills', async (req, res, next) => {
  try {
    if (!req.body?.name) return res.status(400).json({ error: 'name es obligatorio' });
    res.status(201).json(await createDrill(req.tenantId, req.body));
  } catch (err) { next(err); }
});

router.post('/drills/:id/start', async (req, res, next) => {
  try { const d = await startDrill(req.tenantId, req.params.id); if (!d) return res.status(404).json({ error: 'no encontrado' }); res.json(d); }
  catch (err) { next(err); }
});

router.post('/drills/:id/checkin', async (req, res, next) => {
  try { res.status(201).json(await checkIn(req.tenantId, req.params.id, req.body || {})); } catch (err) { next(err); }
});

router.post('/drills/:id/finish', async (req, res, next) => {
  try { const r = await finishDrill(req.tenantId, req.params.id); if (!r) return res.status(404).json({ error: 'no encontrado' }); res.json(r); }
  catch (err) { next(err); }
});

router.get('/drills/:id/results', async (req, res, next) => {
  try { const r = await results(req.tenantId, req.params.id); if (!r) return res.status(404).json({ error: 'no encontrado' }); res.json(r); }
  catch (err) { next(err); }
});

export default router;
