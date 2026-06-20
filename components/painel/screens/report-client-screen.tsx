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

// Mapeamento de serviço → produtos que serão entregues
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

      {/* 1. DADOS DO PROJETO */}
      <ReportSection title="Dados do projeto">
        <ReportRow label="Proprietário / Cliente" value={project.clientName} />
        {project.fazenda && <ReportRow label="Fazenda / Empreendimento" value={project.fazenda} />}
        <ReportRow label="Localização" value="Roraima, Brasil" />
        <ReportRow label="Área total contratada" value={`${fmtHa(total)} ha`} />
        <ReportRow label="Área mapeada até o momento" value={`${fmtHa(m)} ha`} accent />
        <ReportRow label="Progresso geral" value={`${progress.toFixed(1)}%`} strong />
      </ReportSection>

      {/* 2. TECNOLOGIA E EQUIPAMENTOS */}
      <ReportSection title="Tecnologia e equipamentos utilizados">
        <div style={{ marginBottom: 6 }}>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#374151]" style={{ marginBottom: 4 }}>
            Coleta de dados em campo
          </div>
          {[
            "Drone DJI Matrice 4E com câmera RGB de alta resolução",
            "Base RTK D-RTK 3 Enterprise para posicionamento centimétrico",
            "Sensores GNSS RTK de precisão para georreferenciamento",
            "Voos operacionais conforme regulamentações ANAC / DECEA",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-1" style={{ borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ color: "#1A4228", marginTop: 1, flexShrink: 0 }}>▸</span>
              <span className="text-[12.5px] text-[#374151]">{item}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#374151]" style={{ marginBottom: 4 }}>
            Processamento e cartografia
          </div>
          {[
            "Agisoft Metashape Professional — fotogrametria e geração de nuvem de pontos",
            "AgroCad Civil — projeto de curvas de nível e drenagem",
            "QGIS — análise geoespacial e entrega de shapefiles",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-1" style={{ borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ color: "#1A4228", marginTop: 1, flexShrink: 0 }}>▸</span>
              <span className="text-[12.5px] text-[#374151]">{item}</span>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* 3. PROGRESSO DO MAPEAMENTO POR TALHÃO */}
      {talhoes.length > 0 && (
        <ReportSection title="Progresso por talhão / matrícula">
          {talhoes.map((t) => {
            const flown = talhaoFlown(project, t.id)
            const badge = talhaoBadge(project, t)
            const label = badge ? `${t.name} (${badge})` : t.name
            const target = t.targetHectares != null ? ` / ${fmtHa(t.targetHectares)} ha` : ""
            const tPct = t.targetHectares ? Math.min(100, (flown / Number(t.targetHectares)) * 100) : null
            return (
              <div key={t.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #f1f1f1" }}>
                <span className="text-[13px] text-[#4b5563]">{label}</span>
                <span className="text-[13px] tabular-nums font-semibold text-[#1a1a1a]">
                  {`${fmtHa(flown)} ha${target}`}
                  {tPct !== null && (
                    <span className={`ml-2 text-[11px] font-bold ${tPct >= 100 ? "text-[#1A4228]" : "text-[#6b7280]"}`}>
                      {tPct >= 100 ? "✓" : `${tPct.toFixed(0)}%`}
                    </span>
                  )}
                </span>
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
      )}

      {/* 4. ESCOPO E PRODUTOS A ENTREGAR */}
      {services.length > 0 && (
        <ReportSection title="Escopo dos serviços e produtos a entregar">
          {services.map((s, i) => (
            <div key={s.id} style={{ marginBottom: i < services.length - 1 ? 10 : 0, paddingBottom: i < services.length - 1 ? 10 : 0, borderBottom: i < services.length - 1 ? "1px solid #f1f1f1" : "none" }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#1a1a1a]">{s.name}</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    background: s.status === "concluido" ? "#eef6f0" : s.status === "andamento" ? "#fef9ec" : "#f3f4f6",
                    color: s.status === "concluido" ? "#1A4228" : s.status === "andamento" ? "#92400e" : "#6b7280",
                  }}
                >
                  {s.status === "concluido" ? "✓ Concluído" : s.status === "andamento" ? "Em andamento" : "Pendente"}
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                {getDeliverables(s.name).map((d, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <span className="text-[10px]" style={{ color: "#1A4228", marginTop: 1, flexShrink: 0 }}>▸</span>
                    <span className="text-[11.5px] text-[#6b7280]">{d}</span>
                  </div>
                ))}
              </div>
              {s.clientNote && (
                <div className="mt-2 rounded-lg px-3 py-2" style={{ background: "#f0f7f3", border: "1px solid #cfe7d8" }}>
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#1A4228" }}>Nota: </span>
                  <span className="text-[11.5px]" style={{ color: "#374151" }}>{s.clientNote}</span>
                </div>
              )}
            </div>
          ))}
        </ReportSection>
      )}

      {/* 5. RESUMO FINANCEIRO */}
      <ReportSection title="Resumo financeiro">
        {services.map((s) => (
          <div key={s.id} style={{ borderBottom: "1px solid #f1f1f1" }} className="py-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#1a1a1a]">{s.name}</span>
              <span className="text-[13px] font-bold tabular-nums text-[#1A4228]">{fmtMoney(serviceRevenue(project, s))}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#6b7280]">{pricingSummary(project, s)}</div>
          </div>
        ))}
        <div className="mt-3">
          <ReportTotal label="Valor total dos serviços" value={fmtMoney(revenue)} />
        </div>
      </ReportSection>

      {/* 6. METODOLOGIA */}
      <ReportSection title="Metodologia de trabalho">
        <div className="space-y-1.5">
          {[
            { fase: "1. Planejamento de voo", desc: "Definição de rotas, GSD alvo e configuração da missão autônoma no DJI Pilot 2." },
            { fase: "2. Coleta em campo", desc: "Voos com o DJI Matrice 4E, posicionamento RTK centimétrico via D-RTK 3 Enterprise. Área dividida em seções para controle de bateria." },
            { fase: "3. Fotogrametria", desc: "Processamento das imagens no Agisoft Metashape Professional: alinhamento, nuvem densa, classificação de pontos (solo/vegetação) e geração do MDT." },
            { fase: "4. Cartografia", desc: "Geração de curvas de nível, projeto de drenagem e linhas de plantio no AgroCad Civil. Exportação em DXF e shapefile via QGIS." },
          ].map((item, i) => (
            <div key={i} className="py-2" style={{ borderBottom: "1px solid #f5f5f5" }}>
              <div className="text-[12px] font-bold text-[#1A4228]">{item.fase}</div>
              <div className="mt-0.5 text-[11.5px] text-[#6b7280] leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </ReportSection>

    </ReportShell>
  )
}
