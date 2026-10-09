import mongoose from 'mongoose';
import { Device, Command } from './models.js';
import { planActions } from './domain/deviceCommander.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = { devices: [], commands: [] };

export async function registerDevice(tenantId, dto) {
  const doc = {
    tenantId, deviceId: dto.deviceId, kind: dto.kind, name: dto.name,
    zoneId: dto.zoneId, location: dto.location, online: dto.online !== false, state: 'idle',
  };
  if (persistenceOn()) {
    return Device.findOneAndUpdate({ tenantId, deviceId: dto.deviceId }, { $set: doc }, { new: true, upsert: true });
  }
  const existing = mem.devices.find((d) => d.tenantId === tenantId && d.deviceId === dto.deviceId);
  if (existing) { Object.assign(existing, doc); return existing; }
  mem.devices.push(doc); return doc;
}

export async function listDevices(tenantId, zoneId) {
  if (persistenceOn()) return Device.find(zoneId ? { tenantId, zoneId } : { tenantId }).lean();
  return mem.devices.filter((d) => d.tenantId === tenantId && (!zoneId || d.zoneId === zoneId));
}

/** Emite un comando puntual a un dispositivo. */
export async function commandDevice(tenantId, deviceId, action, params, reason) {
  const rec = { tenantId, deviceId, action, params: params || {}, reason: reason || 'manual', status: 'simulado', at: new Date() };
  if (persistenceOn()) await Command.create(rec); else mem.commands.push(rec);
  console.log('[iot] ' + deviceId + ' :: ' + action + ' ' + JSON.stringify(params || {}));
  await publish('device.commanded', rec);
  return rec;
}

/** Ejecuta el playbook completo para la zona afectada por una alerta. */
export async function runPlaybook(tenantId, alert) {
  const devices = await listDevices(tenantId, alert.targetId);
  const pool = devices.length ? devices : await listDevices(tenantId);
  const cmds = planActions(alert, pool);
  const out = [];
  for (const c of cmds) out.push(await commandDevice(tenantId, c.deviceId, c.action, c.params, c.reason));
  return { count: out.length, commands: out };
}

export async function recentCommands(tenantId, limit = 50) {
  if (persistenceOn()) return Command.find({ tenantId }).sort({ at: -1 }).limit(limit).lean();
  return mem.commands.filter((c) => c.tenantId === tenantId).slice(-limit).reverse();
}
