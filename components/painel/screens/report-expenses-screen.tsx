"use client"

import { useNav } from "../nav-context"
import { useProject } from "@/lib/hooks"
import { fmtDate, fmtMoney, slug } from "@/lib/format"
import { projectNetRevenue, totalExpenses } from "@/lib/calculations"
import { CellNote, DOC, ReportFigures, ReportHeader, ReportSection, ReportShell, ReportTable, ReportTotal } from "../report-shell"

export function ReportExpensesScreen() {
  const { currentProjectId, goReport } = useNav()
  const { project } = useProject(currentProjectId)

  if (!project) {
    return (
      <ReportShell title="Relatório de gastos" filename="gastos" onBack={() => goReport("project")}>
        <p className="text-sm" style={{ color: DOC.muted }}>Projeto não encontrado.</p>
      </ReportShell>
    )
  }

  const expenses = (project.expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  const opex = totalExpenses(project)
  const revenue = projectNetRevenue(project)
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
      docType="Relatório de gastos"
      filename={`gastos_${slug(project.clientName)}`}
      onBack={() => goReport("project")}
      footerNote="Documento interno — uso gerencial."
    >
      <ReportHeader docType="Relatório de gastos" heading={project.clientName} meta={project.fazenda || "Custos do projeto"}>
        <ReportFigures
          items={[
            { label: "Margem estimada", value: fmtMoney(margin), tone: margin < 0 ? "negative" : "signal" },
            { label: "Faturamento previsto", value: fmtMoney(revenue) },
            { label: "Custos operacionais", value: fmtMoney(opex) },
          ]}
        />
      </ReportHeader>

      {byCategory.size > 0 && (
        <ReportSection title="Gastos por categoria">
          <ReportTable
            columns={[{ label: "Categoria" }, { label: "Total", align: "right", width: "170px" }]}
            rows={[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, v]) => ({ key: cat, cells: [cat, <span key="v" className="font-semibold">{fmtMoney(v)}</span>] }))}
            foot={["Total de gastos", fmtMoney(opex)]}
          />
        </ReportSection>
      )}

      <ReportSection title="Lançamentos" aside={expenses.length ? `${expenses.length} ${expenses.length === 1 ? "lançamento" : "lançamentos"}` : undefined}>
        {expenses.length === 0 ? (
          <p className="py-3 text-[13px]" style={{ color: DOC.muted }}>Nenhum gasto lançado.</p>
        ) : (
          <ReportTable
            columns={[
              { label: "Data", width: "92px" },
              { label: "Gasto" },
              { label: "Valor", align: "right", width: "140px" },
            ]}
            rows={expenses.map((e) => ({
              key: e.id,
              cells: [
                <span key="d" style={{ color: DOC.muted }}>{fmtDate(e.date)}</span>,
                <span key="g" className="font-semibold">
                  {e.category}
                  {e.vehicle ? <span className="font-normal" style={{ color: DOC.muted }}>{` · ${e.vehicle}`}</span> : null}
                  {e.description && <CellNote>{e.description}</CellNote>}
                </span>,
                <span key="v" className="font-semibold">{fmtMoney(e.value)}</span>,
              ],
            }))}
          />
        )}
        <ReportTotal label="Total de gastos" value={fmtMoney(opex)} />
      </ReportSection>
    </ReportShell>
  )
}
