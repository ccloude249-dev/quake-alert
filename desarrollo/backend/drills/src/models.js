import mongoose from 'mongoose';

/** Simulacro con sus participantes y progreso. */
const DrillSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    scope: { type: String, default: 'organizacion' },
    scheduledAt: { type: Date },
    expectedParticipants: { type: Number, default: 0 },
    targetEvacSeconds: { type: Number, default: 90 },
    phase: { type: String, enum: ['config', 'en_vivo', 'finalizado'], default: 'config' },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    checkins: { type: Number, default: 0 },
    avgEvacSeconds: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);
DrillSchema.index({ tenantId: 1, createdAt: -1 });

/** Check-in de participante durante el simulacro. */
const DrillCheckInSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    drillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Drill', index: true },
    participantId: { type: String },
    evacSeconds: { type: Number },
    completedSteps: { type: Number, default: 0 },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Drill = mongoose.model('Drill', DrillSchema);
export const DrillCheckIn = mongoose.model('DrillCheckIn', DrillCheckInSchema);
