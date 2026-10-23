"use client"

import { useState } from "react"
import { FileText, Plus, Trash2, Wallet } from "lucide-react"
import { useNav } from "../nav-context"
import { useFinancialOverview, useInvestments, useRefresh } from "@/lib/hooks"
import { deleteInvestment, saveInvestment, totalInvested } from "@/lib/storage"
import { fmtDate, fmtMoney, genId, todayISO } from "@/lib/format"
import type { Investment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TopBar, EmptyState, SectionTitle } from "../chrome"
import { ModalSheet } from "../modal-sheet"
import { Field, NumberInput, TextInput } from "../fields"
import { SecondaryButton } from "../buttons"
import { ConfirmDeleteSheet, FormAlert, SheetActions } from "../modals"

export function InvestmentsScreen() {
  const { goReport } = useNav()
  const { investments, isLoading } = useInvestments()
  const { overview, isLoading: overviewLoading } = useFinancialOverview()
  const refresh = useRefresh()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Investment | null>(null)

  const invested = totalInvested(investments)
  const contract = overview?.totalContract || 0
  const opex = overview?.totalOpEx || 0
  const balance = contract - opex - invested
  const loading = isLoading || overviewLoading

  function openNew() {
    setEditing(null)
    setName("")
    setValue("")
    setDate(todayISO())
    setNote("")
    setFormError(null)
    setOpen(true)
  }

  function openEdit(inv: Investment) {
    setEditing(inv)
    setName(inv.name)
    setValue(String(inv.value ?? ""))
    setDate(inv.date || todayISO())
    setNote(inv.note || "")
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (!name.trim()) {
      setFormError("Informe o nome do investimento.")
      return
    }
    await saveInvestment(
      editing
        ? { ...editing, name: name.trim(), value: Number(value || 0), date, note: note.trim() }
        : {
            id: genId("inv"),
            name: name.trim(),
            value: Number(value || 0),
            date,
            note: note.trim(),
            createdAt: new Date().toISOString(),
          },
    )
    setOpen(false)
    refresh()
  }

  async function remove(inv: Investment) {
    await deleteInvestment(inv.id)
    setPendingDelete(null)
    setOpen(false)
    refresh()
  }

  const sorted = investments.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Dinheiro" subtitle="Saldo, custos e investimentos da operação" />

      <div className="px-4">
        <section className="px-1 pt-3" aria-busy={loading}>
          <p className="text-[14px] text-muted-foreground">Saldo da operação</p>
          <p
            className={cn(
              "num text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] transition-opacity duration-200",
              balance < 0 && "text-destructive",
              loading && "opacity-40",
            )}
          >
            {fmtMoney(balance)}
          </p>
        </section>

        <dl className="mt-4 divide-y divide-border rounded-[18px] border border-border bg-card">
          {[
            { label: "Faturado nos projetos", value: contract },
            { label: "Custos de campo", value: -opex },
            { label: "Investido", value: -invested },
          ].map((it) => (
            <div key={it.label} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <dt className="text-[14px] text-muted-foreground">{it.label}</dt>
              <dd className={cn("num text-[15px] font-bold", loading && "opacity-40")}>
                {it.value < 0 ? "− " : ""}
                {fmtMoney(Math.abs(it.value))}
              </dd>
            </div>
          ))}
        </dl>

        <SecondaryButton className="mt-3 w-full" onClick={() => goReport("investmentsReport")}>
          <FileText className="h-4 w-4 text-muted-foreground" /> Relatório financeiro
        </SecondaryButton>
      </div>

      <div className="flex-1 px-4 pb-8 pt-8">
        <SectionTitle
          action={
            <button
              onClick={openNew}
              className="pressable -my-2 -mr-2 flex min-h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} /> Novo investimento
            </button>
          }
        >
          Equipamentos e aportes <span className="num ml-1 font-medium text-faint">{investments.length || ""}</span>
        </SectionTitle>
        {isLoading ? (
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[64px]" />
            ))}
          </div>
        ) : investments.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8 opacity-40" />}>
            Cadastre os investimentos em drones, computadores, softwares e outros ativos da operação.
          </EmptyState>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {sorted.map((inv) => (
              <div key={inv.id} className="flex items-center gap-1 py-1.5 pl-1.5 pr-1.5">
                <button
                  onClick={() => openEdit(inv)}
                  aria-label={`Editar ${inv.name}`}
                  className="pressable flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-[12px] px-2.5 py-1.5 text-left hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{inv.name}</div>
                    <div className="num truncate text-[13px] text-muted-foreground">
                      {fmtDate(inv.date)}
                      {inv.note ? ` · ${inv.note}` : ""}
                    </div>
                  </div>
                  <span className="num shrink-0 text-[15px] font-bold">{fmtMoney(inv.value)}</span>
                </button>
                <button
                  onClick={() => setPendingDelete(inv)}
                  aria-label={`Excluir ${inv.name}`}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-faint hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex items-baseline justify-between px-4 py-3">
              <span className="text-[13px] text-muted-foreground">Total investido</span>
              <span className="num text-[15px] font-bold">{fmtMoney(invested)}</span>
            </div>
          </div>
        )}
      </div>

      {open && (
        <ModalSheet title={editing ? "Editar investimento" : "Novo investimento"} onClose={() => setOpen(false)}>
          <Field label="Descrição">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Drone DJI Mavic 3M" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <NumberInput value={value} onChange={(e) => setValue(e.target.value)} type="number" placeholder="45000.00" />
            </Field>
            <Field label="Data">
              <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" className="num" />
            </Field>
          </div>
          <Field label="Observação (opcional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota fiscal, fornecedor…" />
          </Field>
          {formError && <FormAlert>{formError}</FormAlert>}
          <SheetActions
            label={editing ? "Salvar alterações" : "Adicionar investimento"}
            onConfirm={save}
            onCancel={() => setOpen(false)}
          />
        </ModalSheet>
      )}

      {pendingDelete && (
        <ConfirmDeleteSheet
          title="Excluir investimento"
          confirmLabel="Excluir investimento"
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        >
          <strong className="font-semibold text-foreground">{pendingDelete.name}</strong> (
          <span className="num">{fmtMoney(pendingDelete.value)}</span>) sai da lista e do saldo da operação.
        </ConfirmDeleteSheet>
      )}
    </div>
  )
}
