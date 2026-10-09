import mongoose from 'mongoose';
import { Notification } from './models.js';
import { buildMessage } from './domain/templates.js';
import { PROVIDERS } from './providers/index.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const memory = [];

/**
 * Despacha una alerta a todos sus canales. alert trae channels[] desde el Alert Engine.
 * Devuelve el detalle por canal y publica notification.sent.
 */
export async function dispatchAlert(tenantId, alert, lang) {
  const channels = Array.isArray(alert.channels) && alert.channels.length ? alert.channels : ['push'];
  const msg = buildMessage(alert, lang || 'es');
  const results = [];
  for (const ch of channels) {
    const provider = PROVIDERS[ch];
    if (!provider) continue;
    const payload = { ...msg, targetId: alert.targetId, targetName: alert.targetName };
    const out = await provider.send(payload);
    const rec = {
      tenantId, alertEventId: alert.eventId || alert._id, targetId: alert.targetId, targetName: alert.targetName,
      channel: ch, risk: alert.risk, title: msg.title, body: msg.body, status: out.status, provider: out.provider, sentAt: new Date(),
    };
    if (persistenceOn()) await Notification.create(rec); else memory.push(rec);
    results.push(rec);
  }
  await publish('notification.sent', { tenantId, alertEventId: alert.eventId, count: results.length, channels });
  return { count: results.length, results };
}

/** Notificacion directa de prueba (para la consola / QA). */
export async function sendTest(tenantId, dto) {
  const alert = {
    eventId: 'test-' + Date.now(), targetId: dto.targetId || 'test', targetName: dto.targetName || 'Prueba',
    risk: dto.risk || 'amarillo', arrivalSeconds: dto.arrivalSeconds ?? 12, intensity: dto.intensity ?? 6,
    channels: dto.channels || ['push', 'sms'],
  };
  return dispatchAlert(tenantId, alert, dto.lang || 'es');
}

export async function recent(tenantId, limit = 50) {
  if (persistenceOn()) return Notification.find({ tenantId }).sort({ sentAt: -1 }).limit(limit).lean();
  return memory.filter((n) => n.tenantId === tenantId).slice(-limit).reverse();
}

/** Estado de los canales/proveedores configurados. */
export function channelStatus() {
  return Object.values(PROVIDERS).map((p) => ({ channel: p.channel, provider: p.name, mode: 'degradable' }));
}
