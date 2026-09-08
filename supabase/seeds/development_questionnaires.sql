-- SOMENTE DESENVOLVIMENTO. Execute manualmente após todas as migrations.
insert into public.questionnaires (id, titulo, descricao, ativo, estimated_minutes)
values
  ('10000000-0000-4000-8000-000000000001', 'Compras para este mês', 'Conte o que você pretende comprar nas próximas semanas.', true, 2),
  ('10000000-0000-4000-8000-000000000002', 'Preferências no comércio local', 'Ajude a entender o que torna uma experiência local mais relevante.', true, 2)
on conflict (id) do update set titulo=excluded.titulo, descricao=excluded.descricao, ativo=excluded.ativo, estimated_minutes=excluded.estimated_minutes;

insert into public.questionnaire_questions (id, questionnaire_id, pergunta, tipo, opcoes, ordem)
values
  ('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Qual categoria você pretende comprar neste mês?','single_choice','["Mercados e mercearias","Eletrônicos","Papelaria","Farmácia","Pet shop","Roupas","Informática","Materiais de construção","Cosméticos e perfumaria","Autopeças e acessórios"]',1),
  ('11000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Qual produto você está procurando?','short_text',null,2),
  ('11000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Quanto pretende gastar aproximadamente?','single_choice','["Até R$ 50","R$ 51 a R$ 150","R$ 151 a R$ 500","Mais de R$ 500"]',3),
  ('11000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Quão urgente é essa compra?','scale','{"min":1,"max":5}',4),
  ('12000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','O que mais influencia sua escolha de uma loja?','single_choice','["Preço","Proximidade","Atendimento","Variedade","Confiança"]',1),
  ('12000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Você prefere comprar perto de casa?','single_choice','["Sempre","Na maioria das vezes","Às vezes","Raramente"]',2),
  ('12000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Quais categorias você mais compra localmente?','multiple_choice','["Mercados e mercearias","Farmácia","Pet shop","Roupas","Papelaria","Materiais de construção"]',3)
on conflict (id) do update set pergunta=excluded.pergunta, tipo=excluded.tipo, opcoes=excluded.opcoes, ordem=excluded.ordem;

-- Remoção dos dados demonstrativos:
-- delete from public.questionnaires where id in
-- ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
