"use client"

import { useNav } from "../nav-context"
import { useProject } from "@/lib/hooks"
import { fmtDate, fmtMoney, slug } from "@/lib/format"
import { projectRevenue, totalExpenses } from "@/lib/calculations"
import { ReportShell, ReportHeader, ReportRow, ReportSection, ReportTotal } from "../report-shell"

export function ReportExpensesScreen() {
  const { currentProjectId, goReport } = useNav()
  const { project } = useProject(currentProjectId)

  if (!project) {
    return (
      <ReportShell title="Relatório de gastos" filename="gastos" onBack={() => goReport("project")}>
        <p className="text-sm text-[#6b7280]">Projeto não encontrado.</p>
      </ReportShell>
    )
  }

  const expenses = (project.expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  const opex = totalExpenses(project)
  const revenue = projectRevenue(project)
  const margin = revenue - opex

  // Agrupa por categoria
  const byCategory = new Map<string, number>()
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) || 0) + Number(e.value || 0))
  }

  return (
    <ReportShell
      title="Relatório de gastos"
      subtitle={project.clientName}
      filename={`gastos_${slug(project.clientName)}`}
      onBack={() => goReport("project")}
      footerNote="Documento interno — uso gerencial."
    >
      <ReportHeader
        docType="Relatório de Gastos"
        heading={project.clientName}
        meta={project.fazenda || "Custos do projeto"}
      />

      <ReportSection title="Resumo">
        <ReportRow label="Faturamento previsto" value={fmtMoney(revenue)} />
        <ReportRow label="Custos operacionais" value={fmtMoney(opex)} />
        <ReportRow label="Margem estimada" value={fmtMoney(margin)} strong accent />
      </ReportSection>

      {byCategory.size > 0 && (
        <ReportSection title="Gastos por categoria">
          {[...byCategory.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([cat, v]) => (
              <ReportRow key={cat} label={cat} value={fmtMoney(v)} />
            ))}
        </ReportSection>
      )}

      <ReportSection title="Lançamentos">
        {expenses.length === 0 ? (
          <p className="py-2 text-[13px] text-[#6b7280]">Nenhum gasto lançado.</p>
        ) : (
          expenses.map((e) => (
            <div key={e.id} style={{ borderBottom: "1px solid #f1f1f1" }} className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  {e.category}
                  {e.vehicle ? ` · ${e.vehicle}` : ""}
                </span>
                <span className="text-[13px] font-bold tabular-nums text-[#1a1a1a]">{fmtMoney(e.value)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-[#6b7280]">
                <span>{e.description || "—"}</span>
                <span>{fmtDate(e.date)}</span>
              </div>
            </div>
          ))
        )}
      </ReportSection>

      <ReportSection title="Total">
        <ReportTotal label="Total de gastos" value={fmtMoney(opex)} />
      </ReportSection>
    </ReportShell>
  )
}
