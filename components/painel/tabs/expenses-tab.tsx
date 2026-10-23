"use client"

import { useState } from "react"
import { Plus, Receipt, Trash2 } from "lucide-react"
import type { Expense, Project } from "@/lib/types"
import { projectNetRevenue, totalExpenses } from "@/lib/calculations"
import { fmtDate, fmtMoney } from "@/lib/format"
import { deleteExpense } from "@/lib/storage"
import { useRefresh, useVehicles } from "@/lib/hooks"
import { EmptyState, SectionTitle, StatCard, Dinheiro, corDoFluxo } from "../chrome"
import { SecondaryButton } from "../buttons"
import { ConfirmDeleteSheet, ExpenseModal } from "../modals"

export function ExpensesTab({ project }: { project: Project }) {
  const refresh = useRefresh()
  const { vehicles } = useVehicles()
  const [showAdd, setShowAdd] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<Expense | null>(null)

  const total = totalExpenses(project)
  const revenue = projectNetRevenue(project)
  const margin = revenue - total
  const hasRevenue = revenue > 0

  const rows = (project.expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  async function removeExpense(expId: string) {
    await deleteExpense(project.id, expId)
    setPendingRemove(null)
    refresh()
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <StatCard label="Total gasto" value={(total > 0 ? "− " : "") + fmtMoney(total)} valueClassName={corDoFluxo("saida", total)} unit={`${rows.length} lançamento${rows.length === 1 ? "" : "s"}`} />
        {hasRevenue ? (
          <StatCard
            label="Margem estimada"
            value={(margin < 0 ? "− " : "") + fmtMoney(Math.abs(margin))}
            valueClassName={corDoFluxo("saldo", margin)}
            unit={`de ${fmtMoney(revenue)} faturados`}
          />
        ) : (
          <StatCard label="Margem estimada" value="—" unit="Defina o preço dos serviços" />
        )}
      </div>

      <SectionTitle count={rows.length || undefined}>Gastos do projeto</SectionTitle>
      {rows.length === 0 ? (
        <EmptyState icon={<Receipt className="h-8 w-8 opacity-40" />}>
          Nenhum gasto lançado. Registre combustível, diárias e peças para ver a margem do projeto.
        </EmptyState>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          {rows.map((e) => {
            const meta = [fmtDate(e.date), e.description ? e.category : "", e.vehicle].filter(Boolean).join(" · ")
            return (
              <div key={e.id} className="flex items-center gap-2 py-3 pl-4 pr-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{e.description || e.category}</div>
                  <div className="num truncate text-[13px] text-muted-foreground">{meta}</div>
                </div>
                <Dinheiro valor={e.value} fluxo="saida" className="shrink-0 text-[15px] font-bold" />
                <button
                  onClick={() => setPendingRemove(e)}
                  aria-label={`Remover gasto ${e.description || e.category}`}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-faint hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <SecondaryButton className="mt-4 w-full" onClick={() => setShowAdd(true)}>
        <Plus className="h-4 w-4" /> Adicionar gasto
      </SecondaryButton>

      {showAdd && <ExpenseModal project={project} vehicles={vehicles} onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {pendingRemove && (
        <ConfirmDeleteSheet
          title="Remover gasto"
          confirmLabel="Remover gasto"
          onConfirm={() => removeExpense(pendingRemove.id)}
          onClose={() => setPendingRemove(null)}
        >
          <strong className="font-semibold text-foreground">{pendingRemove.description || pendingRemove.category}</strong> (
          <span className="num">{fmtMoney(pendingRemove.value)}</span>, {fmtDate(pendingRemove.date)}) sai do projeto e do
          relatório de gastos.
        </ConfirmDeleteSheet>
      )}
    </div>
  )
}
