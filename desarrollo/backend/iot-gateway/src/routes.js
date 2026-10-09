import { Router } from 'express';
import { registerDevice, listDevices, commandDevice, recentCommands } from './iot.service.js';

const router = Router();

/** GET /devices?zoneId= - dispositivos del tenant. */
router.get('/devices', async (req, res, next) => {
  try {
    const devices = await listDevices(req.tenantId, req.query.zoneId);
    res.json({ count: devices.length, devices });
  } catch (err) { next(err); }
});

/** POST /devices - registra/actualiza un dispositivo. */
router.post('/devices', async (req, res, next) => {
  try {
    const { deviceId, kind } = req.body || {};
    if (!deviceId || !kind) return res.status(400).json({ error: 'deviceId y kind son obligatorios' });
    res.status(201).json(await registerDevice(req.tenantId, req.body));
  } catch (err) { next(err); }
});

/** POST /devices/:id/command - comando puntual { action, params }. */
router.post('/devices/:id/command', async (req, res, next) => {
  try {
    const { action, params, reason } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action es obligatorio' });
    res.status(202).json(await commandDevice(req.tenantId, req.params.id, action, params, reason));
  } catch (err) { next(err); }
});

/** GET /commands - ultimos comandos emitidos. */
router.get('/commands', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const commands = await recentCommands(req.tenantId, limit);
    res.json({ count: commands.length, commands });
  } catch (err) { next(err); }
});

export default router;
