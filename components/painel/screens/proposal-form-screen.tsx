"use client"

import { useEffect, useState } from "react"
import { Check, FileText, Plus, Trash2 } from "lucide-react"
import { useNav } from "../nav-context"
import { useProposal, useRefresh } from "@/lib/hooks"
import { saveProposal } from "@/lib/storage"
import { proposalItemPricingSummary, proposalDiscount, proposalSubtotal, proposalTotal } from "@/lib/calculations"
import { fmtMoney, genId } from "@/lib/format"
import type { BillingType, Proposal, ProposalDeliverables, ProposalItem, ProposalTimelinePhase } from "@/lib/types"
import { TopBar } from "../chrome"
import { Field, Hint, Select, TextArea, TextInput } from "../fields"
import { PrimaryButton, SecondaryButton, GhostButton } from "../buttons"

const BLANK_ITEM = (): ProposalItem => ({
  id: genId("pi"),
  name: "",
  billingType: "hectare",
  rate: 0,
  quantity: null,
})

// Presets que ja casam com os detalhamentos tecnicos automaticos do documento
// (ver ITEM_SPECS em proposal-document-screen.tsx). Escolher um preset garante
// que o detalhamento tecnico apareca certo no PDF; "Outro" mantem liberdade total.
const ITEM_NAME_PRESETS = ["Levantamento Planialtimétrico", "Curva de Nível", "Projeto de Drenagem"]

// bannerMap comeca desmarcado — lona grande so faz sentido economicamente em
// projetos grandes, entao a excecao (marcar) fica a criterio de quem preenche.
const DEFAULT_DELIVERABLES: ProposalDeliverables = {
  rawPhotosHd: true,
  bannerMap: false,
  georefPdf: true,
  photoPaperMap: true,
}

const DELIVERABLE_OPTIONS: { key: keyof ProposalDeliverables; label: string; desc: string }[] = [
  {
    key: "rawPhotosHd",
    label: "HD com as fotos brutas",
    desc: "Todas as fotos aéreas capturadas em campo, em HD externo.",
  },
  {
    key: "bannerMap",
    label: "Mapa geral em lona",
    desc: "Impressão em lona (banner) de formato grande — normalmente só em projetos grandes.",
  },
  {
    key: "georefPdf",
    label: "PDF georreferenciado",
    desc: "Mapas em PDF georreferenciado, compatível com GPS e QGIS.",
  },
  {
    key: "photoPaperMap",
    label: "Mapa em papel fotográfico",
    desc: "Impressão do mapa geral em papel fotográfico.",
  },
]

const DEFAULT_TIMELINE = (): ProposalTimelinePhase[] => [
  { id: genId("tl"), label: "Planejamento e mobilização", duration: "3-5 dias úteis" },
  { id: genId("tl"), label: "Operação de campo (voos)", duration: "5-10 dias úteis" },
  { id: genId("tl"), label: "Processamento e cartografia", duration: "10-15 dias úteis" },
  { id: genId("tl"), label: "Entrega final", duration: "3-5 dias úteis" },
]

export function ProposalFormScreen() {
  const { goProposals, currentProposalId, navigate } = useNav()
  const { proposal: existing, isLoading } = useProposal(currentProposalId)
  const refresh = useRefresh()

  const [clientName, setClientName] = useState("")
  const [fazenda, setFazenda] = useState("")
  const [location, setLocation] = useState("Roraima, Brasil")
  const [items, setItems] = useState<ProposalItem[]>([BLANK_ITEM()])
  const [discount, setDiscount] = useState("")
  const [discountNote, setDiscountNote] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("PIX ou boleto, mediante confirmação de cada parcela.")
  const [timeline, setTimeline] = useState<ProposalTimelinePhase[]>(DEFAULT_TIMELINE())
  const [clientResponsibilities, setClientResponsibilities] = useState(
    "Disponibilizar acesso à área para os voos e coleta de pontos de apoio.\nGarantir segurança e acesso aos locais de decolagem.\nApoiar na identificação de pontos de controle em campo, se necessário.",
  )
  const [experienceNote, setExperienceNote] = useState("Mais de 20.000 hectares mapeados em propriedades rurais.")
  const [notes, setNotes] = useState("")
  const [deliverables, setDeliverables] = useState<ProposalDeliverables>(DEFAULT_DELIVERABLES)
  const [hydrated, setHydrated] = useState(false)

  // Preenche o form quando a proposta existente carrega (edicao). So roda uma vez,
  // por proposta, pra nao sobrescrever o que o usuario esta digitando.
  useEffect(() => {
    if (!currentProposalId) {
      setHydrated(true)
      return
    }
    if (existing && !hydrated) {
      setClientName(existing.clientName)
      setFazenda(existing.fazenda || "")
      setLocation(existing.location || "Roraima, Brasil")
      setItems(existing.items?.length ? existing.items : [BLANK_ITEM()])
      setDiscount(existing.discount ? String(existing.discount) : "")
      setDiscountNote(existing.discountNote || "")
      setPaymentTerms(existing.paymentTerms || "PIX ou boleto, mediante confirmação de cada parcela.")
      setTimeline(existing.timeline?.length ? existing.timeline : DEFAULT_TIMELINE())
      setClientResponsibilities(existing.clientResponsibilities ?? "")
      setExperienceNote(existing.experienceNote ?? "")
      setNotes(existing.notes || "")
      setDeliverables({ ...DEFAULT_DELIVERABLES, ...(existing.deliverables || {}) })
      setHydrated(true)
    }
  }, [existing, currentProposalId, hydrated])

  function updateItem(id: string, patch: Partial<ProposalItem>) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function addItem() {
    setItems((list) => [...list, BLANK_ITEM()])
  }

  function removeItem(id: string) {
    setItems((list) => (list.length > 1 ? list.filter((i) => i.id !== id) : list))
  }

  function toggleDeliverable(key: keyof ProposalDeliverables) {
    setDeliverables((d) => ({ ...d, [key]: !d[key] }))
  }

  function updateTimelinePhase(id: string, patch: Partial<ProposalTimelinePhase>) {
    setTimeline((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function addTimelinePhase() {
    setTimeline((list) => [...list, { id: genId("tl"), label: "", duration: "" }])
  }
  function removeTimelinePhase(id: string) {
    setTimeline((list) => (list.length > 1 ? list.filter((p) => p.id !== id) : list))
  }

  function buildProposal(): Proposal | null {
    const name = clientName.trim()
    if (!name) {
      alert("Informe o nome do cliente.")
      return null
    }
    const cleanItems = items
      .map((i) => ({ ...i, name: i.name.trim(), note: i.note?.trim() || undefined }))
      .filter((i) => i.name)
    if (!cleanItems.length) {
      alert("Adicione pelo menos um item de serviço.")
      return null
    }
    return {
      id: currentProposalId || genId("prop"),
      clientName: name,
      fazenda: fazenda.trim() || undefined,
      location: location.trim() || undefined,
      items: cleanItems,
      discount: Number(discount || 0) || undefined,
      discountNote: discountNote.trim() || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      timeline: timeline
        .map((t) => ({ ...t, label: t.label.trim(), duration: t.duration.trim() }))
        .filter((t) => t.label),
      clientResponsibilities: clientResponsibilities.trim() || undefined,
      experienceNote: experienceNote.trim() || undefined,
      notes: notes.trim() || undefined,
      deliverables,
      createdAt: existing?.createdAt || new Date().toISOString(),
    }
  }

  async function save() {
    const p = buildProposal()
    if (!p) return
    await saveProposal(p)
    refresh()
    goProposals()
  }

  async function saveAndGenerate() {
    const p = buildProposal()
    if (!p) return
    await saveProposal(p)
    refresh()
    navigate("proposalDocument")
  }

  if (currentProposalId && isLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <TopBar title="Proposta" onBack={goProposals} showDarkToggle={false} />
      </div>
    )
  }

  const subtotal = proposalSubtotal({ items } as Proposal)
  const disc = proposalDiscount({ items, discount: Number(discount || 0) } as Proposal)
  const total = proposalTotal({ items, discount: Number(discount || 0) } as Proposal)

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        title={currentProposalId ? "Editar proposta" : "Nova proposta"}
        onBack={goProposals}
        showDarkToggle={false}
      />

      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-5">
        <Field label="Nome do cliente">
          <TextInput
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: Fábio Fukuda"
            autoFocus
          />
        </Field>
        <Field label="Fazenda / empreendimento (opcional)">
          <TextInput value={fazenda} onChange={(e) => setFazenda(e.target.value)} placeholder="Ex: Fazenda Vila Alta" />
        </Field>
        <Field label="Localização">
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Roraima, Brasil" />
        </Field>
        <Field
          label="Experiência / números reais (opcional)"
          hint="Use dado verificável, não frase de efeito. Ex: hectares já mapeados, tempo de atuação na região. Uma linha por item — vira lista no documento. Deixe em branco se não tiver número pra citar."
        >
          <TextArea
            value={experienceNote}
            onChange={(e) => setExperienceNote(e.target.value)}
            placeholder={"Ex:\nMais de 20.000 ha mapeados em fazendas de Roraima\nAtuação em Roraima, Venezuela e Guiana"}
          />
        </Field>

        <div className="mt-2 mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Itens da proposta
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const isPreset = ITEM_NAME_PRESETS.includes(item.name)
            const selectValue = item.name === "" ? "" : isPreset ? item.name : "custom"
            return (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="mb-2.5 flex items-start gap-2">
                <div className="flex-1">
                  <Select
                    value={selectValue}
                    onChange={(e) => {
                      const v = e.target.value
                      updateItem(item.id, { name: v === "custom" ? (isPreset ? "" : item.name) : v })
                    }}
                  >
                    <option value="" disabled>
                      Selecione um item…
                    </option>
                    {ITEM_NAME_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="custom">Outro (digitar)</option>
                  </Select>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {selectValue === "custom" && (
                <TextInput
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="Ex: Ortomosaico, Sistematização de Solo…"
                  className="mb-2.5"
                />
              )}
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={item.billingType}
                  onChange={(e) => updateItem(item.id, { billingType: e.target.value as BillingType })}
                >
                  <option value="hectare">R$/ha</option>
                  <option value="metro">R$/m</option>
                  <option value="fixo">Fechado</option>
                </Select>
                <TextInput
                  value={item.rate || ""}
                  onChange={(e) => updateItem(item.id, { rate: Number(e.target.value || 0) })}
                  type="number"
                  inputMode="decimal"
                  placeholder={item.billingType === "fixo" ? "Valor total" : "Valor unit."}
                />
                {item.billingType !== "fixo" && (
                  <TextInput
                    value={item.quantity ?? ""}
                    onChange={(e) => updateItem(item.id, { quantity: e.target.value ? Number(e.target.value) : null })}
                    type="number"
                    inputMode="decimal"
                    placeholder={item.billingType === "hectare" ? "Hectares" : "Metros"}
                  />
                )}
              </div>
              <div className="mt-2 text-right text-[12px] font-semibold text-muted-foreground">
                {proposalItemPricingSummary(item)}
              </div>
              <div className="mt-2.5">
                <TextInput
                  value={item.note || ""}
                  onChange={(e) => updateItem(item.id, { note: e.target.value })}
                  placeholder="O que está incluso (opcional). Ex: inclui marcação dos drenos em campo"
                  className="text-[13px]"
                />
              </div>
            </div>
            )
          })}
        </div>

        <SecondaryButton className="mt-3 w-full" onClick={addItem}>
          <Plus className="h-4 w-4" /> Adicionar item
        </SecondaryButton>

        <div className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          O que será entregue
        </div>
        <Hint className="-mt-1 mb-3">
          Desmarque o que não fizer sentido para esta proposta (ex.: lona grande pode não valer a pena num job pequeno).
        </Hint>
        <div className="flex flex-col gap-2">
          {DELIVERABLE_OPTIONS.map((opt) => {
            const checked = !!deliverables[opt.key]
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleDeliverable(opt.key)}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted"
              >
                <span
                  className={
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 " +
                    (checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")
                  }
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-foreground">{opt.label}</span>
                  <span className="block text-[11.5px] text-muted-foreground">{opt.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <Field label="Desconto (R$, opcional)" className="mt-6">
          <TextInput value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" inputMode="decimal" placeholder="0" />
        </Field>
        {Number(discount || 0) > 0 && (
          <Field label="Motivo do desconto (opcional)">
            <TextInput value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} placeholder="Ex: pacote fechado, condição à vista" />
          </Field>
        )}

        <Field label="Condições de pagamento (forma)">
          <TextInput value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ex: PIX ou boleto" />
        </Field>

        <div className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Cronograma estimado
        </div>
        <Hint className="-mt-1 mb-2">Ajuste os prazos pra realidade dessa proposta — os valores abaixo são só um ponto de partida.</Hint>
        <div className="flex flex-col gap-2">
          {timeline.map((phase) => (
            <div key={phase.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
              <TextInput
                value={phase.label}
                onChange={(e) => updateTimelinePhase(phase.id, { label: e.target.value })}
                placeholder="Ex: Operação de campo"
                className="flex-[1.4]"
              />
              <TextInput
                value={phase.duration}
                onChange={(e) => updateTimelinePhase(phase.id, { duration: e.target.value })}
                placeholder="Ex: 5-10 dias úteis"
                className="flex-1"
              />
              <button
                onClick={() => removeTimelinePhase(phase.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                aria-label="Remover fase"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <SecondaryButton className="mt-2 w-full" onClick={addTimelinePhase}>
          <Plus className="h-4 w-4" /> Adicionar fase
        </SecondaryButton>

        <Field
          label="Responsabilidades do cliente (opcional)"
          hint="Uma por linha. Vira lista com marcadores no documento."
          className="mt-6"
        >
          <TextArea
            value={clientResponsibilities}
            onChange={(e) => setClientResponsibilities(e.target.value)}
            placeholder={"Ex:\nDisponibilizar acesso à área\nGarantir segurança no local de decolagem"}
          />
        </Field>
        <Field label="Observações (opcional)" hint="Aparece no rodapé da proposta, antes da assinatura.">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: prazo de execução estimado, restrições de acesso à área…" />
        </Field>

        <div className="mt-2 rounded-2xl bg-muted p-4">
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <span>Subtotal</span>
            <span className="num font-semibold">{fmtMoney(subtotal)}</span>
          </div>
          {disc > 0 && (
            <div className="mt-1 flex items-center justify-between text-[13px] text-muted-foreground">
              <span>Desconto</span>
              <span className="num font-semibold">− {fmtMoney(disc)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-[14px] font-extrabold text-foreground">Total da proposta</span>
            <span className="num text-[18px] font-extrabold text-primary">{fmtMoney(total)}</span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex gap-2.5 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        <GhostButton className="flex-1" onClick={save}>
          Salvar
        </GhostButton>
        <PrimaryButton className="flex-[2]" onClick={saveAndGenerate}>
          <FileText className="h-4 w-4" /> Salvar e gerar PDF
        </PrimaryButton>
      </div>
    </div>
  )
}
