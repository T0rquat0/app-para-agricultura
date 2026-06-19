"use client"

import { useNav } from "../nav-context"
import { useProject } from "@/lib/hooks"
import { fmtHa, fmtMoney, slug } from "@/lib/format"
import {
  mappedHa,
  pct,
  projectRevenue,
  serviceRevenue,
  pricingSummary,
  talhaoFlown,
  talhaoBadge,
  ungroupedAreas,
} from "@/lib/calculations"
import { ReportShell, ReportHeader, ReportRow, ReportSection, ReportTotal } from "../report-shell"

export function ReportClientScreen() {
  const { currentProjectId, goReport } = useNav()
  const { project } = useProject(currentProjectId)

  if (!project) {
    return (
      <ReportShell title="Relatório do cliente" filename="relatorio" onBack={() => goReport("project")}>
        <p className="text-sm text-[#6b7280]">Projeto não encontrado.</p>
      </ReportShell>
    )
  }

  const m = mappedHa(project)
  const total = Number(project.totalHectares || 0)
  const progress = pct(project)
  const revenue = projectRevenue(project)
  const talhoes = project.talhoes || []
  const loose = ungroupedAreas(project)

  return (
    <ReportShell
      title="Relatório do cliente"
      subtitle={project.clientName}
      filename={`relatorio_${slug(project.clientName)}`}
      onBack={() => goReport("project")}
      footerNote="Valores sujeitos a confirmação contratual."
    >
      <ReportHeader
        docType="Relatório do Cliente"
        heading={project.clientName}
        meta={project.fazenda ? `${project.fazenda} · ${fmtHa(total)} ha contratados` : `${fmtHa(total)} ha contratados`}
      />

      <ReportSection title="Progresso do mapeamento">
        <ReportRow label="Área total contratada" value={`${fmtHa(total)} ha`} />
        <ReportRow label="Área mapeada" value={`${fmtHa(m)} ha`} accent />
        <ReportRow label="Conclusão" value={`${progress.toFixed(1)}%`} strong />
      </ReportSection>

      {talhoes.length > 0 && (
        <ReportSection title="Talhões / matrículas">
          {talhoes.map((t) => {
            const flown = talhaoFlown(project, t.id)
            const badge = talhaoBadge(project, t)
            const label = badge ? `${t.name} (${badge})` : t.name
            const target = t.targetHectares != null ? ` / ${fmtHa(t.targetHectares)} ha` : ""
            return <ReportRow key={t.id} label={label} value={`${fmtHa(flown)} ha${target}`} />
          })}
          {loose.length > 0 && (
            <ReportRow
              label="Áreas sem talhão"
              value={`${fmtHa(loose.reduce((s, a) => s + Number(a.hectares || 0), 0))} ha`}
            />
          )}
        </ReportSection>
      )}

      <ReportSection title="Serviços contratados">
        {(project.services || []).length === 0 ? (
          <p className="py-2 text-[13px] text-[#6b7280]">Nenhum serviço cadastrado.</p>
        ) : (
          project.services.map((s) => (
            <div key={s.id} style={{ borderBottom: "1px solid #f1f1f1" }} className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">{s.name}</span>
                <span className="text-[13px] font-bold tabular-nums text-[#1A4228]">{fmtMoney(serviceRevenue(project, s))}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-[#6b7280]">{pricingSummary(project, s)}</div>
            </div>
          ))
        )}
      </ReportSection>

      <ReportSection title="Resumo financeiro">
        <ReportTotal label="Valor total dos serviços" value={fmtMoney(revenue)} />
      </ReportSection>
    </ReportShell>
  )
}
