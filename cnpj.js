// api/cnpj.js — consulta de CNPJ na Casa dos Dados (API v4). A api-key fica só no servidor.
import { cors, anyAuth, safe } from "./_lib.js";
export default safe(async (req, res) => {
  cors(req, res, "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!(await anyAuth(req, res))) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido." });
  const cnpj = String(req.query.cnpj || "").replace(/\D/g, "");
  if (cnpj.length !== 14) return res.status(400).json({ error: "Informe um CNPJ com 14 dígitos." });
  const key = process.env.CASADOSDADOS_KEY; if (!key) return res.status(500).json({ error: "CASADOSDADOS_KEY não configurada no servidor." });
  const r = await fetch(`${process.env.CASADOSDADOS_API_URL || "https://api.casadosdados.com.br"}/v4/cnpj/${cnpj}`, { headers: { "api-key": key } });
  if (r.status === 401 || r.status === 403) return res.status(502).json({ error: "Casa dos Dados recusou a chave ou o acesso (confira a api-key e o saldo da conta)." });
  if (r.status === 404) return res.status(404).json({ error: "CNPJ não encontrado na Casa dos Dados." });
  if (!r.ok) return res.status(502).json({ error: `Casa dos Dados respondeu HTTP ${r.status}.` });
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.status(200).json(await r.json().catch(() => ({})));
});
