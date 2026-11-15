// api/social.js — encontra as redes sociais públicas de EMPRESAS (PJ) pelo nome, usando a Brave Search API (busca oficial, sem raspagem).
// GET ?name=&alt=&city=&nets=ig,fb,li,tk,x → {ig:{url,score,title},...} só com as redes encontradas. Resultado em cache por 30 dias.
import { store } from "./_store.js";
import { cors, anyAuth, jp, safe } from "./_lib.js";

const API = process.env.BRAVE_API_URL || "https://api.search.brave.com/res/v1/web/search";
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set("ltda me epp eireli sa de da do das dos comercio industria servicos servico empresa grupo cia the".split(" "));
const toks = (n) => norm(n).split(" ").filter((t) => t.length >= 3 && !STOP.has(t));
const first = (u, re, bad, f) => { const m = u.pathname.match(re); return m && !(bad && bad.test(m[1])) ? f(m[1]) : null; };
export const NETS = {
  ig: { site: "instagram.com", host: /(^|\.)instagram\.com$/, pick: (u) => first(u, /^\/([A-Za-z0-9._]{2,30})\/?$/, /^(p|reel|reels|explore|stories|tv|accounts|about|direct)$/, (h) => `https://www.instagram.com/${h}/`) },
  fb: { site: "facebook.com", host: /(^|\.)facebook\.com$/, pick: (u) => first(u, /^\/([A-Za-z0-9.\-]{3,80})\/?$/, /^(posts|photo|photos|watch|groups|events|marketplace|share|sharer|login|public|hashtag|pages|people|reel|reels|policies)$/, (h) => `https://www.facebook.com/${h}`) },
  li: { site: "linkedin.com/company", host: /(^|\.)linkedin\.com$/, pick: (u) => first(u, /^\/company\/([^/]+)/, null, (h) => `https://www.linkedin.com/company/${h}`) },
  tk: { site: "tiktok.com", host: /(^|\.)tiktok\.com$/, pick: (u) => first(u, /^\/(@[A-Za-z0-9._]{2,30})\/?$/, null, (h) => `https://www.tiktok.com/${h}`) },
  x: { site: "x.com", host: /(^|\.)(x|twitter)\.com$/, pick: (u) => first(u, /^\/([A-Za-z0-9_]{2,15})\/?$/, /^(i|home|search|hashtag|intent|share|explore|login|settings)$/, (h) => `https://x.com/${h}`) },
};
// Só aceita perfis (não posts) cujo nome/URL contenha ao menos 60% das palavras do nome da empresa.
export function best(net, results, names) {
  let b = null;
  for (const r of results) {
    let u; try { u = new URL(r.url); } catch { continue; }
    if (!NETS[net].host.test(u.hostname)) continue;
    const link = NETS[net].pick(u); if (!link) continue;
    const hay = norm((r.title || "") + " " + u.pathname.replace(/[\/@._-]/g, " "));
    for (const n of names) {
      const T = [...new Set(toks(n))]; if (!T.length || (T.length === 1 && T[0].length < 5)) continue;
      const sc = T.filter((t) => hay.includes(t)).length / T.length;
      if (sc >= 0.6 && (!b || sc > b.score)) b = { url: link, score: Math.round(sc * 100) / 100, title: r.title || "" };
    }
  }
  return b;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default safe(async (req, res) => {
  cors(req, res, "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!(await anyAuth(req, res))) return;
  const key = process.env.BRAVE_SEARCH_KEY; if (!key) return res.status(501).json({ error: "Rastreamento de redes não configurado (BRAVE_SEARCH_KEY)." });
  const q = req.query, name = String(q.name || "").trim().slice(0, 100), alt = String(q.alt || "").trim().slice(0, 100), city = String(q.city || "").trim().slice(0, 60);
  if (name.length < 3) return res.status(400).json({ error: "Nome da empresa muito curto." });
  const nets = String(q.nets || "ig,fb,li,tk,x").split(",").filter((n) => NETS[n]);
  const ck = norm(name) + "|" + norm(city), c = jp(await store.hget("social", ck)) || { got: {}, tried: {} }, now = Date.now();
  const todo = nets.filter((n) => !c.got[n] && !(c.tried[n] && now - c.tried[n] < 30 * 864e5));
  for (let i = 0; i < todo.length; i++) {
    if (i) await sleep(1100); // limite da API: 1 consulta por segundo
    const n = todo[i];
    const r = await fetch(API + "?" + new URLSearchParams({ q: `"${name}" ${city} site:${NETS[n].site}`.trim(), count: "10", country: "BR", search_lang: "pt" }), { headers: { Accept: "application/json", "X-Subscription-Token": key } });
    if (r.status === 401 || r.status === 403 || r.status === 422) return res.status(502).json({ error: "Brave Search recusou a chave ou a consulta." });
    if (r.status === 429) break;
    if (!r.ok) continue;
    const d = await r.json().catch(() => ({})), hit = best(n, ((d.web && d.web.results) || []).map((x) => ({ url: x.url, title: x.title })), [name, alt].filter(Boolean));
    c.tried[n] = now; if (hit) c.got[n] = hit;
  }
  if (todo.length) await store.hmset("social", { [ck]: JSON.stringify(c) });
  res.status(200).json(Object.fromEntries(nets.filter((n) => c.got[n]).map((n) => [n, c.got[n]])));
});
