// ============================================================
// CAMADA DE DADOS (REPOSITORIO)
// Hoje: localStorage. Amanha: trocar SOMENTE este arquivo por
// chamadas ao banco (ex: rotas /api ou cliente do Neon/Supabase).
// A interface assincrona ja esta pronta para isso — nenhuma tela
// precisa mudar quando o backend chegar.
// ============================================================

import { mappedHa, projectRevenue, totalExpenses } from "./calculations"
import type { CommissionConfig, CommissionEntry, FinancialOverview, Investment, Project, ProjectSummary } from "./types"

const KEYS = {
  index: "ags-projects-index",
  project: (id: string) => "ags-project-" + id,
  vehicles: "ags-vehicles",
  investments: "ags-investments",
  commissionEntries: "ags-commission-entries",
  commissionConfig: "ags-commission-config",
}

const DEFAULT_COMMISSION_CONFIG: CommissionConfig = { percent: 10, fixedSalary: 2000 }

function read(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, value)
  } catch (e) {
    console.error("[v0] storage write failed", e)
  }
}

function remove(key: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch (e) {
    console.error("[v0] storage remove failed", e)
  }
}

// ---- Projetos ----
export async function getIndex(): Promise<ProjectSummary[]> {
  const v = read(KEYS.index)
  try {
    return v ? (JSON.parse(v) as ProjectSummary[]) : []
  } catch {
    return []
  }
}

async function saveIndex(list: ProjectSummary[]) {
  write(KEYS.index, JSON.stringify(list))
}

export async function getProject(id: string): Promise<Project | null> {
  const v = read(KEYS.project(id))
  try {
    return v ? (JSON.parse(v) as Project) : null
  } catch {
    return null
  }
}

export async function saveProject(p: Project): Promise<Project> {
  p.updatedAt = new Date().toISOString()
  write(KEYS.project(p.id), JSON.stringify(p))
  const idx = await getIndex()
  const i = idx.findIndex((x) => x.id === p.id)
  const summary: ProjectSummary = {
    id: p.id,
    clientName: p.clientName,
    fazenda: p.fazenda,
    totalHectares: p.totalHectares,
    mappedHectares: mappedHa(p),
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
  }
  if (i >= 0) idx[i] = summary
  else idx.push(summary)
  await saveIndex(idx)
  return p
}

export async function getAllProjects(): Promise<Project[]> {
  const idx = await getIndex()
  const list: Project[] = []
  for (const summary of idx) {
    const full = await getProject(summary.id)
    if (full) list.push(full)
  }
  return list
}

export async function deleteProjectById(id: string) {
  remove(KEYS.project(id))
  const idx = await getIndex()
  await saveIndex(idx.filter((x) => x.id !== id))
}

// ---- Veiculos (lista global usada nos gastos de combustivel) ----
export async function getVehicles(): Promise<string[]> {
  const v = read(KEYS.vehicles)
  let list: string[] | null = null
  try {
    list = v ? (JSON.parse(v) as string[]) : null
  } catch {
    list = null
  }
  if (!list || !list.length) {
    list = ["Quadriciclo", "Carro 408"]
    write(KEYS.vehicles, JSON.stringify(list))
  }
  return list
}

export async function addVehicle(name: string): Promise<string[]> {
  const list = await getVehicles()
  if (!list.find((x) => x.trim().toLowerCase() === name.trim().toLowerCase())) {
    list.push(name.trim())
    write(KEYS.vehicles, JSON.stringify(list))
  }
  return list
}

// ---- Investimentos (CAPEX da divisao de levantamento) ----
export async function getInvestments(): Promise<Investment[]> {
  const v = read(KEYS.investments)
  try {
    return v ? (JSON.parse(v) as Investment[]) : []
  } catch {
    return []
  }
}

export async function saveInvestments(list: Investment[]) {
  write(KEYS.investments, JSON.stringify(list))
}

export function totalInvested(list: Investment[]): number {
  return (list || []).reduce((s, i) => s + Number(i.value || 0), 0)
}

// ---- Visao financeira agregada ----
export async function getFinancialOverview(): Promise<FinancialOverview> {
  const idx = await getIndex()
  let totalContract = 0
  let totalOpEx = 0
  for (const summary of idx) {
    const full = await getProject(summary.id)
    if (full) {
      totalContract += projectRevenue(full)
      totalOpEx += totalExpenses(full)
    }
  }
  const investments = await getInvestments()
  const invested = totalInvested(investments)
  return {
    totalContract,
    totalOpEx,
    invested,
    balance: totalContract - totalOpEx - invested,
    projectCount: idx.length,
    investments,
  }
}

// ---- Comissao (lancamentos de levantamento por periodo + config) ----
export async function getCommissionEntries(): Promise<CommissionEntry[]> {
  const v = read(KEYS.commissionEntries)
  try {
    return v ? (JSON.parse(v) as CommissionEntry[]) : []
  } catch {
    return []
  }
}

export async function saveCommissionEntries(list: CommissionEntry[]) {
  write(KEYS.commissionEntries, JSON.stringify(list))
}

export async function getCommissionConfig(): Promise<CommissionConfig> {
  const v = read(KEYS.commissionConfig)
  try {
    return v ? (JSON.parse(v) as CommissionConfig) : DEFAULT_COMMISSION_CONFIG
  } catch {
    return DEFAULT_COMMISSION_CONFIG
  }
}

export async function saveCommissionConfig(config: CommissionConfig) {
  write(KEYS.commissionConfig, JSON.stringify(config))
}

// ---- Backup manual (export/import de arquivo JSON) ----
export async function exportBackup() {
  const idx = await getIndex()
  const projects: Project[] = []
  for (const summary of idx) {
    const full = await getProject(summary.id)
    if (full) projects.push(full)
  }
  const vehicles = await getVehicles()
  const investments = await getInvestments()
  const commissionEntries = await getCommissionEntries()
  const commissionConfig = await getCommissionConfig()
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
    vehicles,
    investments,
    commissionEntries,
    commissionConfig,
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "ags_painel_backup_" + new Date().toISOString().slice(0, 10) + ".json"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function importBackup(data: {
  projects?: Project[]
  vehicles?: string[]
  investments?: Investment[]
  commissionEntries?: CommissionEntry[]
  commissionConfig?: CommissionConfig
}) {
  for (const p of data.projects || []) await saveProject(p)
  if (data.vehicles && data.vehicles.length) write(KEYS.vehicles, JSON.stringify(data.vehicles))
  if (data.investments) await saveInvestments(data.investments)
  if (data.commissionEntries) await saveCommissionEntries(data.commissionEntries)
  if (data.commissionConfig) await saveCommissionConfig(data.commissionConfig)
}
