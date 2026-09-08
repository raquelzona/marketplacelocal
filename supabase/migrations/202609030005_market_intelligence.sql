-- Etapa 7 — inteligência agregada e segura para o comerciante.
create index if not exists search_events_period_location_idx
on public.search_events (created_at desc, lower(cidade), lower(bairro), categoria);

create index if not exists submissions_period_location_idx
on public.questionnaire_submissions (completed_at desc, lower(cidade), lower(bairro), questionnaire_id);

create or replace function public.get_merchant_market_intelligence(
  p_period_days integer default 7,
  p_scope text default 'neighborhood'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_merchant public.merchants%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_period_days not in (7, 30, 90) then raise exception 'invalid_period'; end if;
  if p_scope not in ('neighborhood', 'city') then raise exception 'invalid_scope'; end if;
  if not exists(select 1 from public.profiles where id = auth.uid() and role = 'merchant')
  then raise exception 'merchant_required'; end if;

  select * into v_merchant from public.merchants where owner_id = auth.uid();
  if not found then raise exception 'merchant_company_required'; end if;

  with
  scoped_events as (
    select se.termo, se.categoria, se.created_at
    from public.search_events se
    where lower(se.cidade) = lower(v_merchant.cidade)
      and (p_scope = 'city' or lower(se.bairro) = lower(v_merchant.bairro))
      and se.created_at >= now() - make_interval(days => p_period_days * 2)
  ),
  term_stats as (
    select termo,
      count(*) filter (where created_at >= now() - make_interval(days => p_period_days))::integer current_count,
      count(*) filter (where created_at < now() - make_interval(days => p_period_days))::integer previous_count
    from scoped_events group by termo
  ),
  category_stats as (
    select categoria,
      count(*) filter (where created_at >= now() - make_interval(days => p_period_days))::integer current_count,
      count(*) filter (where created_at < now() - make_interval(days => p_period_days))::integer previous_count
    from scoped_events where categoria is not null group by categoria
  ),
  local_supply as (
    select p.categoria, count(*)::integer supply_count
    from public.products p join public.merchants m on m.id = p.merchant_id
    where m.verification_status = 'verified'
      and lower(m.cidade) = lower(v_merchant.cidade)
      and (p_scope = 'city' or lower(m.bairro) = lower(v_merchant.bairro))
      and p.status in ('available', 'low_stock')
    group by p.categoria
  ),
  term_supply as (
    select ts.termo, count(p.id)::integer supply_count
    from term_stats ts
    left join public.merchants m on m.verification_status = 'verified'
      and lower(m.cidade) = lower(v_merchant.cidade)
      and (p_scope = 'city' or lower(m.bairro) = lower(v_merchant.bairro))
    left join public.products p on p.merchant_id = m.id
      and p.status in ('available', 'low_stock')
      and lower(p.nome) like '%' || lower(ts.termo) || '%'
    where ts.current_count >= 3
    group by ts.termo
  ),
  comparisons as (
    select
      count(*) filter (where se.created_at >= now() - interval '7 days')::integer week_current,
      count(*) filter (where se.created_at >= now() - interval '14 days' and se.created_at < now() - interval '7 days')::integer week_previous,
      count(*) filter (where se.created_at >= now() - interval '30 days')::integer month_current,
      count(*) filter (where se.created_at >= now() - interval '60 days' and se.created_at < now() - interval '30 days')::integer month_previous
    from public.search_events se
    where lower(se.cidade) = lower(v_merchant.cidade)
      and (p_scope = 'city' or lower(se.bairro) = lower(v_merchant.bairro))
  ),
  submission_counts as (
    select s.questionnaire_id, count(distinct s.consumer_id)::integer respondent_count
    from public.questionnaire_submissions s
    where lower(s.cidade) = lower(v_merchant.cidade)
      and (p_scope = 'city' or lower(s.bairro) = lower(v_merchant.bairro))
      and s.completed_at >= now() - make_interval(days => p_period_days)
    group by s.questionnaire_id having count(distinct s.consumer_id) >= 5
  ),
  response_values as (
    select q.pergunta, value.answer, count(*)::integer answer_count, sc.respondent_count
    from public.questionnaire_responses r
    join public.questionnaire_submissions s on s.id = r.submission_id
    join submission_counts sc on sc.questionnaire_id = s.questionnaire_id
    join public.questionnaire_questions q on q.id = r.question_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(r.resposta) = 'array' then r.resposta else jsonb_build_array(r.resposta) end
    ) value(answer)
    where lower(s.cidade) = lower(v_merchant.cidade)
      and (p_scope = 'city' or lower(s.bairro) = lower(v_merchant.bairro))
      and s.completed_at >= now() - make_interval(days => p_period_days)
      and q.tipo in ('single_choice', 'multiple_choice', 'scale')
    group by q.id, q.pergunta, value.answer, sc.respondent_count
    having count(*) >= 3
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'period_days', p_period_days, 'scope', p_scope,
      'city', v_merchant.cidade, 'neighborhood', v_merchant.bairro,
      'segment', v_merchant.categoria, 'ranking_threshold', 3,
      'questionnaire_respondent_threshold', 5
    ),
    'kpis', jsonb_build_object(
      'total_searches', (select count(*) from scoped_events where created_at >= now() - make_interval(days => p_period_days)),
      'segment_searches', (select count(*) from scoped_events where created_at >= now() - make_interval(days => p_period_days) and lower(categoria) = lower(v_merchant.categoria)),
      'week_current', (select week_current from comparisons),
      'week_previous', (select week_previous from comparisons),
      'month_current', (select month_current from comparisons),
      'month_previous', (select month_previous from comparisons)
    ),
    'top_terms', coalesce((select jsonb_agg(jsonb_build_object(
      'label', termo, 'current', current_count, 'previous', previous_count,
      'growth_pct', case when previous_count = 0 then null else round((current_count - previous_count) * 100.0 / previous_count, 1) end
    ) order by current_count desc, termo) from (select * from term_stats where current_count >= 3 order by current_count desc limit 8) ranked), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object(
      'label', categoria, 'current', current_count, 'previous', previous_count,
      'growth_pct', case when previous_count = 0 then null else round((current_count - previous_count) * 100.0 / previous_count, 1) end
    ) order by current_count desc, categoria) from (select * from category_stats where current_count >= 3 order by current_count desc limit 8) ranked), '[]'::jsonb),
    'market_gaps', coalesce((select jsonb_agg(jsonb_build_object(
      'category', cs.categoria, 'demand', cs.current_count, 'previous_demand', cs.previous_count,
      'supply', coalesce(ls.supply_count, 0),
      'kind', case
        when cs.current_count >= 5 and coalesce(ls.supply_count, 0) <= 2 then 'high_demand_low_supply'
        when cs.current_count > cs.previous_count and cs.current_count >= 5 and coalesce(ls.supply_count, 0) <= 3 then 'growing_demand_low_supply'
        when cs.current_count <= 3 and coalesce(ls.supply_count, 0) >= 8 then 'low_demand_high_supply'
        else 'balanced' end
    ) order by cs.current_count desc) from category_stats cs left join local_supply ls on lower(ls.categoria) = lower(cs.categoria) where cs.current_count >= 3), '[]'::jsonb),
    'product_gaps', coalesce((select jsonb_agg(jsonb_build_object(
      'term', ts.termo, 'demand', ts.current_count, 'previous_demand', ts.previous_count,
      'supply', coalesce(os.supply_count, 0),
      'kind', case
        when ts.current_count >= 5 and coalesce(os.supply_count, 0) <= 2 then 'high_demand_low_supply'
        when ts.current_count > ts.previous_count and ts.current_count >= 5 and coalesce(os.supply_count, 0) <= 3 then 'growing_demand_low_supply'
        when ts.current_count <= 3 and coalesce(os.supply_count, 0) >= 8 then 'low_demand_high_supply'
        else 'balanced' end
    ) order by ts.current_count desc) from term_stats ts left join term_supply os on os.termo = ts.termo where ts.current_count >= 3), '[]'::jsonb),
    'questionnaire_signals', coalesce((select jsonb_agg(jsonb_build_object(
      'question', pergunta, 'answer', answer #>> '{}', 'count', answer_count, 'respondents', respondent_count
    ) order by answer_count desc) from (select * from response_values order by answer_count desc limit 8) signals), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_merchant_market_intelligence(integer,text) from public;
grant execute on function public.get_merchant_market_intelligence(integer,text) to authenticated;

comment on function public.get_merchant_market_intelligence is
'Retorna somente agregados da localidade da empresa autenticada. Rankings exigem 3 eventos e questionários exigem 5 respondentes, com células de no mínimo 3 respostas.';
