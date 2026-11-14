// api/data.js — leads e visitas compartilhados entre todos os aparelhos.
// GET ?v=<versão> → {same:true} se nada mudou (barato, usado a cada 10 s) ou {ver, leads, visits, users}.
// POST {leads:{up,del}, visits:{up,del}} → grava com as permissões do nível. Master: tudo · Gerente: sua equipe + sem dono · Consultor: os seus + sem dono (sem excluir).
import { store } from "./_store.js";
import { cors, authUser, allUsers, scopeOf, bodyOf, pub, jp, safe } from "./_lib.js";

export default safe(async (req, res) => {
  cors(req, res, "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  const me = await authUser(req, res); if (!me) return;
  const ver = Number((await store.get("ver")) || 0);
  if (req.method === "GET") {
    if (req.query.v != null && Number(req.query.v) === ver) return res.status(200).json({ same: true, ver });
  }
  const users = await allUsers(), { ids } = scopeOf(me, users);
  const seeAll = me.role === 1 || (me.role === 2 && process.env.GERENTE_VE_TUDO === "1");
  const free = (r) => !r.ow && !String(r.cs || "").trim();
  const see = (r) => seeAll || (me.role === 3 ? r.ow === me.id || free(r) : ids.has(r.ow) || !r.ow);

  if (req.method === "GET") {
    const rows = async (k) => Object.values(await store.hgetall(k)).map(jp).filter((r) => r && see(r));
    return res.status(200).json({ ver, leads: await rows("leads"), visits: await rows("visits"), users: users.filter((u) => seeAll || ids.has(u.id)).map(pub) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const b = bodyOf(req), rejected = []; let changed = 0;

  async function sync(key, part) {
    const up = Array.isArray(part && part.up) ? part.up.slice(0, 300) : [], del = Array.isArray(part && part.del) ? part.del.slice(0, 300) : [];
    if (!up.length && !del.length) return;
    const cur = await store.hgetall(key), w = {};
    for (const r of up) {
      if (!r || typeof r.id !== "string" || !r.id || r.id.length > 64 || JSON.stringify(r).length > 20000) continue;
      const o = jp(cur[r.id]); if (o && !see(o)) { rejected.push(r.id); continue; }
      if (me.role === 3) { r.ow = me.id; r.cs = me.name; }
      else {
        const nm = String(r.cs || "").trim().toLowerCase(), t = nm && users.find((u) => u.active !== false && u.name.toLowerCase() === nm && (seeAll || ids.has(u.id)));
        if (t) { r.ow = t.id; r.cs = t.name; } else r.ow = nm && o && String(o.cs || "").trim().toLowerCase() === nm ? o.ow || "" : "";
      }
      w[r.id] = JSON.stringify(r);
    }
    if (Object.keys(w).length) { await store.hmset(key, w); changed += Object.keys(w).length; }
    if (me.role !== 3) {
      const ok = del.filter((id) => { const o = jp(cur[id]); return typeof id === "string" && o && see(o); });
      if (ok.length) { await store.hdel(key, ok); changed += ok.length; }
    }
  }
  await sync("leads", b.leads); await sync("visits", b.visits);
  const nv = changed ? await store.incrv("ver") : ver;
  res.status(200).json({ ok: true, ver: nv, rejected });
});
