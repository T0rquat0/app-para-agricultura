"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import type { Project } from "@/lib/types"
import { projectNetRevenue, totalExpenses } from "@/lib/calculations"
import { fmtDate, fmtMoney } from "@/lib/format"
import { deleteExpense } from "@/lib/storage"
import { useRefresh, useVehicles } from "@/lib/hooks"
import { SectionTitle } from "../chrome"
import { SecondaryButton } from "../buttons"
import { ExpenseModal } from "../modals"

export function ExpensesTab({ project }: { project: Project }) {
  const refresh = useRefresh()
  const { vehicles } = useVehicles()
  const [showAdd, setShowAdd] = useState(false)

  const total = totalExpenses(project)
  const revenue = projectNetRevenue(project)
  const margin = revenue - total
  const hasRevenue = revenue > 0

  const rows = (project.expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  async function removeExpense(expId: string) {
    if (!confirm("Remover este gasto?")) return
    await deleteExpense(project.id, expId)
    refresh()
  }

  return (
    <div>
      <div className="mb-2.5 grid grid-cols-2 gap-2.5">
        <Card label="Total gasto" value={fmtMoney(total)} tone="sand" />
        <Card label="Lançamentos" value={String((project.expenses || []).length)} tone="sand" />
      </div>
      {hasRevenue && (
        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          <Card label="Faturamento estimado" value={fmtMoney(revenue)} />
          <Card label="Margem estimada" value={fmtMoney(margin)} negative={margin < 0} />
        </div>
      )}

      <SectionTitle className="mt-3">Gastos do projeto</SectionTitle>
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground border border-border">
          Nenhum gasto lançado ainda.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-border bg-card">
          {rows.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5 last:border-0">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-bold text-foreground">{e.description || e.category}</div>
                <div className="text-[12.5px] text-muted-foreground">{fmtDate(e.date)}</div>
                {(e.description || e.vehicle) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.description && (
                      <span className="rounded-md bg-raised px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{e.category}</span>
                    )}
                    {e.vehicle && (
                      <span className="rounded-md bg-raised px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{e.vehicle}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="num text-[14px] font-bold text-foreground">{fmtMoney(e.value)}</span>
                <button
                  onClick={() => removeExpense(e.id)}
                  aria-label="Remover gasto"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <SecondaryButton className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Adicionar gasto
        </SecondaryButton>
      </div>

      {showAdd && <ExpenseModal project={project} vehicles={vehicles} onClose={() => setShowAdd(false)} onSaved={refresh} />}
    </div>
  )
}

function Card({
  label,
  value,
  tone,
  negative,
}: {
  label: string
  value: string
  tone?: "sand"
  negative?: boolean
}) {
  return (
    <div className={`rounded-2xl p-3 text-center ring-1 ${tone === "sand" ? "bg-sand-bg ring-accent/20" : "bg-card ring-border/60"}`}>
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-base font-bold ${negative ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  )
}
