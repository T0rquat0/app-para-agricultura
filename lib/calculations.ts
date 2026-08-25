// Calculos derivados — copiados fielmente do app original.
// NAO alterar: estas formulas definem faturamento, progresso e margens.

import { fmtHa, fmtMoney } from "./format"
import type { CommissionConfig, CommissionEntry, Project, Service, Talhao } from "./types"

export function mappedHa(p: Project): number {
  return (p.areas || []).reduce((s, a) => s + Number(a.hectares || 0), 0)
}

export function pct(p: Project): number {
  const t = Number(p.totalHectares || 0)
  if (!t) return 0
  return (mappedHa(p) / t) * 100
}

export function totalExpenses(p: Project): number {
  return (p.expenses || []).reduce((s, e) => s + Number(e.value || 0), 0)
}

export function talhaoFlown(p: Project, talhaoId: string): number {
  return (p.areas || [])
    .filter((a) => a.talhaoId === talhaoId)
    .reduce((s, a) => s + Number(a.hectares || 0), 0)
}

export function talhaoBadge(p: Project, t: Talhao): string {
  if (t.identifier && t.identifier.trim()) return t.identifier.trim()
  const sameName = (p.talhoes || []).filter(
    (x) => x.name.trim().toLowerCase() === t.name.trim().toLowerCase(),
  )
  if (sameName.length > 1) {
    const i = sameName.findIndex((x) => x.id === t.id)
    return "Nº " + (i + 1)
  }
  return ""
}

export function ungroupedAreas(p: Project) {
  const talhaoIds = (p.talhoes || []).map((t) => t.id)
  return (p.areas || []).filter((a) => !a.talhaoId || !talhaoIds.includes(a.talhaoId))
}

export function isAltimetricName(name?: string): boolean {
  return String(name || "").trim().toLowerCase() === "levantamento altimétrico"
}

export function serviceQuantity(p: Project, s: Service): number | null {
  if (s.billingType === "metro") return Number(s.quantity || 0)
  if (s.billingType === "hectare") {
    if (isAltimetricName(s.name)) return mappedHa(p)
    return Number(s.quantity != null ? s.quantity : p.totalHectares || 0)
  }
  return null
}

export function serviceRevenue(p: Project, s: Service): number {
  if (!s) return 0
  if (s.billingType === "fixo") return Number(s.rate || 0)
  const qty = serviceQuantity(p, s)
  return Number(s.rate || 0) * Number(qty || 0)
}

export function projectRevenue(p: Project): number {
  return (p.services || []).reduce((sum, s) => sum + serviceRevenue(p, s), 0)
}

// ---- Comissao ----
// Regra: 10% sobre o faturamento dos levantamentos do periodo + salario fixo.
// (percentual e salario ficam configuraveis, mas o padrao segue essa regra)

// "Periodo" no formato "AAAA-MM", extraido da data (AAAA-MM-DD) do lancamento.
export function periodOf(dateISO: string): string {
  return String(dateISO || "").slice(0, 7)
}

// Mes efetivo de um lancamento para fins de comissao: usa o mes escolhido manualmente
// (attributedPeriod) quando definido, senao cai no mes da data real do lancamento.
// IMPORTANTE: pullCommissionDrafts e a deduplicacao do "puxar automaticamente" usam
// sempre periodOf(e.date) (a data real), nunca esta funcao — para nao recriar em
// duplicidade um lancamento que o usuario moveu manualmente para outro mes.
export function entryPeriod(e: CommissionEntry): string {
  return e.attributedPeriod || periodOf(e.date)
}

export function entryRevenue(e: CommissionEntry): number {
  return Number(e.hectares || 0) * Number(e.rate || 0)
}

export function entriesForPeriod(entries: CommissionEntry[], period: string): CommissionEntry[] {
  return (entries || []).filter((e) => entryPeriod(e) === period)
}

export function periodRevenue(entries: CommissionEntry[], period: string): number {
  return entriesForPeriod(entries, period).reduce((s, e) => s + entryRevenue(e), 0)
}

export function commissionVariable(entries: CommissionEntry[], period: string, config: CommissionConfig): number {
  return periodRevenue(entries, period) * (Number(config.percent || 0) / 100)
}

export function commissionTotal(entries: CommissionEntry[], period: string, config: CommissionConfig): number {
  return commissionVariable(entries, period, config) + Number(config.fixedSalary || 0)
}

// Lista de periodos (AAAA-MM) distintos presentes nos lancamentos, mais recente primeiro.
export function availablePeriods(entries: CommissionEntry[]): string[] {
  const set = new Set((entries || []).map((e) => entryPeriod(e)).filter(Boolean))
  return Array.from(set).sort((a, b) => b.localeCompare(a))
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number)
  if (!y || !m) return period
  const d = new Date(y, m - 1, 1)
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Primeiro e ultimo dia (AAAA-MM-DD) de um periodo "AAAA-MM".
export function periodRange(period: string): { start: string; end: string } {
  const [y, m] = period.split("-").map(Number)
  const start = `${period}-01`
  const lastDay = y && m ? new Date(y, m, 0).getDate() : 31
  const end = `${period}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}

// ---- Puxar comissao automaticamente a partir das areas lancadas nos projetos ----
// Agrupa as partes voadas (Area) de cada projeto por dia, dentro do intervalo,
// e aplica o valor por hectare ja usado para faturar o cliente.

// Valor por hectare a usar na comissao deste projeto:
// 1) Project.commissionRate, se o usuario definiu um valor manual (substitui tudo).
// 2) O servico "Levantamento Altimetrico" (billingType hectare), que ja e o
//    servico que acompanha os hectares mapeados automaticamente.
// 3) Se so existir um servico por hectare no projeto, usa o dele.
// Retorna 0 quando nao da pra decidir sozinho (nenhum servico por hectare, ou mais
// de um sem ser o Levantamento Altimetrico) — nesse caso o projeto e ignorado no pull.
export function effectiveCommissionRate(p: Project): number {
  const manual = Number(p.commissionRate || 0)
  if (manual > 0) return manual
  const hectareServices = (p.services || []).filter((s) => s.billingType === "hectare" && Number(s.rate || 0) > 0)
  if (hectareServices.length === 0) return 0
  const altimetric = hectareServices.find((s) => isAltimetricName(s.name))
  if (altimetric) return Number(altimetric.rate)
  if (hectareServices.length === 1) return Number(hectareServices[0].rate)
  return 0
}

export interface CommissionDraft {
  clientName: string
  projectId: string
  hectares: number
  rate: number
  date: string
}

export function pullCommissionDrafts(projects: Project[], startDate: string, endDate: string): CommissionDraft[] {
  const byKey = new Map<string, CommissionDraft>()
  for (const p of projects || []) {
    const rate = effectiveCommissionRate(p)
    if (!rate) continue
    for (const a of p.areas || []) {
      const d = a.date
      if (!d || d < startDate || d > endDate) continue
      const key = `${p.id}|${d}`
      const existing = byKey.get(key)
      if (existing) {
        existing.hectares += Number(a.hectares || 0)
      } else {
        byKey.set(key, { clientName: p.clientName, projectId: p.id, hectares: Number(a.hectares || 0), rate, date: d })
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// Clientes que tem areas lancadas no intervalo mas nenhum valor de comissao configurado.
export function clientsMissingCommissionRate(projects: Project[], startDate: string, endDate: string): string[] {
  const names = new Set<string>()
  for (const p of projects || []) {
    if (effectiveCommissionRate(p) > 0) continue
    const hasAreaInRange = (p.areas || []).some((a) => a.date && a.date >= startDate && a.date <= endDate)
    if (hasAreaInRange) names.add(p.clientName)
  }
  return Array.from(names)
}

export function pricingSummary(p: Project, s: Service): string {
  if (s.billingType === "fixo") {
    if (!s.rate) return "Toque para definir o valor do pacote"
    return `Pacote fechado · ${fmtMoney(s.rate)}`
  }
  if (s.billingType === "metro") {
    if (!s.rate || !s.quantity) return "Toque para definir R$/metro e a extensão"
    return `${fmtMoney(s.rate)}/m × ${Number(s.quantity).toLocaleString("pt-BR")} m = ${fmtMoney(
      serviceRevenue(p, s),
    )}`
  }
  if (!s.rate) return "Toque para definir o valor por hectare"
  const qty = serviceQuantity(p, s) || 0
  const qtyLabel = isAltimetricName(s.name) ? `${fmtHa(qty)} ha mapeados` : `${fmtHa(qty)} ha`
  return `${fmtMoney(s.rate)}/ha × ${qtyLabel} = ${fmtMoney(serviceRevenue(p, s))}`
}
