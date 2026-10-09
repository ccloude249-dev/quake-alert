import { Router } from 'express';
import { ingestEvent } from '../services/alert.service.js';

const router = Router();

/**
 * POST /events
 * Ingiere un evento sísmico y dispara el cálculo + publicación de alertas.
 * body: { magnitude, depthKm?, epicenter:{lat,lng}, source?, targets?[] }
 */
router.post('/', async (req, res, next) => {
  try {
    const { magnitude, epicenter } = req.body || {};
    if (typeof magnitude !== 'number' || !epicenter || typeof epicenter.lat !== 'number') {
      return res.status(400).json({ error: 'magnitude (number) y epicenter {lat,lng} son obligatorios' });
    }
    const result = await ingestEvent(req.tenantId, req.body);
    res.status(202).json({ status: 'accepted', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
