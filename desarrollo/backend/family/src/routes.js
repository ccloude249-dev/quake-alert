import { Router } from 'express';
import { createGroup, checkIn, groupStatus } from './family.service.js';

const router = Router();

/** POST /groups — crea un grupo familiar. body: { name, members:[{name,userId}] } */
router.post('/groups', async (req, res, next) => {
  try {
    if (!req.body?.name) return res.status(400).json({ error: 'name es obligatorio' });
    const group = await createGroup(req.tenantId, req.body);
    res.status(201).json(group);
  } catch (err) { next(err); }
});

/** GET /groups/:id/status — estado agregado del grupo. */
router.get('/groups/:id/status', async (req, res, next) => {
  try {
    res.json(await groupStatus(req.tenantId, req.params.id));
  } catch (err) { next(err); }
});

/** POST /checkins — registra estado. body: { groupId, memberId, memberName, status, location?, alertEventId? } */
router.post('/checkins', async (req, res, next) => {
  try {
    const { groupId, memberId, status } = req.body || {};
    if (!groupId || !memberId || !['bien', 'ayuda', 'medica'].includes(status)) {
      return res.status(400).json({ error: 'groupId, memberId y status (bien|ayuda|medica) son obligatorios' });
    }
    res.status(201).json(await checkIn(req.tenantId, req.body));
  } catch (err) { next(err); }
});

export default router;
