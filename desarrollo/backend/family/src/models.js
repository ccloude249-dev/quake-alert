import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema(
  { name: String, userId: String },
  { _id: true }
);

/** Grupo familiar / equipo. */
const GroupSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    members: { type: [MemberSchema], default: [] },
  },
  { timestamps: true }
);

/** Check-in de seguridad de un miembro tras una alerta. */
const CheckInSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', index: true },
    memberId: { type: String, required: true },
    memberName: { type: String },
    status: { type: String, enum: ['bien', 'ayuda', 'medica'], required: true },
    location: { lat: Number, lng: Number },
    alertEventId: { type: String },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CheckInSchema.index({ tenantId: 1, groupId: 1, at: -1 });

export const Group = mongoose.model('Group', GroupSchema);
export const CheckIn = mongoose.model('CheckIn', CheckInSchema);
