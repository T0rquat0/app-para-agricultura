"use client"

import { useNav } from "../nav-context"
import { useCommissionAdjustments, useCommissionConfig, useCommissionEntries } from "@/lib/hooks"
import {
  commissionSummary,
  currentPeriod,
  entriesForPeriod,
  entryRevenue,
  periodLabel,
} from "@/lib/calculations"
import { fmtDate, fmtHa, fmtMoney } from "@/lib/format"
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

export function CommissionReportScreen() {
  const { goReport, currentPeriod: navPeriod } = useNav()
  const { entries } = useCommissionEntries()
  const { config } = useCommissionConfig()
  const { adjustments } = useCommissionAdjustments()
  const period = navPeriod || currentPeriod()

  const list = entriesForPeriod(entries, period)
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
  const adjustment = adjustments[period]
  // Mesma fonte da tela de Comissao, para os numeros nunca divergirem.
  const { revenue, discount, base, variable, employeeDeduction, total, hectares } = commissionSummary(
    entries,
    period,
    config,
    adjustment,
  )

  // Agrupado por cliente, para o resumo por cliente do relatorio.
  const byClient = new Map<string, { hectares: number; revenue: number }>()
  for (const e of list) {
    const cur = byClient.get(e.clientName) || { hectares: 0, revenue: 0 }
    cur.hectares += Number(e.hectares || 0)
    cur.revenue += entryRevenue(e)
    byClient.set(e.clientName, cur)
  }

  return (
    <ReportShell
      title="Relatório de comissão"
      subtitle={periodLabel(period)}
      docType="Relatório de comissão"
      filename={`relatorio_comissao_${period}`}
      onBack={() => goReport("commission")}
      footerNote="Documento interno — uso gerencial."
    >
      <ReportHeader
        docType="Relatório de comissão"
        heading={periodLabel(period)}
        meta="Divisão de Geoprocessamento com Drone"
      >
        <ReportFigures
          items={[
            {
              label: "Total a receber",
              value: fmtMoney(total),
              tone: "signal",
            },
            {
              label: "Faturamento do mês",
              value: fmtMoney(revenue),
            },
            { label: "Hectares faturados", value: fmtHa(hectares), unit: "ha" },
          ]}
        />
      </ReportHeader>

      <ReportSection
        title="Faturamento por cliente"
        aside={`${list.length} ${list.length === 1 ? "levantamento lançado" : "levantamentos lançados"}`}
      >
        {byClient.size === 0 ? (
          <p className="py-3 text-[13px]" style={{ color: DOC.muted }}>
            Nenhum levantamento lançado neste período.
          </p>
        ) : (
          <ReportTable
            columns={[
              { label: "Cliente" },
              { label: "Hectares", align: "right", width: "130px" },
              { label: "Faturamento", align: "right", width: "160px" },
            ]}
            rows={Array.from(byClient.entries()).map(([clientName, v]) => ({
              key: clientName,
              cells: [
                <span key="c" className="font-semibold">
                  {clientName}
                </span>,
                <span key="h" style={{ color: DOC.muted }}>{`${fmtHa(v.hectares)} ha`}</span>,
                <span key="r" className="font-semibold">
                  {fmtMoney(v.revenue)}
                </span>,
              ],
            }))}
            foot={["Total do mês", `${fmtHa(hectares)} ha`, fmtMoney(revenue)]}
          />
        )}
      </ReportSection>

      <ReportSection title="Lançamentos do período">
        {list.length === 0 ? (
          <p className="py-3 text-[13px]" style={{ color: DOC.muted }}>
            Nenhum lançamento neste período.
          </p>
        ) : (
          <ReportTable
            columns={[
              { label: "Data", width: "90px" },
              { label: "Levantamento" },
              { label: "Cálculo", align: "right", width: "200px" },
              { label: "Valor", align: "right", width: "124px" },
            ]}
            rows={list.map((e) => ({
              key: e.id,
              cells: [
                <span key="d" style={{ color: DOC.muted }}>
                  {fmtDate(e.date)}
                </span>,
                <span key="c" className="font-semibold">
                  {e.clientName}
                  {e.talhaoName ? (
                    <span className="font-normal" style={{ color: DOC.muted }}>{` — ${e.talhaoName}`}</span>
                  ) : null}
                  {e.note && <CellNote>{e.note}</CellNote>}
                </span>,
                <span key="x" style={{ color: DOC.muted }}>
                  {fmtHa(e.hectares)} ha × {fmtMoney(e.rate)}/ha
                </span>,
                <span key="v" className="font-semibold">
                  {fmtMoney(entryRevenue(e))}
                </span>,
              ],
            }))}
          />
        )}
      </ReportSection>

      <ReportSection title="Cálculo da comissão">
        <div data-pdf-keep>
          <ReportRow label="Faturamento dos levantamentos" value={fmtMoney(revenue)} />
          {discount > 0 && (
            <>
              <ReportRow
                label={adjustment?.note ? `Desconto ao cliente (${adjustment.note})` : "Desconto ao cliente"}
                value={`− ${fmtMoney(discount)}`}
              />
              <ReportRow label="Base de cálculo" value={fmtMoney(base)} accent />
            </>
          )}
          <ReportRow label={`Comissão variável (${config.percent}%)`} value={fmtMoney(variable)} />
          <ReportRow label="Salário fixo" value={fmtMoney(config.fixedSalary)} />
          {employeeDeduction > 0 && (
            <ReportRow
              label={adjustment?.employeeNote ? `Meu adiantamento (${adjustment.employeeNote})` : "Meu adiantamento"}
              value={`− ${fmtMoney(employeeDeduction)}`}
            />
          )}
          <ReportTotal label="Total a receber" hint="Comissão + salário fixo" value={fmtMoney(total)} />
        </div>
      </ReportSection>
    </ReportShell>
  )
}
