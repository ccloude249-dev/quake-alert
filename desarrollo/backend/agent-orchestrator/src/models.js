import mongoose from 'mongoose';

/** Conversacion con turnos para trazabilidad. */
const ConversationSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    turns: [{ role: String, text: String, intent: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', ConversationSchema);
