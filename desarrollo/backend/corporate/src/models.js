import mongoose from 'mongoose';

/** Sede corporativa monitoreada. */
const SiteSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    siteId: { type: String, required: true },
    name: { type: String, required: true },
    sector: { type: String, enum: ['banca', 'salud', 'educacion', 'industria', 'retail', 'gobierno'], required: true },
    city: { type: String },
    location: { lat: Number, lng: Number },
    headcount: { type: Number, default: 0 },
    protocol: { type: String, default: 'estandar' },
    status: { type: String, enum: ['normal', 'alerta', 'evacuacion', 'despejado'], default: 'normal' },
  },
  { timestamps: true }
);
SiteSchema.index({ tenantId: 1, siteId: 1 }, { unique: true });

/** Registro de activacion de protocolo por sede. */
const SiteEventSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    siteId: { type: String },
    risk: { type: String },
    action: { type: String },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Site = mongoose.model('Site', SiteSchema);
export const SiteEvent = mongoose.model('SiteEvent', SiteEventSchema);
