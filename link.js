// api/link.js — (Master) devolve o link pessoal de um usuário; {rotate:true} gera um novo e revoga o anterior e as sessões abertas.
import { store } from "./_store.js";
import { cors, authUser, allUsers, bodyOf, linkToken, safe } from "./_lib.js";
export default safe(async (req, res) => {
  cors(req, res, "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  const me = await authUser(req, res); if (!me) return;
  if (me.role !== 1) return res.status(403).json({ error: "Somente o Master gera links de acesso." });
  const b = req.method === "POST" ? bodyOf(req) : req.query;
  const u = (await allUsers()).find((x) => x.id === b.id);
  if (!u) return res.status(404).json({ error: "Usuário não encontrado." });
  if (b.rotate) { u.lv = (u.lv || 0) + 1; await store.hmset("users", { [u.id]: JSON.stringify(u) }); }
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0], host = req.headers["x-forwarded-host"] || req.headers.host;
  res.status(200).json({ url: `${proto}://${host}/?k=${linkToken(u)}`, lv: u.lv || 0 });
});
