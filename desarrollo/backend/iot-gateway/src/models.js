import mongoose from 'mongoose';

/** Dispositivo IoT registrado en una zona. */
const DeviceSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    deviceId: { type: String, required: true },
    kind: { type: String, enum: ['sirena', 'led', 'valvula_gas', 'cerradura', 'luz', 'quakebox'], required: true },
    name: { type: String },
    zoneId: { type: String, index: true },
    location: { lat: Number, lng: Number },
    online: { type: Boolean, default: true },
    state: { type: String, default: 'idle' },
  },
  { timestamps: true }
);
DeviceSchema.index({ tenantId: 1, deviceId: 1 }, { unique: true });

/** Comando emitido a un dispositivo. */
const CommandSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    deviceId: { type: String, index: true },
    kind: { type: String },
    action: { type: String, required: true },
    params: { type: Object },
    reason: { type: String },
    status: { type: String, enum: ['enviado', 'simulado', 'fallido'], default: 'simulado' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
CommandSchema.index({ tenantId: 1, at: -1 });

export const Device = mongoose.model('Device', DeviceSchema);
export const Command = mongoose.model('Command', CommandSchema);
