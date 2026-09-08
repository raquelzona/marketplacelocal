-- Etapa 9 — hardening final do MVP. Sem expansão funcional.

-- Limites evitam payloads excessivos; NOT VALID preserva instalações que já tenham
-- dados antigos, mas passa a validar toda nova escrita.
alter table public.merchants add constraint merchants_text_lengths check (
  char_length(nome_fantasia) between 2 and 120 and char_length(endereco) between 2 and 240
  and char_length(cidade) between 2 and 100 and char_length(bairro) between 1 and 100
  and char_length(categoria) between 2 and 100 and char_length(email) between 3 and 254
  and (cnpj is null or cnpj ~ '^[0-9]{14}$')
) not valid;
alter table public.products add constraint products_text_lengths check (
  char_length(nome) between 2 and 160 and char_length(categoria) between 2 and 100
  and (marca is null or char_length(marca) <= 120)
) not valid;
alter table public.products add constraint hidden_products_are_unavailable
  check (moderation_status <> 'hidden' or status = 'unavailable') not valid;
alter table public.search_events add constraint search_events_term_length
  check (char_length(termo) between 1 and 100) not valid;
alter table public.questionnaires add constraint questionnaires_text_lengths
  check (char_length(titulo) between 3 and 160 and (descricao is null or char_length(descricao) <= 1000)) not valid;
alter table public.questionnaire_questions add constraint questionnaire_question_type
  check (tipo in ('single_choice','multiple_choice','short_text','scale')) not valid;
alter table public.questionnaire_questions add constraint questionnaire_question_length
  check (char_length(pergunta) between 3 and 500) not valid;
alter table public.audit_logs add constraint audit_log_lengths
  check (char_length(action) between 3 and 100 and char_length(entity_type) between 2 and 60) not valid;

create index if not exists profiles_admin_role_created_idx on public.profiles (role, created_at desc);
create index if not exists merchants_admin_status_created_idx on public.merchants (verification_status, created_at desc);
create index if not exists products_admin_created_idx on public.products (created_at desc);

-- Auditoria só é escrita pelas funções SECURITY DEFINER administrativas.
revoke insert, update, delete, truncate on public.audit_logs from anon, authenticated;

comment on table public.audit_logs is
'Trilha operacional somente leitura para clientes; escritas ocorrem exclusivamente nas RPCs administrativas.';
