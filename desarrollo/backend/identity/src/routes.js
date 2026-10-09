import { Router } from 'express';
import { createTenant, register, login, verify2fa, social } from './identity.service.js';
import { verifyToken } from './domain/crypto.js';

const router = Router();
const SECRET = process.env.AUTH_SECRET || 'dev-secret';
const ok = (res, r) => (r.error ? res.status(400).json(r) : res.json(r));

router.post('/tenants', async (req, res, next) => {
  try {
    if (!req.body?.tenantId || !req.body?.name) return res.status(400).json({ error: 'tenantId y name son obligatorios' });
    res.status(201).json(await createTenant(req.body));
  } catch (err) { next(err); }
});

router.post('/auth/register', async (req, res, next) => {
  try { ok(res, await register(req.tenantId, req.body || {})); } catch (err) { next(err); }
});

router.post('/auth/login', async (req, res, next) => {
  try { ok(res, await login(req.tenantId, req.body || {})); } catch (err) { next(err); }
});

router.post('/auth/2fa/verify', async (req, res, next) => {
  try { ok(res, await verify2fa(req.tenantId, req.body || {})); } catch (err) { next(err); }
});

router.post('/auth/social', async (req, res, next) => {
  try { ok(res, await social(req.tenantId, req.body || {})); } catch (err) { next(err); }
});

/** GET /me - valida el Bearer token y devuelve el claim. */
router.get('/me', (req, res) => {
  const auth = req.header('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const claim = verifyToken(token, SECRET);
  if (!claim) return res.status(401).json({ error: 'token_invalido' });
  res.json({ user: claim });
});

export default router;
