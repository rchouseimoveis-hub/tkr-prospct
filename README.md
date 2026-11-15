# TKR PRO – Dashboard de Prospecção (multiusuário, multi-aparelho)

```
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
```

## Colocar no ar (Vercel)
1. Suba a pasta no Vercel (Import Project). Em **Storage**, crie um **Upstash Redis** e conecte ao projeto.
2. Em **Settings > Environment Variables**, cadastre as variáveis do `.env.example`
   (obrigatórias: `SESSION_SECRET`, `MASTER_EMAIL`, `MASTER_PASSWORD`; recomendadas: `GOOGLE_MAPS_KEY`, `CASADOSDADOS_KEY`; opcional: `BRAVE_SEARCH_KEY`).
3. Faça o deploy, abra o endereço e entre com o e-mail/senha do Master (a conta é criada no 1º login). Troque a senha em 🔑.
4. Aba **Acesso**: crie Gerentes e Consultores (consultor precisa de gerente responsável), use **🔗 Link** para o link pessoal de cada um
   e **🩺 Diagnóstico do servidor** para conferir se está tudo configurado.
5. Leve os leads: **Enviar base local deste navegador ao servidor** (Acesso) ou **Adicionar base original** (aba Leads).

Todos os aparelhos abrem o MESMO endereço e veem os mesmos leads. Alterações de uma pessoa chegam às outras em até ~10 s.
Em conflito (duas pessoas editando o mesmo lead ao mesmo tempo) vale a última gravação.

## Níveis
- **Master**: tudo, inclusive Acesso. · **Gerente**: tudo menos Acesso e "Restaurar base original"; vê os leads da sua equipe e os sem dono
  (`GERENTE_VE_TUDO=1` para ver todos). · **Consultor VIP**: sem exportar, excluir, importar, Nova prospecção e Histórico; vê só os seus leads e os sem dono.
As regras são aplicadas no servidor, não só na tela.

## Segurança
`SESSION_SECRET` assina sessões e links pessoais: não divulgue. Revogar um link (♻) ou desativar o usuário derruba as sessões abertas na próxima validação (até 15 min).
A API da Casa dos Dados e a da Brave são pagas (por consulta); o rastreio de redes é feito só para empresas (PJ).
