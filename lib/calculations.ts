// Calculos derivados — copiados fielmente do app original.
// NAO alterar: estas formulas definem faturamento, progresso e margens.
// (andamentoProjeto, mais abaixo, e novo: e o "falta voar" das telas, contando as matriculas.)

import { fmtHa, fmtMoney, todayISO } from "./format"
import { areaHa } from "./geo"
import type { CommissionConfig, CommissionEntry, Project, Proposal, ProposalItem, ProposalPaymentPhase, Service, Talhao } from "./types"

export function mappedHa(p: Project): number {
  return (p.areas || []).reduce((s, a) => s + Number(a.hectares || 0), 0)
}

export function pct(p: Project): number {
  const t = Number(p.totalHectares || 0)
  if (!t) return 0
  return (mappedHa(p) / t) * 100
}

// Percentual mapeado a partir de valores ja resolvidos (mapped/total), para uso
// fora do tipo Project completo (ex: ProjectSummary do index).
export function projectPercent(mapped: number, total: number): number {
  if (!total) return 0
  return (Number(mapped) / Number(total)) * 100
}

// Regra unica de "projeto concluido": usa o MESMO arredondamento que aparece na tela
// (pct.toFixed(0)). Evita que um projeto mostre 100% no card mas continue contado
// como "ativo" por uma fracao de hectare — diferenca normal em voo real (buffer de
// borda, zona de nao-voo, arredondamento de poligono). Antes desta funcao havia 3
// regras diferentes (contagem de ativos, card de frente ativa, checkmark da lista),
// cada uma com sua propria tolerancia — corrigido para usar sempre esta.
export function isProjectComplete(mapped: number, total: number): boolean {
  return total > 0 && Math.round(projectPercent(mapped, total)) >= 100
}

export function totalExpenses(p: Project): number {
  return (p.expenses || []).reduce((s, e) => s + Number(e.value || 0), 0)
}

export function talhaoFlown(p: Project, talhaoId: string): number {
  return (p.areas || [])
    .filter((a) => a.talhaoId === talhaoId)
    .reduce((s, a) => s + Number(a.hectares || 0), 0)
}

// Meta da matricula: o tamanho previsto digitado ou, sem ele, a area do contorno do KML.
export function metaMatricula(t: Talhao): number {
  return Number(t.targetHectares || 0) || (t.geometry?.length ? areaHa(t.geometry) : 0)
}

// Quanto falta voar e o andamento do projeto. Com matriculas que tem meta, vale a soma do que
// falta em cada uma (o mapa e a lista mostram isso); sem nenhuma, vale o contratado menos o voado.
export function andamentoProjeto(p: Project): { falta: number; pct: number; fechado: boolean } {
  const comMeta = (p.talhoes || []).filter((t) => metaMatricula(t) > 0)
  const voado = mappedHa(p)
  if (!comMeta.length) {
    const total = Number(p.totalHectares || 0)
    return { falta: Math.max(0, total - voado), pct: projectPercent(voado, total), fechado: isProjectComplete(voado, total) }
  }
  let meta = 0
  let feito = 0
  for (const t of comMeta) {
    const m = metaMatricula(t)
    meta += m
    feito += Math.min(talhaoFlown(p, t.id), m)
  }
  const pctFeito = meta > 0 ? (feito / meta) * 100 : 0
  return { falta: Math.max(0, meta - feito), pct: pctFeito, fechado: Math.round(pctFeito) >= 100 }
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

// Desconto concedido ao cliente (R$), limitado ao faturamento bruto.
export function projectDiscount(p: Project): number {
  return Math.min(projectRevenue(p), Math.max(0, Number(p.discount || 0)))
}

// Faturamento efetivamente cobrado do cliente = bruto - desconto.
export function projectNetRevenue(p: Project): number {
  return projectRevenue(p) - projectDiscount(p)
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

// Base de calculo da comissao: faturamento do periodo menos o desconto AO CLIENTE
// do mes (nunca negativa). Este desconto cascateia pelo percentual — reduz a base
// antes de multiplicar, entao 1 real de desconto aqui reduz a comissao em (percent%)
// reais, nao 1 real.
export function commissionBase(entries: CommissionEntry[], period: string, clientDiscount = 0): number {
  return Math.max(0, periodRevenue(entries, period) - Number(clientDiscount || 0))
}

export function commissionVariable(
  entries: CommissionEntry[],
  period: string,
  config: CommissionConfig,
  clientDiscount = 0,
): number {
  return commissionBase(entries, period, clientDiscount) * (Number(config.percent || 0) / 100)
}

// employeeDeduction (adiantamento/desconto do funcionario) abate DIRETO e por
// INTEIRO do total final — nao passa pelo percentual, ao contrario do clientDiscount.
// 1 real de employeeDeduction reduz a comissao final em exatamente 1 real.
export function commissionTotal(
  entries: CommissionEntry[],
  period: string,
  config: CommissionConfig,
  clientDiscount = 0,
  employeeDeduction = 0,
): number {
  const gross = commissionVariable(entries, period, config, clientDiscount) + Number(config.fixedSalary || 0)
  return Math.max(0, gross - Number(employeeDeduction || 0))
}

// Resumo de um mes, numa fonte so para a tela e o relatorio (os numeros nao podem divergir).
// Mesmas regras de commissionTotal: o desconto ao cliente fica limitado ao faturamento e o
// adiantamento ao bruto (variavel + fixo), para que as linhas exibidas somem o total.
export interface CommissionSummary {
  revenue: number
  discount: number
  base: number
  variable: number
  fixedSalary: number
  gross: number
  employeeDeduction: number
  total: number
  hectares: number
  count: number
}

export function commissionSummary(
  entries: CommissionEntry[],
  period: string,
  config: CommissionConfig,
  adjustment?: { discount?: number; employeeDeduction?: number } | null,
): CommissionSummary {
  const list = entriesForPeriod(entries, period)
  const revenue = periodRevenue(entries, period)
  const discount = Math.min(revenue, Math.max(0, Number(adjustment?.discount || 0)))
  const base = commissionBase(entries, period, discount)
  const variable = commissionVariable(entries, period, config, discount)
  const fixedSalary = Number(config.fixedSalary || 0)
  const gross = variable + fixedSalary
  const employeeDeduction = Math.min(Math.max(0, gross), Math.max(0, Number(adjustment?.employeeDeduction || 0)))
  const total = commissionTotal(entries, period, config, discount, employeeDeduction)
  const hectares = list.reduce((s, e) => s + Number(e.hectares || 0), 0)
  return { revenue, discount, base, variable, fixedSalary, gross, employeeDeduction, total, hectares, count: list.length }
}

// Lista de periodos (AAAA-MM) distintos presentes nos lancamentos, mais recente primeiro.
export function availablePeriods(entries: CommissionEntry[]): string[] {
  const set = new Set((entries || []).map((e) => entryPeriod(e)).filter(Boolean))
  return Array.from(set).sort((a, b) => b.localeCompare(a))
}

// Mes atual no horario do aparelho (ver todayISO: toISOString viraria o mes antes da hora).
export function currentPeriod(): string {
  return periodOf(todayISO())
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
  talhaoName?: string
  talhaoId?: string
  hectares: number
  rate: number
  date: string
}

// Agrupa as areas mapeadas por projeto + talhao + data, para que cada lancamento
// automatico represente um talhao (matricula) especifico num dia — permitindo exibir
// o nome do cliente e do talhao lado a lado no relatorio.
export function pullCommissionDrafts(projects: Project[], startDate: string, endDate: string): CommissionDraft[] {
  const byKey = new Map<string, CommissionDraft>()
  for (const p of projects || []) {
    const rate = effectiveCommissionRate(p)
    if (!rate) continue
    const talhaoNameById = new Map((p.talhoes || []).map((t) => [t.id, t.name]))
    for (const a of p.areas || []) {
      const d = a.date
      if (!d || d < startDate || d > endDate) continue
      const talhaoName = talhaoNameById.get(a.talhaoId) || undefined
      const key = `${p.id}|${a.talhaoId || "_"}|${d}`
      const existing = byKey.get(key)
      if (existing) {
        existing.hectares += Number(a.hectares || 0)
      } else {
        byKey.set(key, {
          clientName: p.clientName,
          projectId: p.id,
          talhaoName,
          talhaoId: talhaoName ? a.talhaoId : undefined,
          hectares: Number(a.hectares || 0),
          rate,
          date: d,
        })
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// Plano do "Puxar areas": compara o que foi voado (drafts) com o que ja esta lancado e
// devolve so a diferenca. Antes, puxar apagava e recriava tudo do intervalo; agora:
// - lancamento automatico igual ao voo fica como esta (mesmo id, mesmo mes escolhido);
// - voo que mudou (area editada) atualiza o lancamento existente, mantendo o mes escolhido;
// - voo novo vira lancamento novo; lancamento automatico sem voo (area apagada) sai;
// - lancamento automatico ajustado a mao (auto=false, mas com sourceProjectId) e respeitado:
//   o voo correspondente nao e recriado por cima.
// O mesmo voo e identificado por projeto + matricula (id, ou o nome nos lancamentos antigos) + dia.
export interface CommissionPullPlan {
  add: CommissionDraft[]
  update: { entry: CommissionEntry; draft: CommissionDraft }[]
  // mesmo voo e mesmos valores; so completa o id da matricula nos lancamentos antigos
  backfill: { entry: CommissionEntry; draft: CommissionDraft }[]
  remove: CommissionEntry[]
  unchanged: number
  keptAdjusted: number
}

function sameFlight(e: CommissionEntry, d: CommissionDraft): boolean {
  if ((e.sourceProjectId || "") !== d.projectId || e.date !== d.date) return false
  if (e.talhaoId && d.talhaoId) return e.talhaoId === d.talhaoId
  return (e.talhaoName || "") === (d.talhaoName || "")
}

const sameValues = (e: CommissionEntry, d: CommissionDraft) =>
  Math.abs(Number(e.hectares || 0) - d.hectares) < 1e-6 && Math.abs(Number(e.rate || 0) - d.rate) < 1e-6

export function planCommissionPull(
  existing: CommissionEntry[],
  drafts: CommissionDraft[],
  startDate: string,
  endDate: string,
): CommissionPullPlan {
  const inRange = (e: CommissionEntry) => !!e.date && e.date >= startDate && e.date <= endDate
  const pool = (existing || []).filter((e) => e.auto && inRange(e))
  const adjusted = (existing || []).filter((e) => !e.auto && e.sourceProjectId && inRange(e))
  const used = new Set<string>()
  const matched = new Map<number, CommissionEntry>()
  // 1a passada: casa o voo com o lancamento identico (resolve matriculas de mesmo nome no mesmo dia)
  drafts.forEach((d, i) => {
    const e = pool.find((x) => !used.has(x.id) && sameFlight(x, d) && sameValues(x, d))
    if (e) {
      used.add(e.id)
      matched.set(i, e)
    }
  })
  // 2a passada: o que sobrou do mesmo voo, com valores diferentes
  drafts.forEach((d, i) => {
    if (matched.has(i)) return
    const e = pool.find((x) => !used.has(x.id) && sameFlight(x, d))
    if (e) {
      used.add(e.id)
      matched.set(i, e)
    }
  })
  const usedAdjusted = new Set<string>()
  const plan: CommissionPullPlan = { add: [], update: [], backfill: [], remove: [], unchanged: 0, keptAdjusted: 0 }
  drafts.forEach((d, i) => {
    const e = matched.get(i)
    if (e) {
      if (!sameValues(e, d)) plan.update.push({ entry: e, draft: d })
      else {
        plan.unchanged++
        if ((e.talhaoId || undefined) !== (d.talhaoId || undefined)) plan.backfill.push({ entry: e, draft: d })
      }
      return
    }
    const adj = adjusted.find((x) => !usedAdjusted.has(x.id) && sameFlight(x, d))
    if (adj) {
      usedAdjusted.add(adj.id)
      plan.keptAdjusted++
      return
    }
    plan.add.push(d)
  })
  plan.remove = pool.filter((e) => !used.has(e.id))
  return plan
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

// ---- Propostas comerciais ----
// Quantidade sempre informada manualmente no item (nada foi mapeado ainda),
// diferente de serviceQuantity() que deriva de areas ja voadas do Project.
export function proposalItemTotal(item: ProposalItem): number {
  if (item.billingType === "fixo") return Number(item.rate || 0)
  return Number(item.rate || 0) * Number(item.quantity || 0)
}

export function proposalSubtotal(p: Proposal): number {
  return (p.items || []).reduce((sum, i) => sum + proposalItemTotal(i), 0)
}

// Desconto entre zero e o subtotal (um valor negativo nao pode aumentar o total).
export function proposalDiscount(p: Proposal): number {
  return Math.min(Math.max(0, Number(p.discount || 0)), proposalSubtotal(p))
}

export function proposalTotal(p: Proposal): number {
  return Math.max(0, proposalSubtotal(p) - proposalDiscount(p))
}

export function proposalItemPricingSummary(item: ProposalItem): string {
  if (item.billingType === "fixo") {
    if (!item.rate) return "Defina o valor do pacote"
    return `Pacote fechado · ${fmtMoney(item.rate)}`
  }
  const unit = item.billingType === "metro" ? "m" : "ha"
  if (!item.rate || !item.quantity) return `Defina R$/${unit} e a quantidade`
  // Quantidade como foi digitada (ate 2 casas): arredondar a 1 casa (fmtHa) mostraria uma conta
  // que nao fecha com o total.
  const qtyLabel = item.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  return `${fmtMoney(item.rate)}/${unit} × ${qtyLabel} ${unit} = ${fmtMoney(proposalItemTotal(item))}`
}

// Valor em R$ de uma parcela, calculado a partir do percentual — nunca digitado
// solto, pra nao dessincronizar se o total da proposta mudar.
export function paymentPhaseValue(total: number, phase: ProposalPaymentPhase): number {
  return Math.round(total * (Number(phase.percent || 0) / 100) * 100) / 100
}

// Valores em R$ de todas as parcelas. Cada uma e arredondada ao centavo; quando os
// percentuais fecham 100%, a ultima parcela leva a diferenca do arredondamento, para a
// soma das parcelas bater exatamente com o total da proposta.
export function paymentScheduleValues(total: number, schedule: ProposalPaymentPhase[]): number[] {
  const list = schedule || []
  const values = list.map((ph) => paymentPhaseValue(total, ph))
  if (list.length && Math.abs(paymentSchedulePercentTotal(list) - 100) < 1e-9) {
    const rest = values.slice(0, -1).reduce((s, v) => s + v, 0)
    values[values.length - 1] = Math.round((total - rest) * 100) / 100
  }
  return values
}

// Area do levantamento: o maior item cobrado por hectare. Os servicos da proposta costumam
// cobrir a mesma area (levantamento + curva de nivel sobre os mesmos ha), entao somar
// contaria a area duas vezes.
export function proposalAreaHa(p: Proposal): number {
  return (p.items || [])
    .filter((i) => i.billingType === "hectare")
    .reduce((m, i) => Math.max(m, Number(i.quantity || 0)), 0)
}

export function paymentSchedulePercentTotal(schedule: ProposalPaymentPhase[]): number {
  return (schedule || []).reduce((sum, p) => sum + Number(p.percent || 0), 0)
}
