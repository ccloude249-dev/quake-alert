import mongoose from 'mongoose';
import { Conversation } from './models.js';
import { detectIntent } from './domain/intentRouter.js';
import { SKILLS } from './domain/skills.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;

/**
 * Procesa un mensaje del usuario: detecta intencion, ejecuta la habilidad y
 * devuelve la respuesta estructurada. Persiste el turno si hay DB.
 */
export async function chat(tenantId, dto) {
  const text = (dto.message || '').trim();
  if (!text) return { intent: 'fallback', ...SKILLS.fallback() };
  const intent = detectIntent(text);
  const result = (SKILLS[intent] || SKILLS.fallback)();
  if (persistenceOn() && dto.userId) {
    await Conversation.findOneAndUpdate(
      { tenantId, userId: dto.userId },
      { $push: { turns: { $each: [
        { role: 'user', text, intent, at: new Date() },
        { role: 'assistant', text: result.reply, intent, at: new Date() },
      ] } } },
      { upsert: true }
    );
  }
  return { intent, ...result };
}

export async function history(tenantId, userId) {
  if (!persistenceOn()) return { userId, turns: [] };
  const conv = await Conversation.findOne({ tenantId, userId }).lean();
  return conv || { userId, turns: [] };
}
