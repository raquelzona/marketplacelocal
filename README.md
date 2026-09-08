# MarketPulse Local

Plataforma web responsiva de inteligência de mercado para aproximar consumidores e comerciantes e fortalecer o comércio local.

## O problema

Pequenos e médios comerciantes conhecem seus clientes, mas normalmente não têm acesso a dados estruturados sobre buscas, interesses e mudanças na demanda do próprio bairro. Isso dificulta decisões de estoque e reduz a capacidade de competir com grandes redes.

## A solução

O MarketPulse Local conecta consumidores, comerciantes e inteligência de mercado. Consumidores encontram produtos e lojas próximas e participam de pesquisas; comerciantes mantêm seu catálogo e recebem sinais locais agregados; administradores moderam o ecossistema e acompanham a operação.

## Principais funcionalidades

- **Consumidor:** onboarding, perfil e interesses, busca local, descoberta de lojas e questionários.
- **Comerciante:** cadastro da empresa, catálogo, estoque, tendências, comparações e recomendações determinísticas.
- **Administrador:** verificação de lojas, moderação de produtos, questionários, métricas e auditoria.

## Tecnologias

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase Auth, PostgreSQL e Supabase SSR.

## Arquitetura

As rotas e Server Components ficam em `src/app`, os componentes reutilizáveis em `src/components` e as regras compartilhadas em `src/lib`. O Supabase mantém autenticação e dados. A autorização é aplicada por guardas no servidor e, principalmente, por RLS e RPCs PostgreSQL. As migrations versionadas ficam em `supabase/migrations`.

## Banco de dados

As entidades centrais são `profiles`, `merchants`, `products`, `product_stock_events`, `product_alerts`, `alert_notifications`, `search_events`, `questionnaires`, `questionnaire_questions`, `questionnaire_submissions`, `questionnaire_responses`, `campaigns`, `campaign_events` e `audit_logs`. Chaves estrangeiras preservam os vínculos entre usuários, empresas, produtos e respostas; índices atendem localização, períodos, filtros e agregações.

## Desenvolvimento

```bash
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Supabase e variáveis de ambiente

1. Crie um projeto no Supabase.
2. No SQL Editor, execute as migrations em ordem:
   - `supabase/migrations/202609020001_initial_schema.sql`
   - `supabase/migrations/202609020002_consumer_interests.sql`
   - `supabase/migrations/202609020003_product_search.sql`
   - `supabase/migrations/202609030004_questionnaire_submissions.sql`
   - `supabase/migrations/202609030005_market_intelligence.sql`
   - `supabase/migrations/202609030006_admin_operations.sql`
   - `supabase/migrations/202609030007_final_hardening.sql`
   - `supabase/migrations/202609080008_geo_forecast_campaigns_monetization.sql`
   - `supabase/migrations/202609080009_expansion_features.sql`
3. Copie `.env.example` para `.env.local` e preencha a Project URL e a chave pública `anon` em **Project Settings > API**.
4. Em **Authentication > URL Configuration**, defina a Site URL (localmente, `http://localhost:3000`) e adicione `http://localhost:3000/auth/callback` aos Redirect URLs.

Não use a `service_role` no frontend. Administradores não possuem cadastro público: depois de criar um usuário autorizado, promova-o manualmente pelo SQL Editor com `update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';`.

Se a confirmação de email estiver habilitada no Supabase, o usuário receberá um link e será direcionado pelo callback. Para produção, acrescente também a URL HTTPS do domínio publicado.

### Experiência do consumidor

Depois do login, consumidores sem localização ou interesses completos são enviados para `/consumidor/onboarding`. As categorias ficam em `profiles.interests` como um array PostgreSQL privado pela RLS. Buscas atuais fazem correspondência simples por nome ou marca e filtram pelos produtos visíveis na cidade e no bairro do perfil; não há ranking ou inteligência avançada nesta etapa.

### Experiência do comerciante

Usuários `merchant` sem registro em `merchants` são direcionados para `/comerciante/onboarding`. A empresa é criada com `owner_id = auth.uid()` e status inicial `pending`. O catálogo permite criar, editar, filtrar, alterar disponibilidade e excluir produtos; todas as operações incluem o `merchant_id` da empresa autenticada e continuam protegidas pelas policies RLS.

Uma loja e seus produtos só aparecem para consumidores depois que `verification_status` for alterado para `verified` por um administrador. A Etapa 4 reutiliza o schema da migration inicial e não requer seeds nem uma migration adicional.

### Busca de produtos

A migration `202609020003_product_search.sql` cria a RPC `search_public_products` e índices para nome, marca, localização, categoria e disponibilidade. A função é `SECURITY INVOKER`, portanto as policies RLS continuam sendo aplicadas, e limita cada página a uma quantidade controlada de resultados.

Cada busca válida registra um `search_events` normalizado. Pela RLS, o evento individual só pode ser lido pelo próprio consumidor ou por administradores; merchants não possuem acesso. Não há dados de demonstração automáticos. Cálculo de distância não é realizado porque o schema ainda não possui coordenadas geográficas.

### Questionários

A migration `202609030004_questionnaire_submissions.sql` adiciona submissões completas, segmentação opcional e a RPC transacional `submit_questionnaire`. A RLS limita questionários à audiência correspondente e mantém submissões/respostas visíveis apenas ao consumidor responsável e aos administradores. Merchants não recebem acesso aos dados individuais.

Para inserir os dois questionários de demonstração em um ambiente local, execute manualmente `supabase/seeds/development_questionnaires.sql`. O arquivo contém IDs fixos, é idempotente e inclui no final o comando de remoção. Ele não é executado automaticamente nem deve ser aplicado em produção.

### Inteligência de mercado

A RPC `get_merchant_market_intelligence` valida a empresa do usuário autenticado e retorna somente agregados da cidade ou bairro dela. O frontend não recebe IDs de consumidores, eventos individuais, perfis ou respostas brutas.

Regras do MVP:

- rankings exigem pelo menos 3 buscas para o termo/categoria;
- questionários exigem 5 respondentes na localidade e cada alternativa exibida exige 3 seleções;
- demanda relevante começa em 5 buscas;
- oferta baixa significa até 2 produtos disponíveis, ou até 3 quando a demanda está crescendo;
- confiança baixa: 3–9 ocorrências; média: 10–19; alta: 20 ou mais;
- crescimento compara o período selecionado com o período imediatamente anterior de mesma duração;
- período anterior igual a zero é apresentado como “novo sinal”, sem divisão por zero.

Para a demonstração, execute primeiro `supabase/seeds/development_questionnaires.sql` e depois `supabase/seeds/development_market_intelligence.sql`. O segundo seed cria dados fictícios em São Paulo/Centro, é destinado exclusivamente ao ambiente local e contém instruções de remoção ao final do arquivo. Nunca execute esses seeds em produção.

### Painel administrativo

O painel canônico está em `/admin` e exige `profiles.role = 'admin'` no servidor e no banco. Ele reúne visão geral, verificação de lojas, consulta mínima de consumidores, moderação reversível de produtos, questionários, métricas agregadas e auditoria. A rota antiga `/administrador` redireciona para `/admin`.

A migration `202609030006_admin_operations.sql` adiciona metadados de verificação, moderação de produto (`active`/`hidden`), `audit_logs` e RPCs administrativas transacionais. Produtos ocultos deixam de ser públicos e não podem ser alterados pelo comerciante enquanto estiverem moderados. Não há exclusão física pela interface administrativa.

Para habilitar o primeiro administrador, crie a conta e execute no SQL Editor, substituindo o UUID:

```sql
update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
```

O seed final de demonstração inclui estados administrativos fictícios e logs identificados como Demo; ele é manual e nunca deve ser aplicado em produção.

## Privacidade e segurança

Comerciantes não recebem perfis, emails, buscas ou respostas individuais de consumidores. O dashboard comercial usa exclusivamente a RPC agregada e aplica limiares mínimos antes de exibir sinais. Cadastro público aceita apenas `consumer` ou `merchant`; operações administrativas validam o role novamente no banco e registram auditoria. Nenhuma chave `service_role` é usada pela aplicação.

### Expansão final

A migration `009` adiciona alertas internos, matching de disponibilidade, atribuição UTM agregável e uma RPC pública mínima para lojas verificadas. O mapa usa tiles OpenStreetMap com Leaflet; a posição do navegador fica apenas no estado da tela. Recomendações usam interesses, buscas do próprio consumidor e oferta local. O resumo semanal é determinístico e pode ser impresso ou salvo como PDF pelo navegador. QR Codes contêm exclusivamente URLs públicas.

Alertas não enviam email, SMS ou push. UTMs aceitam somente textos curtos de origem, mídia e campanha, sem IP, email, user agent ou identificadores pessoais. Consulte `/privacidade` e `/termos` para a transparência apresentada no MVP.

## Dados de demonstração

Os seeds são manuais e exclusivos para desenvolvimento. Execute, nesta ordem, depois das nove migrations:

1. `supabase/seeds/development_questionnaires.sql`
2. `supabase/seeds/development_market_intelligence.sql`
3. `supabase/seeds/development_final_demo.sql`

Eles criam fixtures claramente marcadas como Demo, com localidades, interesses, lojas, estados de verificação, estoque, buscas históricas, respostas e auditoria. Instruções de reset aparecem no final dos arquivos. Consulte `DEMO.md` para o roteiro de apresentação e criação segura das contas interativas.

## Deploy na Vercel

1. Publique o repositório em um provedor Git e importe-o na Vercel como projeto Next.js.
2. Crie um projeto Supabase de produção e aplique somente as migrations `001` a `009`, em ordem. Não aplique seeds de desenvolvimento.
3. Configure na Vercel `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Production, Preview e Development conforme necessário.
4. No Supabase, configure **Authentication > URL Configuration > Site URL** com o domínio HTTPS final.
5. Adicione `https://seu-dominio/auth/callback` aos Redirect URLs; mantenha também a URL local durante desenvolvimento.
6. Faça o deploy e valide cadastro, confirmação de email, login e redirecionamento por role.
7. Promova administradores somente pelo SQL Editor ou por um processo operacional seguro.

O projeto não exige variáveis privadas no navegador. Nunca adicione `service_role`, senhas ou secrets ao repositório.

## Comandos de qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
