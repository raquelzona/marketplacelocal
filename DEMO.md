# Demonstração do MarketPulse Local

Este roteiro é exclusivo para ambiente local ou projeto Supabase descartável. Nunca execute os seeds em produção.

## 1. Preparar os dados

1. Copie `.env.example` para `.env.local` e preencha a URL e a chave pública `anon` do projeto de demonstração.
2. Execute as migrations `001` a `009`, na ordem indicada no `README.md`.
3. Execute os seeds `development_questionnaires.sql`, `development_market_intelligence.sql` e `development_final_demo.sql`, nessa ordem.
4. Inicie com `npm run dev`.

Os usuários inseridos pelos seeds são fixtures analíticas sem senha e não devem ser usados para login. Isso evita guardar credenciais no código.

## 2. Contas da apresentação

Crie três contas interativas pela interface ou pelo painel **Authentication > Users** do Supabase, escolhendo senhas temporárias somente no momento da demonstração:

- `consumidor.apresentacao@seu-dominio.test` — role `consumer`;
- `comerciante.apresentacao@seu-dominio.test` — role `merchant`;
- `admin.apresentacao@seu-dominio.test` — crie como consumidor e depois altere `profiles.role` para `admin` no SQL Editor.

Não registre as senhas neste arquivo. Se confirmação de email estiver ligada, confirme as contas antes da apresentação. Para o comerciante interativo visualizar os insights preparados, cadastre sua empresa em **São Paulo / Centro**.

## 3. Roteiro recomendado

1. Na landing page, apresente o problema e os três públicos.
2. Entre como consumidor, conclua o perfil, busque “ração”, abra uma loja e responda uma pesquisa.
3. Entre como comerciante, mostre empresa, catálogo, atualização de estoque e inteligência nos períodos semanal e mensal.
4. Destaque “ração” em crescimento, “perfume” em queda e a oportunidade de demanda alta com oferta baixa.
5. Entre como administrador, analise a loja pendente, mostre uma rejeitada, modere um produto, consulte métricas e abra a auditoria.

## Funcionalidades da etapa de crescimento

- O consumidor pode usar a localização apenas durante a busca; coordenadas precisas não são persistidas. Sem permissão ou coordenadas da loja, a ordenação original continua disponível.
- A distância usa Haversine e as coordenadas comerciais informadas no cadastro da empresa.
- O plano Pro libera previsão linear de 7 e 30 dias quando existe volume suficiente; confiança e tamanho da amostra ficam visíveis.
- Campanhas públicas aceitam respostas anônimas por RPC validada. Respostas individuais continuam invisíveis para comerciantes.
- Plano e patrocínio são alterados somente pelo administrador; esta demonstração não integra cobrança nem plataformas de anúncios.
- Acesse as lojas em modo Mapa, crie um alerta por termo e abra o Resumo semanal do comerciante.
- Em Origens no admin, mostre UTMs agregadas e os QR Codes das campanhas.

## 4. O que destacar

- busca e descoberta realmente conectadas ao PostgreSQL;
- autorização por role e RLS, não apenas menus escondidos;
- privacidade: comerciantes enxergam agregados, nunca pessoas ou respostas individuais;
- rankings, comparação de períodos, crescimento e demanda versus oferta;
- recomendações explicáveis por regras determinísticas, sem alegar IA generativa;
- interface responsiva para celular, tablet e desktop.

Os comandos comentados no final de cada seed explicam como remover as fixtures.
