import { Router } from 'express';
import { ingestReading } from './detection.service.js';

const router = Router();

/**
 * POST /readings — lectura de un sensor.
 * body: { sensorId, location:{lat,lng}, peakAmplitude }
 */
router.post('/readings', async (req, res, next) => {
  try {
    const { sensorId, peakAmplitude, location } = req.body || {};
    if (!sensorId || typeof peakAmplitude !== 'number' || !location) {
      return res.status(400).json({ error: 'sensorId, peakAmplitude (number) y location {lat,lng} son obligatorios' });
    }
    const result = await ingestReading(req.tenantId, req.body);
    res.status(202).json(result);
  } catch (err) { next(err); }
});

export default router;
