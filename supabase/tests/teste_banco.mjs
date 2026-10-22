// Monta o banco com supabase/*.sql num Postgres de verdade (PGlite, em memoria) e confere as regras
// e a seguranca: cada conta so ve e mexe no que e dela, visitante sem login nao ve nada.
// Rodar: cd supabase/tests && npm install && npm test
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PASTA_SQL = fileURLToPath(new URL('../', import.meta.url));
const arquivos = readdirSync(PASTA_SQL).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
const db = new PGlite();
let ok = true;
const checa = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); ok = ok && c; };

// O que o Supabase ja tem pronto: papeis, auth.users e auth.uid() (aqui lido de uma variavel).
await db.exec(`create role anon; create role authenticated; create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('teste.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;`);

for (const rodada of [1, 2]) {
  let erro = null;
  try { for (const f of arquivos) await db.exec(readFileSync(PASTA_SQL + f, 'utf8')); } catch (e) { erro = e.message; }
  checa(!erro, `${arquivos.join(', ')}: roda ${rodada === 1 ? 'no banco vazio' : 'de novo sem estragar'}` + (erro ? ': ' + erro : ''));
}

const tabelas = ['projects', 'talhoes', 'areas', 'expenses', 'services', 'investments', 'vehicles',
  'commission_entries', 'commission_config', 'commission_adjustments', 'proposals'];
const rls = (await db.query(`select relname t, relrowsecurity r from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'`)).rows;
checa(tabelas.every((t) => rls.some((x) => x.t === t)), `as ${tabelas.length} tabelas existem`);
const semRls = rls.filter((x) => !x.r).map((x) => x.t);
checa(semRls.length === 0, 'RLS ligado em TODAS as tabelas' + (semRls.length ? ': falta em ' + semRls.join(', ') : ''));

const A = '00000000-0000-4000-8000-0000000000a1', B = '00000000-0000-4000-8000-0000000000b2';
await db.exec(`insert into auth.users values ('${A}', 'guilherme@ags'), ('${B}', 'outro@x')`);

async function como(uid, q) {
  await db.exec(uid ? `set role authenticated; set teste.uid = '${uid}';` : `set role anon; set teste.uid = '';`);
  // exec aceita varios comandos; vale o resultado do ultimo. Comandos juntos rodam numa transacao so.
  try { const res = await db.exec(`begin; ${q}; commit;`); return { rows: res[res.length - 2].rows }; }
  catch (e) { await db.exec('rollback'); return { erro: e.message }; }
  finally { await db.exec(`reset role; set teste.uid = '';`); }
}
const conta = async (uid, q) => { const r = await como(uid, q); return r.erro ? -1 : r.rows.length; };

// ---------- Conta A monta um projeto como o do Fabio Fukuda ----------
let r = await como(A, `insert into projects (id, client_name, fazenda, total_hectares) values ('p1', 'Fábio Fukuda', 'John Deere', 6596.5);
  insert into talhoes (id, project_id, name, target_hectares) values ('t1', 'p1', 'Floresta', 288.5);
  insert into areas (id, project_id, talhao_id, hectares, date) values ('a1', 'p1', 't1', 240, '2026-06-19'), ('a2', 'p1', 't1', 48.5, '2026-06-20');
  insert into expenses (id, project_id, category, vehicle, value, date) values
    ('e1', 'p1', 'Combustível / deslocamento', 'Triton - L200', 200.01, '2026-07-14'),
    ('e2', 'p1', 'Combustível / deslocamento', 'Triton - L200', 200.01, '2026-07-15'),
    ('e3', 'p1', 'SSD', null, 200.01, '2026-07-16');
  insert into services (id, project_id, name, status, billing_type, rate) values ('s1', 'p1', 'Levantamento Altimétrico', 'concluido', 'hectare', 20);
  insert into investments (id, name, value, date) values ('i1', 'Drone - Matrice 4E', 56000, '2026-06-01');
  insert into vehicles (name) values ('Triton - L200');
  insert into commission_config (percent, fixed_salary) values (10, 2000);
  insert into commission_adjustments (period, employee_deduction) values ('2026-08', 641.16);
  insert into commission_entries (id, client_name, talhao_name, source_project_id, talhao_id, hectares, rate, date, auto, attributed_period)
    values ('c1', 'Fábio Fukuda', 'Floresta', 'p1', 't1', 240, 20, '2026-07-22', true, '2026-08');
  insert into proposals (id, client_name, items) values ('pr1', 'Marcelo', '[{"id":"pi1","name":"Levantamento","billingType":"hectare","rate":30,"quantity":1000}]');`);
checa(!r.erro, 'conta A cadastra projeto, talhão, áreas, gastos (inclusive categoria "SSD"), serviço, investimento, comissão e proposta' + (r.erro ? ': ' + r.erro : ''));

r = await como(A, `select mapped_hectares::float m from project_summaries where id = 'p1'`);
checa(r.rows?.[0]?.m === 288.5, `resumo da tela inicial calcula os hectares mapeados (${r.rows?.[0]?.m})`);
r = await como(A, `select sum(value)::text s from expenses where project_id = 'p1'`);
checa(r.rows?.[0]?.s === '600.03', `dinheiro sem erro de centavos: 3 × 200,01 = ${r.rows?.[0]?.s}`);

// ---------- Visitante sem login ----------
for (const t of tabelas) {
  const n = await conta(null, `select * from ${t}`);
  if (n !== -1 && n !== 0) checa(false, `visitante sem login leu ${t}`);
}
checa(true, 'visitante sem login não lê nenhuma tabela');
checa((await conta(null, `select * from project_summaries`)) <= 0, 'visitante sem login não lê o resumo dos projetos');
checa(!!(await como(null, `insert into projects (id, client_name) values ('x', 'invasor')`)).erro, 'visitante sem login não cria projeto');

// ---------- Conta B tenta mexer nos dados da conta A ----------
let vazou = [];
for (const t of tabelas) if ((await conta(B, `select * from ${t}`)) > 0) vazou.push(t);
checa(vazou.length === 0, 'outra conta não lê nada da conta A' + (vazou.length ? ': leu ' + vazou.join(', ') : ''));
checa((await conta(B, `select * from project_summaries`)) === 0, 'outra conta não vê os projetos da A na tela inicial');
r = await como(B, `update projects set client_name = 'hack' where id = 'p1' returning id`);
checa(!r.erro && r.rows.length === 0, 'outra conta não altera projeto da A');
r = await como(B, `delete from areas where id = 'a1' returning id`);
checa(!r.erro && r.rows.length === 0, 'outra conta não apaga área da A');
r = await como(B, `insert into areas (id, project_id, hectares, date) values ('ax', 'p1', 1, '2026-01-01')`);
checa(!!r.erro, 'outra conta não pendura área no projeto da A');
r = await como(B, `insert into projects (id, owner_id, client_name) values ('px', '${A}', 'falso')`);
checa(!!r.erro, 'outra conta não cria projeto em nome da A');
r = await como(B, `insert into projects (id, client_name) values ('pB', 'Cliente do B');
  insert into talhoes (id, project_id, name) values ('tB', 'pB', 'X');
  insert into areas (id, project_id, talhao_id, hectares, date) values ('aB', 'pB', 't1', 1, '2026-01-01')`);
checa(!!r.erro, 'outra conta não liga a área dela ao talhão da A');
checa((await conta(A, `select * from projects where id = 'p1' and client_name = 'Fábio Fukuda'`)) === 1, 'dados da A continuam intactos');

// ---------- Regras ----------
const antes = (await como(A, `select updated_at::text u from projects where id = 'p1'`)).rows[0].u;
await como(A, `insert into areas (id, project_id, talhao_id, hectares, date) values ('a3', 'p1', 't1', 10, '2026-06-21')`);
const depois = (await como(A, `select updated_at::text u from projects where id = 'p1'`)).rows[0].u;
checa(depois > antes, 'lançar uma área atualiza a data do projeto (ordem da tela inicial)');

r = await como(A, `update projects set updated_at = '2026-08-25T21:55:05Z' where id = 'p1'; select updated_at::text u from projects where id = 'p1'`);
checa(r.rows?.[0]?.u?.startsWith('2026-08-25'), 'importar backup consegue manter a data original do projeto');
r = await como(A, `update projects set fazenda = 'JD' where id = 'p1'; select updated_at::text u from projects where id = 'p1'`);
checa(!r.rows?.[0]?.u?.startsWith('2026-08-25'), 'editar o projeto normalmente atualiza a data para agora');

r = await como(null, `select keepalive() k`);
checa(!r.erro && !!r.rows?.[0]?.k, 'manter acordado: visitante sem login consegue chamar keepalive()' + (r.erro ? ': ' + r.erro : ''));

r = await como(A, `insert into commission_entries (id, client_name, hectares, rate, date, attributed_period) values ('cx', 'X', 1, 1, '2026-01-01', '2026-13')`);
checa(!!r.erro, 'mês de comissão inválido (2026-13) é recusado');
r = await como(A, `insert into areas (id, project_id, hectares, date) values ('an', 'p1', -5, '2026-01-01')`);
checa(!!r.erro, 'hectares negativos são recusados');
r = await como(A, `insert into vehicles (name) values ('triton - l200 ')`);
checa(!!r.erro, 'veículo repetido (maiúsculas/espaços diferentes) não duplica');

await como(A, `delete from talhoes where id = 't1'`);
r = await como(A, `select talhao_id from areas where id = 'a1'`);
checa(r.rows?.length === 1 && r.rows[0].talhao_id === null, 'apagar o talhão mantém as áreas voadas (ficam sem talhão)');
r = await como(A, `select talhao_id, talhao_name from commission_entries where id = 'c1'`);
checa(r.rows?.[0]?.talhao_id === null && r.rows[0].talhao_name === 'Floresta', 'apagar o talhão mantém a comissão com o nome antigo');

await como(A, `delete from projects where id = 'p1'`);
const sobras = await conta(A, `select id from areas where project_id = 'p1' union all select id from expenses where project_id = 'p1' union all select id from services where project_id = 'p1'`);
checa(sobras === 0, 'apagar o projeto apaga áreas, gastos e serviços dele');
r = await como(A, `select source_project_id from commission_entries where id = 'c1'`);
checa(r.rows?.length === 1 && r.rows[0].source_project_id === null, 'apagar o projeto NÃO apaga a comissão já lançada');

console.log(ok ? 'RESULTADO: TUDO OK' : 'RESULTADO: COM FALHAS');
process.exit(ok ? 0 : 1);
