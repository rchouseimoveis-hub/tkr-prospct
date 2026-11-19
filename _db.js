import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TKR_SECRET'];
export function assertEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variáveis ausentes na Vercel: ${missing.join(', ')}`);
  if (process.env.TKR_SECRET.length < 32) throw new Error('TKR_SECRET precisa ter pelo menos 32 caracteres aleatórios.');
}
export function getSupabase() {
  assertEnv();
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
export function signToken(user) {
  assertEnv();
  const payload = Buffer.from(JSON.stringify({
    id: user.id, email: user.email, role: user.role, name: user.name, mid: user.mid || null,
    exp: Date.now() + 8 * 60 * 60 * 1000
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.TKR_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function verifyToken(req) {
  try {
    assertEnv();
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = crypto.createHmac('sha256', process.env.TKR_SECRET).update(payload).digest();
    const supplied = Buffer.from(sig, 'base64url');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.id || !Number.isFinite(data.exp) || data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('A senha precisa ter pelo menos 12 caracteres.');
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}
export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return { valid: false, needsUpgrade: false };
  if (stored.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = stored.split('$');
    try {
      const expected = Buffer.from(hashHex, 'hex');
      const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      return { valid: expected.length === actual.length && crypto.timingSafeEqual(expected, actual), needsUpgrade: false };
    } catch { return { valid: false, needsUpgrade: false }; }
  }
  // Migração de hashes legados ou senhas antigas: permite autenticação única e troca imediata para scrypt.
  const legacy = /^[a-f0-9]{64}$/i.test(stored)
    ? crypto.createHash('sha256').update(password + process.env.TKR_SECRET).digest('hex')
    : stored;
  const a = Buffer.from(String(legacy)); const b = Buffer.from(stored);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { valid, needsUpgrade: valid };
}
export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ error: 'Método não permitido.' });
}
export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, mid: user.mid || null, active: user.active !== false };
}

export async function getActor(req) {
  const token = verifyToken(req);
  if (!token) return null;
  const db = getSupabase();
  const { data, error } = await db.from('tkr_users').select('id,name,email,role,mid,active').eq('id', token.id).maybeSingle();
  if (error) throw error;
  if (!data || !data.active) return null;
  return data;
}
