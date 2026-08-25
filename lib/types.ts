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

// Ajuste por periodo (AAAA-MM): dois tipos de desconto, com efeito matematico
// diferente sobre a comissao final:
// - discount: desconto AO CLIENTE. Abate do faturamento ANTES de aplicar o %.
//   Ex.: faturou 136k mas so sera cobrado 130k -> desconto 6k, comissao incide sobre 130k.
// - employeeDeduction: adiantamento/desconto DO FUNCIONARIO. Abate direto e por
//   inteiro do valor final da comissao (variavel + fixo), sem passar pelo %.
//   Ex.: ja recebeu 641 adiantado -> employeeDeduction 641, comissao final cai 641 exatos.
export interface CommissionAdjustment {
  discount: number
  note?: string
  employeeDeduction?: number
  employeeNote?: string
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
