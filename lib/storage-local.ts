// Dados guardados no proprio aparelho (localStorage) — o jeito original do app.
// NAO mudar as chaves nem o formato: os dados reais do celular estao nelas.

import { mappedHa } from "./calculations"
import {
  DEFAULT_COMMISSION_CONFIG,
  DEFAULT_VEHICLES,
  hasAdjustmentContent,
  sortByRecent,
  type StorageBackend,
} from "./storage-backend"
import type {
  CommissionAdjustments,
  CommissionConfig,
  CommissionEntry,
  Investment,
  Project,
  ProjectSummary,
  Proposal,
} from "./types"

const KEYS = {
  index: "ags-projects-index",
  project: (id: string) => "ags-project-" + id,
  vehicles: "ags-vehicles",
  investments: "ags-investments",
  commissionEntries: "ags-commission-entries",
  commissionConfig: "ags-commission-config",
  commissionAdjustments: "ags-commission-adjustments",
  proposals: "ags-proposals",
}

function read(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function readJson<T>(key: string, fallback: T): T {
  const v = read(key)
  try {
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, value)
  } catch (e) {
    console.error("[v0] storage write failed", e)
    // Antes a falha (ex.: armazenamento cheio) so ia para o console e a tela parecia ter salvo.
    window.alert("Não foi possível salvar no aparelho. Exporte um backup agora e libere espaço no celular.")
    throw e
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
async function getIndex(): Promise<ProjectSummary[]> {
  return readJson<ProjectSummary[]>(KEYS.index, [])
}

async function getProject(id: string): Promise<Project | null> {
  return readJson<Project | null>(KEYS.project(id), null)
}

async function saveProject(p: Project) {
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
  write(KEYS.index, JSON.stringify(idx))
}

// Le o projeto atual do aparelho, aplica a mudanca e grava.
async function mutateProject(id: string, change: (p: Project) => void) {
  const p = await getProject(id)
  if (!p) throw new Error("Projeto não encontrado: " + id)
  change(p)
  await saveProject(p)
}

function upsertById<T extends { id: string }>(list: T[], items: T[]): T[] {
  const out = list.slice()
  for (const item of items) {
    const i = out.findIndex((x) => x.id === item.id)
    if (i >= 0) out[i] = item
    else out.push(item)
  }
  return out
}

async function getProposals(): Promise<Proposal[]> {
  return sortByRecent(readJson<Proposal[]>(KEYS.proposals, []))
}

export const localBackend: StorageBackend = {
  getIndex,
  getProject,

  async getAllProjects() {
    const list: Project[] = []
    for (const summary of await getIndex()) {
      const full = await getProject(summary.id)
      if (full) list.push(full)
    }
    return list
  },

  async createProject(p) {
    await saveProject(p)
  },

  async updateProject(id, patch) {
    await mutateProject(id, (p) => Object.assign(p, patch))
  },

  async deleteProject(id) {
    remove(KEYS.project(id))
    const idx = await getIndex()
    write(KEYS.index, JSON.stringify(idx.filter((x) => x.id !== id)))
  },

  async addTalhao(projectId, t) {
    await mutateProject(projectId, (p) => {
      p.talhoes = [...(p.talhoes || []), t]
    })
  },
  async updateTalhao(projectId, t) {
    await mutateProject(projectId, (p) => {
      p.talhoes = (p.talhoes || []).map((x) => (x.id === t.id ? t : x))
    })
  },
  async deleteTalhao(projectId, talhaoId) {
    await mutateProject(projectId, (p) => {
      p.talhoes = (p.talhoes || []).filter((t) => t.id !== talhaoId)
      p.areas = (p.areas || []).filter((a) => a.talhaoId !== talhaoId)
    })
  },

  async addArea(projectId, a) {
    await mutateProject(projectId, (p) => {
      p.areas = [...(p.areas || []), a]
    })
  },
  async updateArea(projectId, a) {
    await mutateProject(projectId, (p) => {
      p.areas = (p.areas || []).map((x) => (x.id === a.id ? a : x))
    })
  },
  async deleteArea(projectId, areaId) {
    await mutateProject(projectId, (p) => {
      p.areas = (p.areas || []).filter((a) => a.id !== areaId)
    })
  },

  async addExpense(projectId, e) {
    await mutateProject(projectId, (p) => {
      p.expenses = [...(p.expenses || []), e]
    })
  },
  async deleteExpense(projectId, expenseId) {
    await mutateProject(projectId, (p) => {
      p.expenses = (p.expenses || []).filter((e) => e.id !== expenseId)
    })
  },

  async addService(projectId, s) {
    await mutateProject(projectId, (p) => {
      p.services = [...(p.services || []), s]
    })
  },
  async updateService(projectId, s) {
    await mutateProject(projectId, (p) => {
      p.services = (p.services || []).map((x) => (x.id === s.id ? s : x))
    })
  },
  async deleteService(projectId, serviceId) {
    await mutateProject(projectId, (p) => {
      p.services = (p.services || []).filter((s) => s.id !== serviceId)
    })
  },

  // ---- Veiculos (lista global usada nos gastos de combustivel) ----
  async getVehicles() {
    let list = readJson<string[] | null>(KEYS.vehicles, null)
    if (!list || !list.length) {
      list = DEFAULT_VEHICLES.slice()
      write(KEYS.vehicles, JSON.stringify(list))
    }
    return list
  },
  async addVehicle(name) {
    const list = await localBackend.getVehicles()
    if (!list.find((x) => x.trim().toLowerCase() === name.trim().toLowerCase())) {
      list.push(name.trim())
      write(KEYS.vehicles, JSON.stringify(list))
    }
  },

  // ---- Investimentos ----
  async getInvestments() {
    return readJson<Investment[]>(KEYS.investments, [])
  },
  async saveInvestment(inv) {
    write(KEYS.investments, JSON.stringify(upsertById(await localBackend.getInvestments(), [inv])))
  },
  async deleteInvestment(id) {
    const list = await localBackend.getInvestments()
    write(KEYS.investments, JSON.stringify(list.filter((x) => x.id !== id)))
  },

  // ---- Comissao ----
  async getCommissionEntries() {
    return readJson<CommissionEntry[]>(KEYS.commissionEntries, [])
  },
  async saveCommissionEntries(list) {
    const all = upsertById(await localBackend.getCommissionEntries(), list)
    write(KEYS.commissionEntries, JSON.stringify(all))
  },
  async deleteCommissionEntries(ids) {
    const drop = new Set(ids)
    const list = await localBackend.getCommissionEntries()
    write(KEYS.commissionEntries, JSON.stringify(list.filter((x) => !drop.has(x.id))))
  },
  async getCommissionConfig() {
    return readJson<CommissionConfig>(KEYS.commissionConfig, DEFAULT_COMMISSION_CONFIG)
  },
  async saveCommissionConfig(config) {
    write(KEYS.commissionConfig, JSON.stringify(config))
  },
  // Mapa { "AAAA-MM": { discount, note, employeeDeduction, employeeNote } }.
  async getCommissionAdjustments() {
    return readJson<CommissionAdjustments>(KEYS.commissionAdjustments, {})
  },
  async saveCommissionAdjustment(period, adj) {
    const map = await localBackend.getCommissionAdjustments()
    if (hasAdjustmentContent(adj)) map[period] = adj
    else delete map[period]
    write(KEYS.commissionAdjustments, JSON.stringify(map))
  },

  // ---- Propostas (lista unica numa chave so; volume baixo) ----
  getProposals,
  async getProposal(id) {
    return (await getProposals()).find((p) => p.id === id) || null
  },
  async saveProposal(p) {
    p.updatedAt = new Date().toISOString()
    write(KEYS.proposals, JSON.stringify(upsertById(await getProposals(), [p])))
  },
  async deleteProposal(id) {
    const list = await getProposals()
    write(KEYS.proposals, JSON.stringify(list.filter((x) => x.id !== id)))
  },

  async importBackup(data) {
    for (const p of data.projects || []) await saveProject(p)
    if (data.vehicles && data.vehicles.length) write(KEYS.vehicles, JSON.stringify(data.vehicles))
    if (data.investments) write(KEYS.investments, JSON.stringify(data.investments))
    if (data.commissionEntries) write(KEYS.commissionEntries, JSON.stringify(data.commissionEntries))
    if (data.commissionConfig) write(KEYS.commissionConfig, JSON.stringify(data.commissionConfig))
    if (data.commissionAdjustments) write(KEYS.commissionAdjustments, JSON.stringify(data.commissionAdjustments))
    if (data.proposals && data.proposals.length) write(KEYS.proposals, JSON.stringify(data.proposals))
  },
}
