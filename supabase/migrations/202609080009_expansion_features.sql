-- Expansão final: alertas, atribuição agregável, páginas públicas e apoio ao mapa.
create table public.product_alerts (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  search_term text,
  product_id uuid references public.products(id) on delete cascade,
  cidade text not null,
  bairro text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((search_term is not null) <> (product_id is not null)),
  check (search_term is null or char_length(search_term) between 2 and 100)
);

create table public.alert_notifications (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.product_alerts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(alert_id,product_id)
);

create index product_alerts_owner_idx on public.product_alerts(consumer_id,active,created_at desc);
create index product_alerts_matching_idx on public.product_alerts(cidade,bairro,active);
create index alert_notifications_alert_idx on public.alert_notifications(alert_id,created_at desc);

alter table public.product_alerts enable row level security;
alter table public.alert_notifications enable row level security;
grant select,insert,update,delete on public.product_alerts to authenticated;
grant select,delete on public.alert_notifications to authenticated;
create policy alerts_own_all on public.product_alerts for all to authenticated
using(consumer_id=auth.uid()) with check(consumer_id=auth.uid());
create policy notifications_own_read on public.alert_notifications for select to authenticated
using(exists(select 1 from public.product_alerts a where a.id=alert_id and a.consumer_id=auth.uid()));
create policy notifications_own_delete on public.alert_notifications for delete to authenticated
using(exists(select 1 from public.product_alerts a where a.id=alert_id and a.consumer_id=auth.uid()));

create or replace function public.create_matches_for_alert(p_alert_id uuid)
returns void language sql security definer set search_path='' as $$
 insert into public.alert_notifications(alert_id,product_id,merchant_id)
 select a.id,p.id,m.id from public.product_alerts a
 join public.merchants m on lower(m.cidade)=lower(a.cidade) and lower(m.bairro)=lower(a.bairro) and m.verification_status='verified'
 join public.products p on p.merchant_id=m.id and p.status='available' and p.moderation_status='active'
 where a.id=p_alert_id and a.active and (a.product_id=p.id or (a.search_term is not null and
   (lower(p.nome) like '%'||lower(a.search_term)||'%' or lower(coalesce(p.marca,'')) like '%'||lower(a.search_term)||'%')))
 on conflict(alert_id,product_id) do nothing;
$$;
create or replace function public.match_new_alert() returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.create_matches_for_alert(new.id);return new;end;$$;
create trigger product_alerts_match_after_insert after insert on public.product_alerts for each row execute function public.match_new_alert();

create or replace function public.match_available_product() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='available' and new.moderation_status='active' and (tg_op='INSERT' or old.status<>'available') then
  insert into public.alert_notifications(alert_id,product_id,merchant_id)
  select a.id,new.id,new.merchant_id from public.product_alerts a join public.merchants m on m.id=new.merchant_id
  where a.active and lower(a.cidade)=lower(m.cidade) and lower(a.bairro)=lower(m.bairro)
   and (a.product_id=new.id or (a.search_term is not null and (lower(new.nome) like '%'||lower(a.search_term)||'%' or lower(coalesce(new.marca,'')) like '%'||lower(a.search_term)||'%')))
  on conflict(alert_id,product_id) do nothing;
 end if;return new;
end;$$;
create trigger products_match_alerts after insert or update of status on public.products for each row execute function public.match_available_product();

alter table public.campaign_events
 add column utm_source text,
 add column utm_medium text,
 add column utm_campaign text,
 add constraint campaign_utm_lengths check(char_length(coalesce(utm_source,''))<=80 and char_length(coalesce(utm_medium,''))<=80 and char_length(coalesce(utm_campaign,''))<=120);
create index campaign_events_source_idx on public.campaign_events(campaign_id,utm_source,event_type);

drop function public.register_campaign_view(text);
create function public.register_campaign_view(p_slug text,p_utm_source text default null,p_utm_medium text default null,p_utm_campaign text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
 select id into v_id from public.campaigns where slug=p_slug and active and now() between starts_at and ends_at;
 if v_id is not null then insert into public.campaign_events(campaign_id,event_type,utm_source,utm_medium,utm_campaign)
 values(v_id,'view',nullif(left(lower(trim(p_utm_source)),80),''),nullif(left(lower(trim(p_utm_medium)),80),''),nullif(left(trim(p_utm_campaign),120),''));end if;
end;$$;

drop function public.submit_public_campaign(text,jsonb,text,text);
create function public.submit_public_campaign(p_slug text,p_answers jsonb,p_city text default null,p_neighborhood text default null,p_utm_source text default null,p_utm_medium text default null,p_utm_campaign text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_campaign public.campaigns%rowtype;v_question public.questionnaire_questions%rowtype;v_answer jsonb;v_submission uuid;v_count int;
begin
 select * into v_campaign from public.campaigns where slug=p_slug and active and now() between starts_at and ends_at;if not found then raise exception 'campaign_unavailable';end if;
 select count(*) into v_count from public.questionnaire_questions where questionnaire_id=v_campaign.questionnaire_id;
 if v_count=0 or jsonb_typeof(p_answers)<>'object' or (select count(*) from jsonb_object_keys(p_answers))<>v_count then raise exception 'incomplete_answers';end if;
 for v_question in select * from public.questionnaire_questions where questionnaire_id=v_campaign.questionnaire_id loop
  v_answer:=p_answers->v_question.id::text;if v_answer is null or v_answer='null'::jsonb then raise exception 'incomplete_answers';end if;
  case v_question.tipo
   when 'single_choice' then if jsonb_typeof(v_answer)<>'string' or not(v_question.opcoes@>jsonb_build_array(v_answer)) then raise exception 'invalid_answer';end if;
   when 'multiple_choice' then if jsonb_typeof(v_answer)<>'array' or jsonb_array_length(v_answer)=0 or exists(select 1 from jsonb_array_elements(v_answer) a where not(v_question.opcoes@>jsonb_build_array(a))) then raise exception 'invalid_answer';end if;
   when 'short_text' then if jsonb_typeof(v_answer)<>'string' or length(trim(v_answer#>>'{}')) not between 1 and 300 then raise exception 'invalid_answer';end if;
   when 'scale' then if jsonb_typeof(v_answer)<>'number' then raise exception 'invalid_answer';end if;
   else raise exception 'invalid_answer';end case;
 end loop;
 insert into public.questionnaire_submissions(questionnaire_id,consumer_id,cidade,bairro,source,campaign_id)
 values(v_campaign.questionnaire_id,null,coalesce(nullif(trim(p_city),''),v_campaign.target_city,''),coalesce(nullif(trim(p_neighborhood),''),v_campaign.target_neighborhood,''),'campaign',v_campaign.id) returning id into v_submission;
 insert into public.questionnaire_responses(submission_id,questionnaire_id,question_id,consumer_id,resposta,cidade,bairro)
 select v_submission,v_campaign.questionnaire_id,q.id,null,p_answers->q.id::text,coalesce(nullif(trim(p_city),''),v_campaign.target_city,''),coalesce(nullif(trim(p_neighborhood),''),v_campaign.target_neighborhood,'') from public.questionnaire_questions q where q.questionnaire_id=v_campaign.questionnaire_id;
 insert into public.campaign_events(campaign_id,event_type,utm_source,utm_medium,utm_campaign) values(v_campaign.id,'completion',nullif(left(lower(trim(p_utm_source)),80),''),nullif(left(lower(trim(p_utm_medium)),80),''),nullif(left(trim(p_utm_campaign),120),''));return v_submission;
end;$$;

create or replace function public.get_public_merchant(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'name',m.nome_fantasia,'category',m.categoria,'address',m.endereco,'city',m.cidade,'neighborhood',m.bairro,'phone',m.telefone,'whatsapp',m.whatsapp,'email',m.email,'latitude',m.latitude,'longitude',m.longitude,'verified',true,'sponsored',m.sponsored,'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.nome,'category',p.categoria,'brand',p.marca,'status',p.status)) from public.products p where p.merchant_id=m.id and p.moderation_status='active'),'[]'::jsonb)) from public.merchants m where m.id=p_id and m.verification_status='verified';
$$;

create function public.get_admin_campaign_origins() returns table(source text,total bigint,completions bigint) language sql stable security definer set search_path='' as $$
 select case when coalesce(trim(utm_source),'')='' then 'direct' when lower(utm_source) in('instagram','tiktok','google') then lower(utm_source) else 'other' end,count(*),count(*) filter(where event_type='completion') from public.campaign_events where public.is_admin() group by 1 order by 2 desc;
$$;
create function public.get_admin_alert_aggregates() returns table(term text,total bigint,matches bigint) language sql stable security definer set search_path='' as $$
 select coalesce(a.search_term,p.nome),count(distinct a.id),count(distinct n.id) from public.product_alerts a left join public.products p on p.id=a.product_id left join public.alert_notifications n on n.alert_id=a.id where public.is_admin() group by 1 having count(*)>=3 order by 2 desc limit 20;
$$;

revoke all on function public.create_matches_for_alert(uuid),public.register_campaign_view(text,text,text,text),public.submit_public_campaign(text,jsonb,text,text,text,text,text),public.get_public_merchant(uuid),public.get_admin_campaign_origins(),public.get_admin_alert_aggregates() from public;
grant execute on function public.register_campaign_view(text,text,text,text),public.submit_public_campaign(text,jsonb,text,text,text,text,text),public.get_public_merchant(uuid) to anon,authenticated;
grant execute on function public.create_matches_for_alert(uuid) to authenticated;
grant execute on function public.get_admin_campaign_origins(),public.get_admin_alert_aggregates() to authenticated;
