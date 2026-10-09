import mongoose from 'mongoose';

/** Tenant (organizacion / gobierno / empresa). */
const TenantSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    plan: { type: String, default: 'free' },
    country: { type: String, default: 'GT' },
  },
  { timestamps: true }
);

/** Usuario con credenciales (hash+salt scrypt) y 2FA. */
const UserSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    name: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['ciudadano', 'operador', 'admin'], default: 'ciudadano' },
    passwordHash: { type: String },
    passwordSalt: { type: String },
    twoFaCode: { type: String },
    twoFaExpiresAt: { type: Date },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const Tenant = mongoose.model('Tenant', TenantSchema);
export const User = mongoose.model('User', UserSchema);
