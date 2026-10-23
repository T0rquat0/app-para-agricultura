// Dados guardados na nuvem (Supabase). Tabelas e regras em supabase/01_schema.sql.
// Cada funcao grava so a linha envolvida; o owner_id e preenchido pelo proprio banco
// (auth.uid()) e o RLS garante que cada conta so ve e mexe no que e dela.

import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabase } from "./supabase"
import {
  DEFAULT_COMMISSION_CONFIG,
  DEFAULT_VEHICLES,
  hasAdjustmentContent,
  type StorageBackend,
} from "./storage-backend"
import type {
  Area,
  CommissionAdjustments,
  CommissionEntry,
  Expense,
  Investment,
  Project,
  ProjectSummary,
  Proposal,
  Service,
  Talhao,
} from "./types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function db(): SupabaseClient {
  const client = getSupabase()
  if (!client) throw new Error("Banco de dados não configurado")
  return client
}

// Falha de gravacao vira aviso na tela (como no modo do aparelho) e interrompe a acao,
// para o formulario nao fechar como se tivesse salvo.
function failWrite(message: string): never {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false
  window.alert(
    offline
      ? "Sem internet: não foi possível salvar. Tente de novo quando tiver sinal."
      : "Não foi possível salvar no banco de dados. Tente novamente.",
  )
  throw new Error(message)
}

async function mustWrite(query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query
  if (error) failWrite(error.message)
}

// O Supabase devolve no maximo 1000 linhas por pedido: busca em paginas ate acabar.
// orderBy precisa identificar cada linha (senao a paginacao pode pular ou repetir).
async function selectAll(table: string, build?: (q: Row) => Row, orderBy = ["created_at", "id"]): Promise<Row[]> {
  const PAGE = 1000
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    let q: Row = db().from(table).select("*")
    for (const column of orderBy) q = q.order(column, { ascending: true })
    if (build) q = build(q)
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data as Row[]))
    if (!data || data.length < PAGE) return rows
  }
}

const num = (v: unknown) => Number(v ?? 0)
const optNum = (v: unknown) => (v == null ? undefined : Number(v))
const opt = <T>(v: T | null) => (v == null ? undefined : v)

// ---------- Linha do banco <-> objeto do app ----------
const toTalhao = (r: Row): Talhao => ({
  id: r.id,
  name: r.name,
  identifier: r.identifier ?? "",
  targetHectares: r.target_hectares == null ? null : Number(r.target_hectares),
  geometry: opt(r.geometry),
  createdAt: r.created_at,
})
const fromTalhao = (projectId: string, t: Talhao): Row => ({
  id: t.id,
  project_id: projectId,
  name: t.name,
  identifier: t.identifier || null,
  target_hectares: t.targetHectares,
  // Sem contorno no objeto (ex.: backup antigo), nao mexe no que ja esta no banco.
  ...(t.geometry !== undefined ? { geometry: t.geometry } : {}),
  ...(t.createdAt ? { created_at: t.createdAt } : {}),
})

const toArea = (r: Row): Area => ({
  id: r.id,
  talhaoId: r.talhao_id ?? "",
  hectares: num(r.hectares),
  date: r.date,
  note: r.note ?? "",
  name: opt(r.name),
  createdAt: r.created_at,
})
const fromArea = (projectId: string, a: Area): Row => ({
  id: a.id,
  project_id: projectId,
  talhao_id: a.talhaoId || null,
  hectares: a.hectares,
  date: a.date,
  note: a.note || null,
  name: a.name || null,
  ...(a.createdAt ? { created_at: a.createdAt } : {}),
})

const toExpense = (r: Row): Expense => ({
  id: r.id,
  category: r.category,
  vehicle: r.vehicle ?? "",
  description: r.description ?? "",
  value: num(r.value),
  date: r.date,
  note: opt(r.note),
  createdAt: r.created_at,
})
const fromExpense = (projectId: string, e: Expense): Row => ({
  id: e.id,
  project_id: projectId,
  category: e.category,
  vehicle: e.vehicle || null,
  description: e.description || null,
  value: e.value,
  date: e.date,
  note: e.note || null,
  ...(e.createdAt ? { created_at: e.createdAt } : {}),
})

const toService = (r: Row): Service => ({
  id: r.id,
  name: r.name,
  status: r.status,
  billingType: r.billing_type,
  rate: num(r.rate),
  quantity: r.quantity == null ? null : Number(r.quantity),
  clientNote: opt(r.client_note),
  updatedAt: opt(r.updated_on),
  createdAt: r.created_at,
})
const fromService = (projectId: string, s: Service): Row => ({
  id: s.id,
  project_id: projectId,
  name: s.name,
  status: s.status,
  billing_type: s.billingType,
  rate: s.rate || 0,
  quantity: s.quantity,
  client_note: s.clientNote || null,
  updated_on: s.updatedAt ? s.updatedAt.slice(0, 10) : null,
  ...(s.createdAt ? { created_at: s.createdAt } : {}),
})

const toProject = (r: Row): Project => ({
  id: r.id,
  clientName: r.client_name,
  fazenda: r.fazenda ?? "",
  totalHectares: num(r.total_hectares),
  commissionRate: optNum(r.commission_rate),
  discount: optNum(r.discount),
  discountNote: opt(r.discount_note),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  areas: [],
  expenses: [],
  talhoes: [],
  services: [],
})

// Campos do Project -> colunas. So entra o que veio no patch (undefined = apagar o valor).
const PROJECT_COLUMNS: Record<string, string> = {
  clientName: "client_name",
  fazenda: "fazenda",
  totalHectares: "total_hectares",
  commissionRate: "commission_rate",
  discount: "discount",
  discountNote: "discount_note",
}
function projectColumns(patch: Row): Row {
  const row: Row = {}
  for (const [field, column] of Object.entries(PROJECT_COLUMNS)) {
    if (field in patch) row[column] = patch[field] ?? null
  }
  return row
}

const toInvestment = (r: Row): Investment => ({
  id: r.id,
  name: r.name,
  value: num(r.value),
  date: r.date,
  note: r.note ?? "",
  createdAt: r.created_at,
})

const toEntry = (r: Row, projectNames: Map<string, string>, talhaoNames: Map<string, string>): CommissionEntry => ({
  id: r.id,
  // Lancamento ligado a um projeto/talhao mostra o nome ATUAL dele; os soltos, o nome gravado.
  clientName: (r.source_project_id && projectNames.get(r.source_project_id)) || r.client_name,
  talhaoName: (r.talhao_id && talhaoNames.get(r.talhao_id)) || opt(r.talhao_name),
  talhaoId: opt(r.talhao_id),
  sourceProjectId: opt(r.source_project_id),
  hectares: num(r.hectares),
  rate: num(r.rate),
  date: r.date,
  note: r.note ?? "",
  auto: r.auto || undefined,
  attributedPeriod: opt(r.attributed_period),
  createdAt: r.created_at,
})
const fromEntry = (e: CommissionEntry): Row => ({
  id: e.id,
  client_name: e.clientName,
  talhao_name: e.talhaoName || null,
  talhao_id: e.talhaoId || null,
  source_project_id: e.sourceProjectId || null,
  hectares: e.hectares,
  rate: e.rate,
  date: e.date,
  note: e.note || null,
  auto: Boolean(e.auto),
  attributed_period: e.attributedPeriod || null,
  ...(e.createdAt ? { created_at: e.createdAt } : {}),
})

const toProposal = (r: Row): Proposal => ({
  id: r.id,
  clientName: r.client_name,
  fazenda: opt(r.fazenda),
  location: opt(r.location),
  items: r.items || [],
  discount: optNum(r.discount),
  discountNote: opt(r.discount_note),
  validityDays: opt(r.validity_days),
  paymentTerms: opt(r.payment_terms),
  paymentSchedule: opt(r.payment_schedule),
  timeline: opt(r.timeline),
  clientResponsibilities: opt(r.client_responsibilities),
  experienceNote: opt(r.experience_note),
  notes: opt(r.notes),
  deliverables: opt(r.deliverables),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
const fromProposal = (p: Proposal): Row => ({
  id: p.id,
  client_name: p.clientName,
  fazenda: p.fazenda || null,
  location: p.location || null,
  items: p.items || [],
  discount: p.discount ?? null,
  discount_note: p.discountNote || null,
  validity_days: p.validityDays ?? null,
  payment_terms: p.paymentTerms || null,
  payment_schedule: p.paymentSchedule ?? null,
  timeline: p.timeline ?? null,
  client_responsibilities: p.clientResponsibilities || null,
  experience_note: p.experienceNote || null,
  notes: p.notes || null,
  deliverables: p.deliverables ?? null,
  ...(p.createdAt ? { created_at: p.createdAt } : {}),
})

// Monta os projetos completos a partir das linhas de cada tabela (filtradas ou nao).
async function loadProjects(ids?: string[]): Promise<Project[]> {
  const byProject = (q: Row) => (ids ? q.in("project_id", ids) : q)
  const [projects, talhoes, areas, expenses, services] = await Promise.all([
    selectAll("projects", (q) => (ids ? q.in("id", ids) : q)),
    selectAll("talhoes", byProject),
    selectAll("areas", byProject),
    selectAll("expenses", byProject),
    selectAll("services", byProject),
  ])
  const map = new Map(projects.map((r) => [r.id as string, toProject(r)]))
  for (const r of talhoes) map.get(r.project_id)?.talhoes.push(toTalhao(r))
  for (const r of areas) map.get(r.project_id)?.areas.push(toArea(r))
  for (const r of expenses) map.get(r.project_id)?.expenses.push(toExpense(r))
  for (const r of services) map.get(r.project_id)?.services.push(toService(r))
  return Array.from(map.values())
}

async function getProposals(): Promise<Proposal[]> {
  const { data, error } = await db().from("proposals").select("*").order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Row[]).map(toProposal)
}

async function getVehicles(): Promise<string[]> {
  const rows = await selectAll("vehicles", undefined, ["name"])
  return rows.length ? rows.map((r) => r.name as string) : DEFAULT_VEHICLES.slice()
}

export const cloudBackend: StorageBackend = {
  async getIndex() {
    const { data, error } = await db().from("project_summaries").select("*")
    if (error) throw new Error(error.message)
    return (data as Row[]).map(
      (r): ProjectSummary => ({
        id: r.id,
        clientName: r.client_name,
        fazenda: opt(r.fazenda),
        totalHectares: num(r.total_hectares),
        mappedHectares: num(r.mapped_hectares),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
    )
  },

  async getProject(id) {
    return (await loadProjects([id]))[0] || null
  },

  getAllProjects: () => loadProjects(),

  async createProject(p) {
    await mustWrite(
      db().from("projects").insert({
        id: p.id,
        ...projectColumns(p as Row),
        ...(p.createdAt ? { created_at: p.createdAt } : {}),
      }),
    )
    if (p.talhoes?.length) await mustWrite(db().from("talhoes").insert(p.talhoes.map((t) => fromTalhao(p.id, t))))
    if (p.areas?.length) await mustWrite(db().from("areas").insert(p.areas.map((a) => fromArea(p.id, a))))
    if (p.expenses?.length) await mustWrite(db().from("expenses").insert(p.expenses.map((e) => fromExpense(p.id, e))))
    if (p.services?.length) await mustWrite(db().from("services").insert(p.services.map((s) => fromService(p.id, s))))
  },

  async updateProject(id, patch) {
    await mustWrite(db().from("projects").update(projectColumns(patch as Row)).eq("id", id))
  },

  async deleteProject(id) {
    // O banco apaga junto talhoes, areas, gastos e servicos (on delete cascade).
    await mustWrite(db().from("projects").delete().eq("id", id))
  },

  async addTalhao(projectId, t) {
    await mustWrite(db().from("talhoes").insert(fromTalhao(projectId, t)))
  },
  async updateTalhao(projectId, t) {
    await mustWrite(db().from("talhoes").update(fromTalhao(projectId, t)).eq("id", t.id))
  },
  async deleteTalhao(_projectId, talhaoId) {
    await mustWrite(db().from("areas").delete().eq("talhao_id", talhaoId))
    await mustWrite(db().from("talhoes").delete().eq("id", talhaoId))
  },

  async addArea(projectId, a) {
    await mustWrite(db().from("areas").insert(fromArea(projectId, a)))
  },
  async updateArea(projectId, a) {
    await mustWrite(db().from("areas").update(fromArea(projectId, a)).eq("id", a.id))
  },
  async deleteArea(_projectId, areaId) {
    await mustWrite(db().from("areas").delete().eq("id", areaId))
  },

  async addExpense(projectId, e) {
    await mustWrite(db().from("expenses").insert(fromExpense(projectId, e)))
  },
  async deleteExpense(_projectId, expenseId) {
    await mustWrite(db().from("expenses").delete().eq("id", expenseId))
  },

  async addService(projectId, s) {
    await mustWrite(db().from("services").insert(fromService(projectId, s)))
  },
  async updateService(projectId, s) {
    await mustWrite(db().from("services").update(fromService(projectId, s)).eq("id", s.id))
  },
  async deleteService(_projectId, serviceId) {
    await mustWrite(db().from("services").delete().eq("id", serviceId))
  },

  getVehicles,
  async addVehicle(name) {
    const clean = name.trim()
    const existing = await selectAll("vehicles", undefined, ["name"])
    if (existing.some((r) => String(r.name).trim().toLowerCase() === clean.toLowerCase())) return
    await mustWrite(db().from("vehicles").insert({ name: clean }))
  },

  async getInvestments() {
    return (await selectAll("investments")).map(toInvestment)
  },
  async saveInvestment(inv) {
    await mustWrite(
      db()
        .from("investments")
        .upsert({
          id: inv.id,
          name: inv.name,
          value: inv.value,
          date: inv.date,
          note: inv.note || null,
          ...(inv.createdAt ? { created_at: inv.createdAt } : {}),
        }),
    )
  },
  async deleteInvestment(id) {
    await mustWrite(db().from("investments").delete().eq("id", id))
  },

  async getCommissionEntries() {
    const [entries, projects, talhoes] = await Promise.all([
      selectAll("commission_entries"),
      selectAll("projects"),
      selectAll("talhoes"),
    ])
    const projectNames = new Map(projects.map((r) => [r.id as string, r.client_name as string]))
    const talhaoNames = new Map(talhoes.map((r) => [r.id as string, r.name as string]))
    return entries.map((r) => toEntry(r, projectNames, talhaoNames))
  },
  async saveCommissionEntries(list) {
    if (!list.length) return
    await mustWrite(db().from("commission_entries").upsert(list.map(fromEntry)))
  },
  async deleteCommissionEntries(ids) {
    if (!ids.length) return
    await mustWrite(db().from("commission_entries").delete().in("id", ids))
  },
  async getCommissionConfig() {
    const { data, error } = await db().from("commission_config").select("*").maybeSingle()
    if (error) throw new Error(error.message)
    return data ? { percent: num(data.percent), fixedSalary: num(data.fixed_salary) } : DEFAULT_COMMISSION_CONFIG
  },
  async saveCommissionConfig(config) {
    await mustWrite(
      db().from("commission_config").upsert({ percent: config.percent, fixed_salary: config.fixedSalary }),
    )
  },
  async getCommissionAdjustments() {
    const rows = await selectAll("commission_adjustments", undefined, ["period"])
    const map: CommissionAdjustments = {}
    for (const r of rows) {
      map[r.period] = {
        discount: num(r.discount),
        note: opt(r.note),
        employeeDeduction: optNum(r.employee_deduction) || undefined,
        employeeNote: opt(r.employee_note),
      }
    }
    return map
  },
  async saveCommissionAdjustment(period, adj) {
    if (!hasAdjustmentContent(adj)) {
      await mustWrite(db().from("commission_adjustments").delete().eq("period", period))
      return
    }
    await mustWrite(
      db()
        .from("commission_adjustments")
        .upsert(
          {
            period,
            discount: adj.discount || 0,
            note: adj.note || null,
            employee_deduction: adj.employeeDeduction || 0,
            employee_note: adj.employeeNote || null,
          },
          { onConflict: "owner_id,period" },
        ),
    )
  },

  getProposals,
  async getProposal(id) {
    const { data, error } = await db().from("proposals").select("*").eq("id", id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toProposal(data) : null
  },
  async saveProposal(p) {
    await mustWrite(db().from("proposals").upsert(fromProposal(p)))
  },
  async deleteProposal(id) {
    await mustWrite(db().from("proposals").delete().eq("id", id))
  },

  // Sobe um backup do aparelho para a nuvem. Pode rodar de novo: atualiza pelo id, sem duplicar.
  async importBackup(data) {
    const projects = data.projects || []
    for (const p of projects) {
      await mustWrite(
        db()
          .from("projects")
          .upsert({ id: p.id, ...projectColumns(p as Row), created_at: p.createdAt || new Date().toISOString() }),
      )
    }
    const all = <T>(pick: (p: Project) => T[] | undefined, map: (projectId: string, x: T) => Row) =>
      projects.flatMap((p) => (pick(p) || []).map((x) => map(p.id, x)))
    const talhaoRows = all((p) => p.talhoes, fromTalhao)
    const validTalhoes = new Set(talhaoRows.map((r) => r.id as string))
    // Area apontando para talhao que nao existe mais vira area avulsa (o banco exige talhao valido).
    const areaRows = all((p) => p.areas, fromArea).map((r) =>
      r.talhao_id && !validTalhoes.has(r.talhao_id) ? { ...r, talhao_id: null } : r,
    )
    if (talhaoRows.length) await mustWrite(db().from("talhoes").upsert(talhaoRows))
    if (areaRows.length) await mustWrite(db().from("areas").upsert(areaRows))
    const expenseRows = all((p) => p.expenses, fromExpense)
    if (expenseRows.length) await mustWrite(db().from("expenses").upsert(expenseRows))
    const serviceRows = all((p) => p.services, fromService)
    if (serviceRows.length) await mustWrite(db().from("services").upsert(serviceRows))

    for (const v of data.vehicles || []) await cloudBackend.addVehicle(v)
    for (const inv of data.investments || []) await cloudBackend.saveInvestment(inv)

    // Comissoes antigas so guardam o nome do talhao: liga ao talhao do mesmo projeto quando o
    // nome for unico nele (com nome repetido fica so o nome, sem ligacao).
    const knownProjects = new Set(projects.map((p) => p.id))
    const entries = (data.commissionEntries || []).map((e) => {
      const project = projects.find((p) => p.id === e.sourceProjectId)
      const sameName = (project?.talhoes || []).filter(
        (t) => e.talhaoName && t.name.trim().toLowerCase() === e.talhaoName.trim().toLowerCase(),
      )
      return {
        ...e,
        sourceProjectId: e.sourceProjectId && knownProjects.has(e.sourceProjectId) ? e.sourceProjectId : undefined,
        talhaoId: e.talhaoId || (sameName.length === 1 ? sameName[0].id : undefined),
      }
    })
    await cloudBackend.saveCommissionEntries(entries)
    if (data.commissionConfig) await cloudBackend.saveCommissionConfig(data.commissionConfig)
    for (const [period, adj] of Object.entries(data.commissionAdjustments || {})) {
      await cloudBackend.saveCommissionAdjustment(period, adj)
    }
    for (const p of data.proposals || []) {
      await mustWrite(db().from("proposals").upsert({ ...fromProposal(p), ...(p.updatedAt ? { updated_at: p.updatedAt } : {}) }))
    }
    // Por ultimo: gravar as areas/gastos acima marcou os projetos como "atualizados agora".
    // Devolve a data real de cada um, que ordena a tela inicial.
    for (const p of projects) {
      if (p.updatedAt) await mustWrite(db().from("projects").update({ updated_at: p.updatedAt }).eq("id", p.id))
    }
  },
}
