"use client"

import { useState } from "react"
import { FileText, Pencil, Plus, Trash2, Wallet } from "lucide-react"
import { useNav } from "../nav-context"
import { useFinancialOverview, useInvestments, useRefresh } from "@/lib/hooks"
import { deleteInvestment, saveInvestment, totalInvested } from "@/lib/storage"
import { fmtDate, fmtMoney, genId, todayISO } from "@/lib/format"
import type { Investment } from "@/lib/types"
import { TopBar, EmptyState, SectionTitle } from "../chrome"
import { ModalSheet } from "../modal-sheet"
import { Field, TextInput } from "../fields"
import { PrimaryButton, GhostButton } from "../buttons"

export function InvestmentsScreen() {
  const { goReport } = useNav()
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
    if (!confirm(`Excluir o investimento "${inv.name}"?`)) return
    await deleteInvestment(inv.id)
    refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Dinheiro" subtitle="Saldo, custos e investimentos da operação" />

      <div className="px-4">
        <section className="px-1 pt-2">
          <p className="text-[14px] text-muted-foreground">Saldo da operação</p>
          <p className={`num text-[36px] font-extrabold leading-[1.1] tracking-[-0.025em] ${balance < 0 ? "text-destructive" : ""}`}>
            {fmtMoney(balance)}
          </p>
          <p className="num mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{fmtMoney(contract)}</span> faturados, menos{" "}
            <span className="font-semibold text-foreground">{fmtMoney(opex)}</span> de custos de campo e{" "}
            <span className="font-semibold text-foreground">{fmtMoney(invested)}</span> investidos.
          </p>
        </section>


        <button
          onClick={() => goReport("investmentsReport")}
          className="pressable mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-border bg-raised text-[14px] font-bold hover:border-foreground/20"
        >
          <FileText className="h-4 w-4 text-muted-foreground" /> Relatório financeiro
        </button>
      </div>

      <div className="flex-1 px-4 pb-6 pt-7">
        <SectionTitle
          action={
            <button onClick={openNew} className="pressable -my-1 flex items-center gap-1 rounded-full px-2 py-1 text-[14px] font-bold text-primary">
              <Plus className="h-4 w-4" strokeWidth={2.4} /> Novo
            </button>
          }
        >
          Equipamentos e aportes <span className="num ml-1 font-medium text-faint">{investments.length || ""}</span>
        </SectionTitle>
        {investments.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8 opacity-40" />}>
            Cadastre os investimentos em drones, computadores, softwares e outros ativos da operação.
          </EmptyState>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {investments
              .slice()
              .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
              .map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 py-3 pl-4 pr-2">
                  <button onClick={() => openEdit(inv)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[15px] font-semibold">{inv.name}</div>
                    <div className="truncate text-[13px] text-muted-foreground">
                      {fmtDate(inv.date)}
                      {inv.note ? ` · ${inv.note}` : ""}
                    </div>
                  </button>
                  <span className="num shrink-0 text-[15px] font-bold">{fmtMoney(inv.value)}</span>
                  <button
                    onClick={() => openEdit(inv)}
                    aria-label={`Editar ${inv.name}`}
                    className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-faint hover:bg-raised hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(inv)}
                    aria-label={`Excluir ${inv.name}`}
                    className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-faint hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
          </div>
        )}
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
