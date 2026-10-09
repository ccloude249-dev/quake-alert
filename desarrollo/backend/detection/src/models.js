import mongoose from 'mongoose';

/** Lectura cruda enviada por un sensor QuakeBox. */
const SensorReadingSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    sensorId: { type: String, required: true, index: true },
    location: { lat: Number, lng: Number },
    peakAmplitude: { type: Number, required: true }, // aceleración pico (g)
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SensorReading = mongoose.model('SensorReading', SensorReadingSchema);
