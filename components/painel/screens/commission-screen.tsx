"use client"

import { useMemo, useState } from "react"
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react"
import { useNav } from "../nav-context"
import {
  useAllProjects,
  useCommissionAdjustments,
  useCommissionConfig,
  useCommissionEntries,
  useIndex,
  useRefresh,
} from "@/lib/hooks"
import {
  deleteCommissionEntries,
  getCommissionConfig,
  getCommissionEntries,
  saveCommissionAdjustment,
  saveCommissionConfig,
  saveCommissionEntries,
} from "@/lib/storage"
import {
  clientsMissingCommissionRate,
  commissionSummary,
  commissionTotal,
  currentPeriod,
  entriesForPeriod,
  entryPeriod,
  entryRevenue,
  periodLabel,
  periodOf,
  periodRange,
  planCommissionPull,
  pullCommissionDrafts,
  type CommissionDraft,
} from "@/lib/calculations"
import { fmtDate, fmtHa, fmtMoney, genId, numInput, parseNum, todayISO } from "@/lib/format"
import type { CommissionEntry } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TopBar, EmptyState, SectionTitle, Dinheiro, corDoFluxo } from "../chrome"
import { ModalSheet } from "../modal-sheet"
import { Field, Hint, NumberInput, TextInput } from "../fields"
import { IconButton, SecondaryButton } from "../buttons"
import { ConfirmDeleteSheet, FormAlert, SheetActions } from "../modals"

// Pilula de estado: tinta palida do papel, 12px/600
function Pill({ tone = "neutral", children }: { tone?: "neutral" | "warning"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold leading-[18px]",
        tone === "neutral" && "bg-foreground/[0.07] text-muted-foreground",
        tone === "warning" && "bg-warning/12 text-warning",
      )}
    >
      {children}
    </span>
  )
}

const AUTO_NOTE = "Puxado automaticamente das áreas mapeadas"

const rowIconBtn =
  "pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"

export function CommissionScreen() {
  const { goReport, currentPeriod: navPeriod, setPeriod: setNavPeriod } = useNav()
  const { entries, isLoading: entriesLoading } = useCommissionEntries()
  const { config } = useCommissionConfig()
  const { adjustments } = useCommissionAdjustments()
  const { index } = useIndex()
  const { projects } = useAllProjects()
  const refresh = useRefresh()

  const [period, setPeriod] = useState(navPeriod || currentPeriod())
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CommissionEntry | null>(null)
  const [clientName, setClientName] = useState("")
  const [hectares, setHectares] = useState("")
  const [rate, setRate] = useState("")
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState("")

  const [configOpen, setConfigOpen] = useState(false)
  const [percentInput, setPercentInput] = useState(String(config.percent))
  const [salaryInput, setSalaryInput] = useState(String(config.fixedSalary))

  const [pullOpen, setPullOpen] = useState(false)
  const [pullStart, setPullStart] = useState("")
  const [pullEnd, setPullEnd] = useState("")
  const [pullOtherRange, setPullOtherRange] = useState(false)
  const [pullBusy, setPullBusy] = useState(false)

  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set())

  const [moveOpen, setMoveOpen] = useState(false)
  const [moveClient, setMoveClient] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState("")

  const [formError, setFormError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CommissionEntry | null>(null)

  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState("")
  const [discountNoteInput, setDiscountNoteInput] = useState("")
  const [employeeDeductionInput, setEmployeeDeductionInput] = useState("")
  const [employeeNoteInput, setEmployeeNoteInput] = useState("")

  const periodEntries = useMemo(
    () => entriesForPeriod(entries, period).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [entries, period],
  )
  const adjustment = adjustments[period]
  const {
    revenue,
    discount,
    base,
    variable,
    employeeDeduction,
    total,
    hectares: monthHectares,
  } = commissionSummary(entries, period, config, adjustment)
  const autoCount = periodEntries.filter((e) => e.auto).length

  // O "Puxar areas" mostra antes o que vai mudar; nada e apagado sem aparecer aqui.
  const pullValid = !!pullStart && !!pullEnd && pullStart <= pullEnd
  const pullPlan = useMemo(
    () =>
      pullOpen && pullValid
        ? planCommissionPull(entries, pullCommissionDrafts(projects, pullStart, pullEnd), pullStart, pullEnd)
        : null,
    [pullOpen, pullValid, entries, projects, pullStart, pullEnd],
  )
  const pullMissing = useMemo(
    () => (pullOpen && pullValid ? clientsMissingCommissionRate(projects, pullStart, pullEnd) : []),
    [pullOpen, pullValid, projects, pullStart, pullEnd],
  )
  const pullChanges = pullPlan ? pullPlan.add.length + pullPlan.update.length + pullPlan.remove.length : 0
  const manualCount = periodEntries.length - autoCount

  // Agrupa os lancamentos do mes por cliente, mantendo a ordem por maior faturamento primeiro.
  const groupedByClient = useMemo(() => {
    const map = new Map<string, { entries: CommissionEntry[]; revenue: number }>()
    for (const e of periodEntries) {
      const cur = map.get(e.clientName) || { entries: [], revenue: 0 }
      cur.entries.push(e)
      cur.revenue += entryRevenue(e)
      map.set(e.clientName, cur)
    }
    return Array.from(map.entries())
      .map(([clientName, v]) => ({ clientName, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [periodEntries])

  function toggleClient(name: string) {
    setCollapsedClients((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Historico dos ultimos 6 meses (incluindo o atual), para dar contexto de tendencia.
  const history = useMemo(() => {
    const [y, m] = period.split("-").map(Number)
    const months: { period: string; total: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1)
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      months.push({
        period: p,
        total: commissionTotal(entries, p, config, adjustments[p]?.discount || 0, adjustments[p]?.employeeDeduction || 0),
      })
    }
    return months
  }, [entries, period, config, adjustments])
  const historyMax = Math.max(1, ...history.map((h) => h.total))
  const prevMonthTotal = history[history.length - 2]?.total ?? 0
  const monthDelta = prevMonthTotal > 0 ? ((total - prevMonthTotal) / prevMonthTotal) * 100 : null

  function shiftPeriod(delta: number) {
    const [y, m] = period.split("-").map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  function openPull() {
    const { start, end } = periodRange(period)
    setPullStart(start)
    setPullEnd(end)
    setPullOtherRange(false)
    setPullOpen(true)
  }

  // Aplica so a diferenca calculada por planCommissionPull: o lancamento atualizado mantem
  // o id e o mes escolhido (attributedPeriod), e o ajustado a mao nao e tocado.
  async function applyPull() {
    if (!pullPlan || pullChanges + pullPlan.backfill.length === 0) {
      setPullOpen(false)
      return
    }
    setPullBusy(true)
    const fromDraft = (d: CommissionDraft) => ({
      clientName: d.clientName,
      hectares: d.hectares,
      rate: d.rate,
      date: d.date,
      sourceProjectId: d.projectId,
      talhaoName: d.talhaoName,
      talhaoId: d.talhaoId,
    })
    const now = new Date().toISOString()
    const toSave: CommissionEntry[] = [
      ...pullPlan.add.map((d) => ({ id: genId("com"), ...fromDraft(d), note: AUTO_NOTE, createdAt: now, auto: true })),
      ...pullPlan.update.map(({ entry, draft }) => ({ ...entry, ...fromDraft(draft) })),
      ...pullPlan.backfill.map(({ entry, draft }) => ({ ...entry, talhaoId: draft.talhaoId })),
    ]
    try {
      if (pullPlan.remove.length) await deleteCommissionEntries(pullPlan.remove.map((e) => e.id))
      if (toSave.length) await saveCommissionEntries(toSave)
      setPullOpen(false)
    } finally {
      setPullBusy(false)
      refresh()
    }
  }

  function openNew() {
    setEditing(null)
    setClientName("")
    setHectares("")
    setRate("")
    setDate(todayISO())
    setNote("")
    setFormError(null)
    setOpen(true)
  }

  function openEdit(e: CommissionEntry) {
    setEditing(e)
    setClientName(e.clientName)
    setHectares(numInput(e.hectares))
    setRate(numInput(e.rate))
    setDate(e.date || todayISO())
    setNote(e.note || "")
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (!clientName.trim()) {
      setFormError("Informe o nome do cliente.")
      return
    }
    const ha = parseNum(hectares)
    const rt = parseNum(rate)
    if (!(ha > 0)) {
      setFormError("Informe os hectares levantados (maior que zero).")
      return
    }
    if (!(rt > 0)) {
      setFormError("Informe o valor por hectare (maior que zero).")
      return
    }
    setFormError(null)
    const fields = { clientName: clientName.trim(), hectares: ha, rate: rt, date, note: note.trim() }
    // Mexer num lancamento automatico o torna "ajustado a mao" (auto=false, mantem a origem):
    // assim o proximo "Puxar areas" respeita a correcao em vez de recriar o original.
    const changedAuto =
      !!editing?.auto &&
      (fields.clientName !== editing.clientName ||
        ha !== Number(editing.hectares) ||
        rt !== Number(editing.rate) ||
        date !== editing.date)
    await saveCommissionEntries([
      editing
        ? { ...editing, ...fields, ...(changedAuto ? { auto: false } : {}) }
        : { id: genId("com"), ...fields, createdAt: new Date().toISOString() },
    ])
    setOpen(false)
    refresh()
  }

  function openMove(clientName: string) {
    setMoveClient(clientName)
    // sugere o proximo mes como padrao, ja que e o caso de uso mais comum (adiar)
    const [y, m] = period.split("-").map(Number)
    const d = new Date(y, m, 1)
    setMoveTarget(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    setMoveOpen(true)
  }

  async function runMove() {
    if (!moveClient || !moveTarget) return
    const list = await getCommissionEntries()
    const updated = list
      .filter((e) => e.clientName === moveClient && entryPeriod(e) === period)
      // Se o destino coincide com o mes real da data, remove o override (volta ao padrao).
      .map((e) => ({ ...e, attributedPeriod: moveTarget === periodOf(e.date) ? undefined : moveTarget }))
    await saveCommissionEntries(updated)
    setMoveOpen(false)
    refresh()
  }

  async function resetMove(clientName: string) {
    const list = await getCommissionEntries()
    const updated = list
      .filter((e) => e.clientName === clientName && entryPeriod(e) === period)
      .map((e) => ({ ...e, attributedPeriod: undefined }))
    await saveCommissionEntries(updated)
    refresh()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    await deleteCommissionEntries([pendingDelete.id])
    setPendingDelete(null)
    refresh()
  }

  async function saveConfig() {
    const percent = parseNum(percentInput)
    const fixedSalary = parseNum(salaryInput)
    if (percentInput.trim() === "" || salaryInput.trim() === "" || Number.isNaN(percent) || Number.isNaN(fixedSalary)) {
      setConfigError("Informe valores numéricos válidos.")
      return
    }
    if (percent < 0 || fixedSalary < 0) {
      setConfigError("Os valores não podem ser negativos.")
      return
    }
    setConfigError(null)
    await saveCommissionConfig({ percent, fixedSalary })
    setConfigOpen(false)
    refresh()
  }

  function openDiscount() {
    setDiscountInput(adjustment?.discount ? numInput(adjustment.discount) : "")
    setDiscountNoteInput(adjustment?.note || "")
    setEmployeeDeductionInput(adjustment?.employeeDeduction ? numInput(adjustment.employeeDeduction) : "")
    setEmployeeNoteInput(adjustment?.employeeNote || "")
    setDiscountOpen(true)
  }

  async function saveDiscount() {
    const discountValue = parseNum(discountInput)
    const safeDiscount = Number.isNaN(discountValue) || discountValue < 0 ? 0 : discountValue
    const deductionValue = parseNum(employeeDeductionInput)
    const safeDeduction = Number.isNaN(deductionValue) || deductionValue < 0 ? 0 : deductionValue
    const hasAny = safeDiscount > 0 || safeDeduction > 0
    await saveCommissionAdjustment(
      period,
      hasAny
        ? {
            discount: safeDiscount,
            note: discountNoteInput.trim() || undefined,
            employeeDeduction: safeDeduction || undefined,
            employeeNote: employeeNoteInput.trim() || undefined,
          }
        : null,
    )
    setDiscountOpen(false)
    refresh()
  }

  const hasDiscounts = discount > 0 || employeeDeduction > 0

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Comissão" subtitle="Levantamentos faturados por mês">
        <IconButton
          onClick={() => {
            setPercentInput(numInput(config.percent))
            setSalaryInput(numInput(config.fixedSalary))
            setConfigError(null)
            setConfigOpen(true)
          }}
          aria-label="Configurar comissão"
        >
          <Settings className="h-[18px] w-[18px]" />
        </IconButton>
      </TopBar>

      <div className="px-4">
        {/* Troca de mes */}
        <div className="flex items-center justify-between rounded-[14px] border border-border bg-card p-1">
          <button
            onClick={() => shiftPeriod(-1)}
            aria-label="Mês anterior"
            className="pressable flex h-10 w-10 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="num text-[15px] font-bold first-letter:uppercase" aria-live="polite">
            {periodLabel(period).toLowerCase()}
          </span>
          <button
            onClick={() => shiftPeriod(1)}
            aria-label="Próximo mês"
            className="pressable flex h-10 w-10 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Numero do mes */}
        <section className="mt-6 px-1" aria-busy={entriesLoading}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[14px] text-muted-foreground">Comissão do mês</p>
            {monthDelta !== null && (
              <span
                className={cn(
                  "num text-[13px] font-semibold",
                  monthDelta === 0 ? "text-faint" : monthDelta > 0 ? "text-positive" : "text-destructive",
                )}
              >
                {monthDelta > 0 ? "+" : monthDelta < 0 ? "−" : ""}
                {Math.abs(monthDelta).toFixed(0)}% vs. mês anterior
              </span>
            )}
          </div>
          <p
            className={cn(
              "num text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] transition-opacity duration-200",
              corDoFluxo("saldo", total),
              entriesLoading && "opacity-40",
            )}
          >
            {total < 0 ? "− " : ""}
            {fmtMoney(Math.abs(total))}
          </p>
          <p className="num mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
            <Dinheiro valor={variable} fluxo="entrada" className="font-semibold" /> variável (
            {config.percent}% de <span className="whitespace-nowrap">{fmtMoney(discount > 0 ? base : revenue)}</span>) +{" "}
            <span className="whitespace-nowrap">
              <Dinheiro valor={config.fixedSalary} fluxo="entrada" className="font-semibold" /> fixo
            </span>
            {employeeDeduction > 0 && (
              <>
                {" "}−{" "}
                <span className="whitespace-nowrap">
                  <Dinheiro valor={employeeDeduction} fluxo="saida" className="font-semibold" /> adiantamento
                </span>
              </>
            )}
          </p>
        </section>

        {/* Ultimos 6 meses */}
        <div
          className="mt-5 flex items-end justify-between gap-1.5 rounded-[18px] border border-border bg-card px-2.5 pb-1.5 pt-3"
          role="group"
          aria-label="Comissão dos últimos seis meses"
        >
          {history.map((h) => {
            const isCurrent = h.period === period
            const heightPct = Math.max(6, (h.total / historyMax) * 100)
            return (
              <button
                key={h.period}
                onClick={() => setPeriod(h.period)}
                title={`${periodLabel(h.period)}: ${fmtMoney(h.total)}`}
                aria-label={`${periodLabel(h.period)}: ${fmtMoney(h.total)}. Ver este mês.`}
                aria-current={isCurrent ? "date" : undefined}
                className="group flex min-h-11 flex-1 flex-col items-center gap-1.5 rounded-[10px] px-0.5 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                <div className="flex h-14 w-full items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-[5px] rounded-b-[2px] transition-[height,background-color] duration-300 ease-out",
                      isCurrent ? "bg-primary" : "bg-foreground/15 group-hover:bg-foreground/25",
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={cn("pb-1 text-[12px] font-semibold", isCurrent ? "text-foreground" : "text-faint")}>
                  {periodLabel(h.period).slice(0, 3)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Resumo do mes + descontos */}
        <div className="mt-2.5 overflow-hidden rounded-[18px] border border-border bg-card">
          {periodEntries.length > 0 && (
            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              <div className="px-4 py-3">
                <div className="text-[13px] text-muted-foreground">Hectares no mês</div>
                <div className="num mt-0.5 text-[19px] font-bold leading-tight">
                  {fmtHa(monthHectares)} <span className="text-[13px] font-semibold text-muted-foreground">ha</span>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[13px] text-muted-foreground">Lançamentos</div>
                <div className="num mt-0.5 text-[19px] font-bold leading-tight">{periodEntries.length}</div>
                <div className="num text-[12px] text-faint">
                  {autoCount} auto · {manualCount} manual
                </div>
              </div>
            </div>
          )}
          <button
            onClick={openDiscount}
            className="pressable flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">Descontos do mês</div>
              {hasDiscounts ? (
                <div className="mt-0.5 space-y-0.5">
                  {discount > 0 && (
                    <div className="num truncate text-[13px] text-muted-foreground">
                      Ao cliente: <Dinheiro valor={discount} fluxo="saida" className="font-semibold" />
                      {adjustment?.note ? ` · ${adjustment.note}` : ""}
                    </div>
                  )}
                  {employeeDeduction > 0 && (
                    <div className="num truncate text-[13px] text-muted-foreground">
                      Meu adiantamento: <Dinheiro valor={employeeDeduction} fluxo="saida" className="font-semibold" />
                      {adjustment?.employeeNote ? ` · ${adjustment.employeeNote}` : ""}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[13px] text-muted-foreground">Desconto ao cliente ou adiantamento seu</div>
              )}
            </div>
            {hasDiscounts ? (
              <Pencil className="h-4 w-4 shrink-0 text-faint" />
            ) : (
              <Plus className="h-4 w-4 shrink-0 text-faint" />
            )}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <SecondaryButton onClick={openPull} className="px-3">
            <Zap className="h-4 w-4 shrink-0 text-muted-foreground" /> Puxar áreas
          </SecondaryButton>
          <SecondaryButton
            onClick={() => {
              setNavPeriod(period)
              goReport("commissionReport")
            }}
            className="px-3"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" /> Relatório
          </SecondaryButton>
        </div>
      </div>

      {/* Lancamentos agrupados por cliente */}
      <div className="flex-1 px-4 pb-8 pt-8">
        <SectionTitle
          action={
            <button
              onClick={openNew}
              className="pressable -my-2 -mr-2 flex min-h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} /> Novo lançamento
            </button>
          }
        >
          Lançados no mês{" "}
          {groupedByClient.length > 0 && (
            <span className="num ml-1 font-medium text-faint">
              {groupedByClient.length} cliente{groupedByClient.length === 1 ? "" : "s"}
            </span>
          )}
        </SectionTitle>
        {entriesLoading ? (
          <div className="space-y-2.5" aria-busy>
            {[0, 1].map((i) => (
              <div key={i} className="h-[68px] rounded-[18px] border border-border bg-card" />
            ))}
          </div>
        ) : periodEntries.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8 opacity-40" />}>
            Nada lançado em {periodLabel(period).toLowerCase()}. Use “Puxar áreas” para trazer o que foi voado ou “Novo
            lançamento” para registrar à mão.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5">
            {groupedByClient.map((group) => {
              const isCollapsed = collapsedClients.has(group.clientName)
              const anyMoved = group.entries.some((e) => e.attributedPeriod)
              const groupHa = group.entries.reduce((s, e) => s + Number(e.hectares || 0), 0)
              return (
                <div key={group.clientName} className="overflow-hidden rounded-[18px] border border-border bg-card">
                  <button
                    onClick={() => toggleClient(group.clientName)}
                    aria-expanded={!isCollapsed}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[16px] font-bold">{group.clientName}</div>
                        {anyMoved && <Pill tone="warning">Movido</Pill>}
                      </div>
                      <div className="num mt-0.5 text-[13px] text-muted-foreground">
                        {group.entries.length} lançamento{group.entries.length === 1 ? "" : "s"} · {fmtHa(groupHa)} ha
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Dinheiro valor={group.revenue} fluxo="entrada" className="block text-[15px] font-bold" />
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-faint transition-transform duration-200 ease-out",
                          isCollapsed ? "" : "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {!isCollapsed && (
                    <>
                      <ul className="divide-y divide-border border-t border-border">
                        {group.entries.map((e) => (
                          <li key={e.id} className="grid grid-cols-[1fr_auto] gap-x-3 py-3 pl-4 pr-2">
                            <div className="min-w-0">
                              <div className="truncate text-[15px] font-semibold">
                                {e.talhaoName || `${fmtHa(e.hectares)} ha × ${fmtMoney(e.rate)}/ha`}
                              </div>
                              <div className="num mt-0.5 text-[13px] text-muted-foreground">
                                {e.talhaoName && (
                                  <span className="whitespace-nowrap">
                                    {fmtHa(e.hectares)} ha × {fmtMoney(e.rate)}/ha
                                  </span>
                                )}
                                {e.talhaoName ? " · " : ""}
                                <span className="whitespace-nowrap">{fmtDate(e.date)}</span>
                              </div>
                              {/* a nota padrao do "puxar" repete o que a pilula Automatico ja diz */}
                              {e.note && !(e.auto && e.note === AUTO_NOTE) && (
                                <div className="mt-0.5 text-[13px] text-faint">{e.note}</div>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {e.auto ? (
                                  <Pill>
                                    <Zap className="h-3 w-3" /> Automático
                                  </Pill>
                                ) : e.sourceProjectId ? (
                                  <Pill>
                                    <Pencil className="h-3 w-3" /> Ajustado à mão
                                  </Pill>
                                ) : (
                                  <Pill>Manual</Pill>
                                )}
                                {e.attributedPeriod && (
                                  <Pill tone="warning">Recebido em {periodLabel(e.attributedPeriod).split(" ")[0]}</Pill>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <Dinheiro valor={entryRevenue(e)} fluxo="entrada" className="block pr-2 text-[15px] font-bold" />
                              <div className="mt-auto flex items-center pt-1">
                              <button
                                onClick={() => openEdit(e)}
                                aria-label="Editar lançamento"
                                className={cn(rowIconBtn, "hover:bg-raised hover:text-foreground")}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setPendingDelete(e)}
                                aria-label="Excluir lançamento"
                                className={cn(rowIconBtn, "hover:bg-destructive/10 hover:text-destructive")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => (anyMoved ? resetMove(group.clientName) : openMove(group.clientName))}
                        className="pressable flex min-h-12 w-full items-center justify-center gap-2 border-t border-border text-[14px] font-semibold text-primary hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        {anyMoved ? "Trazer de volta para este mês" : "Mover para outro mês"}
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {open && (
        <ModalSheet title={editing ? "Editar lançamento" : "Novo lançamento"} onClose={() => setOpen(false)}>
          <Field label="Cliente">
            <TextInput
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex.: Fábio Fukuda"
              list="commission-clients"
              autoComplete="off"
              autoFocus
            />
            <datalist id="commission-clients">
              {index.map((p) => (
                <option key={p.id} value={p.clientName} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hectares">
              <NumberInput value={hectares} onChange={(e) => setHectares(e.target.value)} placeholder="605,5" />
            </Field>
            <Field label="Valor por ha (R$)">
              <NumberInput value={rate} onChange={(e) => setRate(e.target.value)} placeholder="20,00" />
            </Field>
          </div>
          {editing?.auto && (
            <Hint className="-mt-1 mb-4">
              Veio das áreas voadas. Se você mudar, ele fica como “Ajustado à mão” e o Puxar áreas não mexe mais nele.
            </Hint>
          )}
          <Field label="Data do levantamento" hint="Define em qual mês o lançamento entra na comissão.">
            <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" className="num" />
          </Field>
          <Field label="Observação (opcional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fazenda, matrícula, contrato…" />
          </Field>
          {parseNum(hectares) > 0 && parseNum(rate) > 0 && (
            <FormAlert tone="info" className="flex items-baseline justify-between gap-3">
              <span>Faturamento deste lançamento</span>
              <span className="num shrink-0 whitespace-nowrap text-[17px] font-bold text-foreground">{fmtMoney(parseNum(hectares) * parseNum(rate))}</span>
            </FormAlert>
          )}
          {formError && <FormAlert>{formError}</FormAlert>}
          <SheetActions
            label={editing ? "Salvar alterações" : "Adicionar lançamento"}
            onConfirm={save}
            onCancel={() => setOpen(false)}
          />
        </ModalSheet>
      )}

      {moveOpen && (
        <ModalSheet title="Mover para outro mês" onClose={() => setMoveOpen(false)}>
          <p className="mb-5 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            Os lançamentos de <strong className="font-semibold text-foreground">{moveClient}</strong> em{" "}
            {periodLabel(period).toLowerCase()} passam a contar na comissão do mês escolhido. A data de cada lançamento não
            muda, só o mês em que entra no total pago.
          </p>
          <Field label="Receber comissão em" hint={moveTarget ? periodLabel(moveTarget) : undefined}>
            <TextInput value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} type="month" className="num" />
          </Field>
          <SheetActions label="Mover lançamentos" onConfirm={runMove} onCancel={() => setMoveOpen(false)} />
        </ModalSheet>
      )}

      {pullOpen && (
        <ModalSheet title="Puxar áreas voadas" onClose={() => setPullOpen(false)}>
          <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            Compara as áreas voadas
            {pullOtherRange ? " no período abaixo" : <> em <strong className="font-semibold text-foreground">{periodLabel(period).toLowerCase()}</strong></>}{" "}
            com o que já está lançado. Só muda o que for diferente, e você vê antes.
          </p>

          {pullOtherRange ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="De">
                <TextInput value={pullStart} onChange={(e) => setPullStart(e.target.value)} type="date" className="num" />
              </Field>
              <Field label="Até">
                <TextInput value={pullEnd} onChange={(e) => setPullEnd(e.target.value)} type="date" className="num" />
              </Field>
            </div>
          ) : (
            <button
              onClick={() => setPullOtherRange(true)}
              className="pressable -mt-1 mb-4 min-h-10 text-[14px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              Escolher outro período
            </button>
          )}

          {!pullValid ? (
            <FormAlert>Informe uma data de início e uma data de fim válidas.</FormAlert>
          ) : pullPlan && (
            <div className="mb-4 overflow-hidden rounded-[14px] border border-border" role="status">
              {pullChanges === 0 && pullPlan.backfill.length === 0 ? (
                <div className="px-4 py-3 text-[15px] font-semibold">Tudo em dia: nada a mudar.</div>
              ) : (
                <ul className="divide-y divide-border text-[15px]">
                  {pullPlan.add.length > 0 && (
                    <li className="flex justify-between gap-3 px-4 py-2.5">
                      <span>Novos</span>
                      <span className="num font-bold text-positive">+{pullPlan.add.length}</span>
                    </li>
                  )}
                  {pullPlan.update.length > 0 && (
                    <li className="flex justify-between gap-3 px-4 py-2.5">
                      <span>Atualizados (a área mudou)</span>
                      <span className="num font-bold">{pullPlan.update.length}</span>
                    </li>
                  )}
                  {pullPlan.remove.length > 0 && (
                    <li className="flex justify-between gap-3 px-4 py-2.5">
                      <span>Removidos (área apagada)</span>
                      <span className="num font-bold text-destructive">−{pullPlan.remove.length}</span>
                    </li>
                  )}
                </ul>
              )}
              {(pullPlan.unchanged > 0 || pullPlan.keptAdjusted > 0) && (
                <div className="num border-t border-border bg-foreground/[0.03] px-4 py-2 text-[13px] text-muted-foreground">
                  {pullPlan.unchanged > 0 && `${pullPlan.unchanged} já em dia`}
                  {pullPlan.unchanged > 0 && pullPlan.keptAdjusted > 0 && " · "}
                  {pullPlan.keptAdjusted > 0 && `${pullPlan.keptAdjusted} ajustado${pullPlan.keptAdjusted === 1 ? "" : "s"} à mão (mantido${pullPlan.keptAdjusted === 1 ? "" : "s"})`}
                </div>
              )}
            </div>
          )}

          {pullMissing.length > 0 && (
            <FormAlert tone="warning">
              <div className="font-semibold">Ignorados por falta de valor por hectare:</div>
              <div className="mt-0.5">{pullMissing.join(", ")}</div>
              <div className="mt-1.5 text-[13px] opacity-90">
                Defina o valor do serviço &quot;Levantamento Altimétrico&quot; ou a comissão por hectare em Editar projeto.
              </div>
            </FormAlert>
          )}

          <SheetActions
            label={pullChanges > 0 ? `Aplicar ${pullChanges} mudança${pullChanges === 1 ? "" : "s"}` : "Fechar"}
            onConfirm={applyPull}
            disabled={pullBusy || !pullValid}
            onCancel={() => setPullOpen(false)}
          />
        </ModalSheet>
      )}

      {configOpen && (
        <ModalSheet title="Configurar comissão" onClose={() => setConfigOpen(false)}>
          <Field label="Percentual de comissão (%)" hint="Aplicado sobre o faturamento dos levantamentos do mês.">
            <NumberInput value={percentInput} onChange={(e) => setPercentInput(e.target.value)} placeholder="Ex.: 10" />
          </Field>
          <Field label="Salário fixo mensal (R$)" hint="Somado à comissão variável, independente do que foi levantado.">
            <NumberInput value={salaryInput} onChange={(e) => setSalaryInput(e.target.value)} placeholder="Ex.: 2000" />
          </Field>
          {configError && <FormAlert>{configError}</FormAlert>}
          <SheetActions label="Salvar configuração" onConfirm={saveConfig} onCancel={() => setConfigOpen(false)} />
        </ModalSheet>
      )}

      {pendingDelete && (
        <ConfirmDeleteSheet
          title="Excluir lançamento"
          confirmLabel="Excluir lançamento"
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        >
          O lançamento de <strong className="font-semibold text-foreground">{pendingDelete.clientName}</strong> (
          <span className="num">
            {fmtHa(pendingDelete.hectares)} ha × {fmtMoney(pendingDelete.rate)}/ha = {fmtMoney(entryRevenue(pendingDelete))}
          </span>
          ) será apagado. Esta ação não pode ser desfeita.
        </ConfirmDeleteSheet>
      )}

      {discountOpen && (
        <ModalSheet title="Descontos do mês" onClose={() => setDiscountOpen(false)}>
          <FormAlert tone="info" className="flex items-baseline justify-between gap-3">
            <span>Sem desconto, a comissão seria</span>
            <span className="num shrink-0 whitespace-nowrap font-bold text-foreground">{fmtMoney(commissionTotal(entries, period, config))}</span>
          </FormAlert>

          <h3 className="mt-6 text-[15px] font-bold">Desconto ao cliente</h3>
          <p className="mb-4 mt-1 text-[14px] leading-relaxed text-muted-foreground text-pretty">
            Abate do faturamento (<span className="num">{fmtMoney(revenue)}</span>) antes do seu percentual: cada R$ 1 aqui
            reduz sua comissão em{" "}
            <span className="num">R$ {(config.percent / 100).toFixed(2).replace(".", ",")}</span> ({config.percent}%). Use
            quando deu desconto no serviço ao cliente.
          </p>
          <div className="grid grid-cols-[0.8fr_1fr] gap-3">
            <Field label="Valor (R$)">
              <NumberInput value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="6000" />
            </Field>
            <Field label="Motivo (opcional)">
              <TextInput
                value={discountNoteInput}
                onChange={(e) => setDiscountNoteInput(e.target.value)}
                placeholder="Combinado"
              />
            </Field>
          </div>

          <div className="my-5 h-px bg-border" />

          <h3 className="text-[15px] font-bold">Meu adiantamento</h3>
          <p className="mb-4 mt-1 text-[14px] leading-relaxed text-muted-foreground text-pretty">
            Abate direto e por inteiro da comissão final: cada R$ 1 aqui reduz exatamente R$ 1. Use quando já recebeu um
            adiantamento e quer ver só o que falta.
          </p>
          <div className="grid grid-cols-[0.8fr_1fr] gap-3">
            <Field label="Valor (R$)">
              <NumberInput
                value={employeeDeductionInput}
                onChange={(e) => setEmployeeDeductionInput(e.target.value)}
                placeholder="641"
              />
            </Field>
            <Field label="Motivo (opcional)">
              <TextInput
                value={employeeNoteInput}
                onChange={(e) => setEmployeeNoteInput(e.target.value)}
                placeholder="Recebido dia 10"
              />
            </Field>
          </div>
          <Hint className="-mt-1 mb-4">Em branco ou 0 remove o valor.</Hint>

          {(() => {
            const previewDiscount = Math.max(0, parseNum(discountInput) || 0)
            const previewDeduction = Math.max(0, parseNum(employeeDeductionInput) || 0)
            if (previewDiscount <= 0 && previewDeduction <= 0) return null
            const previewTotal = commissionTotal(entries, period, config, previewDiscount, previewDeduction)
            return (
              <FormAlert tone="info" className="flex items-baseline justify-between gap-3">
                <span>Comissão final com esses descontos</span>
                <span className="num shrink-0 whitespace-nowrap text-[17px] font-bold text-foreground">{fmtMoney(previewTotal)}</span>
              </FormAlert>
            )
          })()}

          <SheetActions label="Salvar descontos" onConfirm={saveDiscount} onCancel={() => setDiscountOpen(false)} />
        </ModalSheet>
      )}
    </div>
  )
}

