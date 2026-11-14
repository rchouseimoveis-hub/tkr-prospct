// api/login.js — login por e-mail+senha ou pelo link pessoal ({link}). Na 1ª vez cria o Master (MASTER_EMAIL / MASTER_PASSWORD).
import { randomBytes } from "node:crypto";
import { store } from "./_store.js";
import { cors, bodyOf, allUsers, hashPw, checkPw, signToken, readLink, pub, safe } from "./_lib.js";

export default safe(async (req, res) => {
  cors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const b = bodyOf(req), ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?", rk = "rl:" + ip;
  if (Number((await store.get(rk)) || 0) >= 20) return res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos." });
  let users = await allUsers();
  if (!users.length) {
    const me = process.env.MASTER_EMAIL, mp = process.env.MASTER_PASSWORD;
    if (!me || !mp) return res.status(503).json({ error: "Servidor sem Master: defina MASTER_EMAIL e MASTER_PASSWORD no Vercel." });
    const m = { id: "m" + randomBytes(5).toString("hex"), name: "Master", email: me.trim().toLowerCase(), role: 1, mid: "", active: true, lv: 0, ...(await hashPw(mp)) };
    await store.hmset("users", { [m.id]: JSON.stringify(m) }); await store.hmset("uemail", { [m.email]: m.id }); users = [m];
  }
  let u = null;
  if (b.link) { const l = readLink(b.link); u = l && users.find((x) => x.id === l.id && x.active !== false && (x.lv || 0) === l.lv); }
  else { const email = String(b.email || "").trim().toLowerCase(), c = users.find((x) => x.email === email && x.active !== false); if (c && (await checkPw(b.password, c.salt, c.hash))) u = c; }
  if (!u) { await store.incr(rk, 900); return res.status(401).json({ error: b.link ? "Link inválido ou revogado." : "E-mail ou senha inválidos." }); }
  res.status(200).json({ token: signToken({ id: u.id, lv: u.lv || 0 }), user: pub(u) });
});
