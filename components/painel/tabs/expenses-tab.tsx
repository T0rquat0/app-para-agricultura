"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import type { Project } from "@/lib/types"
import { projectRevenue, totalExpenses } from "@/lib/calculations"
import { fmtDate, fmtMoney } from "@/lib/format"
import { saveProject } from "@/lib/storage"
import { useRefresh, useVehicles } from "@/lib/hooks"
import { SectionTitle } from "../chrome"
import { SecondaryButton } from "../buttons"
import { ExpenseModal } from "../modals"

export function ExpensesTab({ project }: { project: Project }) {
  const refresh = useRefresh()
  const { vehicles } = useVehicles()
  const [showAdd, setShowAdd] = useState(false)

  const total = totalExpenses(project)
  const revenue = projectRevenue(project)
  const margin = revenue - total
  const hasRevenue = revenue > 0

  const rows = (project.expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  async function removeExpense(expId: string) {
    if (!confirm("Remover este gasto?")) return
    const p = { ...project, expenses: (project.expenses || []).filter((e) => e.id !== expId) }
    await saveProject(p)
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
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border/60">
          Nenhum gasto lançado ainda.
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-1 shadow-sm ring-1 ring-border/60">
          {rows.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5 last:border-0">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-bold text-foreground">{e.description || e.category}</div>
                <div className="text-[11.5px] text-muted-foreground">{fmtDate(e.date)}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-md bg-sand-bg px-1.5 py-0.5 text-[10px] font-bold text-accent">{e.category}</span>
                  {e.vehicle && (
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">{e.vehicle}</span>
                  )}
                </div>
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
    <div className={`rounded-2xl p-3 text-center shadow-sm ring-1 ${tone === "sand" ? "bg-sand-bg ring-accent/20" : "bg-card ring-border/60"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-base font-bold ${negative ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  )
}
