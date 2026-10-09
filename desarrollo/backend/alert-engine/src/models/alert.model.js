import mongoose from 'mongoose';

/** Alerta calculada para una zona/objetivo a partir de un evento sísmico. */
const AlertSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeismicEvent', index: true },
    targetId: { type: String, required: true },
    targetName: { type: String },
    distanceKm: { type: Number },
    arrivalSeconds: { type: Number },
    intensity: { type: Number },
    risk: { type: String, enum: ['verde', 'amarillo', 'rojo'], index: true },
    channels: { type: [String], default: [] },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AlertSchema.index({ tenantId: 1, issuedAt: -1 });

export const Alert = mongoose.model('Alert', AlertSchema);
