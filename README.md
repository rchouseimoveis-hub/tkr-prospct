tkr-pro/
├─ index.html          painel (um arquivo, responsivo; modo local ou servidor)
├─ dev-server.mjs      teste local: node dev-server.mjs  → http://localhost:3000 (banco em memória)
├─ package.json  .env.example
└─ api/
   ├─ _lib.js _store.js         sessão, links pessoais, escopo por nível · banco (Upstash Redis)
   ├─ login.js session.js link.js users.js   acesso por e-mail+senha ou link pessoal; renovação a cada 15 min
   ├─ data.js                   leads e visitas compartilhados (os aparelhos conferem a cada 10 s)
   ├─ proxy-maps.js cnpj.js social.js        Google Places · Casa dos Dados · redes sociais (Brave Search)
   └─ health.js                 diagnóstico (Master): banco e variáveis configuradas
