import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    plan: { type: String, enum: ['free', 'ciudad', 'empresa', 'nacional'], default: 'free' },
    status: { type: String, enum: ['activa', 'morosa', 'cancelada'], default: 'activa' },
    seats: { type: Number, default: 1 },
    startedAt: { type: Date, default: Date.now },
    renewsAt: { type: Date },
  },
  { timestamps: true }
);

const UsageSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    metric: { type: String, enum: ['alertas', 'sensores', 'sedes', 'sms', 'voz'], required: true },
    qty: { type: Number, default: 1 },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
UsageSchema.index({ tenantId: 1, metric: 1, at: -1 });

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
export const Usage = mongoose.model('Usage', UsageSchema);
