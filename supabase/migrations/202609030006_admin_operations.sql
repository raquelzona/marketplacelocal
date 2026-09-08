-- Etapa 8 — operações administrativas, moderação e auditoria.
create type public.product_moderation_status as enum ('active', 'hidden');

alter table public.products
  add column moderation_status public.product_moderation_status not null default 'active',
  add column moderation_reason text,
  add column moderated_at timestamptz,
  add column moderated_by uuid references public.profiles(id) on delete set null;

alter table public.merchants
  add column verification_reason text,
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index products_moderation_idx on public.products (moderation_status, status, merchant_id);

alter table public.audit_logs enable row level security;
grant select on public.audit_logs to authenticated;
create policy "audit_logs_admin_read" on public.audit_logs for select to authenticated using (public.is_admin());

create or replace function public.protect_product_moderation_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.moderation_status = 'hidden' and not public.is_admin() then
    raise exception 'hidden_product_cannot_be_changed';
  end if;
  if (new.moderation_status, new.moderation_reason, new.moderated_at, new.moderated_by)
    is distinct from (old.moderation_status, old.moderation_reason, old.moderated_at, old.moderated_by)
    and not public.is_admin()
  then raise exception 'admin_required_for_moderation'; end if;
  return new;
end;
$$;
create trigger products_protect_moderation before update on public.products
for each row execute function public.protect_product_moderation_fields();

create or replace function public.protect_merchant_verification_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.verification_reason, new.verified_at, new.verified_by)
    is distinct from (old.verification_reason, old.verified_at, old.verified_by)
    and not public.is_admin()
  then raise exception 'admin_required_for_verification'; end if;
  return new;
end;
$$;
create trigger merchants_protect_verification_metadata before update on public.merchants
for each row execute function public.protect_merchant_verification_fields();

drop policy "products_read_public_or_owner_admin" on public.products;
create policy "products_read_public_or_owner_admin" on public.products for select to authenticated
using (
  public.owns_merchant(merchant_id) or public.is_admin() or (
    moderation_status = 'active' and exists (
      select 1 from public.merchants m where m.id = merchant_id and m.verification_status = 'verified'
    )
  )
);

drop policy "products_delete_owner_or_admin" on public.products;
create policy "products_delete_owner_or_admin" on public.products for delete to authenticated
using (public.is_admin() or (public.owns_merchant(merchant_id) and moderation_status = 'active'));

create or replace function public.admin_set_merchant_status(
  p_merchant_id uuid,
  p_status public.merchant_verification_status,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous public.merchant_verification_status;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  select verification_status into v_previous from public.merchants where id = p_merchant_id for update;
  if not found then raise exception 'merchant_not_found'; end if;
  update public.merchants set
    verification_status = p_status,
    verification_reason = nullif(trim(p_reason), ''),
    verified_at = case when p_status = 'verified' then now() else null end,
    verified_by = auth.uid()
  where id = p_merchant_id;
  insert into public.audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'merchant.status_changed','merchant',p_merchant_id,
    jsonb_build_object('previous_status',v_previous,'new_status',p_status,'reason',nullif(trim(p_reason),'')));
end;
$$;

create or replace function public.admin_moderate_product(
  p_product_id uuid,
  p_status public.product_moderation_status,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous public.product_moderation_status;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  select moderation_status into v_previous from public.products where id = p_product_id for update;
  if not found then raise exception 'product_not_found'; end if;
  if p_status = 'hidden' and nullif(trim(p_reason), '') is null then raise exception 'reason_required'; end if;
  update public.products set moderation_status=p_status,moderation_reason=nullif(trim(p_reason),''),moderated_at=now(),moderated_by=auth.uid(),
    status=case when p_status='hidden' then 'unavailable' else status end
  where id=p_product_id;
  insert into public.audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'product.moderation_changed','product',p_product_id,
    jsonb_build_object('previous_status',v_previous,'new_status',p_status,'reason',nullif(trim(p_reason),'')));
end;
$$;

create or replace function public.admin_set_questionnaire_status(p_questionnaire_id uuid,p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous boolean; v_questions integer;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  select ativo into v_previous from public.questionnaires where id=p_questionnaire_id for update;
  if not found then raise exception 'questionnaire_not_found'; end if;
  select count(*) into v_questions from public.questionnaire_questions where questionnaire_id=p_questionnaire_id;
  if p_active and v_questions=0 then raise exception 'question_required'; end if;
  update public.questionnaires set ativo=p_active where id=p_questionnaire_id;
  if v_previous is distinct from p_active then
    insert into public.audit_logs(admin_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'questionnaire.status_changed','questionnaire',p_questionnaire_id,
      jsonb_build_object('previous_active',v_previous,'new_active',p_active));
  end if;
end;
$$;

create or replace function public.get_admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  return jsonb_build_object(
    'consumers',(select count(*) from public.profiles where role='consumer'),
    'merchants',(select count(*) from public.profiles where role='merchant'),
    'pending_merchants',(select count(*) from public.merchants where verification_status='pending'),
    'products',(select count(*) from public.products),
    'searches',(select count(*) from public.search_events),
    'active_questionnaires',(select count(*) from public.questionnaires where ativo),
    'submissions',(select count(*) from public.questionnaire_submissions),
    'active_cities',(select count(distinct lower(cidade)) from public.profiles where cidade is not null and trim(cidade)<>'')
  );
end;
$$;

create or replace function public.get_admin_platform_metrics(p_period_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if p_period_days not in (7,30,90) then raise exception 'invalid_period'; end if;
  select jsonb_build_object(
    'searches_by_day',coalesce((select jsonb_agg(jsonb_build_object('date',day,'count',total) order by day) from (
      select
  created_at::date AS event_day,
  count(*) AS total
from public.search_events
where created_at >= now() - make_interval(days => p_period_days)
group by created_at::date
    ) x),'[]'::jsonb),
    'top_categories',coalesce((select jsonb_agg(jsonb_build_object('label',categoria,'count',total) order by total desc) from (
      select categoria,count(*) total from public.search_events where created_at>=now()-make_interval(days=>p_period_days) and categoria is not null group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'active_cities',coalesce((select jsonb_agg(jsonb_build_object('label',cidade,'count',total) order by total desc) from (
      select cidade,count(*) total from public.search_events where created_at>=now()-make_interval(days=>p_period_days) and cidade is not null group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'submissions',(select count(*) from public.questionnaire_submissions where completed_at>=now()-make_interval(days=>p_period_days)),
    'users_current',(select count(*) from public.profiles where created_at>=now()-make_interval(days=>p_period_days)),
    'users_previous',(select count(*) from public.profiles where created_at>=now()-make_interval(days=>p_period_days*2) and created_at<now()-make_interval(days=>p_period_days))
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.admin_set_merchant_status(uuid,public.merchant_verification_status,text) from public;
revoke all on function public.admin_moderate_product(uuid,public.product_moderation_status,text) from public;
revoke all on function public.admin_set_questionnaire_status(uuid,boolean) from public;
revoke all on function public.get_admin_dashboard() from public;
revoke all on function public.get_admin_platform_metrics(integer) from public;
grant execute on function public.admin_set_merchant_status(uuid,public.merchant_verification_status,text) to authenticated;
grant execute on function public.admin_moderate_product(uuid,public.product_moderation_status,text) to authenticated;
grant execute on function public.admin_set_questionnaire_status(uuid,boolean) to authenticated;
grant execute on function public.get_admin_dashboard() to authenticated;
grant execute on function public.get_admin_platform_metrics(integer) to authenticated;
