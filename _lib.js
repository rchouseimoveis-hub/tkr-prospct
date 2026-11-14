// api/_lib.js — senhas, sessões, links de acesso, escopo por nível e autenticação (compartilhado pelas funções)
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { store } from "./_store.js";
const scrypt = promisify(_scrypt);

const secret = () => { const s = process.env.SESSION_SECRET; if (!s || s.length < 24) throw new Error("SESSION_SECRET ausente ou curta (mínimo 24 caracteres)."); return s; };
const sig = (s) => createHmac("sha256", secret()).update(s).digest("base64url");
const eq = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const jp = (v) => { try { return JSON.parse(v); } catch { return null; } };
export const bodyOf = (req) => (typeof req.body === "string" ? jp(req.body) || {} : req.body || {});
export const bearer = (req) => String(req.headers.authorization || "").replace(/^Bearer /, "");
export const safe = (fn) => async (req, res) => { try { await fn(req, res); } catch (e) { res.status(500).json({ error: "Erro no servidor: " + e.message }); } };

export async function hashPw(pw) { const salt = randomBytes(16).toString("hex"); return { salt, hash: (await scrypt(String(pw), salt, 64)).toString("hex") }; }
export async function checkPw(pw, salt, hash) {
  if (!salt || !hash) return false;
  const x = await scrypt(String(pw), salt, 64), y = Buffer.from(hash, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

// Sessão (12 h, renovada a cada validação) e link de acesso (derivado do segredo: não fica guardado em texto; revogado ao mudar "lv")
export function signToken(p) { const b = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + 12 * 3600e3 })).toString("base64url"); return b + "." + sig(b); }
export function verifyToken(t) {
  const [b, s] = String(t || "").split("."); if (!b || !s || !eq(s, sig(b))) return null;
  const p = jp(Buffer.from(b, "base64url").toString()); return p && p.exp > Date.now() ? p : null;
}
export const linkToken = (u) => `${u.id}.${u.lv || 0}.${sig("link:" + u.id + ":" + (u.lv || 0))}`;
export function readLink(t) {
  const [id, lv, s] = String(t || "").split("."); if (!id || lv == null || !s || !eq(s, sig("link:" + id + ":" + lv))) return null;
  return { id, lv: Number(lv) };
}

export const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, mid: u.mid || "", active: u.active !== false });
export async function allUsers() { return Object.values(await store.hgetall("users")).map(jp).filter(Boolean); }
// ids de usuários cujos dados o usuário pode ver: Master todos · Gerente ele + sua equipe · Consultor só ele
export function scopeOf(me, users) {
  const ids = new Set([me.id]);
  if (me.role === 1) users.forEach((u) => ids.add(u.id)); else if (me.role === 2) users.forEach((u) => { if (u.mid === me.id) ids.add(u.id); });
  return { ids };
}

export function cors(req, res, methods = "GET, POST, OPTIONS") {
  const o = process.env.ALLOWED_ORIGIN; if (!o) return; // sem ALLOWED_ORIGIN: só mesma origem (painel e API no mesmo projeto)
  res.setHeader("Access-Control-Allow-Origin", o); res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tkr-key, X-Goog-FieldMask");
}

// Confere a assinatura E o banco: usuário ativo e link/sessão não revogados.
export async function authUser(req, res) {
  const p = verifyToken(bearer(req));
  if (!p) { res.status(401).json({ error: "Sessão inválida ou expirada." }); return null; }
  const u = jp(await store.hget("users", p.id));
  if (!u || u.active === false || (u.lv || 0) !== (p.lv || 0)) { res.status(401).json({ error: "Acesso revogado ou usuário inativo." }); return null; }
  return u;
}
// Proxies: sessão válida OU chave legada TKR_KEY (opcional)
export async function anyAuth(req, res) {
  const k = String(req.headers["x-tkr-key"] || ""), t = process.env.TKR_KEY || "";
  if (k && t && eq(k, t)) return { id: "legacy", role: 1 };
  return authUser(req, res);
}
