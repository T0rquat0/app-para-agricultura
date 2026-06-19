// Calculos derivados — copiados fielmente do app original.
// NAO alterar: estas formulas definem faturamento, progresso e margens.

import { fmtHa, fmtMoney } from "./format"
import type { Project, Service, Talhao } from "./types"

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
