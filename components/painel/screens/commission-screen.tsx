"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, FileText, Pencil, Plus, Settings, Trash2, Wallet } from "lucide-react"
import { useNav } from "../nav-context"
import { useCommissionConfig, useCommissionEntries, useIndex, useRefresh } from "@/lib/hooks"
import {
  getCommissionConfig,
  getCommissionEntries,
  saveCommissionConfig,
  saveCommissionEntries,
} from "@/lib/storage"
import {
  commissionTotal,
  commissionVariable,
  currentPeriod,
  entriesForPeriod,
  entryRevenue,
  periodLabel,
  periodRevenue,
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

  const periodEntries = useMemo(
    () => entriesForPeriod(entries, period).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [entries, period],
  )
  const revenue = periodRevenue(entries, period)
  const variable = commissionVariable(entries, period, config)
  const total = commissionTotal(entries, period, config)

  function shiftPeriod(delta: number) {
    const [y, m] = period.split("-").map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  function openNew() {
    setEditing(null)
    setClientName("")
    setHectares("")
    setRate("")
    setDate(todayISO())
    setNote("")
    setOpen(true)
  }

  function openEdit(e: CommissionEntry) {
    setEditing(e)
    setClientName(e.clientName)
    setHectares(String(e.hectares ?? ""))
    setRate(String(e.rate ?? ""))
    setDate(e.date || todayISO())
    setNote(e.note || "")
    setOpen(true)
  }

  async function save() {
    if (!clientName.trim()) {
      alert("Informe o nome do cliente.")
      return
    }
    if (!hectares || Number(hectares) <= 0) {
      alert("Informe os hectares levantados.")
      return
    }
    if (!rate || Number(rate) <= 0) {
      alert("Informe o valor por hectare.")
      return
    }
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

  async function remove(e: CommissionEntry) {
    if (!confirm(`Excluir o lançamento de "${e.clientName}"?`)) return
    const list = await getCommissionEntries()
    await saveCommissionEntries(list.filter((x) => x.id !== e.id))
    refresh()
  }

  async function saveConfig() {
    const percent = Number(percentInput)
    const fixedSalary = Number(salaryInput)
    if (Number.isNaN(percent) || Number.isNaN(fixedSalary)) {
      alert("Informe valores numéricos válidos.")
      return
    }
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
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white/65">
            <Wallet className="h-3.5 w-3.5" /> Comissão do mês
          </div>
          <div className="num mt-1 text-3xl font-extrabold">{fmtMoney(total)}</div>
          <div className="mt-1 text-[11px] text-white/60">
            {fmtMoney(variable)} variável ({config.percent}% de {fmtMoney(revenue)}) + {fmtMoney(config.fixedSalary)} fixo
          </div>
        </div>

        <button
          onClick={() => {
            setNavPeriod(period)
            goReport("commissionReport")
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-white/25"
        >
          <FileText className="h-4 w-4" /> Relatório de comissão
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
        <SectionTitle>Levantamentos lançados</SectionTitle>
        {periodEntries.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8 text-muted-foreground/50" />}>
            Nenhum levantamento lançado em {periodLabel(period).toLowerCase()}. Toque em "Novo lançamento" para
            registrar o que foi feito.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5">
            {periodEntries.map((e) => (
              <div key={e.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-foreground">{e.clientName}</div>
                    <div className="num mt-0.5 text-xs text-muted-foreground">
                      {fmtHa(e.hectares)} ha × {fmtMoney(e.rate)}/ha
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{fmtDate(e.date)}</div>
                    {e.note && <div className="mt-1 text-[13px] text-muted-foreground">{e.note}</div>}
                  </div>
                  <div className="num shrink-0 text-[15px] font-extrabold text-primary">
                    {fmtMoney(entryRevenue(e))}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEdit(e)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/70"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => remove(e)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
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
          <PrimaryButton className="w-full" onClick={save}>
            {editing ? "Salvar alterações" : "Adicionar lançamento"}
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setOpen(false)}>
            Cancelar
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
          <PrimaryButton className="w-full" onClick={saveConfig}>
            Salvar configuração
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setConfigOpen(false)}>
            Cancelar
          </GhostButton>
        </ModalSheet>
      )}
    </div>
  )
}
