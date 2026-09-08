"use client"

import { useNav } from "../nav-context"
import { useProposal } from "@/lib/hooks"
import { fmtMoney, slug } from "@/lib/format"
import {
  proposalDiscount,
  proposalItemPricingSummary,
  proposalItemTotal,
  proposalSubtotal,
  proposalTotal,
} from "@/lib/calculations"
import { ReportShell, ReportHeader, ReportRow, ReportSection, ReportTotal } from "../report-shell"

const COMPANY_INTRO =
  "A AGS GEO é a divisão de aerolevantamento e geoprocessamento da AGS Soluções Agrícolas, especializada em fotogrametria por drone para propriedades rurais em Roraima e região. Atuamos com equipamentos de posicionamento RTK e processamento fotogramétrico profissional, entregando dados prontos para gestão de propriedade, projetos de infraestrutura e regularização fundiária."

const WHY_US = [
  "Atuação especializada em geoprocessamento agrícola, com operação própria em Roraima, Venezuela e Guiana.",
  "Equipamento e equipe próprios — sem terceirização de voo ou de processamento de dados.",
  "Entregas em formatos compatíveis com os principais softwares do mercado (QGIS, AutoCAD), prontas para uso do seu agrônomo, engenheiro ou consultor.",
]

const Divider = () => <div style={{ height: 1, background: "#f0f0f0", margin: "20px 0" }} />

const DELIVERABLE_TEXT: Record<string, string> = {
  rawPhotosHd: "HD externo com todas as fotos aéreas capturadas em campo, em arquivo bruto e alta resolução.",
  bannerMap: "Mapa geral da propriedade impresso em lona (banner), em formato grande, para escritório ou galpão.",
  georefPdf: "Mapas da propriedade em PDF georreferenciado, compatível com GPS e softwares de geoprocessamento (QGIS e similares).",
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
      <ReportShell title="Proposta comercial" filename="proposta" onBack={goProposals}>
        <p className="text-sm text-[#6b7280]">Carregando…</p>
      </ReportShell>
    )
  }

  if (!proposal) {
    return (
      <ReportShell title="Proposta comercial" filename="proposta" onBack={goProposals}>
        <p className="text-sm text-[#6b7280]">Proposta não encontrada.</p>
      </ReportShell>
    )
  }

  const subtotal = proposalSubtotal(proposal)
  const discount = proposalDiscount(proposal)
  const total = proposalTotal(proposal)

  return (
    <ReportShell
      title="Proposta comercial"
      subtitle={proposal.clientName}
      filename={`proposta_${slug(proposal.clientName)}`}
      onBack={() => openProposal(proposal.id)}
      footerNote="Valores sujeitos a confirmação contratual."
    >
      <ReportHeader
        docType="Proposta Comercial"
        heading={proposal.clientName}
        meta={proposal.fazenda ? `${proposal.fazenda} · ${proposal.location || "Roraima, Brasil"}` : proposal.location || "Roraima, Brasil"}
      />

      {/* APRESENTAÇÃO */}
      <ReportSection title="Sobre a AGS GEO">
        <p className="text-[12px] leading-relaxed text-[#4b5563]">{COMPANY_INTRO}</p>
        <div className="mt-3 space-y-1.5">
          {WHY_US.map((w, i) => (
            <div key={i} className="flex items-start">
              <span className="mr-2 mt-0.5 shrink-0 text-[10px]" style={{ color: "#0C3A26" }}>▸</span>
              <span className="text-[12px] text-[#374151] leading-relaxed">{w}</span>
            </div>
          ))}
          {proposal.experienceNote &&
            proposal.experienceNote.split("\n").filter(Boolean).map((line, i) => (
              <div key={`exp-${i}`} className="flex items-start">
                <span className="mr-2 mt-0.5 shrink-0 text-[10px]" style={{ color: "#0C3A26" }}>▸</span>
                <span className="text-[12px] text-[#374151] leading-relaxed">{line}</span>
              </div>
            ))}
        </div>
      </ReportSection>

      <Divider />

      {/* DADOS DO CLIENTE */}
      <ReportSection title="Dados do cliente">
        <ReportRow label="Cliente" value={proposal.clientName} />
        {proposal.fazenda && <ReportRow label="Fazenda / empreendimento" value={proposal.fazenda} />}
        <ReportRow label="Localização" value={proposal.location || "Roraima, Brasil"} />
      </ReportSection>

      <Divider />

      {/* EQUIPAMENTOS */}
      <ReportSection title="Equipamentos e tecnologia">
        <div className="pt-1">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#374151" }}>
            Coleta de dados em campo
          </div>
          {[
            { label: "Aeronave", value: "DJI Matrice 4E" },
            { label: "Posicionamento", value: "Base RTK DJI D-RTK 3 Enterprise" },
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

      {/* ESCOPO PROPOSTO */}
      <ReportSection title="Escopo proposto">
        <div className="space-y-4 pt-1">
          {proposal.items.map((item) => {
            const specs = getItemSpecs(item.name)
            return (
              <div key={item.id} className="pb-3" style={{ borderBottom: "1px solid #f1f1f1" }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="text-[13.5px] font-bold text-[#1a1a1a]">{item.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#9ca3af]">{proposalItemPricingSummary(item)}</div>
                    {item.note && (
                      <div className="mt-1 text-[11px] italic text-[#6b7280]">{item.note}</div>
                    )}
                  </div>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#0C3A26]">
                    {fmtMoney(proposalItemTotal(item))}
                  </span>
                </div>
                {specs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {specs.map((s, i) => (
                      <div key={i} className="flex items-start">
                        <span className="mr-2 mt-0.5 shrink-0 text-[10px]" style={{ color: "#0C3A26" }}>▸</span>
                        <span className="text-[11.5px] text-[#6b7280] leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ReportSection>

      <Divider />

      {/* ENTREGAS */}
      {Object.entries(proposal.deliverables || {}).some(([, v]) => v) && (
        <>
          <ReportSection title="O que você recebe ao final">
            <div className="space-y-1.5 pt-1">
              {Object.entries(proposal.deliverables || {})
                .filter(([, v]) => v)
                .map(([key]) => (
                  <div key={key} className="flex items-start">
                    <span className="mr-2 mt-0.5 shrink-0 text-[10px]" style={{ color: "#0C3A26" }}>▸</span>
                    <span className="text-[12px] text-[#374151] leading-relaxed">{DELIVERABLE_TEXT[key]}</span>
                  </div>
                ))}
            </div>
          </ReportSection>
          <Divider />
        </>
      )}

      {/* INVESTIMENTO */}
      <ReportSection title="Investimento">
        {discount > 0 && (
          <div className="mb-1">
            <ReportRow label="Subtotal" value={fmtMoney(subtotal)} />
            <ReportRow label={proposal.discountNote ? `Desconto (${proposal.discountNote})` : "Desconto"} value={`− ${fmtMoney(discount)}`} />
          </div>
        )}
        <ReportTotal label="Valor total da proposta" value={fmtMoney(total)} />

        {proposal.paymentTerms && (
          <div className="mt-3 rounded-xl px-3.5 py-3" style={{ background: "#f0f7f3", border: "1px solid #cfe7d8" }}>
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: "#0C3A26" }}>
              Forma de pagamento
            </div>
            <div className="text-[12px] leading-relaxed text-[#374151]">{proposal.paymentTerms}</div>
          </div>
        )}
      </ReportSection>

      {!!proposal.timeline?.length && (
        <>
          <Divider />
          <ReportSection title="Cronograma estimado">
            <div className="space-y-1">
              {proposal.timeline.map((phase) => (
                <div key={phase.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #f1f1f1" }}>
                  <span className="text-[12px] text-[#374151]">{phase.label}</span>
                  <span className="text-[12px] font-semibold text-[#6b7280]">{phase.duration}</span>
                </div>
              ))}
            </div>
          </ReportSection>
        </>
      )}

      {proposal.clientResponsibilities && (
        <>
          <Divider />
          <ReportSection title="Responsabilidades do cliente">
            <div className="space-y-1.5 pt-1">
              {proposal.clientResponsibilities.split("\n").filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start">
                  <span className="mr-2 mt-0.5 shrink-0 text-[10px]" style={{ color: "#0C3A26" }}>▸</span>
                  <span className="text-[12px] text-[#374151] leading-relaxed">{line}</span>
                </div>
              ))}
            </div>
          </ReportSection>
        </>
      )}

      <Divider />

      {proposal.notes && (
        <>
          <Divider />
          <ReportSection title="Observações">
            <p className="text-[12px] leading-relaxed text-[#4b5563]">{proposal.notes}</p>
          </ReportSection>
        </>
      )}

      <Divider />

      {/* ACEITE */}
      <div className="flex items-center justify-center pt-2">
        <div className="w-[68%] max-w-[260px] text-center" style={{ borderTop: "1.5px solid #9ca3af", paddingTop: 8 }}>
          <div className="text-[11px] font-bold text-[#1f2937]">Assinatura do contratante</div>
          <div className="mt-0.5 text-[9.5px] text-[#6b7280]">De acordo com os termos desta proposta</div>
        </div>
      </div>
    </ReportShell>
  )
}
