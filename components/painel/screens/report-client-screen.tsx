"use client"

import { useNav } from "../nav-context"
import { useProject } from "@/lib/hooks"
import { fmtHa, fmtMoney, slug } from "@/lib/format"
import {
  mappedHa,
  metaMatricula,
  pct,
  projectDiscount,
  projectNetRevenue,
  projectRevenue,
  serviceRevenue,
  pricingSummary,
  talhaoFlown,
  talhaoBadge,
  ungroupedAreas,
} from "@/lib/calculations"
import { CORES_ANDAMENTO, corDoAndamento } from "@/lib/geo"
import type { ServiceStatus } from "@/lib/types"
import {
  CellNote,
  DOC,
  ReportFigures,
  ReportHeader,
  ReportList,
  ReportNote,
  ReportProgress,
  ReportRow,
  ReportSection,
  ReportShell,
  ReportSpecs,
  ReportSubhead,
  ReportTable,
  ReportTotal,
} from "../report-shell"
import { SatThumb } from "../sat-thumb"
import { GeoThumb } from "../geo-thumb"

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

const EQUIP_CAMPO = [
  { label: "Aeronave", value: "DJI Matrice 4E — câmera RGB de alta resolução" },
  { label: "Posicionamento", value: "Base RTK D-RTK 3 Enterprise — precisão centimétrica" },
  { label: "Regulamentação", value: "Voos autorizados conforme ANAC / DECEA" },
]
const EQUIP_PROCESSO = [
  { label: "Fotogrametria", value: "Agisoft Metashape Professional" },
  { label: "Cartografia", value: "AgroCad Civil — curvas de nível e drenagem" },
  { label: "Geoespacial", value: "QGIS — shapefiles e análise territorial" },
]

// Nomes das faixas do andamento (mesma ordem de CORES_ANDAMENTO).
const FAIXAS = ["Começo, até 25%", "Avançando, até 50%", "Metade, até 75%", "Quase, abaixo de 100%", "Fechada, 100%"]

const STATUS: Record<ServiceStatus, { label: string; color: string; bg: string }> = {
  concluido: { label: "Concluído", color: DOC.positive, bg: "#e7f3ec" },
  andamento: { label: "Em andamento", color: "#8a5800", bg: "#fbf1dd" },
  pendente: { label: "Pendente", color: DOC.muted, bg: DOC.wash },
}

export function ReportClientScreen() {
  const { currentProjectId, goReport } = useNav()
  const { project } = useProject(currentProjectId)

  if (!project) {
    return (
      <ReportShell title="Relatório do cliente" filename="relatorio" onBack={() => goReport("project")}>
        <p className="text-sm" style={{ color: DOC.muted }}>Projeto não encontrado.</p>
      </ReportShell>
    )
  }

  const m = mappedHa(project)
  const total = Number(project.totalHectares || 0)
  const progress = pct(project)
  const progressLabel = progress.toFixed(1).replace(".", ",")
  const revenue = projectRevenue(project)
  const discount = projectDiscount(project)
  const netRevenue = projectNetRevenue(project)
  const talhoes = project.talhoes || []
  const loose = ungroupedAreas(project)
  const looseHa = loose.reduce((s, a) => s + Number(a.hectares || 0), 0)
  const services = project.services || []

  // Desenho das matriculas com KML: mesmo andamento do mapa do app (voado / meta).
  const formas = talhoes
    .filter((t) => t.geometry?.length)
    .map((t) => {
      const meta = metaMatricula(t)
      return { id: t.id, geometry: t.geometry!, pct: meta > 0 ? Math.min(100, (talhaoFlown(project, t.id) / meta) * 100) : 0 }
    })
  const formaDe = new Map(formas.map((f) => [f.id, f]))
  const faixasPresentes = new Set(formas.filter((f) => f.pct > 0).map((f) => corDoAndamento(f.pct)))
  const temNaoVoada = formas.some((f) => !(f.pct > 0))

  return (
    <ReportShell
      title="Relatório do cliente"
      subtitle={project.clientName}
      docType="Relatório de progresso"
      filename={`relatorio_${slug(project.clientName)}`}
      onBack={() => goReport("project")}
      footerNote="Documento técnico. Valores sujeitos a confirmação contratual."
    >
      <ReportHeader
        docType="Relatório de progresso"
        heading={project.clientName}
        meta={project.fazenda ? `${project.fazenda} · Roraima, Brasil` : "Roraima, Brasil"}
      >
        <ReportFigures
          items={[
            { label: "Área mapeada até o momento", value: fmtHa(m), unit: "ha", bar: progress },
            { label: "Área total contratada", value: fmtHa(total), unit: "ha" },
            { label: "Progresso geral", value: progressLabel, unit: "%" },
          ]}
        />
      </ReportHeader>

      {/* MAPA DAS MATRICULAS (so com KML) */}
      {formas.length > 0 && (
        <ReportSection title="Mapa das matrículas" aside={`${formas.length} ${formas.length === 1 ? "matrícula" : "matrículas"} no KML`}>
          <div className="grid grid-cols-[300px_1fr] gap-7 pt-4" data-pdf-keep>
            <div className="overflow-hidden rounded-[10px]" style={{ width: 300, height: 300 }}>
              <SatThumb formas={formas} lado={300} />
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: DOC.muted }}>
                  Imagem de satélite com o contorno de cada matrícula. A parte riscada é a área já voada,
                  na cor da faixa do andamento.
                </p>
                <ul className="mt-4 space-y-2">
                  {CORES_ANDAMENTO.map((f, i) =>
                    faixasPresentes.has(f.cor) ? (
                      <li key={f.cor} className="flex items-center gap-2.5 text-[12.5px]">
                        <span className="block h-3 w-3 rounded-[3px]" style={{ background: f.cor }} />
                        {FAIXAS[i]}
                      </li>
                    ) : null,
                  )}
                  {temNaoVoada && (
                    <li className="flex items-center gap-2.5 text-[12.5px]">
                      <span className="block h-3 w-3 rounded-[3px]" style={{ border: `1.5px solid ${DOC.faint}` }} />
                      Ainda não voada
                    </li>
                  )}
                </ul>
              </div>
              <div className="text-[11px]" style={{ color: DOC.faint }}>
                Andamento por matrícula na tabela a seguir.
              </div>
            </div>
          </div>
        </ReportSection>
      )}

      {/* PROGRESSO POR MATRICULA */}
      {talhoes.length > 0 && (
        <ReportSection title="Progresso por talhão / matrícula">
          <ReportTable
            columns={[
              { label: "Matrícula" },
              { label: "Voado", align: "right", width: "108px" },
              { label: "Meta", align: "right", width: "108px" },
              { label: "Andamento", align: "right", width: "170px" },
            ]}
            rows={[
              ...talhoes.map((t) => {
                const flown = talhaoFlown(project, t.id)
                const badge = talhaoBadge(project, t)
                const tPct = t.targetHectares ? Math.min(100, (flown / Number(t.targetHectares)) * 100) : null
                const forma = formaDe.get(t.id)
                return {
                  key: t.id,
                  cells: [
                    <span key="n" className="flex items-center gap-2.5 leading-6">
                      {forma && (
                        <GeoThumb formas={[forma]} className="h-6 w-6 shrink-0" />
                      )}
                      <span className="font-semibold">
                        {t.name}
                        {badge && <span className="font-normal" style={{ color: DOC.muted }}>{` · ${badge}`}</span>}
                      </span>
                    </span>,
                    `${fmtHa(flown)} ha`,
                    <span key="m" style={{ color: DOC.muted }}>{t.targetHectares != null ? `${fmtHa(t.targetHectares)} ha` : "—"}</span>,
                    tPct !== null ? (
                      <span key="p" className="inline-flex items-center justify-end gap-2.5">
                        <ReportProgress pct={tPct} width={96} />
                        <span className="w-10 text-right font-bold" style={{ color: tPct >= 100 ? DOC.positive : DOC.ink }}>
                          {`${tPct.toFixed(0)}%`}
                        </span>
                      </span>
                    ) : (
                      <span key="p" style={{ color: DOC.faint }}>sem meta</span>
                    ),
                  ],
                }
              }),
              ...(loose.length > 0
                ? [{ key: "loose", cells: [<span key="n" style={{ color: DOC.muted }}>Áreas sem talhão</span>, `${fmtHa(looseHa)} ha`, "", ""] }]
                : []),
            ]}
            foot={["Área mapeada até o momento", `${fmtHa(m)} ha`, "", `${progressLabel}% do contratado`]}
          />
        </ReportSection>
      )}

      {/* ESCOPO E PRODUTOS */}
      {services.length > 0 && (
        <ReportSection title="Serviços e produtos a entregar">
          {services.map((s) => {
            const st = STATUS[s.status] || STATUS.pendente
            return (
              <div key={s.id} className="py-4" style={{ borderBottom: `1px solid ${DOC.rule}` }} data-pdf-keep>
                <div className="mb-2.5 flex items-center justify-between gap-4">
                  <span className="text-[14px] font-bold">{s.name}</span>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <ReportList items={getDeliverables(s.name)} />
                {s.clientNote && <ReportNote label="Observação:">{s.clientNote}</ReportNote>}
              </div>
            )
          })}
        </ReportSection>
      )}

      {/* RESUMO FINANCEIRO */}
      <ReportSection title="Resumo financeiro">
        <ReportTable
          columns={[{ label: "Serviço" }, { label: "Valor", align: "right", width: "160px" }]}
          rows={services.map((s) => ({
            key: s.id,
            cells: [
              <span key="n" className="font-semibold">
                {s.name}
                <CellNote>{pricingSummary(project, s)}</CellNote>
              </span>,
              <span key="v" className="font-semibold">{fmtMoney(serviceRevenue(project, s))}</span>,
            ],
          }))}
        />
        <div data-pdf-keep>
          {discount > 0 && (
            <div className="mt-1">
              <ReportRow label="Subtotal dos serviços" value={fmtMoney(revenue)} />
              <ReportRow
                label={project.discountNote ? `Desconto (${project.discountNote})` : "Desconto"}
                value={`− ${fmtMoney(discount)}`}
              />
            </div>
          )}
          <ReportTotal label="Valor total dos serviços" value={fmtMoney(netRevenue)} />
        </div>
      </ReportSection>

      {/* EQUIPAMENTOS */}
      <ReportSection title="Equipamentos e tecnologia">
        <ReportSubhead>Coleta de dados em campo</ReportSubhead>
        <ReportSpecs items={EQUIP_CAMPO} />
        <ReportSubhead>Processamento e cartografia</ReportSubhead>
        <ReportSpecs items={EQUIP_PROCESSO} />
      </ReportSection>
    </ReportShell>
  )
}
