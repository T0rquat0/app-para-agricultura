// Modelo de dados do Painel de Levantamentos AGS.
// Mantido fiel ao app original para nao alterar regras de negocio.

export type ServiceStatus = "pendente" | "andamento" | "concluido"
export type BillingType = "hectare" | "metro" | "fixo"

export interface Area {
  id: string
  talhaoId: string
  hectares: number
  date: string
  note?: string
  name?: string
  createdAt?: string
}

export interface Talhao {
  id: string
  name: string
  identifier?: string
  targetHectares: number | null
  createdAt: string
}

export interface Service {
  id: string
  name: string
  status: ServiceStatus
  billingType: BillingType
  rate: number
  quantity: number | null
  updatedAt?: string
  createdAt?: string
}

export interface Expense {
  id: string
  category: string
  vehicle?: string
  description?: string
  value: number
  date: string
  note?: string
  createdAt?: string
}

export interface Project {
  id: string
  clientName: string
  fazenda?: string
  totalHectares: number
  areas: Area[]
  expenses: Expense[]
  talhoes: Talhao[]
  services: Service[]
  createdAt: string
  updatedAt?: string
}

export interface ProjectSummary {
  id: string
  clientName: string
  fazenda?: string
  totalHectares: number
  mappedHectares: number
  updatedAt?: string
  createdAt?: string
}

export interface Investment {
  id: string
  category: string
  description: string
  value: number
  date: string
}

export interface FinancialOverview {
  totalContract: number
  totalOpEx: number
  invested: number
  balance: number
  projectCount: number
  investments: Investment[]
}

export interface BackupData {
  version: number
  exportedAt: string
  projects: Project[]
  vehicles: string[]
  investments: Investment[]
}
