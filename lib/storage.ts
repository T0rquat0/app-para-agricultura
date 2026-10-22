// ============================================================
// CAMADA DE DADOS (REPOSITORIO)
// As telas so falam com este arquivo. Ele escolhe onde os dados ficam:
// - banco configurado (NEXT_PUBLIC_SUPABASE_*): nuvem, storage-cloud.ts;
// - sem banco: no aparelho, storage-local.ts (o jeito original).
// Cada funcao mexe so no item envolvido (uma area, um gasto...).
// ============================================================

import { projectNetRevenue, totalExpenses } from "./calculations"
import { todayISO } from "./format"
import { cloudBackend } from "./storage-cloud"
import { localBackend } from "./storage-local"
import type { StorageBackend } from "./storage-backend"
import { isSupabaseConfigured } from "./supabase"
import type {
  Area,
  BackupData,
  CommissionAdjustment,
  CommissionConfig,
  CommissionEntry,
  Expense,
  FinancialOverview,
  Investment,
  Project,
  ProjectPatch,
  Proposal,
  Service,
  Talhao,
} from "./types"

function backend(): StorageBackend {
  return isSupabaseConfigured() ? cloudBackend : localBackend
}

// Pede ao navegador para nao apagar os dados sozinho (o Safari do iPhone limpa sites
// pouco usados). Chamado uma vez ao abrir o app; se negar, segue funcionando igual.
export function requestPersistentStorage() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return
  navigator.storage.persist().catch(() => {})
}

// ---- Projetos ----
export const getIndex = () => backend().getIndex()
export const getProject = (id: string) => backend().getProject(id)
export const getAllProjects = () => backend().getAllProjects()
export const createProject = (p: Project) => backend().createProject(p)
export const updateProject = (id: string, patch: ProjectPatch) => backend().updateProject(id, patch)
export const deleteProjectById = (id: string) => backend().deleteProject(id)

export const addTalhao = (projectId: string, t: Talhao) => backend().addTalhao(projectId, t)
export const updateTalhao = (projectId: string, t: Talhao) => backend().updateTalhao(projectId, t)
export const deleteTalhao = (projectId: string, talhaoId: string) => backend().deleteTalhao(projectId, talhaoId)

export const addArea = (projectId: string, a: Area) => backend().addArea(projectId, a)
export const updateArea = (projectId: string, a: Area) => backend().updateArea(projectId, a)
export const deleteArea = (projectId: string, areaId: string) => backend().deleteArea(projectId, areaId)

export const addExpense = (projectId: string, e: Expense) => backend().addExpense(projectId, e)
export const deleteExpense = (projectId: string, expenseId: string) => backend().deleteExpense(projectId, expenseId)

export const addService = (projectId: string, s: Service) => backend().addService(projectId, s)
export const updateService = (projectId: string, s: Service) => backend().updateService(projectId, s)
export const deleteService = (projectId: string, serviceId: string) => backend().deleteService(projectId, serviceId)

// ---- Veiculos (lista global usada nos gastos de combustivel) ----
export const getVehicles = () => backend().getVehicles()
export const addVehicle = (name: string) => backend().addVehicle(name)

// ---- Investimentos (CAPEX da divisao de levantamento) ----
export const getInvestments = () => backend().getInvestments()
export const saveInvestment = (inv: Investment) => backend().saveInvestment(inv)
export const deleteInvestment = (id: string) => backend().deleteInvestment(id)

export function totalInvested(list: Investment[]): number {
  return (list || []).reduce((s, i) => s + Number(i.value || 0), 0)
}

// ---- Visao financeira agregada ----
export async function getFinancialOverview(): Promise<FinancialOverview> {
  const [projects, investments] = await Promise.all([getAllProjects(), getInvestments()])
  let totalContract = 0
  let totalOpEx = 0
  for (const p of projects) {
    totalContract += projectNetRevenue(p)
    totalOpEx += totalExpenses(p)
  }
  const invested = totalInvested(investments)
  return {
    totalContract,
    totalOpEx,
    invested,
    balance: totalContract - totalOpEx - invested,
    projectCount: projects.length,
    investments,
  }
}

// ---- Comissao (lancamentos de levantamento por periodo + config) ----
export const getCommissionEntries = () => backend().getCommissionEntries()
export const saveCommissionEntries = (list: CommissionEntry[]) => backend().saveCommissionEntries(list)
export const deleteCommissionEntries = (ids: string[]) => backend().deleteCommissionEntries(ids)
export const getCommissionConfig = () => backend().getCommissionConfig()
export const saveCommissionConfig = (config: CommissionConfig) => backend().saveCommissionConfig(config)
export const getCommissionAdjustments = () => backend().getCommissionAdjustments()
export const saveCommissionAdjustment = (period: string, adj: CommissionAdjustment | null) =>
  backend().saveCommissionAdjustment(period, adj)

// ---- Propostas comerciais ----
export const getProposals = () => backend().getProposals()
export const getProposal = (id: string) => backend().getProposal(id)
export const saveProposal = (p: Proposal) => backend().saveProposal(p)
export const deleteProposal = (id: string) => backend().deleteProposal(id)

// ---- Backup manual (export/import de arquivo JSON) ----
export async function exportBackup() {
  const [projects, vehicles, investments, commissionEntries, commissionConfig, commissionAdjustments, proposals] =
    await Promise.all([
      getAllProjects(),
      getVehicles(),
      getInvestments(),
      getCommissionEntries(),
      getCommissionConfig(),
      getCommissionAdjustments(),
      getProposals(),
    ])
  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
    vehicles,
    investments,
    commissionEntries,
    commissionConfig,
    commissionAdjustments,
    proposals,
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "ags_painel_backup_" + todayISO() + ".json"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const importBackup = (data: Partial<BackupData>) => backend().importBackup(data)
