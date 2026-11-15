// Confere a sintaxe das funções e do painel e procura segredos esquecidos no código. Uso: npm run check
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
let bad = 0; const fail = (m) => { console.error("✘ " + m); bad++; };
const syntax = (file) => { try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); return true; } catch (e) { fail(file + " — " + String(e.stderr).split("\n").find((l) => l.trim()) ); return false; } };
for (const f of readdirSync("api").filter((f) => f.endsWith(".js"))) if (syntax("api/" + f)) console.log("✔ api/" + f);
const html = readFileSync("index.html", "utf8"), m = html.match(/<script>\n(\/\* ===== BASE[\s\S]*?)<\/script><\/body>/);
if (!m) fail("index.html: script principal não encontrado");
else { const t = join(mkdtempSync(join(tmpdir(), "tkr-")), "app.js"); writeFileSync(t, m[1]); if (syntax(t)) console.log("✔ index.html (script do painel)"); }
const scan = [["index.html", html], ...readdirSync("api").map((f) => ["api/" + f, readFileSync("api/" + f, "utf8")])];
for (const [f, c] of scan) {
  if (/AIza[0-9A-Za-z_-]{35}/.test(c)) fail(f + ": parece conter uma chave do Google");
  if (c.includes("TKR_Consult_@2026#")) fail(f + ": contém a chave antiga que foi exposta");
}
if (bad) { console.error(`\n${bad} problema(s).`); process.exit(1); } else console.log("\nTudo certo.");
