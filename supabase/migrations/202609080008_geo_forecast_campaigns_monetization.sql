-- Nova etapa — geolocalização, previsão interpretável, campanhas e planos demo.
create type public.merchant_plan as enum ('basic','pro');
create type public.submission_source as enum ('internal','campaign');

alter table public.merchants
  add column latitude double precision,
  add column longitude double precision,
  add column plan public.merchant_plan not null default 'basic',
  add column sponsored boolean not null default false,
  add constraint merchants_valid_coordinates check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  );

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  description text check (char_length(description) <= 1200),
  questionnaire_id uuid not null references public.questionnaires(id) on delete restrict,
  target_city text,
  target_neighborhood text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default false,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('view','completion')),
  created_at timestamptz not null default now()
);

alter table public.questionnaire_submissions alter column consumer_id drop not null;
alter table public.questionnaire_submissions
  add column source public.submission_source not null default 'internal',
  add column campaign_id uuid references public.campaigns(id) on delete set null,
  drop constraint questionnaire_submissions_questionnaire_id_consumer_id_key;
create unique index questionnaire_internal_submission_unique
  on public.questionnaire_submissions(questionnaire_id,consumer_id) where consumer_id is not null;
alter table public.questionnaire_responses alter column consumer_id drop not null;

create index merchants_geo_idx on public.merchants(latitude,longitude) where latitude is not null;
create index campaigns_public_idx on public.campaigns(active,starts_at,ends_at);
create index campaign_events_aggregate_idx on public.campaign_events(campaign_id,event_type,created_at);
create index search_events_forecast_idx on public.search_events(created_at,termo,categoria,cidade,bairro);
create trigger campaigns_set_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;
alter table public.campaign_events enable row level security;
grant select on public.campaigns to anon,authenticated;
grant select,insert,update,delete on public.campaigns to authenticated;
create policy campaigns_public_read on public.campaigns for select to anon,authenticated
using (active and now() between starts_at and ends_at);
create policy campaigns_admin_all on public.campaigns for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select on public.campaign_events to authenticated;
create policy campaign_events_admin_read on public.campaign_events for select to authenticated using(public.is_admin());

create or replace function public.protect_merchant_commercial_fields()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.plan,new.sponsored) is distinct from (old.plan,old.sponsored) and not public.is_admin()
  then raise exception 'admin_required_for_plan'; end if;
  return new;
end;$$;
create trigger merchants_protect_commercial before update on public.merchants
for each row execute function public.protect_merchant_commercial_fields();

create or replace function public.admin_set_merchant_plan(p_merchant_id uuid,p_plan public.merchant_plan,p_sponsored boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_old_plan public.merchant_plan;v_old_sponsored boolean;
begin
  if not public.is_admin() then raise exception 'admin_required';end if;
  select plan,sponsored into v_old_plan,v_old_sponsored from public.merchants where id=p_merchant_id for update;
  if not found then raise exception 'merchant_not_found';end if;
  update public.merchants set plan=p_plan,sponsored=p_sponsored where id=p_merchant_id;
  insert into public.audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'merchant.commercial_changed','merchant',p_merchant_id,
    jsonb_build_object('previous_plan',v_old_plan,'new_plan',p_plan,'previous_sponsored',v_old_sponsored,'new_sponsored',p_sponsored));
end;$$;

create or replace function public.get_public_campaign(p_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('id',c.id,'title',c.title,'description',c.description,'questionnaire_id',q.id,
 'city',c.target_city,'neighborhood',c.target_neighborhood,'questions',coalesce((select jsonb_agg(jsonb_build_object(
 'id',qq.id,'pergunta',qq.pergunta,'tipo',qq.tipo,'opcoes',qq.opcoes,'ordem',qq.ordem) order by qq.ordem)
 from public.questionnaire_questions qq where qq.questionnaire_id=q.id),'[]'::jsonb))
from public.campaigns c join public.questionnaires q on q.id=c.questionnaire_id
where c.slug=p_slug and c.active and now() between c.starts_at and c.ends_at;
$$;

create or replace function public.register_campaign_view(p_slug text)
returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 select id into v_id from public.campaigns where slug=p_slug and active and now() between starts_at and ends_at;
 if v_id is not null then insert into public.campaign_events(campaign_id,event_type) values(v_id,'view');end if;
end;$$;

create or replace function public.submit_public_campaign(p_slug text,p_answers jsonb,p_city text default null,p_neighborhood text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_campaign public.campaigns%rowtype;v_question public.questionnaire_questions%rowtype;v_answer jsonb;v_submission uuid;v_count int;
begin
 select * into v_campaign from public.campaigns where slug=p_slug and active and now() between starts_at and ends_at;
 if not found then raise exception 'campaign_unavailable';end if;
 select count(*) into v_count from public.questionnaire_questions where questionnaire_id=v_campaign.questionnaire_id;
 if v_count=0 or jsonb_typeof(p_answers)<>'object' or (select count(*) from jsonb_object_keys(p_answers))<>v_count then raise exception 'incomplete_answers';end if;
 for v_question in select * from public.questionnaire_questions where questionnaire_id=v_campaign.questionnaire_id loop
  v_answer:=p_answers->v_question.id::text;
  if v_answer is null or v_answer='null'::jsonb then raise exception 'incomplete_answers';end if;
  case v_question.tipo
   when 'single_choice' then if jsonb_typeof(v_answer)<>'string' or not(v_question.opcoes@>jsonb_build_array(v_answer)) then raise exception 'invalid_answer';end if;
   when 'multiple_choice' then if jsonb_typeof(v_answer)<>'array' or jsonb_array_length(v_answer)=0 or exists(select 1 from jsonb_array_elements(v_answer) a where not(v_question.opcoes@>jsonb_build_array(a))) then raise exception 'invalid_answer';end if;
   when 'short_text' then if jsonb_typeof(v_answer)<>'string' or length(trim(v_answer#>>'{}')) not between 1 and 300 then raise exception 'invalid_answer';end if;
   when 'scale' then if jsonb_typeof(v_answer)<>'number' then raise exception 'invalid_answer';end if;
   else raise exception 'invalid_answer';
  end case;
 end loop;
 insert into public.questionnaire_submissions(questionnaire_id,consumer_id,cidade,bairro,source,campaign_id)
 values(v_campaign.questionnaire_id,null,coalesce(nullif(trim(p_city),''),v_campaign.target_city,''),coalesce(nullif(trim(p_neighborhood),''),v_campaign.target_neighborhood,''),'campaign',v_campaign.id)
 returning id into v_submission;
 insert into public.questionnaire_responses(submission_id,questionnaire_id,question_id,consumer_id,resposta,cidade,bairro)
 select v_submission,v_campaign.questionnaire_id,q.id,null,p_answers->q.id::text,
  coalesce(nullif(trim(p_city),''),v_campaign.target_city,''),coalesce(nullif(trim(p_neighborhood),''),v_campaign.target_neighborhood,'')
 from public.questionnaire_questions q where q.questionnaire_id=v_campaign.questionnaire_id;
 insert into public.campaign_events(campaign_id,event_type) values(v_campaign.id,'completion');
 return v_submission;
end;$$;

create or replace function public.get_merchant_demand_forecast(p_scope text default 'neighborhood')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_m public.merchants%rowtype;v_result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='merchant') then raise exception 'merchant_required';end if;
 select * into v_m from public.merchants where owner_id=auth.uid();if not found then raise exception 'merchant_company_required';end if;
 if v_m.plan<>'pro' then return jsonb_build_object('available',false,'reason','pro_required','items','[]'::jsonb);end if;
 with weeks as(select generate_series(0,7) n),terms as(
  select termo,count(*) total from public.search_events where created_at>=now()-interval '56 days' and lower(cidade)=lower(v_m.cidade)
   and(p_scope='city' or lower(bairro)=lower(v_m.bairro)) group by termo having count(*)>=8 order by total desc limit 8),
 series as(select t.termo,w.n,count(se.id)::numeric demand from terms t cross join weeks w left join public.search_events se on se.termo=t.termo
  and se.created_at>=date_trunc('day',now())-make_interval(days=>(w.n+1)*7) and se.created_at<date_trunc('day',now())-make_interval(days=>w.n*7)
  and lower(se.cidade)=lower(v_m.cidade) and(p_scope='city' or lower(se.bairro)=lower(v_m.bairro)) group by t.termo,w.n),
 stats as(select termo,sum(demand)::int points,avg(demand) avg_week,regr_slope(demand,7-n) slope,count(*) weeks from series group by termo)
 select jsonb_build_object('available',true,'method','8_week_linear_trend','items',coalesce(jsonb_agg(jsonb_build_object(
  'term',termo,'current',round(avg_week,1),'forecast_7',greatest(0,round(avg_week+coalesce(slope,0),1)),
  'forecast_30',case when points>=20 then greatest(0,round((avg_week+coalesce(slope,0)*2.5)*4.2857,1)) end,
  'growth_pct',case when avg_week=0 then null else round(coalesce(slope,0)*100/avg_week,1) end,'data_points',points,
  'confidence',case when points>=40 then 'high' when points>=20 then 'medium' else 'low' end) order by points desc),'[]'::jsonb)) into v_result from stats;
 return coalesce(v_result,jsonb_build_object('available',true,'method','8_week_linear_trend','items','[]'::jsonb));
end;$$;

revoke all on function public.admin_set_merchant_plan(uuid,public.merchant_plan,boolean) from public;
revoke all on function public.get_public_campaign(text) from public;
revoke all on function public.register_campaign_view(text) from public;
revoke all on function public.submit_public_campaign(text,jsonb,text,text) from public;
revoke all on function public.get_merchant_demand_forecast(text) from public;
grant execute on function public.admin_set_merchant_plan(uuid,public.merchant_plan,boolean) to authenticated;
grant execute on function public.get_public_campaign(text) to anon,authenticated;
grant execute on function public.register_campaign_view(text) to anon,authenticated;
grant execute on function public.submit_public_campaign(text,jsonb,text,text) to anon,authenticated;
grant execute on function public.get_merchant_demand_forecast(text) to authenticated;
