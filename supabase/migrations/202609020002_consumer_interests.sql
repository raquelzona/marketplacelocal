-- Etapa 3 — preferências do consumidor.
alter table public.profiles
add column interests text[] not null default '{}'::text[];

alter table public.profiles
add constraint profiles_interests_limit check (cardinality(interests) <= 10);

comment on column public.profiles.interests is
'Categorias declaradas pelo usuário; privadas pela RLS de profiles e usadas somente para personalização.';

create index profiles_interests_gin_idx on public.profiles using gin (interests);
