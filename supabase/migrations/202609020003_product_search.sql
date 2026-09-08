-- Etapa 5 — busca pública paginada e índices de apoio.
create extension if not exists pg_trgm;

create index if not exists products_name_trgm_idx
on public.products using gin (lower(nome) gin_trgm_ops);

create index if not exists products_brand_trgm_idx
on public.products using gin (lower(marca) gin_trgm_ops)
where marca is not null;

create index if not exists products_public_filters_idx
on public.products (status, categoria, merchant_id);

create index if not exists merchants_public_location_idx
on public.merchants (verification_status, lower(cidade), lower(bairro));

create or replace function public.search_public_products(
  p_term text default null,
  p_category text default null,
  p_brand text default null,
  p_city text default null,
  p_neighborhood text default null,
  p_status public.product_status default null,
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  nome text,
  categoria text,
  marca text,
  quantidade integer,
  status public.product_status,
  merchant_id uuid,
  merchant_name text,
  merchant_city text,
  merchant_neighborhood text,
  merchant_verification_status public.merchant_verification_status,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.nome,
    p.categoria,
    p.marca,
    p.quantidade,
    p.status,
    m.id,
    m.nome_fantasia,
    m.cidade,
    m.bairro,
    m.verification_status,
    count(*) over()
  from public.products p
  join public.merchants m on m.id = p.merchant_id
  where m.verification_status = 'verified'
    and (p_term is null or lower(p.nome) like '%' || lower(p_term) || '%'
      or lower(coalesce(p.marca, '')) like '%' || lower(p_term) || '%'
      or lower(p.categoria) like '%' || lower(p_term) || '%')
    and (p_category is null or lower(p.categoria) = lower(p_category))
    and (p_brand is null or lower(coalesce(p.marca, '')) = lower(p_brand))
    and (p_city is null or lower(m.cidade) = lower(p_city))
    and (p_neighborhood is null or lower(m.bairro) = lower(p_neighborhood))
    and (p_status is null or p.status = p_status)
  order by
    case when p_term is not null and lower(p.nome) = lower(p_term) then 0 else 1 end,
    p.nome,
    m.nome_fantasia
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.search_public_products(text,text,text,text,text,public.product_status,integer,integer) from public;
grant execute on function public.search_public_products(text,text,text,text,text,public.product_status,integer,integer) to authenticated;

comment on function public.search_public_products is
'Busca paginada de produtos de lojas verificadas. SECURITY INVOKER mantém RLS como barreira principal.';
