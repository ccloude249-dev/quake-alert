import mongoose from 'mongoose';
import { Zone, CityEvent } from './models.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = { zones: [], events: [] };

export async function upsertZone(tenantId, dto) {
  const doc = {
    tenantId, zoneId: dto.zoneId, name: dto.name, population: dto.population || 0, center: dto.center,
    sirens: dto.sirens || 0, ledBoards: dto.ledBoards || 0, panicButtons: dto.panicButtons || 0,
  };
  if (persistenceOn()) return Zone.findOneAndUpdate({ tenantId, zoneId: dto.zoneId }, { $set: doc }, { new: true, upsert: true });
  const ex = mem.zones.find((z) => z.tenantId === tenantId && z.zoneId === dto.zoneId);
  if (ex) { Object.assign(ex, doc); return ex; }
  const z = { ...doc, status: 'normal' }; mem.zones.push(z); return z;
}

export async function listZones(tenantId) {
  if (persistenceOn()) return Zone.find({ tenantId }).lean();
  return mem.zones.filter((z) => z.tenantId === tenantId);
}

async function setZoneStatus(tenantId, zoneId, status) {
  if (persistenceOn()) { await Zone.updateMany(zoneId ? { tenantId, zoneId } : { tenantId }, { $set: { status } }); return; }
  mem.zones.filter((z) => z.tenantId === tenantId && (!zoneId || z.zoneId === zoneId)).forEach((z) => { z.status = status; });
}

async function logEvent(tenantId, rec) {
  if (persistenceOn()) await CityEvent.create(rec); else mem.events.push(rec);
}

/** Activa la alerta municipal: enciende activos y publica al bus. */
export async function activateAlert(tenantId, dto) {
  const risk = dto.risk || 'rojo';
  const status = risk === 'rojo' ? 'evacuacion' : 'alerta';
  await setZoneStatus(tenantId, dto.zoneId, status);
  const rec = { tenantId, kind: 'alerta', zoneId: dto.zoneId || 'todas', risk, message: dto.message || 'Alerta municipal activada', at: new Date() };
  await logEvent(tenantId, rec);
  await publish('city.alert.activated', rec);
  // Eco al Alert Engine para que difunda por todos los canales (push/voz/sirena).
  await publish('alert.issued', {
    tenantId, eventId: 'city-' + Date.now(), targetId: dto.zoneId || 'todas', targetName: dto.zoneName || 'Municipio',
    risk, arrivalSeconds: 0, intensity: risk === 'rojo' ? 8 : 6, channels: ['push', 'sms', 'sirena', 'voz'],
  });
  return rec;
}

export async function deactivate(tenantId, zoneId) {
  await setZoneStatus(tenantId, zoneId, 'normal');
  const rec = { tenantId, kind: 'fin', zoneId: zoneId || 'todas', message: 'Alerta finalizada', at: new Date() };
  await logEvent(tenantId, rec);
  await publish('city.alert.cleared', rec);
  return rec;
}

/** Boton de panico ciudadano georreferenciado. */
export async function panic(tenantId, dto) {
  const rec = { tenantId, kind: 'panico', zoneId: dto.zoneId, message: dto.message || 'Boton de panico', at: new Date(), location: dto.location };
  await logEvent(tenantId, rec);
  await publish('city.panic', rec);
  await publish('assistance.requested', { tenantId, memberId: dto.citizenId || 'anonimo', status: 'ayuda', alertEventId: 'panic-' + Date.now() });
  return rec;
}

/** Resumen para el panel municipal. */
export async function cityStatus(tenantId) {
  const zones = await listZones(tenantId);
  const total = (k) => zones.reduce((a, z) => a + (z[k] || 0), 0);
  return {
    zones: zones.length,
    population: total('population'),
    sirens: total('sirens'),
    ledBoards: total('ledBoards'),
    panicButtons: total('panicButtons'),
    inAlert: zones.filter((z) => z.status !== 'normal').length,
    detail: zones,
  };
}
