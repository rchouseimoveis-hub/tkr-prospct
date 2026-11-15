import fs from 'fs';
import path from 'path';

fs.mkdirSync('public', { recursive: true });
fs.copyFileSync('index.html', path.join('public', 'index.html'));
console.log('Build concluido: public/index.html gerado com sucesso.');
