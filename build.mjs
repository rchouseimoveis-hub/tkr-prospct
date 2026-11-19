import fs from 'node:fs';
import path from 'node:path';
fs.rmSync('public',{recursive:true,force:true});
fs.mkdirSync('public',{recursive:true});
fs.copyFileSync('index.html',path.join('public','index.html'));
console.log('TKR PRO 2.3.1: build concluído. APIs permanecem na pasta /api para a Vercel.');
