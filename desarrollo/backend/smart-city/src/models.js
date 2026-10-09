import mongoose from 'mongoose';

/** Zona/distrito municipal con sus activos. */
const ZoneSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    zoneId: { type: String, required: true },
    name: { type: String, required: true },
    population: { type: Number, default: 0 },
    center: { lat: Number, lng: Number },
    sirens: { type: Number, default: 0 },
    ledBoards: { type: Number, default: 0 },
    panicButtons: { type: Number, default: 0 },
    status: { type: String, enum: ['normal', 'alerta', 'evacuacion'], default: 'normal' },
  },
  { timestamps: true }
);
ZoneSchema.index({ tenantId: 1, zoneId: 1 }, { unique: true });

/** Evento municipal (alerta, panico, simulacro). */
const CityEventSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    kind: { type: String, enum: ['alerta', 'panico', 'fin'], required: true },
    zoneId: { type: String },
    risk: { type: String },
    message: { type: String },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
CityEventSchema.index({ tenantId: 1, at: -1 });

export const Zone = mongoose.model('Zone', ZoneSchema);
export const CityEvent = mongoose.model('CityEvent', CityEventSchema);
