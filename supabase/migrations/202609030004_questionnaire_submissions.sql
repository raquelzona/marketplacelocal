-- Etapa 6 — submissões completas, segmentação e envio transacional.
alter table public.questionnaires
  add column estimated_minutes smallint not null default 2 check (estimated_minutes between 1 and 15),
  add column target_city text,
  add column target_neighborhood text,
  add column target_interest text,
  add column updated_at timestamptz not null default now();

create trigger questionnaires_set_updated_at before update on public.questionnaires
for each row execute function public.set_updated_at();

create table public.questionnaire_submissions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  cidade text not null,
  bairro text not null,
  completed_at timestamptz not null default now(),
  unique (questionnaire_id, consumer_id)
);

alter table public.questionnaire_responses
  add column submission_id uuid references public.questionnaire_submissions(id) on delete cascade;

-- Compatibilidade caso respostas da versão anterior já existam.
insert into public.questionnaire_submissions (questionnaire_id, consumer_id, cidade, bairro, completed_at)
select questionnaire_id, consumer_id, coalesce(max(cidade), ''), coalesce(max(bairro), ''), max(created_at)
from public.questionnaire_responses
group by questionnaire_id, consumer_id
on conflict (questionnaire_id, consumer_id) do nothing;

update public.questionnaire_responses r
set submission_id = s.id
from public.questionnaire_submissions s
where s.questionnaire_id = r.questionnaire_id and s.consumer_id = r.consumer_id;

alter table public.questionnaire_responses alter column submission_id set not null;
alter table public.questionnaire_responses drop constraint questionnaire_responses_question_id_consumer_id_key;
alter table public.questionnaire_responses add constraint questionnaire_response_once_per_submission unique (submission_id, question_id);

create index questionnaire_submissions_consumer_idx on public.questionnaire_submissions (consumer_id, completed_at desc);
create index questionnaire_submissions_aggregation_idx on public.questionnaire_submissions (questionnaire_id, cidade, bairro, completed_at);

alter table public.questionnaire_submissions enable row level security;
grant select on public.questionnaire_submissions to authenticated;

create policy "submissions_select_own_or_admin" on public.questionnaire_submissions for select to authenticated
using (consumer_id = auth.uid() or public.is_admin());

drop policy "active_questionnaires_read" on public.questionnaires;
create policy "questionnaires_read_audience_or_admin" on public.questionnaires for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.questionnaire_submissions s
    where s.questionnaire_id = questionnaires.id and s.consumer_id = auth.uid()
  )
  or (
    ativo and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'consumer'
        and (target_city is null or lower(target_city) = lower(p.cidade))
        and (target_neighborhood is null or lower(target_neighborhood) = lower(p.bairro))
        and (target_interest is null or target_interest = any(p.interests))
    )
  )
);

drop policy "active_questions_read" on public.questionnaire_questions;
create policy "questions_read_audience_or_admin" on public.questionnaire_questions for select to authenticated
using (exists(select 1 from public.questionnaires q where q.id = questionnaire_id));

drop policy "responses_insert_own" on public.questionnaire_responses;
drop policy "responses_update_own" on public.questionnaire_responses;
revoke insert, update, delete on public.questionnaire_responses from authenticated;

create or replace function public.submit_questionnaire(p_questionnaire_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_questionnaire public.questionnaires%rowtype;
  v_submission_id uuid;
  v_question public.questionnaire_questions%rowtype;
  v_answer jsonb;
  v_question_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_profile from public.profiles where id = auth.uid() and role = 'consumer';
  if not found then raise exception 'consumer_required'; end if;
  select * into v_questionnaire from public.questionnaires where id = p_questionnaire_id and ativo;
  if not found then raise exception 'questionnaire_unavailable'; end if;
  if (v_questionnaire.target_city is not null and lower(v_questionnaire.target_city) <> lower(v_profile.cidade))
    or (v_questionnaire.target_neighborhood is not null and lower(v_questionnaire.target_neighborhood) <> lower(v_profile.bairro))
    or (v_questionnaire.target_interest is not null and not (v_questionnaire.target_interest = any(v_profile.interests)))
  then raise exception 'outside_audience'; end if;
  if exists(select 1 from public.questionnaire_submissions where questionnaire_id = p_questionnaire_id and consumer_id = auth.uid())
  then raise exception 'already_submitted'; end if;

  select count(*) into v_question_count from public.questionnaire_questions where questionnaire_id = p_questionnaire_id;
  if v_question_count = 0 or jsonb_typeof(p_answers) <> 'object'
    or (select count(*) from jsonb_object_keys(p_answers)) <> v_question_count
  then raise exception 'incomplete_answers'; end if;

  for v_question in select * from public.questionnaire_questions where questionnaire_id = p_questionnaire_id order by ordem loop
    v_answer := p_answers -> v_question.id::text;
    if v_answer is null or v_answer = 'null'::jsonb then raise exception 'incomplete_answers'; end if;
    case v_question.tipo
      when 'single_choice' then
        if jsonb_typeof(v_answer) <> 'string' or not (v_question.opcoes @> jsonb_build_array(v_answer)) then raise exception 'invalid_single_choice'; end if;
      when 'multiple_choice' then
        if jsonb_typeof(v_answer) <> 'array' or jsonb_array_length(v_answer) = 0
          or exists(select 1 from jsonb_array_elements(v_answer) a where not (v_question.opcoes @> jsonb_build_array(a)))
        then raise exception 'invalid_multiple_choice'; end if;
      when 'short_text' then
        if jsonb_typeof(v_answer) <> 'string' or length(trim(v_answer #>> '{}')) not between 1 and 300 then raise exception 'invalid_short_text'; end if;
      when 'scale' then
        if jsonb_typeof(v_answer) <> 'number' or (v_answer #>> '{}')::numeric <> trunc((v_answer #>> '{}')::numeric)
          or (v_answer #>> '{}')::integer not between coalesce((v_question.opcoes->>'min')::integer, 1) and coalesce((v_question.opcoes->>'max')::integer, 5)
        then raise exception 'invalid_scale'; end if;
      else raise exception 'unsupported_question_type';
    end case;
  end loop;

  insert into public.questionnaire_submissions (questionnaire_id, consumer_id, cidade, bairro)
  values (p_questionnaire_id, auth.uid(), v_profile.cidade, v_profile.bairro)
  returning id into v_submission_id;

  insert into public.questionnaire_responses (submission_id, questionnaire_id, question_id, consumer_id, resposta, cidade, bairro)
  select v_submission_id, p_questionnaire_id, q.id, auth.uid(), p_answers -> q.id::text, v_profile.cidade, v_profile.bairro
  from public.questionnaire_questions q where q.questionnaire_id = p_questionnaire_id;
  return v_submission_id;
exception when unique_violation then raise exception 'already_submitted';
end;
$$;

revoke all on function public.submit_questionnaire(uuid,jsonb) from public;
grant execute on function public.submit_questionnaire(uuid,jsonb) to authenticated;

create or replace function public.protect_answered_questionnaire_questions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_questionnaire_id uuid;
begin
  v_questionnaire_id := case when tg_op = 'INSERT' then new.questionnaire_id else old.questionnaire_id end;
  if exists (
    select 1 from public.questionnaire_submissions
    where questionnaire_id = v_questionnaire_id
  ) then
    raise exception 'answered_questionnaire_is_immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger protect_answered_questions before insert or update or delete on public.questionnaire_questions
for each row execute function public.protect_answered_questionnaire_questions();

-- Reordenação atômica disponível somente para administradores.
create or replace function public.move_questionnaire_question(p_question_id uuid, p_direction integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_current public.questionnaire_questions%rowtype; v_other public.questionnaire_questions%rowtype; v_temp_order integer;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if p_direction not in (-1, 1) then raise exception 'invalid_direction'; end if;
  select * into v_current from public.questionnaire_questions where id = p_question_id;
  if not found then raise exception 'question_not_found'; end if;
  select * into v_other from public.questionnaire_questions
    where questionnaire_id = v_current.questionnaire_id
      and ((p_direction = -1 and ordem < v_current.ordem) or (p_direction = 1 and ordem > v_current.ordem))
    order by case when p_direction = -1 then -ordem else ordem end limit 1;
  if not found then return; end if;
  select coalesce(max(ordem), 0) + 1 into v_temp_order from public.questionnaire_questions where questionnaire_id = v_current.questionnaire_id;
  update public.questionnaire_questions set ordem = v_temp_order where id = v_current.id;
  update public.questionnaire_questions set ordem = v_current.ordem where id = v_other.id;
  update public.questionnaire_questions set ordem = v_other.ordem where id = v_current.id;
end;
$$;

revoke all on function public.move_questionnaire_question(uuid,integer) from public;
grant execute on function public.move_questionnaire_question(uuid,integer) to authenticated;
