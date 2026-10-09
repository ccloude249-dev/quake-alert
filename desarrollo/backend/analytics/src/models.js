import mongoose from 'mongoose';

/** Evento crudo agregable (cualquier topico del bus). */
const EventLogSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    risk: { type: String },
    payload: { type: Object },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);
EventLogSchema.index({ tenantId: 1, type: 1, at: -1 });

export const EventLog = mongoose.model('EventLog', EventLogSchema);
