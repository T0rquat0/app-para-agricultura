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

const SERVICE_DELIVERABLES: Record<string, string[]> = {
  "Levantamento Altimétrico": [
    "Modelo Digital de Terreno (MDT) em formato GeoTIFF",
    "Nuvem de pontos classificada (solo / vegetação)",
    "Ortomosaico georreferenciado em alta resolução",
    "Relatório de processamento fotogramétrico",
  ],
  "Curva de Nível/Desnível": [
    "Curvas de nível em formato DXF e Shapefile",
    "Equidistância vertical definida conforme declividade",
    "Mapa hipsométrico da área",
  ],
  "Projeto de Drenagem": [
    "Análise hidrológica e delineamento de bacias",
    "Projeto executivo das estruturas de drenagem",
    "Especificações técnicas (dimensões, tipologia, declividade)",
    "Destino final das águas drenadas",
  ],
  "Linha de Plantio": [
    "Linhas de plantio georreferenciadas em DXF",
    "Espaçamento e orientação definidos por talhão",
  ],
  "Mapa de Pulverização": [
    "Mapa temático para aplicação de insumos",
    "Zonas de manejo georreferenciadas",
  ],
}

function getDeliverables(serviceName: string): string[] {
  for (const key of Object.keys(SERVICE_DELIVERABLES)) {
    if (serviceName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(serviceName.toLowerCase())) {
      return SERVICE_DELIVERABLES[key]
    }
  }
  return ["Entrega técnica conforme escopo contratado"]
}

const Divider = () => <div style={{ height: 1, background: "#f0f0f0", margin: "20px 0" }} />

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
  const services = project.services || []

  return (
    <ReportShell
      title="Relatório do cliente"
      subtitle={project.clientName}
      filename={`relatorio_${slug(project.clientName)}`}
      onBack={() => goReport("project")}
      footerNote="Documento técnico. Valores sujeitos a confirmação contratual."
    >
      <ReportHeader
        docType="Relatório de Progresso"
        heading={project.clientName}
        meta={project.fazenda ? `${project.fazenda} · ${fmtHa(total)} ha contratados` : `${fmtHa(total)} ha contratados`}
      />

      {/* DADOS DO PROJETO */}
      <ReportSection title="Dados do projeto">
        <ReportRow label="Proprietário / Cliente" value={project.clientName} />
        {project.fazenda && <ReportRow label="Fazenda / Empreendimento" value={project.fazenda} />}
        <ReportRow label="Localização" value="Roraima, Brasil" />
        <ReportRow label="Área total contratada" value={`${fmtHa(total)} ha`} />
        <ReportRow label="Área mapeada até o momento" value={`${fmtHa(m)} ha`} accent />
        <ReportRow label="Progresso geral" value={`${progress.toFixed(1)}%`} strong />
      </ReportSection>

      <Divider />

      {/* EQUIPAMENTOS */}
      <ReportSection title="Equipamentos e tecnologia">
        <div className="pt-1">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#374151" }}>
            Coleta de dados em campo
          </div>
          {[
            { label: "Aeronave", value: "DJI Matrice 4E — câmera RGB de alta resolução" },
            { label: "Posicionamento", value: "Base RTK D-RTK 3 Enterprise — precisão centimétrica" },
            { label: "Regulamentação", value: "Voos autorizados conforme ANAC / DECEA" },
          ].map((item, i) => (
            <div key={i} className="flex justify-between py-2" style={{ borderBottom: "1px solid #f1f1f1" }}>
              <span className="text-[12px] font-semibold" style={{ color: "#374151", minWidth: 110 }}>{item.label}</span>
              <span className="text-[12px] text-right" style={{ color: "#6b7280" }}>{item.value}</span>
            </div>
          ))}
          <div className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#374151" }}>
            Processamento e cartografia
          </div>
          {[
            { label: "Fotogrametria", value: "Agisoft Metashape Professional" },
            { label: "Cartografia", value: "AgroCad Civil — curvas de nível e drenagem" },
            { label: "Geoespacial", value: "QGIS — shapefiles e análise territorial" },
          ].map((item, i) => (
            <div key={i} className="flex justify-between py-2" style={{ borderBottom: "1px solid #f1f1f1" }}>
              <span className="text-[12px] font-semibold" style={{ color: "#374151", minWidth: 110 }}>{item.label}</span>
              <span className="text-[12px] text-right" style={{ color: "#6b7280" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </ReportSection>

      <Divider />

      {/* PROGRESSO POR TALHÃO */}
      {talhoes.length > 0 && (
        <>
          <ReportSection title="Progresso por talhão / matrícula">
            {talhoes.map((t) => {
              const flown = talhaoFlown(project, t.id)
              const badge = talhaoBadge(project, t)
              const label = badge ? `${t.name} (${badge})` : t.name
              const target = t.targetHectares != null ? ` / ${fmtHa(t.targetHectares)} ha` : ""
              const tPct = t.targetHectares ? Math.min(100, (flown / Number(t.targetHectares)) * 100) : null
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #f1f1f1" }}>
                  <span className="text-[13px] text-[#4b5563]">{label}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] tabular-nums font-semibold text-[#1a1a1a]">
                      {`${fmtHa(flown)} ha${target}`}
                    </span>
                    {tPct !== null && (
                      <span className={`text-[11px] font-bold w-8 text-right ${tPct >= 100 ? "text-[#1A4228]" : "text-[#9ca3af]"}`}>
                        {tPct >= 100 ? "✓" : `${tPct.toFixed(0)}%`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {loose.length > 0 && (
              <ReportRow
                label="Áreas sem talhão"
                value={`${fmtHa(loose.reduce((s, a) => s + Number(a.hectares || 0), 0))} ha`}
              />
            )}
          </ReportSection>
          <Divider />
        </>
      )}

      {/* ESCOPO E PRODUTOS */}
      {services.length > 0 && (
        <>
          <ReportSection title="Serviços e produtos a entregar">
            <div className="space-y-5 pt-1">
              {services.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-extrabold text-[#1a1a1a]">{s.name}</span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                      style={{
                        background: s.status === "concluido" ? "#eef6f0" : s.status === "andamento" ? "#fef9ec" : "#f3f4f6",
                        color: s.status === "concluido" ? "#1A4228" : s.status === "andamento" ? "#92400e" : "#6b7280",
                      }}
                    >
                      {s.status === "concluido" ? "✓ Concluído" : s.status === "andamento" ? "Em andamento" : "Pendente"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {getDeliverables(s.name).map((d, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-[10px]" style={{ color: "#1A4228" }}>▸</span>
                        <span className="text-[12px] text-[#6b7280] leading-relaxed">{d}</span>
                      </div>
                    ))}
                  </div>
                  {s.clientNote && (
                    <div className="mt-2.5 rounded-xl px-3 py-2.5" style={{ background: "#f0f7f3", border: "1px solid #cfe7d8" }}>
                      <span className="text-[11px] font-bold text-[#1A4228]">Observação: </span>
                      <span className="text-[12px] text-[#374151]">{s.clientNote}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ReportSection>
          <Divider />
        </>
      )}

      {/* RESUMO FINANCEIRO */}
      <ReportSection title="Resumo financeiro">
        <div className="space-y-1 mb-4">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #f1f1f1" }}>
              <div>
                <div className="text-[13px] font-semibold text-[#1a1a1a]">{s.name}</div>
                <div className="mt-0.5 text-[11px] text-[#9ca3af]">{pricingSummary(project, s)}</div>
              </div>
              <span className="text-[13px] font-bold tabular-nums text-[#1A4228]">{fmtMoney(serviceRevenue(project, s))}</span>
            </div>
          ))}
        </div>
        <ReportTotal label="Valor total dos serviços" value={fmtMoney(revenue)} />
      </ReportSection>

    </ReportShell>
  )
}
