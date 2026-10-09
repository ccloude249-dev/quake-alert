import mongoose from 'mongoose';

/** Registro de un envio por un canal concreto. */
const NotificationSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    alertEventId: { type: String, index: true },
    targetId: { type: String },
    targetName: { type: String },
    channel: { type: String, enum: ['push', 'sms', 'whatsapp', 'email', 'voz', 'sirena'], required: true },
    risk: { type: String, enum: ['verde', 'amarillo', 'rojo'] },
    title: { type: String },
    body: { type: String },
    status: { type: String, enum: ['enviado', 'fallido', 'simulado'], default: 'simulado' },
    provider: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
NotificationSchema.index({ tenantId: 1, sentAt: -1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
