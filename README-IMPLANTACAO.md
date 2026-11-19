# TKR PRO 2.3.1 — Implantação GitHub + Vercel + Supabase

## Estado desta entrega
Pacote preparado para homologação. O build e os testes estáticos precisam ser executados no ambiente de implantação; a conexão real depende das variáveis e do projeto Supabase do cliente. Não publicar em produção antes dos testes.

## 1. Supabase
1. Confirme que está no projeto `tkr-pro-sistem`.
2. Abra SQL Editor > New query.
3. Faça backup/exportação se já houver dados importantes.
4. Execute `supabase_setup.sql`. O script é idempotente e não cria usuário Master nem senha padrão.
5. Confirme as tabelas `tkr_users`, `tkr_leads`, `tkr_visits` e `tkr_meta`.

## 2. GitHub
Extraia o ZIP e envie o CONTEÚDO da pasta `TKR-PRO-2.3.1-IMPLANTACAO/` para a raiz do repositório privado (não envie a pasta externa como nível adicional). A raiz do GitHub deve conter `index.html`, `package.json`, `vercel.json`, `api/`, `scripts/`, `public/` e `supabase_setup.sql`. Não envie `.env`, chaves ou senhas.

## 3. Vercel
Importe o repositório como um novo projeto Preview/Homologação. Configurações: Framework Other; Root `./`; Build `npm run build`; Output `public`; Install `npm install`.

Cadastre as variáveis de `.env.example` em Settings > Environment Variables. Use a chave `service_role`/Secret somente no backend; nunca no HTML. Gere TKR_SECRET e TKR_BOOTSTRAP_KEY com gerador criptograficamente seguro. Não reutilize valores de exemplo.

## 4. Primeiro acesso Master
Depois do deploy Preview e com as variáveis configuradas, abra o endereço Preview. Se não houver usuários, a tela exibirá o formulário de primeiro acesso. Informe TKR_BOOTSTRAP_KEY, nome, e-mail e senha de pelo menos 12 caracteres. A chave de bootstrap deve ser removida/rotacionada após a criação do Master.

## 5. Homologação obrigatória
- GET `/api/session` retorna `server:true` e `setupRequired:true` antes do primeiro Master.
- Criar Master uma única vez; tentativa posterior deve ser recusada.
- Login correto e incorreto.
- Usuário inativo não autentica.
- Master cria Gerente e Consultor.
- Gerente/Consultor não conseguem administrar usuários.
- Consultor não consegue excluir leads/visitas nem acessar registros atribuídos a outra pessoa.
- Testar sincronização com dados de teste, sem dados reais inicialmente.
- Disparos WhatsApp/e-mail permanecem desativados até configurar e validar os provedores e consentimentos.

## Variáveis obrigatórias
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TKR_SECRET` (mínimo 32 caracteres), `TKR_BOOTSTRAP_KEY` (mínimo 24 caracteres).

## Observações de segurança
- A chave Secret do Supabase nunca deve ser exposta ao navegador ou ao GitHub.
- RLS bloqueia acesso direto pelas roles `anon` e `authenticated`; o backend usa a chave de serviço.
- O backend valida os papéis e limita os registros por nome de responsável (`cs`); registros sem responsável não são expostos a Gerentes/Consultores e não podem ser gravados por eles. Recomenda-se evoluir para identificadores imutáveis de responsável (`owner_user_id`) antes de crescimento da equipe.
- O fluxo de senha migra credenciais legadas para scrypt após login válido; redefina senhas antigas se houver suspeita de exposição.
- CEP retorna apenas dados de endereço; não inventa empresas.


## Validação desta revisão

A revisão estática de sintaxe e o build local foram executados. Isso não comprova conexão com o projeto Supabase, publicação na Vercel nem funcionamento em produção; essas etapas dependem das credenciais configuradas e de testes no Preview.
