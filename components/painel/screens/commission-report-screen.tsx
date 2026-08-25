"use client"

import { useNav } from "../nav-context"
import { useCommissionAdjustments, useCommissionConfig, useCommissionEntries } from "@/lib/hooks"
import {
  commissionBase,
  commissionTotal,
  commissionVariable,
  currentPeriod,
  entriesForPeriod,
  entryRevenue,
  periodLabel,
  periodRevenue,
} from "@/lib/calculations"
import { fmtDate, fmtHa, fmtMoney } from "@/lib/format"
import { ReportShell, ReportHeader, ReportRow, ReportSection, ReportTotal } from "../report-shell"

const Divider = () => <div style={{ height: 1, background: "#f0f0f0", margin: "20px 0" }} />

export function CommissionReportScreen() {
  const { goReport, currentPeriod: navPeriod } = useNav()
  const { entries } = useCommissionEntries()
  const { config } = useCommissionConfig()
  const { adjustments } = useCommissionAdjustments()
  const period = navPeriod || currentPeriod()

  const list = entriesForPeriod(entries, period).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""))
  const revenue = periodRevenue(entries, period)
  const adjustment = adjustments[period]
  const discount = Math.min(revenue, Math.max(0, Number(adjustment?.discount || 0)))
  const base = commissionBase(entries, period, discount)
  const variable = commissionVariable(entries, period, config, discount)
  const grossBeforeDeduction = variable + Number(config.fixedSalary || 0)
  const employeeDeduction = Math.min(
    Math.max(0, grossBeforeDeduction),
    Math.max(0, Number(adjustment?.employeeDeduction || 0)),
  )
  const total = commissionTotal(entries, period, config, discount, employeeDeduction)

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
      filename={`relatorio_comissao_${period}`}
      onBack={() => goReport("commission")}
      footerNote="Documento interno — uso gerencial."
    >
      <ReportHeader
        docType="Relatório de Comissão"
        heading={periodLabel(period)}
        meta="Divisão de Geoprocessamento com Drone"
      />

      <ReportSection title="Resumo do mês">
        <ReportRow label="Levantamentos lançados" value={String(list.length)} />
        <ReportRow label="Hectares faturados" value={`${fmtHa(list.reduce((s, e) => s + Number(e.hectares || 0), 0))} ha`} />
        <ReportRow label="Faturamento dos levantamentos" value={fmtMoney(revenue)} accent />
      </ReportSection>

      <Divider />

      <ReportSection title="Faturamento por cliente">
        {byClient.size === 0 ? (
          <p className="py-2 text-[13px] text-[#6b7280]">Nenhum levantamento lançado neste período.</p>
        ) : (
          Array.from(byClient.entries()).map(([clientName, v]) => (
            <div key={clientName} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #f1f1f1" }}>
              <div>
                <div className="text-[13px] font-semibold text-[#1a1a1a]">{clientName}</div>
                <div className="mt-0.5 text-[11px] text-[#9ca3af]">{fmtHa(v.hectares)} ha levantados</div>
              </div>
              <span className="text-[13px] font-bold tabular-nums text-[#0C3A26]">{fmtMoney(v.revenue)}</span>
            </div>
          ))
        )}
      </ReportSection>

      <Divider />

      <ReportSection title="Lançamentos do período">
        {list.length === 0 ? (
          <p className="py-2 text-[13px] text-[#6b7280]">Nenhum lançamento neste período.</p>
        ) : (
          list.map((e) => (
            <div key={e.id} style={{ borderBottom: "1px solid #f1f1f1" }} className="py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  {e.clientName}
                  {e.talhaoName ? (
                    <span className="font-normal text-[#6b7280]">{` — ${e.talhaoName}`}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#0C3A26]">{fmtMoney(entryRevenue(e))}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-[#6b7280]">
                <span>
                  {fmtHa(e.hectares)} ha × {fmtMoney(e.rate)}/ha{e.note ? ` · ${e.note}` : ""}
                </span>
                <span>{fmtDate(e.date)}</span>
              </div>
            </div>
          ))
        )}
      </ReportSection>

      <Divider />

      <ReportSection title="Cálculo da comissão">
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
      </ReportSection>

      <ReportSection title="Total a receber">
        <ReportTotal label="Comissão + salário fixo" value={fmtMoney(total)} />
      </ReportSection>
    </ReportShell>
  )
}
