# TKR PRO – Dashboard de Prospecção

Painel de prospecção multiusuário e multi-aparelho (celular, notebook, desktop, tablet): todos abrem o mesmo endereço e veem os mesmos leads.
Produção: **https://tkr-pro.vercel.app**

```
tkr-pro/
├─ index.html              painel (um arquivo, responsivo)
├─ api/                    funções do servidor (Vercel)
│  ├─ login session link users   acesso por e-mail+senha ou link pessoal; validação a cada 15 min
│  ├─ data seed                  leads/visitas compartilhados (sync a cada 10 s) · base original (só Master/Gerente)
│  ├─ proxy-maps cnpj social     Google Places · Casa dos Dados · redes sociais (Brave Search)
│  ├─ health                     diagnóstico (Master)
│  └─ _lib _store _base          utilitários · banco (Upstash Redis) · base original de empresas
├─ vercel.json             cabeçalhos de segurança e limites das funções
├─ scripts/                check.mjs (verificação) · build-standalone.mjs (versão para 1 aparelho)
├─ dev-server.mjs          teste local: npm run dev  → http://localhost:3000 (banco em memória)
└─ .github/workflows/      verificação automática a cada push
```

## 1) GitHub
Crie um repositório **PRIVADO** (a base de empresas e a lógica de acesso não devem ficar públicas) e envie estes arquivos:

```bash
git init
git add .
git commit -m "TKR PRO"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/tkr-pro.git
git push -u origin main
```
Sem terminal: no GitHub, **Add file > Upload files** e arraste o conteúdo da pasta (não envie arquivos `.env`).

## 2) Vercel (https://tkr-pro.vercel.app)
1. vercel.com > **Add New > Project** > importe o repositório. Nome do projeto: `tkr-pro` (gera o endereço acima, se estiver livre).
   Framework Preset: **Other** · Build Command: vazio · Output Directory: vazio · Root: `./`.
2. Antes do primeiro deploy (ou depois, com **Redeploy**), aba **Storage > Create Database > Upstash Redis** e conecte ao projeto (as variáveis do banco entram sozinhas).
3. **Settings > Environment Variables:** cadastre as variáveis do `.env.example` (obrigatórias: `SESSION_SECRET`, `MASTER_EMAIL`, `MASTER_PASSWORD`).
4. **Deploy.** Toda alteração enviada ao GitHub (`git push`) publica automaticamente.

## 3) Primeiro uso
1. Abra https://tkr-pro.vercel.app e entre com `MASTER_EMAIL` / `MASTER_PASSWORD` (a conta Master é criada nesse primeiro login). **Depois apague `MASTER_PASSWORD`** no Vercel e troque a senha em 🔑.
2. Aba **Acesso**: **🩺 Diagnóstico do servidor** mostra se banco e chaves estão certos. Crie Gerentes e Consultores (consultor precisa de um gerente responsável) e copie o **🔗 Link** pessoal de cada um (♻ gera outro e revoga o anterior).
3. Aba **Leads (CRM)** > **Adicionar base original** carrega as empresas já cadastradas (vêm do servidor). Para trazer leads guardados em um navegador antigo: Acesso > **Enviar base local deste navegador ao servidor**.

## Níveis
- **Master:** tudo, inclusive Acesso.
- **Gerente:** tudo, menos Acesso e "Restaurar base original". Vê os leads da sua equipe e os sem consultor (`GERENTE_VE_TUDO=1` para ver todos).
- **Consultor VIP:** sem exportar, excluir, importar, Nova prospecção e Histórico. Vê só os seus leads e os sem consultor; o campo consultor da visita vem travado.
As regras valem no servidor, não só na tela.

## Observações
- Conflito de edição (duas pessoas no mesmo lead no mesmo instante): vale a última gravação. A sincronização é por consulta a cada 10 s, não instantânea.
- Casa dos Dados e Brave Search são pagas por consulta; o rastreio de redes é feito só para empresas (PJ).
- `SESSION_SECRET` assina sessões e links pessoais: não divulgue; trocá-lo derruba todas as sessões e invalida todos os links.
- Versão para um único aparelho, sem servidor: `npm run standalone` gera `dist/TKR_PRO_standalone.html` com a base embutida (dados só naquele navegador).
- Desenvolvimento: `npm run dev` · Verificação: `npm run check`.
