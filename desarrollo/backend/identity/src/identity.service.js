import mongoose from 'mongoose';
import { Tenant, User } from './models.js';
import { hashPassword, verifyPassword, signToken, genCode } from './domain/crypto.js';
import { publish } from './bus.js';

const persistenceOn = () => mongoose.connection?.readyState === 1;
const mem = { tenants: [], users: [] };
const SECRET = process.env.AUTH_SECRET || 'dev-secret';
const TTL = Number(process.env.TOKEN_TTL_SECONDS) || 86400;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findUser(tenantId, email) {
  const e = (email || '').toLowerCase();
  if (persistenceOn()) return User.findOne({ tenantId, email: e });
  return mem.users.find((u) => u.tenantId === tenantId && u.email === e);
}

export async function createTenant(dto) {
  const doc = { tenantId: dto.tenantId, name: dto.name, plan: dto.plan || 'free', country: dto.country || 'GT' };
  if (persistenceOn()) return Tenant.findOneAndUpdate({ tenantId: dto.tenantId }, { $set: doc }, { new: true, upsert: true });
  const ex = mem.tenants.find((t) => t.tenantId === dto.tenantId);
  if (ex) { Object.assign(ex, doc); return ex; }
  mem.tenants.push(doc); return doc;
}

/** Registro: valida, hashea y emite codigo 2FA. */
export async function register(tenantId, dto) {
  if (!EMAIL_RE.test(dto.email || '')) return { error: 'email_invalido' };
  if (!dto.password || dto.password.length < 8) return { error: 'password_min_8' };
  if (await findUser(tenantId, dto.email)) return { error: 'email_en_uso' };
  const { hash, salt } = hashPassword(dto.password);
  const code = genCode();
  const doc = {
    tenantId, email: (dto.email || '').toLowerCase(), name: dto.name, phone: dto.phone,
    role: dto.role || 'ciudadano', passwordHash: hash, passwordSalt: salt,
    twoFaCode: code, twoFaExpiresAt: new Date(Date.now() + 5 * 60000), verified: false,
  };
  let user;
  if (persistenceOn()) user = await User.create(doc);
  else { user = { _id: 'mem-' + (mem.users.length + 1), ...doc }; mem.users.push(user); }
  await publish('user.registered', { tenantId, email: doc.email });
  console.log('[identity] 2FA para ' + doc.email + ' = ' + code + ' (enviar via Notification svc)');
  return { userId: user._id, email: doc.email, twoFaRequired: true };
}

/** Login: verifica credenciales y emite codigo 2FA (no token aun). */
export async function login(tenantId, dto) {
  const user = await findUser(tenantId, dto.email);
  if (!user || !verifyPassword(dto.password || '', user.passwordHash, user.passwordSalt)) {
    return { error: 'credenciales_invalidas' };
  }
  const code = genCode();
  user.twoFaCode = code; user.twoFaExpiresAt = new Date(Date.now() + 5 * 60000);
  if (persistenceOn()) await user.save();
  console.log('[identity] 2FA login ' + user.email + ' = ' + code);
  return { userId: user._id, email: user.email, twoFaRequired: true };
}

/** Verifica el codigo 2FA y emite el token firmado. */
export async function verify2fa(tenantId, dto) {
  const user = await findUser(tenantId, dto.email);
  if (!user) return { error: 'usuario_no_encontrado' };
  if (!user.twoFaCode || user.twoFaCode !== String(dto.code)) return { error: 'codigo_invalido' };
  if (user.twoFaExpiresAt && new Date(user.twoFaExpiresAt) < new Date()) return { error: 'codigo_expirado' };
  user.twoFaCode = null; user.verified = true;
  if (persistenceOn()) await user.save();
  const token = signToken({ sub: String(user._id), tenantId, email: user.email, role: user.role }, SECRET, TTL);
  return { token, user: { id: user._id, email: user.email, name: user.name, role: user.role } };
}

/** Login social (Google/Apple): crea o recupera y emite token directo. */
export async function social(tenantId, dto) {
  if (!EMAIL_RE.test(dto.email || '')) return { error: 'email_invalido' };
  let user = await findUser(tenantId, dto.email);
  if (!user) {
    const doc = { tenantId, email: (dto.email || '').toLowerCase(), name: dto.name, role: 'ciudadano', verified: true };
    if (persistenceOn()) user = await User.create(doc);
    else { user = { _id: 'mem-' + (mem.users.length + 1), ...doc }; mem.users.push(user); }
  }
  const token = signToken({ sub: String(user._id), tenantId, email: user.email, role: user.role, provider: dto.provider }, SECRET, TTL);
  return { token, user: { id: user._id, email: user.email, name: user.name, role: user.role } };
}
