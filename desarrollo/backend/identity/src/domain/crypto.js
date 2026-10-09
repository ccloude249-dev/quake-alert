import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

/** Hash de contrasena con scrypt + salt aleatorio. */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** Token firmado tipo JWT-lite: base64url(payload).hmac. */
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export function signToken(payload, secret, ttlSeconds) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (ttlSeconds || 86400) };
  const data = b64url(body);
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return data + '.' + sig;
}

export function verifyToken(token, secret) {
  if (!token || token.indexOf('.') < 0) return null;
  const [data, sig] = token.split('.');
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch { return null; }
}

/** Codigo numerico de 6 digitos para 2FA. */
export function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
