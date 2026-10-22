-- ============================================================
-- PAINEL AGS GEO — BANCO DE DADOS (Supabase)
-- Rode no SQL Editor do Supabase do PROJETO DE LEVANTAMENTO (nunca no da piscicultura).
-- Pode rodar de novo sem estragar nada.
--
-- Mesmo modelo de lib/types.ts, mas cada lancamento (area, gasto, servico...) e uma linha
-- propria: assim celular e computador gravam ao mesmo tempo sem um apagar o do outro.
-- Os ids continuam os do app (ex.: "p_1781847309158_2n4b1"), para o backup entrar igual.
--
-- Seguranca: toda linha tem owner_id (dono da conta). RLS deixa cada conta ver e mexer
-- somente no que e dela. Visitante sem login (anon) nao le nada.
-- ============================================================

-- ---------- Projetos (frentes de levantamento) ----------
create table if not exists projects (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_name text not null check (length(trim(client_name)) > 0),
  fazenda text,
  total_hectares numeric(12,4) not null default 0 check (total_hectares >= 0),
  commission_rate numeric(14,4) check (commission_rate is null or commission_rate >= 0),
  -- Desconto ao cliente (R$), abatido do faturamento no relatorio do cliente.
  discount numeric(14,2) check (discount is null or discount >= 0),
  discount_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

-- ---------- Talhoes / matriculas ----------
create table if not exists talhoes (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id text not null,
  name text not null check (length(trim(name)) > 0),
  identifier text,
  target_hectares numeric(12,4) check (target_hectares is null or target_hectares >= 0),
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  -- (projeto, dono) juntos: impede pendurar um talhao no projeto de outra conta.
  foreign key (project_id, owner_id) references projects(id, owner_id) on delete cascade
);

-- ---------- Areas mapeadas (partes voadas) ----------
create table if not exists areas (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id text not null,
  -- Sem talhao = area "avulsa" (ungroupedAreas). Apagar o talhao nao apaga a area voada.
  talhao_id text,
  hectares numeric(12,4) not null check (hectares >= 0),
  date date not null,
  note text,
  name text,
  created_at timestamptz not null default now(),
  foreign key (project_id, owner_id) references projects(id, owner_id) on delete cascade,
  foreign key (talhao_id, owner_id) references talhoes(id, owner_id) on delete set null (talhao_id)
);

-- ---------- Gastos operacionais do projeto ----------
create table if not exists expenses (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id text not null,
  -- Texto livre: alem das categorias do app ja existem outras (ex.: "SSD").
  category text not null,
  vehicle text,
  description text,
  value numeric(14,2) not null check (value >= 0),
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  foreign key (project_id, owner_id) references projects(id, owner_id) on delete cascade
);

-- ---------- Servicos cobrados no projeto ----------
create table if not exists services (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id text not null,
  name text not null,
  status text not null default 'pendente' check (status in ('pendente', 'andamento', 'concluido')),
  billing_type text not null check (billing_type in ('hectare', 'metro', 'fixo')),
  rate numeric(14,4) not null default 0 check (rate >= 0),
  -- null = usa os hectares do projeto (ou os mapeados, no Levantamento Altimetrico)
  quantity numeric(14,4) check (quantity is null or quantity >= 0),
  client_note text,
  created_at timestamptz not null default now(),
  -- O app guarda so o dia em que o status mudou (AAAA-MM-DD).
  updated_on date,
  foreign key (project_id, owner_id) references projects(id, owner_id) on delete cascade
);

-- ---------- Investimentos (CAPEX da divisao) ----------
create table if not exists investments (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  value numeric(14,2) not null check (value >= 0),
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Veiculos (lista usada nos gastos de combustivel) ----------
create table if not exists vehicles (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  primary key (owner_id, name)
);
create unique index if not exists vehicles_owner_name_ci on vehicles (owner_id, lower(trim(name)));

-- ---------- Comissao: lancamentos ----------
create table if not exists commission_entries (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Nome do cliente/talhao como estava no lancamento. Lancamento manual nao tem projeto;
  -- no automatico, source_project_id/talhao_id apontam para a origem e o app mostra o nome atual.
  client_name text not null,
  talhao_name text,
  source_project_id text,
  talhao_id text,
  hectares numeric(12,4) not null check (hectares >= 0),
  rate numeric(14,4) not null check (rate >= 0),
  date date not null,
  note text,
  auto boolean not null default false,
  -- Mes (AAAA-MM) escolhido a mao para receber; senao vale o mes da data.
  attributed_period text check (attributed_period is null or attributed_period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  created_at timestamptz not null default now(),
  foreign key (source_project_id, owner_id) references projects(id, owner_id) on delete set null (source_project_id),
  foreign key (talhao_id, owner_id) references talhoes(id, owner_id) on delete set null (talhao_id)
);

-- ---------- Comissao: configuracao (uma linha por conta) ----------
create table if not exists commission_config (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  percent numeric(6,3) not null default 10 check (percent >= 0 and percent <= 100),
  fixed_salary numeric(14,2) not null default 2000 check (fixed_salary >= 0)
);

-- ---------- Comissao: ajustes por mes ----------
create table if not exists commission_adjustments (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- Desconto AO CLIENTE: abate da base antes do %.
  discount numeric(14,2) not null default 0 check (discount >= 0),
  note text,
  -- Adiantamento/desconto DO FUNCIONARIO: abate direto do total final.
  employee_deduction numeric(14,2) not null default 0 check (employee_deduction >= 0),
  employee_note text,
  primary key (owner_id, period)
);

-- ---------- Propostas comerciais ----------
-- Documento editado inteiro num formulario so: itens, parcelas e cronograma ficam em jsonb
-- (mesmo formato de lib/types.ts), sem tabela propria.
create table if not exists proposals (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_name text not null,
  fazenda text,
  location text,
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array'),
  discount numeric(14,2) check (discount is null or discount >= 0),
  discount_note text,
  validity_days int check (validity_days is null or validity_days >= 0),
  payment_terms text,
  payment_schedule jsonb check (payment_schedule is null or jsonb_typeof(payment_schedule) = 'array'),
  timeline jsonb check (timeline is null or jsonb_typeof(timeline) = 'array'),
  client_responsibilities text,
  experience_note text,
  notes text,
  deliverables jsonb check (deliverables is null or jsonb_typeof(deliverables) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Indices das buscas do app ----------
create index if not exists idx_projects_owner on projects (owner_id, updated_at desc);
create index if not exists idx_talhoes_project on talhoes (project_id);
create index if not exists idx_areas_project on areas (project_id);
create index if not exists idx_areas_talhao on areas (talhao_id);
create index if not exists idx_areas_owner_date on areas (owner_id, date);
create index if not exists idx_expenses_project on expenses (project_id);
create index if not exists idx_services_project on services (project_id);
create index if not exists idx_investments_owner on investments (owner_id);
create index if not exists idx_commission_entries_owner_date on commission_entries (owner_id, date);
create index if not exists idx_commission_entries_project on commission_entries (source_project_id);
create index if not exists idx_commission_entries_talhao on commission_entries (talhao_id);
create index if not exists idx_proposals_owner on proposals (owner_id, updated_at desc);

-- ---------- updated_at automatico ----------
-- Projeto: qualquer mudanca nele OU num lancamento dele (talhao, area, gasto, servico)
-- atualiza o updated_at do projeto, que ordena a lista da tela inicial.
create or replace function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function touch_parent_project() returns trigger
language plpgsql set search_path = public as $$
begin
  update projects set updated_at = now()
   where id in (
     case when tg_op <> 'INSERT' then old.project_id end,
     case when tg_op <> 'DELETE' then new.project_id end
   );
  return null;
end $$;

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();
drop trigger if exists trg_proposals_updated_at on proposals;
create trigger trg_proposals_updated_at before update on proposals
  for each row execute function set_updated_at();

drop trigger if exists trg_talhoes_touch on talhoes;
create trigger trg_talhoes_touch after insert or update or delete on talhoes
  for each row execute function touch_parent_project();
drop trigger if exists trg_areas_touch on areas;
create trigger trg_areas_touch after insert or update or delete on areas
  for each row execute function touch_parent_project();
drop trigger if exists trg_expenses_touch on expenses;
create trigger trg_expenses_touch after insert or update or delete on expenses
  for each row execute function touch_parent_project();
drop trigger if exists trg_services_touch on services;
create trigger trg_services_touch after insert or update or delete on services
  for each row execute function touch_parent_project();

-- ---------- Resumo da tela inicial (substitui o "ags-projects-index") ----------
-- Hectares mapeados calculados aqui, nunca guardados repetidos.
-- security_invoker: a view respeita o RLS de quem consulta.
create or replace view project_summaries with (security_invoker = true) as
select p.id,
       p.owner_id,
       p.client_name,
       p.fazenda,
       p.total_hectares,
       coalesce((select sum(a.hectares) from areas a where a.project_id = p.id), 0) as mapped_hectares,
       p.created_at,
       p.updated_at
  from projects p;

-- ---------- Seguranca (RLS): cada conta so enxerga o que e dela ----------
do $$
declare t text;
begin
  foreach t in array array['projects', 'talhoes', 'areas', 'expenses', 'services', 'investments', 'vehicles',
                           'commission_entries', 'commission_config', 'commission_adjustments', 'proposals']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists owner_all on %I', t);
    execute format('create policy owner_all on %I for all to authenticated
                      using (owner_id = (select auth.uid()))
                      with check (owner_id = (select auth.uid()))', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

revoke all on project_summaries from anon;
grant select on project_summaries to authenticated;
revoke execute on function set_updated_at() from anon, authenticated, public;
revoke execute on function touch_parent_project() from anon, authenticated, public;
