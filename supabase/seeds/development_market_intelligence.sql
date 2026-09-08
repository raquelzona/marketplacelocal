-- SOMENTE DESENVOLVIMENTO/DEMONSTRAÇÃO.
-- Requer migrations 001-005 e development_questionnaires.sql.
-- Localidade da demonstração: São Paulo / Centro.

insert into auth.users (instance_id,id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nome',nome,'role',role,'cidade','São Paulo','bairro','Centro'), now(), now()
from (values
  ('20000000-0000-4000-8000-000000000001'::uuid,'ana.demo@marketpulse.local','Ana Demo','consumer'),
  ('20000000-0000-4000-8000-000000000002'::uuid,'bruno.demo@marketpulse.local','Bruno Demo','consumer'),
  ('20000000-0000-4000-8000-000000000003'::uuid,'carla.demo@marketpulse.local','Carla Demo','consumer'),
  ('20000000-0000-4000-8000-000000000004'::uuid,'diego.demo@marketpulse.local','Diego Demo','consumer'),
  ('20000000-0000-4000-8000-000000000005'::uuid,'elisa.demo@marketpulse.local','Elisa Demo','consumer'),
  ('20000000-0000-4000-8000-000000000006'::uuid,'fabio.demo@marketpulse.local','Fábio Demo','consumer'),
  ('30000000-0000-4000-8000-000000000001'::uuid,'pet.demo@marketpulse.local','Pet Central Demo','merchant'),
  ('30000000-0000-4000-8000-000000000002'::uuid,'beleza.demo@marketpulse.local','Beleza Centro Demo','merchant')
) as demo(id,email,nome,role)
on conflict (id) do nothing;

update public.profiles set interests=array['Pet shop','Cosméticos e perfumaria','Informática']
where id::text like '20000000-0000-4000-8000-%';

insert into public.merchants (id,owner_id,nome_fantasia,endereco,cidade,bairro,categoria,horario_funcionamento,telefone,email,verification_status)
values
 ('31000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Pet Central Demo','Rua da Demo, 10','São Paulo','Centro','Pet shop','{"resumo":"Segunda a sábado, 9h às 18h"}','(11) 3000-1000','pet.demo@marketpulse.local','verified'),
 ('31000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Beleza Centro Demo','Avenida da Demo, 20','São Paulo','Centro','Cosméticos e perfumaria','{"resumo":"Segunda a sexta, 9h às 19h"}','(11) 3000-2000','beleza.demo@marketpulse.local','verified')
on conflict (id) do update set verification_status='verified';

insert into public.products (id,merchant_id,nome,categoria,marca,quantidade,status)
values ('32000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','Ração premium para cães','Pet shop','NutriPet',3,'low_stock')
on conflict (id) do update set quantidade=excluded.quantidade,status=excluded.status;

insert into public.products (id,merchant_id,nome,categoria,marca,quantidade,status)
select ('33000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'31000000-0000-4000-8000-000000000002',
  'Perfume demonstração '||n,'Cosméticos e perfumaria','Essência Local',10,'available'::public.product_status
from generate_series(1,8) n on conflict (id) do nothing;

delete from public.search_events where consumer_id::text like '20000000-0000-4000-8000-%';

insert into public.search_events (consumer_id,termo,categoria,cidade,bairro,created_at)
select ('20000000-0000-4000-8000-'||lpad(((n-1)%6+1)::text,12,'0'))::uuid,'ração','Pet shop','São Paulo','Centro',now()-(n||' hours')::interval from generate_series(1,12) n;
insert into public.search_events (consumer_id,termo,categoria,cidade,bairro,created_at)
select ('20000000-0000-4000-8000-'||lpad(((n-1)%6+1)::text,12,'0'))::uuid,'ração','Pet shop','São Paulo','Centro',now()-interval '8 days'-(n||' hours')::interval from generate_series(1,4) n;
insert into public.search_events (consumer_id,termo,categoria,cidade,bairro,created_at)
select ('20000000-0000-4000-8000-'||lpad(((n-1)%6+1)::text,12,'0'))::uuid,'perfume','Cosméticos e perfumaria','São Paulo','Centro',now()-(n||' hours')::interval from generate_series(1,4) n;
insert into public.search_events (consumer_id,termo,categoria,cidade,bairro,created_at)
select ('20000000-0000-4000-8000-'||lpad(((n-1)%6+1)::text,12,'0'))::uuid,'perfume','Cosméticos e perfumaria','São Paulo','Centro',now()-interval '8 days'-(n||' hours')::interval from generate_series(1,10) n;
insert into public.search_events (consumer_id,termo,categoria,cidade,bairro,created_at)
select ('20000000-0000-4000-8000-'||lpad(((n-1)%6+1)::text,12,'0'))::uuid,'notebook','Informática','São Paulo','Centro',now()-(n||' hours')::interval from generate_series(1,8) n;
insert into public.search_events (consumer_id,termo,categoria,cidade,bairro,created_at)
select ('20000000-0000-4000-8000-'||lpad(((n-1)%6+1)::text,12,'0'))::uuid,'ração','Pet shop','São Paulo','Centro',now()-interval '35 days'-(n||' hours')::interval from generate_series(1,3) n;
insert into public.search_events (consumer_id,termo,categoria,cidade,bairro,created_at)
select ('20000000-0000-4000-8000-'||lpad(((n-1)%6+1)::text,12,'0'))::uuid,'perfume','Cosméticos e perfumaria','São Paulo','Centro',now()-interval '35 days'-(n||' hours')::interval from generate_series(1,20) n;

delete from public.questionnaire_submissions where consumer_id::text like '20000000-0000-4000-8000-%';
insert into public.questionnaire_submissions (id,questionnaire_id,consumer_id,cidade,bairro,completed_at)
select ('40000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000002',
  ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'São Paulo','Centro',now()-interval '1 day'
from generate_series(1,6) n;

insert into public.questionnaire_responses (submission_id,questionnaire_id,question_id,consumer_id,resposta,cidade,bairro)
select s.id,s.questionnaire_id,q.id,s.consumer_id,
  case q.id
    when '12000000-0000-4000-8000-000000000001' then to_jsonb(case when right(s.consumer_id::text,1)::int<=4 then 'Preço' else 'Proximidade' end)
    when '12000000-0000-4000-8000-000000000002' then to_jsonb(case when right(s.consumer_id::text,1)::int<=5 then 'Sempre' else 'Às vezes' end)
    else '["Mercados e mercearias","Farmácia"]'::jsonb end,
  s.cidade,s.bairro
from public.questionnaire_submissions s
join public.questionnaire_questions q on q.questionnaire_id=s.questionnaire_id
where s.consumer_id::text like '20000000-0000-4000-8000-%'
on conflict (submission_id,question_id) do nothing;

-- REMOÇÃO/RESET DOS DADOS DE INTELIGÊNCIA:
-- delete from public.search_events where consumer_id::text like '20000000-0000-4000-8000-%';
-- delete from public.questionnaire_submissions where consumer_id::text like '20000000-0000-4000-8000-%';
-- delete from auth.users where id::text like '20000000-0000-4000-8000-%' or id::text like '30000000-0000-4000-8000-%';
