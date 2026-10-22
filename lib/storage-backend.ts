// Contrato das duas formas de guardar os dados: no aparelho (storage-local.ts) e na
// nuvem (storage-cloud.ts). As telas nunca usam estas funcoes direto: passam por storage.ts.
//
// Cada operacao mexe so no item envolvido (uma area, um gasto...). Nunca regrava o projeto
// inteiro: assim dois aparelhos podem lancar no mesmo projeto sem um apagar o do outro.

import type {
  Area,
  BackupData,
  CommissionAdjustment,
  CommissionAdjustments,
  CommissionConfig,
  CommissionEntry,
  Expense,
  Investment,
  Project,
  ProjectPatch,
  ProjectSummary,
  Proposal,
  Service,
  Talhao,
} from "./types"

export interface StorageBackend {
  getIndex(): Promise<ProjectSummary[]>
  getProject(id: string): Promise<Project | null>
  getAllProjects(): Promise<Project[]>
  createProject(p: Project): Promise<void>
  updateProject(id: string, patch: ProjectPatch): Promise<void>
  deleteProject(id: string): Promise<void>

  addTalhao(projectId: string, t: Talhao): Promise<void>
  updateTalhao(projectId: string, t: Talhao): Promise<void>
  // Remove o talhao E as partes voadas dele (mesmo comportamento de sempre do app).
  deleteTalhao(projectId: string, talhaoId: string): Promise<void>

  addArea(projectId: string, a: Area): Promise<void>
  updateArea(projectId: string, a: Area): Promise<void>
  deleteArea(projectId: string, areaId: string): Promise<void>

  addExpense(projectId: string, e: Expense): Promise<void>
  deleteExpense(projectId: string, expenseId: string): Promise<void>

  addService(projectId: string, s: Service): Promise<void>
  updateService(projectId: string, s: Service): Promise<void>
  deleteService(projectId: string, serviceId: string): Promise<void>

  getVehicles(): Promise<string[]>
  addVehicle(name: string): Promise<void>

  getInvestments(): Promise<Investment[]>
  saveInvestment(inv: Investment): Promise<void>
  deleteInvestment(id: string): Promise<void>

  getCommissionEntries(): Promise<CommissionEntry[]>
  // Cria ou atualiza (pelo id) so os lancamentos passados.
  saveCommissionEntries(list: CommissionEntry[]): Promise<void>
  deleteCommissionEntries(ids: string[]): Promise<void>
  getCommissionConfig(): Promise<CommissionConfig>
  saveCommissionConfig(config: CommissionConfig): Promise<void>
  getCommissionAdjustments(): Promise<CommissionAdjustments>
  saveCommissionAdjustment(period: string, adj: CommissionAdjustment | null): Promise<void>

  getProposals(): Promise<Proposal[]>
  getProposal(id: string): Promise<Proposal | null>
  saveProposal(p: Proposal): Promise<void>
  deleteProposal(id: string): Promise<void>

  // Adiciona/atualiza o que vier no backup; nao apaga o que ja existe e nao veio nele.
  importBackup(data: Partial<BackupData>): Promise<void>
}

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = { percent: 10, fixedSalary: 2000 }
export const DEFAULT_VEHICLES = ["Quadriciclo", "Carro 408"]

export function hasAdjustmentContent(adj: CommissionAdjustment | null): adj is CommissionAdjustment {
  return Boolean(adj && (adj.discount > 0 || Number(adj.employeeDeduction || 0) > 0))
}

export function sortByRecent<T extends { updatedAt?: string; createdAt?: string }>(list: T[]): T[] {
  return list.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime(),
  )
}
