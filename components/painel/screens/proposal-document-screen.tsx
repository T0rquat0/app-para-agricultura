"use client"

import { useNav } from "../nav-context"
import { useProposal } from "@/lib/hooks"
import { fmtHa, fmtMoney, slug } from "@/lib/format"
import {
  paymentPhaseValue,
  paymentSchedulePercentTotal,
  proposalDiscount,
  proposalItemPricingSummary,
  proposalItemTotal,
  proposalSubtotal,
  proposalTotal,
} from "@/lib/calculations"
import {
  CellNote,
  DOC,
  ReportFigures,
  ReportHeader,
  ReportList,
  ReportNote,
  ReportRow,
  ReportSection,
  ReportShell,
  ReportSpecs,
  ReportSubhead,
  ReportTable,
  ReportTotal,
} from "../report-shell"

const COMPANY_INTRO =
  "A AGS GEO é a divisão de aerolevantamento e geoprocessamento da AGS Soluções Agrícolas, especializada em fotogrametria por drone para propriedades rurais em Roraima e região. Atuamos com equipamentos de posicionamento RTK e processamento fotogramétrico profissional, entregando dados prontos para gestão de propriedade, projetos de infraestrutura e regularização fundiária."

const WHY_US = [
  "Atuação especializada em geoprocessamento agrícola, com operação própria em Roraima, Venezuela e Guiana.",
  "Equipamento e equipe próprios — sem terceirização de voo ou de processamento de dados.",
  "Entregas em formatos compatíveis com os principais softwares do mercado (QGIS, AutoCAD), prontas para uso do seu agrônomo, engenheiro ou consultor.",
]

const DELIVERABLE_TEXT: Record<string, string> = {
  rawPhotosHd: "HD externo com todas as fotos aéreas capturadas em campo, em arquivo bruto e alta resolução.",
  bannerMap: "Mapa geral da propriedade impresso em lona (banner), em formato grande, para escritório ou galpão.",
  georefPdf:
    "Mapas da propriedade em PDF georreferenciado, compatível com GPS e softwares de geoprocessamento (QGIS e similares).",
  photoPaperMap: "Impressão do mapa geral em papel fotográfico.",
}

// Especificacoes tecnicas por tipo de item, casadas por trecho do nome (case-insensitive).
// Mesmo espirito do getDeliverables() do relatorio final de entrega — aqui aplicado
// na proposta, pra dar ao cliente uma ideia tecnica do que cada item cobre antes de fechar.
const ITEM_SPECS: { match: string; specs: string[] }[] = [
  {
    match: "levantamento",
    specs: [
      "Ortomosaico georreferenciado em alta resolução",
      "Modelo Digital de Terreno (MDT) em formato GeoTIFF, compatível com QGIS",
      "Nuvem de pontos classificada (solo / vegetação)",
      "Relatório técnico do processamento fotogramétrico",
    ],
  },
  {
    match: "curva de nível",
    specs: [
      "Curvas de nível em formato DXF e Shapefile",
      "Equidistância vertical definida conforme escala e declividade do terreno",
      "Mapa hipsométrico da área",
    ],
  },
  {
    match: "drenagem",
    specs: [
      "Análise hidrológica e delineamento de bacias e microbacias",
      "Estruturas de drenagem dimensionadas, com tipologia (canaletas, bueiros, dissipadores) e declividade",
      "Definição do destino final das águas drenadas",
    ],
  },
  {
    match: "sistematização",
    specs: [
      "Mapa de sistematização com talhões e faixas de manejo definidos",
      "Análise de declividade e sentido de escoamento da área",
      "Indicação técnica de pontos para nivelamento/terraceamento",
    ],
  },
]

function getItemSpecs(name: string): string[] {
  const n = name.toLowerCase()
  const found = ITEM_SPECS.find((s) => n.includes(s.match))
  return found ? found.specs : []
}

export function ProposalDocumentScreen() {
  const { currentProposalId, goProposals, openProposal } = useNav()
  const { proposal, isLoading } = useProposal(currentProposalId)

  if (isLoading) {
    return (
      <ReportShell title="Proposta comercial" filename="proposta" onBack={goProposals} signature={false}>
        <p className="text-sm" style={{ color: DOC.muted }}>
          Carregando…
        </p>
      </ReportShell>
    )
  }

  if (!proposal) {
    return (
      <ReportShell title="Proposta comercial" filename="proposta" onBack={goProposals} signature={false}>
        <p className="text-sm" style={{ color: DOC.muted }}>
          Proposta não encontrada.
        </p>
      </ReportShell>
    )
  }

  const subtotal = proposalSubtotal(proposal)
  const discount = proposalDiscount(proposal)
  const total = proposalTotal(proposal)
  const location = proposal.location || "Roraima, Brasil"
  // Soma das quantidades dos itens cobrados por hectare (as mesmas da tabela do escopo).
  const areaHa = proposal.items
    .filter((i) => i.billingType === "hectare")
    .reduce((s, i) => s + Number(i.quantity || 0), 0)
  const schedule = proposal.paymentSchedule || []
  const deliverables = Object.entries(proposal.deliverables || {}).filter(([, v]) => v)
  const responsibilities = (proposal.clientResponsibilities || "").split("\n").filter(Boolean)
  const experience = (proposal.experienceNote || "").split("\n").filter(Boolean)

  return (
    <ReportShell
      title="Proposta comercial"
      subtitle={proposal.clientName}
      docType="Proposta comercial"
      filename={`proposta_${slug(proposal.clientName)}`}
      onBack={() => openProposal(proposal.id)}
      footerNote="Valores sujeitos a confirmação contratual."
      signature={false}
    >
      <ReportHeader
        docType="Proposta comercial"
        heading={proposal.clientName}
        meta={proposal.fazenda ? `${proposal.fazenda} · ${location}` : location}
      >
        <ReportFigures
          items={[
            {
              label: "Valor total da proposta",
              value: fmtMoney(total),
              tone: "signal",
            },
            ...(areaHa > 0
              ? [
                  {
                    label: "Área do levantamento",
                    value: fmtHa(areaHa),
                    unit: "ha",
                  },
                ]
              : []),
            ...(proposal.validityDays
              ? [
                  {
                    label: "Validade da proposta",
                    value: String(proposal.validityDays),
                    unit: "dias",
                  },
                ]
              : []),
          ]}
        />
      </ReportHeader>

      {/* ESCOPO PROPOSTO */}
      <ReportSection title="Escopo proposto">
        <ReportTable
          columns={[{ label: "Item" }, { label: "Valor", align: "right", width: "160px" }]}
          rows={proposal.items.map((item) => {
            const specs = getItemSpecs(item.name)
            return {
              key: item.id,
              cells: [
                <div key="i" className="pb-1">
                  <div className="text-[14px] font-bold">{item.name}</div>
                  <CellNote>{proposalItemPricingSummary(item)}</CellNote>
                  {item.note && <CellNote>{item.note}</CellNote>}
                  {specs.length > 0 && (
                    <div className="mt-2.5">
                      <ReportList items={specs} />
                    </div>
                  )}
                </div>,
                <span key="v" className="text-[14px] font-bold">
                  {fmtMoney(proposalItemTotal(item))}
                </span>,
              ],
            }
          })}
        />
        <div data-pdf-keep>
          {discount > 0 && (
            <div className="mt-1">
              <ReportRow label="Subtotal" value={fmtMoney(subtotal)} />
              <ReportRow
                label={proposal.discountNote ? `Desconto (${proposal.discountNote})` : "Desconto"}
                value={`− ${fmtMoney(discount)}`}
              />
            </div>
          )}
          <ReportTotal
            label="Valor total da proposta"
            hint={
              proposal.validityDays
                ? `Proposta válida por ${proposal.validityDays} dias a partir da emissão.`
                : undefined
            }
            value={fmtMoney(total)}
          />
        </div>
      </ReportSection>

      {/* PAGAMENTO */}
      {(schedule.length > 0 || proposal.paymentTerms) && (
        <ReportSection title="Forma de pagamento">
          {schedule.length > 0 && (
            <ReportTable
              columns={[
                { label: "Parcela", width: "70px" },
                { label: "Marco" },
                { label: "Percentual", align: "right", width: "110px" },
                { label: "Valor", align: "right", width: "150px" },
              ]}
              rows={schedule.map((ph, i) => ({
                key: ph.id,
                cells: [
                  <span key="n" style={{ color: DOC.muted }}>
                    {i + 1}
                  </span>,
                  <span key="l" className="font-semibold">
                    {ph.label}
                  </span>,
                  `${Number(ph.percent || 0).toLocaleString("pt-BR")}%`,
                  <span key="v" className="font-semibold">
                    {fmtMoney(paymentPhaseValue(total, ph))}
                  </span>,
                ],
              }))}
              foot={[
                "",
                "Total",
                `${paymentSchedulePercentTotal(schedule).toLocaleString("pt-BR")}%`,
                fmtMoney(schedule.reduce((s, ph) => s + paymentPhaseValue(total, ph), 0)),
              ]}
            />
          )}
          {proposal.paymentTerms &&
            (schedule.length > 0 ? (
              <ReportNote label="Observação:">{proposal.paymentTerms}</ReportNote>
            ) : (
              <p className="pt-3 text-[13px] leading-relaxed" style={{ color: DOC.ink }}>
                {proposal.paymentTerms}
              </p>
            ))}
        </ReportSection>
      )}

      {/* CRONOGRAMA */}
      {!!proposal.timeline?.length && (
        <ReportSection title="Cronograma estimado">
          <ReportTable
            columns={[
              { label: "Etapa", width: "70px" },
              { label: "Atividade" },
              { label: "Prazo estimado", align: "right", width: "180px" },
            ]}
            rows={proposal.timeline.map((phase, i) => ({
              key: phase.id,
              cells: [
                <span key="n" style={{ color: DOC.muted }}>
                  {i + 1}
                </span>,
                <span key="l" className="font-semibold">
                  {phase.label}
                </span>,
                <span key="d" style={{ color: DOC.muted }}>
                  {phase.duration}
                </span>,
              ],
            }))}
          />
        </ReportSection>
      )}

      {/* ENTREGAS */}
      {deliverables.length > 0 && (
        <ReportSection title="O que você recebe ao final">
          <div className="pt-3">
            <ReportList tone="ink" items={deliverables.map(([key]) => DELIVERABLE_TEXT[key])} />
          </div>
        </ReportSection>
      )}

      {/* RESPONSABILIDADES */}
      {responsibilities.length > 0 && (
        <ReportSection title="Responsabilidades do cliente">
          <div className="pt-3">
            <ReportList tone="ink" items={responsibilities} />
          </div>
        </ReportSection>
      )}

      {/* APRESENTACAO */}
      <ReportSection title="Sobre a AGS GEO">
        <p className="pt-3 text-[12.5px] leading-relaxed" style={{ color: DOC.muted }}>
          {COMPANY_INTRO}
        </p>
        <div className="mt-3">
          <ReportList tone="ink" items={[...WHY_US, ...experience]} />
        </div>
      </ReportSection>

      {/* EQUIPAMENTOS */}
      <ReportSection title="Equipamentos e tecnologia">
        <ReportSubhead>Coleta de dados em campo</ReportSubhead>
        <ReportSpecs
          items={[
            { label: "Aeronave", value: "DJI Matrice 4E" },
            {
              label: "Posicionamento",
              value: "Base RTK DJI D-RTK 3 Enterprise",
            },
            {
              label: "Regulamentação",
              value: "Voos autorizados conforme ANAC / DECEA",
            },
          ]}
        />
        <ReportSubhead>Processamento e cartografia</ReportSubhead>
        <ReportSpecs
          items={[
            { label: "Fotogrametria", value: "Agisoft Metashape Professional" },
            {
              label: "Cartografia",
              value: "AgroCad Civil — curvas de nível e drenagem",
            },
            {
              label: "Geoespacial",
              value: "QGIS — shapefiles e análise territorial",
            },
          ]}
        />
      </ReportSection>

      {proposal.notes && (
        <ReportSection title="Observações">
          <p className="pt-3 text-[12.5px] leading-relaxed" style={{ color: DOC.muted }}>
            {proposal.notes}
          </p>
        </ReportSection>
      )}

      {/* ACEITE */}
      <div className="mt-6 grid grid-cols-2 gap-12" data-pdf-keep>
        {[
          {
            title: "Responsável técnico",
            sub: "AGS GEO · Levantamento e Geoprocessamento",
          },
          {
            title: "Assinatura do contratante",
            sub: "De acordo com os termos desta proposta",
          },
        ].map((s) => (
          <div key={s.title}>
            <div className="h-16" />
            <div className="pt-2" style={{ borderTop: `1px solid ${DOC.ink}` }}>
              <div className="text-[12px] font-bold">{s.title}</div>
              <div className="mt-0.5 text-[11px]" style={{ color: DOC.muted }}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ReportShell>
  )
}
