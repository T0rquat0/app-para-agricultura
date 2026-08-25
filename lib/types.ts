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
  clientNote?: string
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
  commissionRate?: number
  // Desconto concedido ao cliente (R$), abatido do total dos servicos no relatorio do cliente.
  discount?: number
  discountNote?: string
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
  name: string
  value: number
  date: string
  note?: string
  createdAt?: string
}

export interface FinancialOverview {
  totalContract: number
  totalOpEx: number
  invested: number
  balance: number
  projectCount: number
  investments: Investment[]
}

export interface CommissionEntry {
  id: string
  clientName: string
  hectares: number
  rate: number
  date: string
  note?: string
  createdAt?: string
  auto?: boolean
  sourceProjectId?: string
  // Nome do talhao/matricula de origem (quando puxado automaticamente das areas mapeadas).
  talhaoName?: string
  // Mes (AAAA-MM) em que o usuario decidiu receber a comissao, sobrescrevendo o mes
  // da data real. Usado para adiar/antecipar o recebimento sem alterar a data real
  // (que continua sendo usada pelo "puxar automaticamente" para deduplicar).
  attributedPeriod?: string
}

export interface CommissionConfig {
  percent: number
  fixedSalary: number
}

// Ajuste por periodo (AAAA-MM): desconto/adiantamento que reduz a base de calculo
// da comissao variavel. Ex.: faturou 136k mas so sera cobrado 130k -> desconto 6k,
// e a comissao passa a incidir sobre 130k.
export interface CommissionAdjustment {
  discount: number
  note?: string
}

export type CommissionAdjustments = Record<string, CommissionAdjustment>

export interface BackupData {
  version: number
  exportedAt: string
  projects: Project[]
  vehicles: string[]
  investments: Investment[]
  commissionEntries?: CommissionEntry[]
  commissionConfig?: CommissionConfig
  commissionAdjustments?: CommissionAdjustments
}
