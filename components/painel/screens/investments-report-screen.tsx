"use client"

import { useNav } from "../nav-context"
import { useFinancialOverview, useInvestments } from "@/lib/hooks"
import { totalInvested } from "@/lib/storage"
import { fmtDate, fmtMoney } from "@/lib/format"
import { ReportShell, ReportHeader, ReportRow, ReportSection, ReportTotal } from "../report-shell"

export function InvestmentsReportScreen() {
  const { goInvestments } = useNav()
  const { investments } = useInvestments()
  const { overview } = useFinancialOverview()

  const invested = totalInvested(investments)
  const contract = overview?.totalContract || 0
  const opex = overview?.totalOpEx || 0
  const balance = contract - opex - invested
  const projectCount = overview?.projectCount || 0

  const sorted = investments.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  return (
    <ReportShell
      title="Relatório financeiro"
      subtitle="Divisão de levantamento"
      filename="relatorio_financeiro_ags"
      onBack={goInvestments}
      footerNote="Documento interno — uso gerencial."
    >
      <ReportHeader
        docType="Relatório Financeiro"
        heading="Visão Consolidada"
        meta="Divisão de Geoprocessamento com Drone"
      />

      <ReportSection title="Visão geral">
        <ReportRow label="Projetos ativos" value={String(projectCount)} />
        <ReportRow label="Total contratado" value={fmtMoney(contract)} />
        <ReportRow label="Custos operacionais" value={fmtMoney(opex)} />
        <ReportRow label="Total investido (CAPEX)" value={fmtMoney(invested)} />
        <ReportRow label="Saldo da operação" value={fmtMoney(balance)} strong accent />
      </ReportSection>

      <ReportSection title="Investimentos / equipamentos">
        {sorted.length === 0 ? (
          <p className="py-2 text-[13px] text-[#6b7280]">Nenhum investimento cadastrado.</p>
        ) : (
          sorted.map((inv) => (
            <div key={inv.id} style={{ borderBottom: "1px solid #f1f1f1" }} className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">{inv.name}</span>
                <span className="text-[13px] font-bold tabular-nums text-[#1A4228]">{fmtMoney(inv.value)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-[#6b7280]">
                <span>{inv.note || "—"}</span>
                <span>{fmtDate(inv.date)}</span>
              </div>
            </div>
          ))
        )}
      </ReportSection>

      <ReportSection title="Total investido">
        <ReportTotal label="Soma dos aportes" value={fmtMoney(invested)} />
      </ReportSection>
    </ReportShell>
  )
}
