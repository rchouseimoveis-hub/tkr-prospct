// GET /api/users → usuários do seu escopo. POST (Master): criar/editar. POST {self:true, old, new}: trocar a própria senha.
import { randomBytes } from "node:crypto";
import { store } from "./_store.js";
import { cors, authUser, allUsers, scopeOf, bodyOf, hashPw, checkPw, pub, jp, safe } from "./_lib.js";
const okEm = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export default safe(async (req, res) => {
  cors(req, res, "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  const me = await authUser(req, res); if (!me) return;
  let users = await allUsers();
  const vis = () => (me.role === 1 ? users : users.filter((u) => scopeOf(me, users).ids.has(u.id))).map(pub);
  if (req.method === "GET") return res.status(200).json({ users: vis() });
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const b = bodyOf(req);
  if (b.self) {
    if (String(b.new || "").length < 8) return res.status(400).json({ error: "A nova senha precisa de 8+ caracteres." });
    if (!(await checkPw(b.old, me.salt, me.hash))) return res.status(400).json({ error: "Senha atual incorreta." });
    Object.assign(me, await hashPw(b.new));
    await store.hmset("users", { [me.id]: JSON.stringify(me) });
    return res.status(200).json({ ok: true });
  }
  if (me.role !== 1) return res.status(403).json({ error: "Somente o Master gerencia usuários." });
  const name = String(b.name || "").trim().slice(0, 60), email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || "");
  const ex = b.id ? users.find((u) => u.id === b.id) : null;
  if (b.id && !ex) return res.status(404).json({ error: "Usuário não encontrado." });
  if (name.length < 2) return res.status(400).json({ error: "Informe o nome." });
  if (!okEm(email)) return res.status(400).json({ error: "E-mail inválido." });
  const other = await store.hget("uemail", email);
  if (other && other !== (ex && ex.id)) return res.status(409).json({ error: "E-mail já cadastrado." });
  if (users.some((u) => u.id !== (ex && ex.id) && u.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: "Já existe um usuário com esse nome." });
  const role = ex && ex.role === 1 ? 1 : Number(b.role);
  if (role !== 1 && role !== 2 && role !== 3) return res.status(400).json({ error: "Nível inválido." });
  let mid = "";
  if (role === 3) {
    mid = String(b.mid || "");
    if (!users.some((u) => u.id === mid && u.active !== false && u.role <= 2)) return res.status(400).json({ error: "Escolha o gerente responsável pelo consultor." });
  }
  if ((!ex || pw) && pw.length < 8) return res.status(400).json({ error: "A senha precisa de 8+ caracteres." });
  const u = ex || { id: "u" + randomBytes(6).toString("hex") }, oldName = ex && ex.name, oldEmail = ex && ex.email;
  Object.assign(u, { name, email, role, mid, active: role === 1 ? true : b.active !== false });
  if (pw) Object.assign(u, await hashPw(pw));
  await store.hmset("users", { [u.id]: JSON.stringify(u) });
  if (oldEmail && oldEmail !== email) await store.hdel("uemail", [oldEmail]);
  await store.hmset("uemail", { [email]: u.id });
  await store.incrv("ver");
  if (oldName && oldName !== name) {
    for (const k of ["leads", "visits"]) {
      const all = await store.hgetall(k), w = {};
      for (const [id, v] of Object.entries(all)) { const r = jp(v); if (r && r.ow === u.id) { r.cs = name; w[id] = JSON.stringify(r); } }
      await store.hmset(k, w);
    }
  }
  users = await allUsers();
  res.status(200).json({ users: users.map(pub) });
});
