import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    alertEventId: { type: String, index: true },
    assistant: { type: String, enum: ['alexa', 'google', 'siri', 'ivr'], required: true },
    lang: { type: String, default: 'es' },
    risk: { type: String, enum: ['verde', 'amarillo', 'rojo'] },
    text: { type: String },
    ssml: { type: String },
    durationSec: { type: Number },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
AnnouncementSchema.index({ tenantId: 1, at: -1 });
export const Announcement = mongoose.model('Announcement', AnnouncementSchema);
