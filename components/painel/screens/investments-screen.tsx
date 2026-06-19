"use client"

import { useState } from "react"
import { FileText, Pencil, Plus, Trash2, TrendingUp, Wallet } from "lucide-react"
import { useNav } from "../nav-context"
import { useFinancialOverview, useInvestments, useRefresh } from "@/lib/hooks"
import { getInvestments, saveInvestments, totalInvested } from "@/lib/storage"
import { fmtDate, fmtMoney, genId, todayISO } from "@/lib/format"
import type { Investment } from "@/lib/types"
import { TopBar, EmptyState, SectionTitle } from "../chrome"
import { ModalSheet } from "../modal-sheet"
import { Field, TextInput } from "../fields"
import { PrimaryButton, GhostButton } from "../buttons"

export function InvestmentsScreen() {
  const { goHome, goReport } = useNav()
  const { investments } = useInvestments()
  const { overview } = useFinancialOverview()
  const refresh = useRefresh()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState("")

  const invested = totalInvested(investments)
  const contract = overview?.totalContract || 0
  const opex = overview?.totalOpEx || 0
  const balance = contract - opex - invested

  function openNew() {
    setEditing(null)
    setName("")
    setValue("")
    setDate(todayISO())
    setNote("")
    setOpen(true)
  }

  function openEdit(inv: Investment) {
    setEditing(inv)
    setName(inv.name)
    setValue(String(inv.value ?? ""))
    setDate(inv.date || todayISO())
    setNote(inv.note || "")
    setOpen(true)
  }

  async function save() {
    if (!name.trim()) {
      alert("Informe o nome do investimento.")
      return
    }
    const list = await getInvestments()
    if (editing) {
      const i = list.findIndex((x) => x.id === editing.id)
      if (i >= 0) {
        list[i] = { ...editing, name: name.trim(), value: Number(value || 0), date, note: note.trim() }
      }
    } else {
      list.push({
        id: genId("inv"),
        name: name.trim(),
        value: Number(value || 0),
        date,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      })
    }
    await saveInvestments(list)
    setOpen(false)
    refresh()
  }

  async function remove(inv: Investment) {
    if (!confirm(`Excluir o investimento "${inv.name}"?`)) return
    const list = await getInvestments()
    await saveInvestments(list.filter((x) => x.id !== inv.id))
    refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Investimentos" subtitle="CAPEX da divisão de levantamento" onBack={goHome} />

      <div className="bg-topo px-5 pb-6 text-white">
        <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white/65">
            <TrendingUp className="h-3.5 w-3.5" /> Total investido
          </div>
          <div className="num mt-1 text-3xl font-extrabold">{fmtMoney(invested)}</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <MiniStat label="Contratado" value={fmtMoney(contract)} />
          <MiniStat label="Custos op." value={fmtMoney(opex)} />
          <MiniStat label="Saldo" value={fmtMoney(balance)} positive={balance >= 0} />
        </div>
        <button
          onClick={() => goReport("investmentsReport")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-white/25"
        >
          <FileText className="h-4 w-4" /> Relatório financeiro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
        <SectionTitle>Equipamentos e aportes</SectionTitle>
        {investments.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8 text-muted-foreground/50" />}>
            Cadastre os investimentos em drones, computadores, softwares e outros ativos da operação.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5">
            {investments
              .slice()
              .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
              .map((inv) => (
                <div key={inv.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-foreground">{inv.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{fmtDate(inv.date)}</div>
                      {inv.note && <div className="mt-1 text-[13px] text-muted-foreground">{inv.note}</div>}
                    </div>
                    <div className="num shrink-0 text-[15px] font-extrabold text-primary">{fmtMoney(inv.value)}</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openEdit(inv)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/70"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => remove(inv)}
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-[18px] w-[18px]" /> Novo investimento
        </button>
      </div>

      {open && (
        <ModalSheet title={editing ? "Editar investimento" : "Novo investimento"} onClose={() => setOpen(false)}>
          <Field label="Descrição">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Drone DJI Mavic 3M" autoFocus />
          </Field>
          <Field label="Valor (R$)">
            <TextInput value={value} onChange={(e) => setValue(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 45000.00" />
          </Field>
          <Field label="Data">
            <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </Field>
          <Field label="Observação (opcional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota fiscal, fornecedor…" />
          </Field>
          <PrimaryButton className="w-full" onClick={save}>
            {editing ? "Salvar alterações" : "Adicionar investimento"}
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setOpen(false)}>
            Cancelar
          </GhostButton>
        </ModalSheet>
      )}
    </div>
  )
}

function MiniStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
      <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/60">{label}</div>
      <div
        className={`num mt-0.5 text-[12.5px] font-bold leading-tight ${
          positive === false ? "text-red-300" : positive === true ? "text-green-200" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  )
}
