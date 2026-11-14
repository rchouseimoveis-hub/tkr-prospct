// api/proxy-maps.js — proxy do Google Places (New). A chave do Google fica só no servidor. Exige sessão (Master/Gerente) ou TKR_KEY.
import { cors, anyAuth, bodyOf, safe } from "./_lib.js";
const MASK = "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours.weekdayDescriptions,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,nextPageToken";
export default safe(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const u = await anyAuth(req, res); if (!u) return;
  if (u.role > 2) return res.status(403).json({ error: "Sem permissão para pesquisar empresas." });
  const key = process.env.GOOGLE_MAPS_KEY; if (!key) return res.status(500).json({ error: "GOOGLE_MAPS_KEY não configurada no servidor." });
  let body, mask = MASK;
  if (req.method === "GET") {
    const q = String(req.query.query || "").slice(0, 200); if (!q) return res.status(400).json({ error: "Parâmetro 'query' ausente." });
    body = { textQuery: q, languageCode: "pt-BR", regionCode: "BR" };
  } else if (req.method === "POST") {
    body = bodyOf(req); if (!body.textQuery) return res.status(400).json({ error: "Campo 'textQuery' ausente." });
    const m = req.headers["x-goog-fieldmask"]; if (m) { if (!/^[A-Za-z0-9_.,]+$/.test(m)) return res.status(400).json({ error: "FieldMask inválido." }); mask = m; }
  } else return res.status(405).json({ error: "Método não permitido." });
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask }, body: JSON.stringify(body) });
  res.status(r.status).json(await r.json());
});
