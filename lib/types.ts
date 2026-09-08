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
  proposals?: Proposal[]
}

// ---- Propostas comerciais ----
// Documento pre-contrato, para clientes ainda nao convertidos em Project.
// Deliberadamente separado de Project: nao entra em "Frentes ativas", nao
// conta em hectares mapeados/faturamento real, nao afeta comissao.
export interface ProposalItem {
  id: string
  name: string
  billingType: BillingType
  rate: number
  // null so faz sentido para billingType "fixo" (pacote fechado)
  quantity: number | null
  note?: string
}

export interface ProposalDeliverables {
  rawPhotosHd?: boolean
  bannerMap?: boolean
  georefPdf?: boolean
  photoPaperMap?: boolean
}

// Parcela de pagamento: percentual do valor total, atrelado a um marco do projeto
// (ex: assinatura, campo, entrega). O valor em R$ e sempre calculado, nunca digitado
// solto, pra nao ficar dessincronizado se o total da proposta mudar depois.
export interface ProposalPaymentPhase {
  id: string
  label: string
  percent: number
}

// Fase do cronograma estimado (sem datas fixas — duracao em dias/semanas).
export interface ProposalTimelinePhase {
  id: string
  label: string
  duration: string
}

export interface Proposal {
  id: string
  clientName: string
  fazenda?: string
  location?: string
  items: ProposalItem[]
  // Desconto comercial (R$), abatido do subtotal dos itens.
  discount?: number
  discountNote?: string
  // Validade da proposta em dias corridos a partir da data de emissao.
  validityDays?: number
  // Texto livre (retrocompativel). Se paymentSchedule tiver itens, o documento
  // prioriza a tabela de parcelas e usa este campo so como observacao complementar.
  paymentTerms?: string
  paymentSchedule?: ProposalPaymentPhase[]
  timeline?: ProposalTimelinePhase[]
  // Responsabilidades do cliente / condicoes, uma por linha.
  clientResponsibilities?: string
  // Numeros/fatos reais de credibilidade (ex: hectares ja mapeados na regiao),
  // uma linha por item. Deixado vazio por padrao — nunca inventado pelo app.
  experienceNote?: string
  notes?: string
  deliverables?: ProposalDeliverables
  createdAt: string
  updatedAt?: string
}
