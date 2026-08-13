import crypto from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';

if (!process.env.SESSION_SECRET) {
  console.warn('[auth] SESSION_SECRET is not set — using an insecure development default.');
}

// — Password hashing (scrypt, no external dependency) —

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, derived);
}

// — Signed cookie tokens (HMAC) —
// A token is `payload.signature` where payload is base64url JSON.

export function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function randomId(bytes = 8) {
  return crypto.randomBytes(bytes).toString('hex');
}
