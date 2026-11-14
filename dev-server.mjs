// Servidor local de teste: node dev-server.mjs  (usa banco em memória; os dados somem ao reiniciar)
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
process.env.STORE = "memory";
process.env.SESSION_SECRET ||= "dev-secret-dev-secret-dev-secret-1234";
process.env.MASTER_EMAIL ||= "master@teste.com";
process.env.MASTER_PASSWORD ||= "MasterPass2026!";
const root = path.dirname(fileURLToPath(import.meta.url)), port = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/api/")) {
    const name = u.pathname.slice(5).replace(/[^\w-]/g, "");
    let mod; try { mod = await import(pathToFileURL(path.join(root, "api", name + ".js")).href); } catch { res.statusCode = 404; return res.end("{}"); }
    const ch = []; for await (const c of req) ch.push(c);
    const raw = Buffer.concat(ch).toString(); let body; try { body = raw ? JSON.parse(raw) : undefined; } catch { body = raw; }
    req.query = Object.fromEntries(u.searchParams); req.body = body;
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return res; };
    return mod.default(req, res);
  }
  if (u.pathname === "/" || u.pathname === "/index.html") { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.end(fs.readFileSync(path.join(root, "index.html"))); }
  res.statusCode = 404; res.end("not found");
}).listen(port, () => console.log("TKR PRO em http://localhost:" + port));
