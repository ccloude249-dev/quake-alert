import { Router } from 'express';
import { chat, history } from './agent.service.js';

const router = Router();

/** POST /chat - { message, userId? } -> { intent, reply, actions, suggestions } */
router.post('/chat', async (req, res, next) => {
  try {
    if (!req.body?.message) return res.status(400).json({ error: 'message es obligatorio' });
    res.json(await chat(req.tenantId, req.body));
  } catch (err) { next(err); }
});

/** GET /conversations/:userId */
router.get('/conversations/:userId', async (req, res, next) => {
  try { res.json(await history(req.tenantId, req.params.userId)); } catch (err) { next(err); }
});

export default router;
