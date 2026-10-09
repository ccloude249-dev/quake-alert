import mongoose from 'mongoose';

const PointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

/** Evento sísmico crudo recibido desde la red de sensores QuakeBox / Detection. */
const SeismicEventSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    magnitude: { type: Number, required: true },
    depthKm: { type: Number, default: 10 },
    epicenter: { type: PointSchema, required: true },
    source: { type: String, default: 'quakebox' },
    detectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SeismicEvent = mongoose.model('SeismicEvent', SeismicEventSchema);
