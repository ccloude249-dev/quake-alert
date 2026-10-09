import mongoose from 'mongoose';
import { Announcement } from './models.js';
import { buildAnnouncement, ASSISTANTS } from './domain/voiceScript.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const memory = [];

/** Genera y registra anuncios para los asistentes pedidos (o todos). */
export async function announce(tenantId, alert, opts) {
  opts = opts || {};
  const lang = opts.lang || 'es';
  const targets = (opts.assistants && opts.assistants.length ? opts.assistants : ASSISTANTS);
  const script = buildAnnouncement(alert, lang);
  const made = [];
  for (const assistant of targets) {
    const rec = {
      tenantId, alertEventId: alert.eventId || alert._id, assistant, lang, risk: alert.risk,
      text: script.text, ssml: script.ssml, durationSec: script.durationSec, at: new Date(),
    };
    if (persistenceOn()) await Announcement.create(rec); else memory.push(rec);
    console.log('[voice:' + assistant + '] ' + script.durationSec + 's :: ' + script.text.slice(0, 60));
    made.push(rec);
  }
  await publish('voice.announced', { tenantId, alertEventId: alert.eventId, assistants: targets, durationSec: script.durationSec });
  return { count: made.length, script, announcements: made };
}

export async function manualAnnounce(tenantId, dto) {
  const alert = {
    eventId: 'manual-' + Date.now(), targetName: dto.targetName || 'Ciudad de Guatemala',
    risk: dto.risk || 'rojo', arrivalSeconds: dto.arrivalSeconds ?? 15, intensity: dto.intensity ?? 7,
  };
  return announce(tenantId, alert, { lang: dto.lang || 'es', assistants: dto.assistants });
}

export async function recent(tenantId, limit = 50) {
  if (persistenceOn()) return Announcement.find({ tenantId }).sort({ at: -1 }).limit(limit).lean();
  return memory.filter((a) => a.tenantId === tenantId).slice(-limit).reverse();
}

export function listAssistants() { return ASSISTANTS; }
