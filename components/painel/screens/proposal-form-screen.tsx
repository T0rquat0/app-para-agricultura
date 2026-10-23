"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Check, FileText, Plus, Trash2 } from "lucide-react"
import { useNav } from "../nav-context"
import { useProposal, useRefresh } from "@/lib/hooks"
import { saveProposal } from "@/lib/storage"
import { proposalItemPricingSummary, proposalDiscount, proposalSubtotal, proposalTotal } from "@/lib/calculations"
import { fmtMoney, genId } from "@/lib/format"
import type { BillingType, Proposal, ProposalDeliverables, ProposalItem, ProposalTimelinePhase } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TopBar } from "../chrome"
import { Field, Hint, NumberInput, Select, TextArea, TextInput } from "../fields"
import { PrimaryButton, SecondaryButton } from "../buttons"
import { FormAlert, Segmented } from "../modals"

// Bloco do formulario: titulo de secao (15px/700) com frase de apoio opcional
function FormSection({ title, hint, children, className }: { title: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("pt-8 first:pt-2", className)}>
      <h2 className="text-[15px] font-bold">{title}</h2>
      {hint && <Hint className="mt-1">{hint}</Hint>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

const removeBtn =
  "pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-faint hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"

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
  const { goProposals, currentProposalId, navigate, openProposal } = useNav()
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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
      setError("Informe o nome do cliente.")
      return null
    }
    const cleanItems = items
      .map((i) => ({ ...i, name: i.name.trim(), note: i.note?.trim() || undefined }))
      .filter((i) => i.name)
    if (!cleanItems.length) {
      setError("Adicione pelo menos um item de serviço.")
      return null
    }
    setError(null)
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
    setSaving(true)
    try {
      await saveProposal(p)
    } finally {
      setSaving(false)
    }
    refresh()
    goProposals()
  }

  async function saveAndGenerate() {
    const p = buildProposal()
    if (!p) return
    setSaving(true)
    try {
      await saveProposal(p)
    } finally {
      setSaving(false)
    }
    refresh()
    // Importante pra proposta NOVA: sem isso, currentProposalId continua null
    // (era null desde "Nova proposta") e a tela do documento nao acha nada.
    openProposal(p.id)
    navigate("proposalDocument")
  }

  if (currentProposalId && isLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <TopBar title="Proposta" onBack={goProposals} />
        <div className="space-y-4 px-4 pt-4" aria-busy>
          <p className="text-[14px] text-muted-foreground">Carregando proposta…</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-[14px] border border-border bg-card" />
          ))}
        </div>
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
        subtitle={clientName.trim() || undefined}
        onBack={goProposals}
      />

      <div className={cn("flex-1 px-4", error ? "pb-44" : "pb-24")}>
        <FormSection title="Cliente">
          <Field label="Nome do cliente">
            <TextInput
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex.: Fábio Fukuda"
              autoComplete="off"
              autoFocus={!currentProposalId}
            />
          </Field>
          <Field label="Fazenda ou empreendimento (opcional)">
            <TextInput value={fazenda} onChange={(e) => setFazenda(e.target.value)} placeholder="Ex.: Fazenda Vila Alta" />
          </Field>
          <Field label="Localização" className="mb-0">
            <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: Roraima, Brasil" />
          </Field>
        </FormSection>

        <FormSection title="Itens da proposta" hint="Escolha um item pronto para o PDF trazer o detalhamento técnico certo.">
          <div className="flex flex-col gap-2.5">
            {items.map((item, idx) => {
              const isPreset = ITEM_NAME_PRESETS.includes(item.name)
              const selectValue = item.name === "" ? "" : isPreset ? item.name : "custom"
              const unitLabel = item.billingType === "hectare" ? "Hectares" : "Metros"
              return (
                <div key={item.id} className="rounded-[18px] border border-border bg-card p-3.5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="num text-[13px] font-semibold text-faint">Item {idx + 1}</span>
                    <span className="flex-1" />
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className={cn(removeBtn, "-my-2 -mr-2 h-10 w-10")}
                      aria-label={`Remover item ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Select
                    value={selectValue}
                    aria-label="Serviço"
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
                  {selectValue === "custom" && (
                    <TextInput
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="Ex.: Ortomosaico, sistematização de solo…"
                      aria-label="Nome do item"
                      className="mt-2.5"
                    />
                  )}

                  <div className="mt-3">
                    <Segmented<BillingType>
                      label="Forma de cobrança"
                      value={item.billingType}
                      onChange={(v) => updateItem(item.id, { billingType: v })}
                      options={[
                        { value: "hectare", label: "R$/ha" },
                        { value: "metro", label: "R$/m" },
                        { value: "fixo", label: "Fechado" },
                      ]}
                    />
                  </div>
                  <div className={cn("mt-3 grid gap-2.5", item.billingType === "fixo" ? "grid-cols-1" : "grid-cols-2")}>
                    <label className="min-w-0">
                      <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">
                        {item.billingType === "fixo" ? "Valor total (R$)" : item.billingType === "hectare" ? "Valor por ha (R$)" : "Valor por m (R$)"}
                      </span>
                      <NumberInput
                        value={item.rate || ""}
                        onChange={(e) => updateItem(item.id, { rate: Number(e.target.value || 0) })}
                        type="number"
                        placeholder="0"
                      />
                    </label>
                    {item.billingType !== "fixo" && (
                      <label className="min-w-0">
                        <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{unitLabel}</span>
                        <NumberInput
                          value={item.quantity ?? ""}
                          onChange={(e) => updateItem(item.id, { quantity: e.target.value ? Number(e.target.value) : null })}
                          type="number"
                          placeholder="0"
                        />
                      </label>
                    )}
                  </div>
                  <div className="num mt-2 text-[13px] font-semibold text-muted-foreground">{proposalItemPricingSummary(item).replace(/R$ /g, "R$00a0")}</div>

                  <TextInput
                    value={item.note || ""}
                    onChange={(e) => updateItem(item.id, { note: e.target.value })}
                    placeholder="O que está incluso (opcional)"
                    aria-label="O que está incluso"
                    className="mt-3"
                  />
                </div>
              )
            })}
          </div>
          <SecondaryButton className="mt-2.5 w-full" onClick={addItem}>
            <Plus className="h-4 w-4" /> Adicionar item
          </SecondaryButton>
        </FormSection>

        <FormSection
          title="O que será entregue"
          hint="Desmarque o que não fizer sentido nesta proposta (ex.: lona grande num trabalho pequeno)."
        >
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {DELIVERABLE_OPTIONS.map((opt) => {
              const checked = !!deliverables[opt.key]
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleDeliverable(opt.key)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-colors duration-150",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-raised",
                    )}
                  >
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-[15px] font-semibold", !checked && "text-muted-foreground")}>{opt.label}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{opt.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </FormSection>

        <FormSection title="Valores e pagamento">
          <Field label="Desconto (R$, opcional)">
            <NumberInput value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" placeholder="0" />
          </Field>
          {Number(discount || 0) > 0 && (
            <Field label="Motivo do desconto (opcional)">
              <TextInput value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} placeholder="Ex.: pacote fechado, condição à vista" />
            </Field>
          )}
          <Field label="Forma de pagamento" className="mb-0">
            <TextArea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ex.: PIX ou boleto" className="min-h-[76px]" rows={2} />
          </Field>
        </FormSection>

        <FormSection title="Cronograma estimado" hint="Ajuste os prazos à realidade desta proposta; os valores são só um ponto de partida.">
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {timeline.map((phase, idx) => (
              <div key={phase.id} className="flex items-start gap-2 py-3 pl-3.5 pr-1.5">
                <span className="num mt-3.5 w-4 shrink-0 text-[13px] font-semibold text-faint">{idx + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <TextInput
                    value={phase.label}
                    onChange={(e) => updateTimelinePhase(phase.id, { label: e.target.value })}
                    placeholder="Ex.: Operação de campo"
                    aria-label={`Fase ${idx + 1}`}
                  />
                  <TextInput
                    value={phase.duration}
                    onChange={(e) => updateTimelinePhase(phase.id, { duration: e.target.value })}
                    placeholder="Ex.: 5-10 dias úteis"
                    aria-label={`Prazo da fase ${idx + 1}`}
                    className="num"
                  />
                </div>
                <button
                  onClick={() => removeTimelinePhase(phase.id)}
                  disabled={timeline.length <= 1}
                  className={removeBtn}
                  aria-label={`Remover fase ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <SecondaryButton className="mt-2.5 w-full" onClick={addTimelinePhase}>
            <Plus className="h-4 w-4" /> Adicionar fase
          </SecondaryButton>
        </FormSection>

        <FormSection title="Textos do documento">
          <Field
            label="Experiência e números reais (opcional)"
            hint="Dado verificável, não frase de efeito: hectares já mapeados, tempo de atuação na região. Uma linha por item; em branco, a seção não aparece."
          >
            <TextArea
              value={experienceNote}
              onChange={(e) => setExperienceNote(e.target.value)}
              placeholder={"Ex.:\nMais de 20.000 ha mapeados em fazendas de Roraima\nAtuação em Roraima, Venezuela e Guiana"}
            />
          </Field>
          <Field label="Responsabilidades do cliente (opcional)" hint="Uma por linha. Vira lista com marcadores no documento.">
            <TextArea
              value={clientResponsibilities}
              onChange={(e) => setClientResponsibilities(e.target.value)}
              placeholder={"Ex.:\nDisponibilizar acesso à área\nGarantir segurança no local de decolagem"}
            />
          </Field>
          <Field label="Observações (opcional)" hint="Aparece no rodapé da proposta, antes da assinatura." className="mb-0">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: restrições de acesso à área…" />
          </Field>
        </FormSection>

        <section className="mt-8 rounded-[18px] border border-border bg-card px-4 py-3.5" aria-label="Resumo dos valores">
          <div className="flex items-baseline justify-between text-[14px] text-muted-foreground">
            <span>Subtotal</span>
            <span className="num font-semibold text-foreground">{fmtMoney(subtotal)}</span>
          </div>
          {disc > 0 && (
            <div className="mt-1.5 flex items-baseline justify-between text-[14px] text-muted-foreground">
              <span>Desconto</span>
              <span className="num font-semibold text-foreground">− {fmtMoney(disc)}</span>
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[15px] font-bold">Total da proposta</span>
            <span className="num text-[24px] font-extrabold tracking-[-0.02em]">{fmtMoney(total)}</span>
          </div>
        </section>
      </div>

      {/* Barra de salvar fixa no rodape: esta tela nao tem barra de abas. "fixed" porque o quadro do app
          tem overflow-hidden, o que anula o sticky. */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-border bg-background/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-md">
        {error && <FormAlert className="mb-3">{error}</FormAlert>}
        <div className="flex gap-2.5">
          <SecondaryButton className="flex-1" onClick={save} disabled={saving}>
            Salvar
          </SecondaryButton>
          <PrimaryButton className="flex-[2]" onClick={saveAndGenerate} disabled={saving}>
            <FileText className="h-4 w-4" /> Salvar e gerar PDF
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

