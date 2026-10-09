import { Router } from 'express';
import { upsertDefinition, getDefinition, listDefinitions, submit, listSubmissions } from './forms.service.js';

const router = Router();

/** GET /forms — catálogos del tenant. */
router.get('/', async (req, res, next) => {
  try { res.json(await listDefinitions(req.tenantId)); } catch (e) { next(e); }
});

/** GET /forms/:key — definición de un catálogo. */
router.get('/:key', async (req, res, next) => {
  try {
    const def = await getDefinition(req.tenantId, req.params.key);
    if (!def) return res.status(404).json({ error: 'no encontrado' });
    res.json(def);
  } catch (e) { next(e); }
});

/** PUT /forms/:key — crea/actualiza la definición. body: { catalog, fields:[...] } */
router.put('/:key', async (req, res, next) => {
  try {
    if (!req.body?.catalog) return res.status(400).json({ error: 'catalog es obligatorio' });
    res.json(await upsertDefinition(req.tenantId, req.params.key, req.body));
  } catch (e) { next(e); }
});

/** POST /forms/:key/submissions — guarda un registro. body: { data:{...} } */
router.post('/:key/submissions', async (req, res, next) => {
  try {
    res.status(201).json(await submit(req.tenantId, req.params.key, req.body?.data || {}));
  } catch (e) { next(e); }
});

/** GET /forms/:key/submissions — registros del catálogo. */
router.get('/:key/submissions', async (req, res, next) => {
  try { res.json(await listSubmissions(req.tenantId, req.params.key)); } catch (e) { next(e); }
});

export default router;
