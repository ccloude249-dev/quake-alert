import { Router } from 'express';
import { manualAnnounce, recent, listAssistants } from './voice.service.js';

const router = Router();

/** GET /announcements - ultimos anuncios. */
router.get('/announcements', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const items = await recent(req.tenantId, limit);
    res.json({ count: items.length, announcements: items });
  } catch (err) { next(err); }
});

/** GET /voices - asistentes soportados. */
router.get('/voices', (_req, res) => res.json({ assistants: listAssistants() }));

/** POST /announce - genera anuncio manual { risk, lang, assistants[] }. */
router.post('/announce', async (req, res, next) => {
  try { res.status(202).json(await manualAnnounce(req.tenantId, req.body || {})); }
  catch (err) { next(err); }
});

export default router;
