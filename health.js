// api/health.js — (Master) diagnóstico: o que está configurado e se o banco responde. Nunca devolve valores de chaves.
import { store } from "./_store.js";
import { cors, authUser, allUsers, jp, safe } from "./_lib.js";
export default safe(async (req, res) => {
  cors(req, res, "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  const me = await authUser(req, res); if (!me) return;
  if (me.role !== 1) return res.status(403).json({ error: "Somente o Master." });
  const e = process.env, has = (k) => !!(e[k] && String(e[k]).length);
  let banco = { ok: false, erro: "" }, leads = 0, visitas = 0, users = 0;
  try { await store.get("ver"); leads = Object.keys(await store.hgetall("leads")).length; visitas = Object.keys(await store.hgetall("visits")).length; users = (await allUsers()).length; banco.ok = true; } catch (x) { banco.erro = x.message; }
  res.status(200).json({
    banco, leads, visitas, usuarios: users, versao: Number((await store.get("ver").catch(() => 0)) || 0),
    config: {
      "SESSION_SECRET (32+ caracteres)": !!(e.SESSION_SECRET && e.SESSION_SECRET.length >= 32),
      "Banco (Upstash/KV)": has("UPSTASH_REDIS_REST_URL") || has("KV_REST_API_URL"),
      "GOOGLE_MAPS_KEY (busca de empresas)": has("GOOGLE_MAPS_KEY"),
      "CASADOSDADOS_KEY (consulta de CNPJ)": has("CASADOSDADOS_KEY"),
      "BRAVE_SEARCH_KEY (redes sociais)": has("BRAVE_SEARCH_KEY"),
    },
  });
});
