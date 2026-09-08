-- MARKETPULSE LOCAL — SOMENTE DESENVOLVIMENTO/DEMONSTRAÇÃO.
-- Nunca execute em produção. Requer migrations 001-009 e os dois seeds anteriores.
-- Este arquivo não insere nem altera auth.users ou public.profiles. Contas reais
-- são criadas separadamente pelo Supabase Auth. Lojas demo só são inseridas para
-- perfis merchant existentes que ainda não sejam proprietários de uma empresa.

with eligible_owners as (
  select p.id, row_number() over (order by p.created_at, p.id) as position
  from public.profiles p
  where p.role = 'merchant'
    and not exists (select 1 from public.merchants m where m.owner_id = p.id)
  limit 3
), demo_merchants as (
  select * from (values
    (1::bigint,'31000000-0000-4000-8000-000000000003'::uuid,'Mercado Bairro Demo','Rua Pamplona, 120','São Paulo','Bela Vista','Mercados e mercearias','{"resumo":"Todos os dias, 8h às 20h"}'::jsonb,'(11) 3000-3000','mercado.demo@marketpulse.local','pending'::public.merchant_verification_status,null::text,-23.5614::float8,-46.6559::float8,'basic'::public.merchant_plan,false),
    (2::bigint,'31000000-0000-4000-8000-000000000004'::uuid,'Tech Local Demo','Rua da Tecnologia, 45','São Paulo','Centro','Informática','{"resumo":"Segunda a sábado, 9h às 18h"}'::jsonb,'(11) 3000-4000','tech.demo@marketpulse.local','rejected'::public.merchant_verification_status,'Cadastro demonstrativo com documento pendente.',-23.5505,-46.6333,'pro',false),
    (3::bigint,'31000000-0000-4000-8000-000000000005'::uuid,'Papelaria Liberdade Demo','Avenida Liberdade, 80','São Paulo','Liberdade','Papelaria','{"resumo":"Segunda a sexta, 8h às 18h"}'::jsonb,'(11) 3000-5000','papelaria.demo@marketpulse.local','verified'::public.merchant_verification_status,null::text,-23.5553,-46.6358,'pro',true)
  ) as d(position,id,nome_fantasia,endereco,cidade,bairro,categoria,horario_funcionamento,telefone,email,verification_status,verification_reason,latitude,longitude,plan,sponsored)
)
insert into public.merchants (id,owner_id,nome_fantasia,endereco,cidade,bairro,categoria,horario_funcionamento,telefone,email,verification_status,verification_reason,latitude,longitude,plan,sponsored)
select d.id,o.id,d.nome_fantasia,d.endereco,d.cidade,d.bairro,d.categoria,d.horario_funcionamento,d.telefone,d.email,d.verification_status,d.verification_reason,d.latitude,d.longitude,d.plan,d.sponsored
from demo_merchants d join eligible_owners o using (position)
-- Não atualize status protegidos ao repetir o seed.
on conflict do nothing;

-- Completa coordenadas das duas lojas criadas pelo seed de inteligência. Não
-- altera verificação, plano ou patrocínio protegidos.
update public.merchants set latitude=-23.5432,longitude=-46.6382 where id='31000000-0000-4000-8000-000000000001';
update public.merchants set latitude=-23.5450,longitude=-46.6420 where id='31000000-0000-4000-8000-000000000002';

-- Campanha pública idempotente. Ela reutiliza um questionário demo existente e
-- não depende de contas/perfis de consumidores.
insert into public.campaigns(id,title,description,questionnaire_id,target_city,target_neighborhood,starts_at,ends_at,active,slug)
select '81000000-0000-4000-8000-000000000001','Intenções de compra na Bela Vista','Pesquisa pública de demonstração para validar a coleta por campanha.',q.id,'São Paulo','Bela Vista',now()-interval '1 day',now()+interval '90 days',true,'intencoes-bela-vista-demo'
from public.questionnaires q order by q.created_at limit 1
on conflict do nothing;

insert into public.campaign_events(id,campaign_id,event_type,created_at)
select ('82000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'81000000-0000-4000-8000-000000000001',case when n<=12 then 'view' else 'completion' end,now()-make_interval(hours=>n)
from generate_series(1,18) n where exists(select 1 from public.campaigns where id='81000000-0000-4000-8000-000000000001')
on conflict(id) do nothing;

insert into public.campaign_events(id,campaign_id,event_type,utm_source,utm_medium,utm_campaign,created_at)
select d.id,'81000000-0000-4000-8000-000000000001',d.event_type,d.utm_source,'social','marketpulse-demo',now()-d.age
from(values
 ('85000000-0000-4000-8000-000000000001'::uuid,'view','instagram',interval '8 hours'),
 ('85000000-0000-4000-8000-000000000002'::uuid,'completion','instagram',interval '7 hours'),
 ('85000000-0000-4000-8000-000000000003'::uuid,'view','tiktok',interval '6 hours'),
 ('85000000-0000-4000-8000-000000000004'::uuid,'completion','google',interval '5 hours')
)d(id,event_type,utm_source,age) where exists(select 1 from public.campaigns where id='81000000-0000-4000-8000-000000000001')
on conflict(id) do nothing;

insert into public.questionnaire_submissions(id,questionnaire_id,consumer_id,cidade,bairro,source,campaign_id,completed_at)
select ('83000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,c.questionnaire_id,null,'São Paulo','Bela Vista','campaign',c.id,now()-make_interval(hours=>n)
from public.campaigns c cross join generate_series(1,6) n where c.id='81000000-0000-4000-8000-000000000001'
on conflict(id) do nothing;

insert into public.questionnaire_responses(id,submission_id,questionnaire_id,question_id,consumer_id,resposta,cidade,bairro,created_at)
select ('84000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,s.id,s.questionnaire_id,q.id,null,
 case when q.tipo in ('single_choice','multiple_choice') then case when q.tipo='multiple_choice' then jsonb_build_array(q.opcoes->0) else q.opcoes->0 end when q.tipo='scale' then '4'::jsonb else '"Compra local demo"'::jsonb end,
 s.cidade,s.bairro,s.completed_at
from public.questionnaire_submissions s cross join lateral(select * from public.questionnaire_questions where questionnaire_id=s.questionnaire_id order by ordem limit 1) q
cross join lateral(select right(s.id::text,12)::bigint n) x where s.campaign_id='81000000-0000-4000-8000-000000000001'
on conflict(id) do nothing;

insert into public.products (id,merchant_id,nome,categoria,marca,quantidade,status)
select d.* from (values
 ('32000000-0000-4000-8000-000000000002'::uuid,'31000000-0000-4000-8000-000000000001'::uuid,'Petisco natural para cães','Pet shop','NutriPet',18,'available'::public.product_status),
 ('32000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003','Arroz tipo 1','Mercados e mercearias','Colheita',2,'low_stock'),
 ('32000000-0000-4000-8000-000000000004','31000000-0000-4000-8000-000000000003','Leite integral','Mercados e mercearias','Fazenda Demo',0,'unavailable'),
 ('32000000-0000-4000-8000-000000000005','31000000-0000-4000-8000-000000000004','Notebook básico','Informática','LocalTech',4,'available'),
 ('32000000-0000-4000-8000-000000000006','31000000-0000-4000-8000-000000000005','Caderno universitário','Papelaria','Escreva',25,'available'),
 ('32000000-0000-4000-8000-000000000007','31000000-0000-4000-8000-000000000005','Caneta azul','Papelaria','Escreva',3,'low_stock')
) as d(id,merchant_id,nome,categoria,marca,quantidade,status)
where exists (select 1 from public.merchants m where m.id=d.merchant_id::uuid)
-- Um produto pode ter sido moderado após a primeira execução. DO NOTHING evita
-- contornar ou acionar a proteção administrativa durante uma reexecução.
on conflict do nothing;

insert into public.product_alerts(id,consumer_id,search_term,product_id,cidade,bairro,active,created_at)
select d.id,d.consumer_id,d.search_term,null,'São Paulo','Centro',true,now()-d.age from(values
 ('86000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'ração',interval '3 days'),
 ('86000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'perfume',interval '2 days'),
 ('86000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'perfume',interval '1 day'),
 ('86000000-0000-4000-8000-000000000004'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'perfume',interval '4 hours')
)d(id,consumer_id,search_term,age) where exists(select 1 from public.profiles p where p.id=d.consumer_id)
on conflict(id) do nothing;

-- As contas interativas, inclusive o admin real, são criadas separadamente.
-- Se já houver um admin, associe a ele os logs demo. Caso contrário, pule esta
-- parte; basta repetir o arquivo depois de criar/promover a conta administrativa.
do $$
declare v_admin_id uuid;
begin
  select id into v_admin_id
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  if v_admin_id is not null then
    insert into public.audit_logs (id,admin_id,action,entity_type,entity_id,metadata,created_at)
    values
      ('91000000-0000-4000-8000-000000000001',v_admin_id,'merchant.status_changed','merchant','31000000-0000-4000-8000-000000000004','{"previous_status":"pending","new_status":"rejected","reason":"Registro de demonstração"}',now()-interval '2 days'),
      ('91000000-0000-4000-8000-000000000002',v_admin_id,'merchant.status_changed','merchant','31000000-0000-4000-8000-000000000005','{"previous_status":"pending","new_status":"verified"}',now()-interval '1 day')
    on conflict (id) do nothing;
  end if;
end;
$$;

-- RESET: remove primeiro os eventos/submissões conforme os seeds anteriores e então:
-- delete from public.audit_logs where id::text like '91000000-0000-4000-8000-%';
