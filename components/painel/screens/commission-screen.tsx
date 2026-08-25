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
import { useAllProjects, useCommissionConfig, useCommissionEntries, useIndex, useRefresh } from "@/lib/hooks"
import {
  getCommissionConfig,
  getCommissionEntries,
  saveCommissionConfig,
  saveCommissionEntries,
} from "@/lib/storage"
import {
  clientsMissingCommissionRate,
  commissionTotal,
  commissionVariable,
  currentPeriod,
  entriesForPeriod,
  entryPeriod,
  entryRevenue,
  periodLabel,
  periodOf,
  periodRange,
  periodRevenue,
  pullCommissionDrafts,
} from "@/lib/calculations"
import { fmtDate, fmtHa, fmtMoney, genId, todayISO } from "@/lib/format"
import type { CommissionEntry } from "@/lib/types"
import { TopBar, EmptyState, SectionTitle } from "../chrome"
import { ModalSheet } from "../modal-sheet"
import { Field, TextInput } from "../fields"
import { PrimaryButton, GhostButton, IconButton } from "../buttons"

export function CommissionScreen() {
  const { goHome, goReport, currentPeriod: navPeriod, setPeriod: setNavPeriod } = useNav()
  const { entries } = useCommissionEntries()
  const { config } = useCommissionConfig()
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
  const [pullMissing, setPullMissing] = useState<string[]>([])
  const [pullResultMsg, setPullResultMsg] = useState<string | null>(null)

  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set())

  const [moveOpen, setMoveOpen] = useState(false)
  const [moveClient, setMoveClient] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState("")

  const [formError, setFormError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CommissionEntry | null>(null)

  const periodEntries = useMemo(
    () => entriesForPeriod(entries, period).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [entries, period],
  )
  const revenue = periodRevenue(entries, period)
  const variable = commissionVariable(entries, period, config)
  const total = commissionTotal(entries, period, config)
  const monthHectares = periodEntries.reduce((s, e) => s + Number(e.hectares || 0), 0)
  const autoCount = periodEntries.filter((e) => e.auto).length
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
      months.push({ period: p, total: commissionTotal(entries, p, config) })
    }
    return months
  }, [entries, period, config])
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
    setPullMissing([])
    setPullResultMsg(null)
    setPullOpen(true)
  }

  async function runPull() {
    if (!pullStart || !pullEnd || pullStart > pullEnd) {
      setPullResultMsg("Informe uma data de início e uma data de fim válidas.")
      return
    }
    const missing = clientsMissingCommissionRate(projects, pullStart, pullEnd)
    setPullMissing(missing)
    const drafts = pullCommissionDrafts(projects, pullStart, pullEnd)
    const list = await getCommissionEntries()
    const kept = list.filter((e) => !(e.auto && e.date >= pullStart && e.date <= pullEnd))
    const fresh: CommissionEntry[] = drafts.map((d) => ({
      id: genId("com"),
      clientName: d.clientName,
      hectares: d.hectares,
      rate: d.rate,
      date: d.date,
      note: "Puxado automaticamente das áreas mapeadas",
      createdAt: new Date().toISOString(),
      auto: true,
      sourceProjectId: d.projectId,
      talhaoName: d.talhaoName,
    }))
    await saveCommissionEntries([...kept, ...fresh])
    refresh()
    setPullResultMsg(
      drafts.length === 0
        ? "Nenhuma área mapeada encontrada nesse período (com valor de comissão configurado)."
        : `${drafts.length} lançamento${drafts.length === 1 ? "" : "s"} puxado${drafts.length === 1 ? "" : "s"} com sucesso.`,
    )
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
    setHectares(String(e.hectares ?? ""))
    setRate(String(e.rate ?? ""))
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
    if (!hectares || Number(hectares) <= 0) {
      setFormError("Informe os hectares levantados (maior que zero).")
      return
    }
    if (!rate || Number(rate) <= 0) {
      setFormError("Informe o valor por hectare (maior que zero).")
      return
    }
    setFormError(null)
    const list = await getCommissionEntries()
    if (editing) {
      const i = list.findIndex((x) => x.id === editing.id)
      if (i >= 0) {
        list[i] = {
          ...editing,
          clientName: clientName.trim(),
          hectares: Number(hectares),
          rate: Number(rate),
          date,
          note: note.trim(),
        }
      }
    } else {
      list.push({
        id: genId("com"),
        clientName: clientName.trim(),
        hectares: Number(hectares),
        rate: Number(rate),
        date,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      })
    }
    await saveCommissionEntries(list)
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
    const updated = list.map((e) => {
      if (e.clientName !== moveClient || entryPeriod(e) !== period) return e
      // Se o destino coincide com o mes real da data, remove o override (volta ao padrao).
      return { ...e, attributedPeriod: moveTarget === periodOf(e.date) ? undefined : moveTarget }
    })
    await saveCommissionEntries(updated)
    setMoveOpen(false)
    refresh()
  }

  async function resetMove(clientName: string) {
    const list = await getCommissionEntries()
    const updated = list.map((e) =>
      e.clientName === clientName && entryPeriod(e) === period ? { ...e, attributedPeriod: undefined } : e,
    )
    await saveCommissionEntries(updated)
    refresh()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const list = await getCommissionEntries()
    await saveCommissionEntries(list.filter((x) => x.id !== pendingDelete.id))
    setPendingDelete(null)
    refresh()
  }

  async function saveConfig() {
    const percent = Number(percentInput)
    const fixedSalary = Number(salaryInput)
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

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Comissão" subtitle="Levantamentos faturados por mês" onBack={goHome}>
        <IconButton
          onClick={() => {
            setPercentInput(String(config.percent))
            setSalaryInput(String(config.fixedSalary))
            setConfigError(null)
            setConfigOpen(true)
          }}
          aria-label="Configurar comissão"
          className="bg-white/15 text-white hover:bg-white/25"
        >
          <Settings className="h-[18px] w-[18px]" />
        </IconButton>
      </TopBar>

      <div className="bg-topo px-5 pb-6 text-white">
        <div className="flex items-center justify-between">
          <IconButton
            onClick={() => shiftPeriod(-1)}
            aria-label="Mês anterior"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </IconButton>
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/85">
            {periodLabel(period)}
          </span>
          <IconButton
            onClick={() => shiftPeriod(1)}
            aria-label="Próximo mês"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </IconButton>
        </div>

        <div className="mt-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white/65">
              <Wallet className="h-3.5 w-3.5" /> Comissão do mês
            </div>
            {monthDelta !== null && (
              <span
                className={`num rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  monthDelta >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300"
                }`}
              >
                {monthDelta >= 0 ? "+" : ""}
                {monthDelta.toFixed(0)}% vs. mês anterior
              </span>
            )}
          </div>
          <div className="num mt-1 text-3xl font-extrabold">{fmtMoney(total)}</div>
          <div className="mt-1 text-[11px] text-white/60">
            {fmtMoney(variable)} variável ({config.percent}% de {fmtMoney(revenue)}) + {fmtMoney(config.fixedSalary)} fixo
          </div>

          {periodEntries.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/55">Hectares no mês</div>
                <div className="num mt-0.5 text-[15px] font-extrabold">{fmtHa(monthHectares)} ha</div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/55">Lançamentos</div>
                <div className="num mt-0.5 text-[15px] font-extrabold leading-none">{periodEntries.length}</div>
                <div className="num mt-1 text-[10px] font-semibold text-white/55">
                  {autoCount} auto · {manualCount} manual
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-end justify-between gap-1.5 border-t border-white/10 pt-3.5">
            {history.map((h) => {
              const isCurrent = h.period === period
              const heightPct = Math.max(6, (h.total / historyMax) * 100)
              return (
                <button
                  key={h.period}
                  onClick={() => setPeriod(h.period)}
                  title={`${periodLabel(h.period)}: ${fmtMoney(h.total)}`}
                  aria-label={`${periodLabel(h.period)}: ${fmtMoney(h.total)}. Ver este mês.`}
                  className="group flex flex-1 flex-col items-center gap-1 rounded-md pt-1 transition-colors hover:bg-white/5"
                >
                  <div className="flex h-10 w-full items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isCurrent ? "bg-cta" : "bg-white/25 group-hover:bg-white/40"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold ${isCurrent ? "text-white" : "text-white/45"}`}>
                    {periodLabel(h.period).slice(0, 3)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={openPull}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cta px-3 text-[13px] font-bold leading-tight text-cta-foreground transition-all hover:brightness-105"
          >
            <Zap className="h-4 w-4 shrink-0" /> Puxar áreas
          </button>
          <button
            onClick={() => {
              setNavPeriod(period)
              goReport("commissionReport")
            }}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 px-3 text-[13px] font-bold leading-tight text-white transition-colors hover:bg-white/25"
          >
            <FileText className="h-4 w-4 shrink-0" /> Relatório
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
        <div className="mb-3 mt-1 flex items-center justify-between">
          <SectionTitle className="mb-0 mt-0">Levantamentos lançados</SectionTitle>
          {groupedByClient.length > 0 && (
            <span className="num text-[11px] font-bold text-muted-foreground">
              {groupedByClient.length} cliente{groupedByClient.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {periodEntries.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8 text-muted-foreground/50" />}>
            Nenhum levantamento lançado em {periodLabel(period).toLowerCase()}. Toque em "Novo lançamento" para
            registrar o que foi feito.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {groupedByClient.map((group) => {
              const isCollapsed = collapsedClients.has(group.clientName)
              const anyMoved = group.entries.some((e) => e.attributedPeriod)
              return (
                <div key={group.clientName} className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60">
                  <button
                    onClick={() => toggleClient(group.clientName)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-[14px] font-extrabold text-foreground">{group.clientName}</div>
                        {anyMoved && (
                          <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            Movido
                          </span>
                        )}
                      </div>
                      <div className="num mt-0.5 text-[11px] text-muted-foreground">
                        {group.entries.length} lançamento{group.entries.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="num text-[14px] font-extrabold text-primary">{fmtMoney(group.revenue)}</div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                      />
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/30 px-3 pb-3 pt-2.5">
                      <button
                        onClick={() => (anyMoved ? resetMove(group.clientName) : openMove(group.clientName))}
                        className="flex items-center justify-center gap-1.5 self-end rounded-lg bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted/70"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        {anyMoved ? "Trazer de volta para este mês" : "Mover para outro mês"}
                      </button>
                      {group.entries.map((e) => (
                        <div key={e.id} className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-border/50">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {e.auto ? (
                                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                                    <Zap className="h-2.5 w-2.5" /> Automático
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                    Manual
                                  </span>
                                )}
                                {e.attributedPeriod && (
                                  <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                    Recebido em {periodLabel(e.attributedPeriod).split(" ")[0]}
                                  </span>
                                )}
                              </div>
                              {e.talhaoName && (
                                <div className="mt-1 truncate text-[13px] font-semibold text-foreground">
                                  {e.talhaoName}
                                </div>
                              )}
                              <div className="num mt-1 text-xs text-muted-foreground">
                                {fmtHa(e.hectares)} ha × {fmtMoney(e.rate)}/ha
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">{fmtDate(e.date)}</div>
                              {e.note && <div className="mt-1 text-[13px] text-muted-foreground">{e.note}</div>}
                            </div>
                            <div className="num shrink-0 text-[14px] font-extrabold text-primary">
                              {fmtMoney(entryRevenue(e))}
                            </div>
                          </div>
                          <div className="mt-2.5 flex gap-2">
                            <button
                              onClick={() => openEdit(e)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted/70"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button
                              onClick={() => setPendingDelete(e)}
                              aria-label="Excluir lançamento"
                              className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        <button
          onClick={openNew}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cta py-3.5 text-sm font-bold text-cta-foreground shadow-sm transition-all hover:brightness-105"
        >
          <Plus className="h-[18px] w-[18px]" /> Novo lançamento
        </button>
      </div>

      {open && (
        <ModalSheet title={editing ? "Editar lançamento" : "Novo lançamento"} onClose={() => setOpen(false)}>
          <Field label="Cliente">
            <TextInput
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Fábio Fukuda"
              list="commission-clients"
              autoFocus
            />
            <datalist id="commission-clients">
              {index.map((p) => (
                <option key={p.id} value={p.clientName} />
              ))}
            </datalist>
          </Field>
          <Field label="Hectares levantados">
            <TextInput
              value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="Ex: 605"
            />
          </Field>
          <Field label="Valor por hectare (R$)">
            <TextInput
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="Ex: 20.00"
            />
          </Field>
          <Field label="Data do levantamento" hint="Define em qual mês o lançamento entra na comissão.">
            <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </Field>
          <Field label="Observação (opcional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fazenda, talhão, contrato…" />
          </Field>
          {hectares && rate && !Number.isNaN(Number(hectares)) && !Number.isNaN(Number(rate)) && (
            <div className="mb-3.5 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] font-semibold text-foreground">
              Faturamento deste lançamento: <span className="text-primary">{fmtMoney(Number(hectares) * Number(rate))}</span>
            </div>
          )}
          {formError && (
            <div className="mb-3.5 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-[13px] font-semibold text-destructive ring-1 ring-destructive/20">
              {formError}
            </div>
          )}
          <PrimaryButton className="w-full" onClick={save}>
            {editing ? "Salvar alterações" : "Adicionar lançamento"}
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setOpen(false)}>
            Cancelar
          </GhostButton>
        </ModalSheet>
      )}

      {moveOpen && (
        <ModalSheet title={`Mover ${moveClient} para outro mês`} onClose={() => setMoveOpen(false)}>
          <p className="mb-3.5 text-[13px] leading-relaxed text-muted-foreground">
            Os lançamentos de <strong>{moveClient}</strong> em {periodLabel(period).toLowerCase()} vão contar como
            comissão do mês escolhido abaixo. A data original de cada lançamento não muda — só o mês em que ele entra
            no total pago.
          </p>
          <Field label="Receber comissão em">
            <TextInput value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} type="month" />
          </Field>
          {moveTarget && <p className="mb-3.5 text-[13px] font-semibold text-foreground">{periodLabel(moveTarget)}</p>}
          <PrimaryButton className="w-full" onClick={runMove}>
            Mover lançamentos
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setMoveOpen(false)}>
            Cancelar
          </GhostButton>
        </ModalSheet>
      )}

      {pullOpen && (
        <ModalSheet
          title="Puxar comissão automaticamente"
          onClose={() => {
            setPullOpen(false)
            setPullResultMsg(null)
          }}
        >
          <p className="mb-3.5 text-[13px] leading-relaxed text-muted-foreground">
            Busca nas áreas mapeadas de todos os clientes, dentro do intervalo abaixo, e calcula o valor de cada uma
            usando o valor por hectare configurado em cada projeto.
          </p>
          <Field label="Data de início">
            <TextInput value={pullStart} onChange={(e) => setPullStart(e.target.value)} type="date" />
          </Field>
          <Field label="Data de fim">
            <TextInput value={pullEnd} onChange={(e) => setPullEnd(e.target.value)} type="date" />
          </Field>

          {pullResultMsg && (
            <div className="mb-3.5 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] font-semibold text-foreground">
              {pullResultMsg}
            </div>
          )}

          {pullMissing.length > 0 && (
            <div className="mb-3.5 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-400">
              <div className="font-bold">Sem valor por hectare configurado — ignorados:</div>
              <div className="mt-0.5">{pullMissing.join(", ")}</div>
              <div className="mt-1 text-[12px] opacity-80">
                Configure o serviço "Levantamento Altimétrico" com o valor, ou defina manualmente em "Editar projeto".
              </div>
            </div>
          )}

          <PrimaryButton className="w-full" onClick={runPull}>
            Puxar lançamentos
          </PrimaryButton>
          <GhostButton
            className="mt-1.5 w-full"
            onClick={() => {
              setPullOpen(false)
              setPullResultMsg(null)
            }}
          >
            Fechar
          </GhostButton>
        </ModalSheet>
      )}

      {configOpen && (
        <ModalSheet title="Configurar comissão" onClose={() => setConfigOpen(false)}>
          <Field label="Percentual de comissão (%)" hint="Aplicado sobre o faturamento dos levantamentos do mês.">
            <TextInput
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="Ex: 10"
            />
          </Field>
          <Field label="Salário fixo mensal (R$)" hint="Somado à comissão variável, independente do que foi levantado.">
            <TextInput
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="Ex: 2000"
            />
          </Field>
          {configError && (
            <div className="mb-3.5 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-[13px] font-semibold text-destructive ring-1 ring-destructive/20">
              {configError}
            </div>
          )}
          <PrimaryButton className="w-full" onClick={saveConfig}>
            Salvar configuração
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setConfigOpen(false)}>
            Cancelar
          </GhostButton>
        </ModalSheet>
      )}

      {pendingDelete && (
        <ModalSheet title="Excluir lançamento" onClose={() => setPendingDelete(null)}>
          <p className="mb-3.5 text-[13px] leading-relaxed text-muted-foreground">
            Tem certeza que deseja excluir o lançamento de <strong>{pendingDelete.clientName}</strong> (
            {fmtHa(pendingDelete.hectares)} ha × {fmtMoney(pendingDelete.rate)}/ha ={" "}
            {fmtMoney(entryRevenue(pendingDelete))})? Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={confirmDelete}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-sm font-bold text-destructive-foreground transition-all hover:brightness-105"
          >
            <Trash2 className="h-[18px] w-[18px]" /> Excluir lançamento
          </button>
          <GhostButton className="mt-1.5 w-full" onClick={() => setPendingDelete(null)}>
            Cancelar
          </GhostButton>
        </ModalSheet>
      )}
    </div>
  )
}
