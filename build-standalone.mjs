// Gera dist/TKR_PRO_standalone.html: o painel com a base original embutida, para uso em UM aparelho (modo local). Uso: npm run standalone
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const { default: base } = await import("../api/_base.js");
const html = readFileSync("index.html", "utf8");
if (!html.includes("[]/*BASE_JSON*/")) { console.error("Marcador da base não encontrado em index.html"); process.exit(1); }
mkdirSync("dist", { recursive: true });
writeFileSync("dist/TKR_PRO_standalone.html", html.replace("[]/*BASE_JSON*/", JSON.stringify(base)));
console.log(`dist/TKR_PRO_standalone.html gerado com ${base.length} empresas.`);
