// api/seed.js — entrega a base original de empresas (Master/Gerente). Fica no servidor, fora do HTML público.
import { cors, authUser, safe } from "./_lib.js";
import base from "./_base.js";
export default safe(async (req, res) => {
  cors(req, res, "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  const me = await authUser(req, res); if (!me) return;
  if (me.role > 2) return res.status(403).json({ error: "Sem permissão." });
  res.setHeader("Cache-Control", "private, max-age=300");
  res.status(200).json({ base });
});
