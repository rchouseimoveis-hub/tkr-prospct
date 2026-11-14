// api/_store.js — armazenamento: Upstash Redis / Vercel KV via REST. Memória só em desenvolvimento (STORE=memory).
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOK = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const memMode = () => process.env.STORE === "memory";
const mem = (globalThis.__tkrMem ||= { h: new Map(), k: new Map() });
const H = (k) => mem.h.get(k) || mem.h.set(k, new Map()).get(k);
async function cmd(a) {
  if (!URL_ || !TOK) throw new Error("Banco de dados não configurado (UPSTASH_REDIS_REST_URL / TOKEN).");
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json" }, body: JSON.stringify(a) });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.result;
}
export const store = {
  async hget(k, f) { return memMode() ? H(k).get(f) ?? null : cmd(["HGET", k, f]); },
  async hgetall(k) {
    if (memMode()) return Object.fromEntries(H(k));
    const a = (await cmd(["HGETALL", k])) || [], o = {};
    for (let i = 0; i < a.length; i += 2) o[a[i]] = a[i + 1];
    return o;
  },
  async hmset(k, o) {
    const e = Object.entries(o); if (!e.length) return;
    if (memMode()) { e.forEach(([f, v]) => H(k).set(f, v)); return; }
    await cmd(["HSET", k, ...e.flat()]);
  },
  async hdel(k, fs) {
    if (!fs.length) return;
    if (memMode()) { fs.forEach((f) => H(k).delete(f)); return; }
    await cmd(["HDEL", k, ...fs]);
  },
  async get(k) {
    if (memMode()) { const x = mem.k.get(k); return x && x.e > Date.now() ? x.v : null; }
    return cmd(["GET", k]);
  },
  async incr(k, ttl) {
    if (memMode()) { const x = mem.k.get(k), live = x && x.e > Date.now(), n = (live ? Number(x.v) : 0) + 1; mem.k.set(k, { v: n, e: live ? x.e : Date.now() + ttl * 1000 }); return n; }
    const n = await cmd(["INCR", k]); if (n === 1) await cmd(["EXPIRE", k, ttl]); return n;
  },
  async set(k, v) { if (memMode()) { mem.k.set(k, { v, e: Infinity }); return; } await cmd(["SET", k, String(v)]); },
  async incrv(k) { if (memMode()) { const x = mem.k.get(k), n = (x ? Number(x.v) : 0) + 1; mem.k.set(k, { v: n, e: Infinity }); return n; } return cmd(["INCR", k]); },
  async del(k) { if (memMode()) { mem.k.delete(k); return; } await cmd(["DEL", k]); },
};
