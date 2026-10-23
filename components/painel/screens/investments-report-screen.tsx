"use client"

import { useNav } from "../nav-context"
import { useFinancialOverview, useInvestments } from "@/lib/hooks"
import { totalInvested } from "@/lib/storage"
import { fmtDate, fmtMoney } from "@/lib/format"
import {
  CellNote,
  DOC,
  ReportFigures,
  ReportHeader,
  ReportRow,
  ReportSection,
  ReportShell,
  ReportTable,
  ReportTotal,
} from "../report-shell"

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
      docType="Relatório financeiro"
      filename="relatorio_financeiro_ags"
      onBack={goInvestments}
      footerNote="Documento interno — uso gerencial."
    >
      <ReportHeader
        docType="Relatório financeiro"
        heading="Visão consolidada"
        meta="Divisão de Geoprocessamento com Drone"
      >
        <ReportFigures
          items={[
            {
              label: "Saldo da operação",
              value: fmtMoney(balance),
              tone: balance < 0 ? "negative" : "signal",
            },
            { label: "Total contratado", value: fmtMoney(contract) },
            { label: "Projetos ativos", value: String(projectCount) },
          ]}
        />
      </ReportHeader>

      <ReportSection title="Composição do saldo">
        <div data-pdf-keep>
          <ReportRow label="Total contratado" value={fmtMoney(contract)} />
          <ReportRow label="Custos operacionais" value={`− ${fmtMoney(opex)}`} />
          <ReportRow label="Total investido (CAPEX)" value={`− ${fmtMoney(invested)}`} />
          <ReportTotal
            label="Saldo da operação"
            value={fmtMoney(balance)}
            tone={balance < 0 ? "negative" : "positive"}
          />
        </div>
      </ReportSection>

      <ReportSection
        title="Investimentos / equipamentos"
        aside={sorted.length ? `${sorted.length} ${sorted.length === 1 ? "aporte" : "aportes"}` : undefined}
      >
        {sorted.length === 0 ? (
          <p className="py-3 text-[13px]" style={{ color: DOC.muted }}>
            Nenhum investimento cadastrado.
          </p>
        ) : (
          <ReportTable
            columns={[
              { label: "Data", width: "92px" },
              { label: "Item" },
              { label: "Valor", align: "right", width: "150px" },
            ]}
            rows={sorted.map((inv) => ({
              key: inv.id,
              cells: [
                <span key="d" style={{ color: DOC.muted }}>
                  {fmtDate(inv.date)}
                </span>,
                <span key="n" className="font-semibold">
                  {inv.name}
                  {inv.note && <CellNote>{inv.note}</CellNote>}
                </span>,
                <span key="v" className="font-semibold">
                  {fmtMoney(inv.value)}
                </span>,
              ],
            }))}
          />
        )}
        <ReportTotal label="Soma dos aportes" value={fmtMoney(invested)} />
      </ReportSection>
    </ReportShell>
  )
}
