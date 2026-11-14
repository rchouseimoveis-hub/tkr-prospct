// api/session.js — valida a sessão (chamada a cada 15 min pelo painel) e devolve um token renovado.
import { cors, verifyToken, bearer, authUser, pub, signToken, safe } from "./_lib.js";
export default safe(async (req, res) => {
  cors(req, res, "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!verifyToken(bearer(req))) return res.status(401).json({ server: true, error: "Sem sessão." });
  const u = await authUser(req, res); if (!u) return;
  res.status(200).json({ server: true, user: pub(u), token: signToken({ id: u.id, lv: u.lv || 0 }) });
});
