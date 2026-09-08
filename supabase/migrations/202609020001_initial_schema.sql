-- MarketPulse Local — schema inicial, gatilhos e Row Level Security.
create extension if not exists pgcrypto;

create type public.user_role as enum ('consumer', 'merchant', 'admin');
create type public.merchant_verification_status as enum ('pending', 'verified', 'rejected');
create type public.product_status as enum ('available', 'low_stock', 'unavailable');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  email text not null,
  role public.user_role not null default 'consumer',
  cidade text,
  bairro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  nome_fantasia text not null,
  razao_social text,
  cnpj text unique,
  endereco text not null,
  cidade text not null,
  bairro text not null,
  categoria text not null,
  horario_funcionamento jsonb not null default '{}'::jsonb,
  telefone text,
  whatsapp text,
  email text not null,
  redes_sociais jsonb not null default '{}'::jsonb,
  verification_status public.merchant_verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  nome text not null,
  categoria text not null,
  marca text,
  quantidade integer not null default 0 check (quantidade >= 0),
  status public.product_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.search_events (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid references public.profiles(id) on delete set null,
  termo text not null,
  categoria text,
  cidade text,
  bairro text,
  created_at timestamptz not null default now()
);

create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  ativo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questionnaire_questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  pergunta text not null,
  tipo text not null,
  opcoes jsonb,
  ordem integer not null check (ordem >= 0),
  unique (questionnaire_id, ordem),
  unique (id, questionnaire_id)
);

create table public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  question_id uuid not null references public.questionnaire_questions(id) on delete cascade,
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  resposta jsonb not null,
  cidade text,
  bairro text,
  created_at timestamptz not null default now(),
  unique (question_id, consumer_id)
);

alter table public.questionnaire_responses add constraint response_question_belongs_to_questionnaire
foreign key (question_id, questionnaire_id)
references public.questionnaire_questions(id, questionnaire_id) on delete cascade;

create index merchants_location_idx on public.merchants (cidade, bairro);
create index merchants_category_idx on public.merchants (categoria);
create index products_merchant_idx on public.products (merchant_id);
create index products_search_idx on public.products (categoria, status);
create index search_events_aggregation_idx on public.search_events (cidade, bairro, categoria, created_at);
create index responses_aggregation_idx on public.questionnaire_responses (questionnaire_id, cidade, bairro, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger merchants_set_updated_at before update on public.merchants
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

-- O role vindo do cadastro público é explicitamente limitado a consumer/merchant.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_role public.user_role;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' = 'merchant' then 'merchant'::public.user_role
    else 'consumer'::public.user_role
  end;
  insert into public.profiles (id, nome, email, role, cidade, bairro)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    requested_role,
    nullif(trim(new.raw_user_meta_data ->> 'cidade'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'bairro'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- SECURITY DEFINER evita recursão nas policies de profiles.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.owns_merchant(target_merchant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.merchants where id = target_merchant_id and owner_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.owns_merchant(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_merchant(uuid) to authenticated;

create or replace function public.protect_profile_authorization_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.email is distinct from old.email) and not public.is_admin() then
    raise exception 'Somente administradores podem alterar email ou role do perfil.';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_authorization before update on public.profiles
for each row execute function public.protect_profile_authorization_fields();

create or replace function public.protect_merchant_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verification_status is distinct from old.verification_status and not public.is_admin() then
    raise exception 'Somente administradores podem alterar o status de verificação.';
  end if;
  return new;
end;
$$;

create trigger merchants_protect_verification before update on public.merchants
for each row execute function public.protect_merchant_verification();

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.products enable row level security;
alter table public.search_events enable row level security;
alter table public.questionnaires enable row level security;
alter table public.questionnaire_questions enable row level security;
alter table public.questionnaire_responses enable row level security;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.merchants, public.products to authenticated;
grant select, insert on public.search_events to authenticated;
grant select, insert, update, delete on public.questionnaires, public.questionnaire_questions, public.questionnaire_responses to authenticated;

create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "merchants_read_public_or_owner_admin" on public.merchants for select to authenticated
using (verification_status = 'verified' or owner_id = auth.uid() or public.is_admin());
create policy "merchants_insert_owner" on public.merchants for insert to authenticated
with check (owner_id = auth.uid() and (select role from public.profiles where id = auth.uid()) = 'merchant');
create policy "merchants_update_owner_or_admin" on public.merchants for update to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());
create policy "merchants_delete_admin" on public.merchants for delete to authenticated
using (public.is_admin());

create policy "products_read_public_or_owner_admin" on public.products for select to authenticated
using (
  public.owns_merchant(merchant_id) or public.is_admin() or
  exists(select 1 from public.merchants m where m.id = merchant_id and m.verification_status = 'verified')
);
create policy "products_insert_owner" on public.products for insert to authenticated
with check (public.owns_merchant(merchant_id));
create policy "products_update_owner_or_admin" on public.products for update to authenticated
using (public.owns_merchant(merchant_id) or public.is_admin())
with check (public.owns_merchant(merchant_id) or public.is_admin());
create policy "products_delete_owner_or_admin" on public.products for delete to authenticated
using (public.owns_merchant(merchant_id) or public.is_admin());

create policy "search_events_insert_consumer" on public.search_events for insert to authenticated
with check (consumer_id = auth.uid() and (select role from public.profiles where id = auth.uid()) = 'consumer');
create policy "search_events_select_own_or_admin" on public.search_events for select to authenticated
using (consumer_id = auth.uid() or public.is_admin());

create policy "active_questionnaires_read" on public.questionnaires for select to authenticated
using (ativo or public.is_admin());
create policy "questionnaires_admin_all" on public.questionnaires for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "active_questions_read" on public.questionnaire_questions for select to authenticated
using (exists(select 1 from public.questionnaires q where q.id = questionnaire_id and q.ativo) or public.is_admin());
create policy "questions_admin_all" on public.questionnaire_questions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "responses_insert_own" on public.questionnaire_responses for insert to authenticated
with check (
  consumer_id = auth.uid() and
  (select role from public.profiles where id = auth.uid()) = 'consumer' and
  exists(select 1 from public.questionnaires q where q.id = questionnaire_id and q.ativo)
);
create policy "responses_select_own_or_admin" on public.questionnaire_responses for select to authenticated
using (consumer_id = auth.uid() or public.is_admin());
create policy "responses_update_own" on public.questionnaire_responses for update to authenticated
using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());
create policy "responses_delete_admin" on public.questionnaire_responses for delete to authenticated
using (public.is_admin());

-- Views agregadas poderão ser adicionadas em migrations futuras. Não conceda acesso
-- comercial às tabelas search_events/questionnaire_responses com dados individuais.
