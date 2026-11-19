import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if(!scripts.length) throw new Error('Nenhum script inline encontrado.');
for(const [i,m] of scripts.entries()) { try { new Function(m[1]); } catch (e) { throw new Error(`Erro no JavaScript inline ${i+1}: ${e.message}`); } }
for(const file of [...fs.readdirSync('api').filter(f=>f.endsWith('.js')).map(f=>`api/${f}`), ...fs.readdirSync('scripts').filter(f=>f.endsWith('.mjs')).map(f=>`scripts/${f}`)]) { const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'}); if(r.status!==0) throw new Error(r.stderr||`Falha em ${file}`); }
console.log(`Verificação concluída: ${scripts.length} script(s) inline e arquivos de API/scripts sem erro de sintaxe.`);
