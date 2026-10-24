"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, Check, Copy, FileText, Plus, Trash2, X } from "lucide-react"
import { useNav } from "../nav-context"
import { useProposal, useRefresh } from "@/lib/hooks"
import { deleteProposal, saveProposal } from "@/lib/storage"
import {
  paymentSchedulePercentTotal,
  paymentScheduleValues,
  proposalDiscount,
  proposalItemTotal,
  proposalSubtotal,
  proposalTotal,
} from "@/lib/calculations"
import { fmtMoney, genId, numInput, parseNum } from "@/lib/format"
import type {
  BillingType,
  Proposal,
  ProposalDeliverables,
  ProposalItem,
  ProposalPaymentPhase,
  ProposalTimelinePhase,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { Field, Hint, TextArea, TextInput } from "../fields"
import { DangerButton, GhostButton, IconButton, PrimaryButton, SecondaryButton } from "../buttons"
import { ConfirmDeleteSheet, FormAlert, Segmented } from "../modals"
import { ModalSheet } from "../modal-sheet"

// ---------------------------------------------------------------------------
// Campo numerico com prefixo/sufixo ("R$", "/ha", "%", "dias"). O campo e texto com teclado
// decimal (type="number" no iPhone em portugues recusa a virgula). Guarda o texto digitado
// enquanto tem foco (para "30," nao virar "30") e mostra o numero salvo ao sair.
// A leitura do texto e do parseNum: "30,50" e "1.234,5" (virgula e o decimal), "20.5" (ponto).
// ---------------------------------------------------------------------------
function DecimalInput({
  value,
  onValue,
  prefix,
  suffix,
  money = false,
  integer = false,
  placeholder = "0",
  label,
  autoFocus,
}: {
  value: number | null | undefined
  onValue: (n: number | null) => void
  prefix?: string
  suffix?: string
  money?: boolean
  integer?: boolean
  placeholder?: string
  label: string
  autoFocus?: boolean
}) {
  // Sem separador de milhar no texto, para o que aparece ser lido do mesmo jeito ao editar.
  const fmt = (n: number | null | undefined) => {
    if (!n) return ""
    return money ? n.toFixed(2).replace(".", ",") : numInput(Math.round(n * 100) / 100)
  }
  const [text, setText] = useState(() => fmt(value))
  const focused = useRef(false)

  // Valor mudou por fora (modelo de parcelas, item preenchido, carregou a proposta)
  useEffect(() => {
    if (!focused.current) setText(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="flex min-h-12 w-full items-center gap-1.5 rounded-[14px] border border-input bg-raised px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
      {prefix && <span className="shrink-0 text-[15px] font-semibold text-faint">{prefix}</span>}
      <input
        aria-label={label}
        inputMode={integer ? "numeric" : "decimal"}
        enterKeyHint="next"
        autoComplete="off"
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          focused.current = true
          e.currentTarget.select()
        }}
        onBlur={() => {
          focused.current = false
          setText(fmt(value))
        }}
        onChange={(e) => {
          let t = e.target.value.replace(/[^\d.,]/g, "")
          if (integer) t = t.replace(/[.,]/g, "")
          setText(t)
          const n = parseNum(t)
          onValue(Number.isFinite(n) && n >= 0 ? (integer ? Math.round(n) : n) : null)
        }}
        className="num min-w-0 flex-1 bg-transparent py-3 text-base text-foreground outline-none placeholder:text-faint"
      />
      {suffix && <span className="shrink-0 text-[14px] font-semibold text-faint">{suffix}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Padroes da proposta
// ---------------------------------------------------------------------------

// Presets que ja casam com os detalhamentos tecnicos automaticos do documento
// (ver ITEM_SPECS em proposal-document-screen.tsx).
const ITEM_NAME_PRESETS = ["Levantamento Planialtimétrico", "Curva de Nível", "Projeto de Drenagem"]

// bannerMap comeca desmarcado: lona grande so faz sentido economicamente em projetos grandes.
const DEFAULT_DELIVERABLES: ProposalDeliverables = {
  rawPhotosHd: true,
  bannerMap: false,
  georefPdf: true,
  photoPaperMap: true,
}

const DELIVERABLE_OPTIONS: { key: keyof ProposalDeliverables; label: string; desc: string }[] = [
  { key: "rawPhotosHd", label: "HD com as fotos brutas", desc: "Todas as fotos aéreas capturadas em campo, em HD externo." },
  {
    key: "bannerMap",
    label: "Mapa geral em lona",
    desc: "Impressão em lona (banner) de formato grande — normalmente só em projetos grandes.",
  },
  { key: "georefPdf", label: "PDF georreferenciado", desc: "Mapas em PDF georreferenciado, compatível com GPS e QGIS." },
  { key: "photoPaperMap", label: "Mapa em papel fotográfico", desc: "Impressão do mapa geral em papel fotográfico." },
]

const DEFAULT_TIMELINE = (): ProposalTimelinePhase[] => [
  { id: genId("tl"), label: "Planejamento e mobilização", duration: "3-5 dias úteis" },
  { id: genId("tl"), label: "Operação de campo (voos)", duration: "5-10 dias úteis" },
  { id: genId("tl"), label: "Processamento e cartografia", duration: "10-15 dias úteis" },
  { id: genId("tl"), label: "Entrega final", duration: "3-5 dias úteis" },
]

const DEFAULT_PAYMENT_TERMS = "PIX ou boleto, mediante confirmação de cada parcela."
const DEFAULT_RESPONSIBILITIES =
  "Disponibilizar acesso à área para os voos e coleta de pontos de apoio.\nGarantir segurança e acesso aos locais de decolagem.\nApoiar na identificação de pontos de controle em campo, se necessário."
const DEFAULT_EXPERIENCE = "Mais de 20.000 hectares mapeados em propriedades rurais."
const DEFAULT_LOCATION = "Roraima, Brasil"
const DEFAULT_VALIDITY = 30

// Modelos de parcelas: so os marcos (rotulos editaveis), os percentuais somam 100%.
const SCHEDULE_TEMPLATES: { label: string; phases: [string, number][] }[] = [
  { label: "À vista", phases: [["Na assinatura do contrato", 100]] },
  {
    label: "50% + 50%",
    phases: [
      ["Na assinatura do contrato", 50],
      ["Na entrega final", 50],
    ],
  },
  {
    label: "30% + 40% + 30%",
    phases: [
      ["Na assinatura do contrato", 30],
      ["Ao concluir a operação de campo", 40],
      ["Na entrega final", 30],
    ],
  },
]

const STEPS = [
  { id: "cliente", label: "Cliente" },
  { id: "servicos", label: "Serviços" },
  { id: "valores", label: "Valores" },
  { id: "pagamento", label: "Pagamento" },
  { id: "prazos", label: "Prazos" },
  { id: "entregas", label: "Entregas" },
  { id: "textos", label: "Textos" },
] as const
type StepId = (typeof STEPS)[number]["id"]

interface FormState {
  clientName: string
  fazenda: string
  location: string
  items: ProposalItem[]
  discount: number | null
  discountNote: string
  validityDays: number | null
  paymentTerms: string
  paymentSchedule: ProposalPaymentPhase[]
  timeline: ProposalTimelinePhase[]
  clientResponsibilities: string
  experienceNote: string
  notes: string
  deliverables: ProposalDeliverables
}

const blankForm = (): FormState => ({
  clientName: "",
  fazenda: "",
  location: DEFAULT_LOCATION,
  items: [],
  discount: null,
  discountNote: "",
  validityDays: DEFAULT_VALIDITY,
  paymentTerms: DEFAULT_PAYMENT_TERMS,
  paymentSchedule: [],
  timeline: DEFAULT_TIMELINE(),
  clientResponsibilities: DEFAULT_RESPONSIBILITIES,
  experienceNote: DEFAULT_EXPERIENCE,
  notes: "",
  deliverables: { ...DEFAULT_DELIVERABLES },
})

// Proposta salva -> formulario. Campos ausentes ficam vazios (nao repoe padrao em cima
// do que o usuario apagou de proposito), exceto os que o documento sempre precisa.
const formFromProposal = (p: Proposal): FormState => ({
  clientName: p.clientName || "",
  fazenda: p.fazenda || "",
  location: p.location || DEFAULT_LOCATION,
  items: (p.items || []).map((i) => ({ ...i })),
  discount: p.discount ?? null,
  discountNote: p.discountNote || "",
  validityDays: p.validityDays ?? null,
  paymentTerms: p.paymentTerms || "",
  paymentSchedule: (p.paymentSchedule || []).map((s) => ({ ...s })),
  timeline: p.timeline?.length ? p.timeline.map((t) => ({ ...t })) : [],
  clientResponsibilities: p.clientResponsibilities ?? "",
  experienceNote: p.experienceNote ?? "",
  notes: p.notes || "",
  deliverables: { ...DEFAULT_DELIVERABLES, ...(p.deliverables || {}) },
})

const removeBtn =
  "pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-faint hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"

const chipBtn =
  "pressable inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[14px] font-semibold text-foreground hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"

function FormSection({
  id,
  title,
  hint,
  children,
}: {
  id: StepId
  title: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={`sec-${id}`} data-step={id} className="scroll-mt-[var(--form-head)] pt-9 first:pt-4">
      <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>
      {hint && <Hint className="mt-1 text-pretty">{hint}</Hint>}
      <div className="mt-3.5">{children}</div>
    </section>
  )
}

function SubLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{children}</span>
}

// ---------------------------------------------------------------------------

export function ProposalFormScreen() {
  const { goProposals, currentProposalId, navigate, openProposal } = useNav()
  const { proposal: existing, isLoading } = useProposal(currentProposalId)
  const refresh = useRefresh()

  const [form, setForm] = useState<FormState>(blankForm)
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(blankForm()))
  const [hydratedFor, setHydratedFor] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<{ msg: string; step: StepId } | null>(null)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [active, setActive] = useState<StepId>("cliente")
  const headRef = useRef<HTMLDivElement>(null)
  const [headH, setHeadH] = useState(124)
  const [barH, setBarH] = useState(140)
  const barRef = useRef<HTMLDivElement>(null)

  // Comeca do topo (a lista podia estar rolada)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentProposalId])

  // Preenche o formulario uma vez por proposta (nova ou existente), sem sobrescrever a digitacao.
  useEffect(() => {
    if (hydratedFor === currentProposalId) return
    if (!currentProposalId) {
      const f = blankForm()
      setForm(f)
      setBaseline(JSON.stringify(f))
      setHydratedFor(null)
      return
    }
    if (existing && existing.id === currentProposalId) {
      const f = formFromProposal(existing)
      setForm(f)
      setBaseline(JSON.stringify(f))
      setHydratedFor(currentProposalId)
    }
  }, [existing, currentProposalId, hydratedFor])

  // Altura do cabecalho e do rodape fixos (o quadro do app tem overflow-hidden, sticky nao gruda)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      if (headRef.current) setHeadH(headRef.current.offsetHeight)
      if (barRef.current) setBarH(barRef.current.offsetHeight)
    })
    if (headRef.current) ro.observe(headRef.current)
    if (barRef.current) ro.observe(barRef.current)
    return () => ro.disconnect()
  })

  // Secao em foco no indicador de etapas
  useEffect(() => {
    const onScroll = () => {
      const line = headH + 24
      let cur: StepId = "cliente"
      for (const s of STEPS) {
        const el = document.getElementById(`sec-${s.id}`)
        if (el && el.getBoundingClientRect().top <= line) cur = s.id
      }
      // no fim da pagina, a ultima secao
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = STEPS[STEPS.length - 1].id
      setActive(cur)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [headH])

  // Mantem a etapa ativa visivel na faixa
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const chip = stripRef.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`)
    const strip = stripRef.current
    if (chip && strip) {
      const left = chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2
      strip.scrollTo({ left, behavior: "smooth" })
    }
  }, [active])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  // ---- Itens ----
  function updateItem(id: string, patch: Partial<ProposalItem>) {
    setForm((f) => ({ ...f, items: f.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  }
  function addItem(name: string) {
    setForm((f) => {
      // Mesma area dos outros servicos por hectare (levantamento e curva de nivel cobrem os mesmos ha)
      const ha = f.items.filter((i) => i.billingType === "hectare").reduce((m, i) => Math.max(m, Number(i.quantity || 0)), 0)
      const item: ProposalItem = { id: genId("pi"), name, billingType: "hectare", rate: 0, quantity: ha || null }
      return { ...f, items: [...f.items, item] }
    })
    // Foca o campo certo do item novo (nome se for "Outro", senao o valor)
    setTimeout(() => {
      const cards = document.querySelectorAll<HTMLElement>("[data-item-card]")
      const last = cards[cards.length - 1]
      const target = name ? last?.querySelector<HTMLInputElement>("[data-rate] input") : last?.querySelector<HTMLInputElement>("[data-item-name]")
      last?.scrollIntoView({ block: "center", behavior: "smooth" })
      target?.focus({ preventScroll: true })
    }, 60)
  }
  function removeItem(id: string) {
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.id !== id) }))
  }

  // ---- Parcelas ----
  function updatePhase(id: string, patch: Partial<ProposalPaymentPhase>) {
    setForm((f) => ({ ...f, paymentSchedule: f.paymentSchedule.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  }
  function addPhase() {
    setForm((f) => {
      const rest = Math.max(0, 100 - paymentSchedulePercentTotal(f.paymentSchedule))
      return { ...f, paymentSchedule: [...f.paymentSchedule, { id: genId("pp"), label: "", percent: rest }] }
    })
  }
  function applyTemplate(phases: [string, number][]) {
    set(
      "paymentSchedule",
      phases.map(([label, percent]) => ({ id: genId("pp"), label, percent })),
    )
  }

  // ---- Cronograma ----
  function updateTimelinePhase(id: string, patch: Partial<ProposalTimelinePhase>) {
    setForm((f) => ({ ...f, timeline: f.timeline.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  }

  // ---- Totais ao vivo ----
  const live = useMemo(() => {
    const p = { items: form.items, discount: form.discount || 0 } as Proposal
    const subtotal = proposalSubtotal(p)
    const disc = proposalDiscount(p)
    const total = proposalTotal(p)
    const pctSum = paymentSchedulePercentTotal(form.paymentSchedule)
    const values = paymentScheduleValues(total, form.paymentSchedule)
    return { subtotal, disc, total, pctSum, values }
  }, [form.items, form.discount, form.paymentSchedule])

  const done: Record<StepId, boolean> = {
    cliente: !!form.clientName.trim(),
    servicos: form.items.some((i) => i.name.trim()) && form.items.every((i) => !i.name.trim() || proposalItemTotal(i) > 0),
    valores: !!form.validityDays,
    pagamento:
      (form.paymentSchedule.length > 0 && Math.abs(live.pctSum - 100) < 0.001) ||
      (form.paymentSchedule.length === 0 && !!form.paymentTerms.trim()),
    prazos: form.timeline.some((t) => t.label.trim()),
    entregas: Object.values(form.deliverables).some(Boolean),
    textos: !!form.clientResponsibilities.trim(),
  }

  const dirty = hydratedFor !== undefined && JSON.stringify(form) !== baseline

  function goTo(step: StepId) {
    document.getElementById(`sec-${step}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function fail(msg: string, step: StepId) {
    setError({ msg, step })
    goTo(step)
    return null
  }

  function buildProposal(id: string, createdAt: string): Proposal | null {
    const name = form.clientName.trim()
    if (!name) return fail("Informe o nome do cliente.", "cliente")
    const items = form.items
      .map((i) => ({
        ...i,
        name: i.name.trim(),
        rate: Math.max(0, Number(i.rate || 0)),
        quantity: i.billingType === "fixo" ? null : i.quantity == null ? null : Math.max(0, Number(i.quantity)),
        note: i.note?.trim() || undefined,
      }))
      .filter((i) => i.name)
    if (!items.length) return fail("Adicione pelo menos um serviço à proposta.", "servicos")
    const semValor = items.find((i) => proposalItemTotal(i) <= 0)
    if (semValor)
      return fail(
        semValor.billingType === "fixo"
          ? `Defina o valor do pacote de “${semValor.name}”.`
          : `Defina o valor e a quantidade de “${semValor.name}”.`,
        "servicos",
      )
    const schedule = form.paymentSchedule
      .map((s) => ({ ...s, label: s.label.trim(), percent: Math.max(0, Number(s.percent || 0)) }))
      .filter((s) => s.label || s.percent > 0)
    if (schedule.some((s) => !s.label)) return fail("Dê um nome a cada parcela (ex.: na assinatura).", "pagamento")
    const sum = paymentSchedulePercentTotal(schedule)
    if (schedule.length && Math.abs(sum - 100) > 0.001)
      return fail(
        `As parcelas somam ${sum.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%. Ajuste para fechar 100%.`,
        "pagamento",
      )
    setError(null)
    const discount = Math.max(0, Number(form.discount || 0))
    return {
      id,
      clientName: name,
      fazenda: form.fazenda.trim() || undefined,
      location: form.location.trim() || undefined,
      items,
      discount: discount || undefined,
      discountNote: discount ? form.discountNote.trim() || undefined : undefined,
      validityDays: form.validityDays && form.validityDays > 0 ? form.validityDays : undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      paymentSchedule: schedule.length ? schedule : undefined,
      timeline: form.timeline
        .map((t) => ({ ...t, label: t.label.trim(), duration: t.duration.trim() }))
        .filter((t) => t.label),
      clientResponsibilities: form.clientResponsibilities.trim() || undefined,
      experienceNote: form.experienceNote.trim() || undefined,
      notes: form.notes.trim() || undefined,
      deliverables: form.deliverables,
      createdAt,
    }
  }

  async function persist(): Promise<Proposal | null> {
    const p = buildProposal(currentProposalId || genId("prop"), existing?.createdAt || new Date().toISOString())
    if (!p) return null
    setSaving(true)
    try {
      await saveProposal(p)
    } catch {
      setError({ msg: "Não foi possível salvar. Verifique a conexão e tente de novo.", step: active })
      return null
    } finally {
      setSaving(false)
    }
    setBaseline(JSON.stringify(form))
    refresh()
    return p
  }

  async function save() {
    if (await persist()) goProposals()
  }

  async function saveAndGenerate() {
    const p = await persist()
    if (!p) return
    // Proposta NOVA: sem isso currentProposalId continua null e o documento nao acha nada.
    openProposal(p.id)
    navigate("proposalDocument")
  }

  async function duplicate() {
    const copy = buildProposal(genId("prop"), new Date().toISOString())
    if (!copy) return
    setSaving(true)
    try {
      await saveProposal(copy)
    } finally {
      setSaving(false)
    }
    refresh()
    setCopied(true)
    openProposal(copy.id)
  }

  async function remove() {
    if (!currentProposalId) return
    await deleteProposal(currentProposalId)
    refresh()
    goProposals()
  }

  function back() {
    if (dirty) setLeaving(true)
    else goProposals()
  }

  if (currentProposalId && hydratedFor !== currentProposalId) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="px-4 pb-3 pt-safe">
          <div className="flex min-h-10 items-center gap-3">
            <IconButton onClick={goProposals} aria-label="Voltar">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </IconButton>
            <h1 className="text-[19px] font-bold">Proposta</h1>
          </div>
        </div>
        <div className="space-y-3 px-4 pt-4" aria-busy>
          <p className="text-[14px] text-muted-foreground">{isLoading ? "Carregando proposta…" : "Proposta não encontrada."}</p>
          {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-12 rounded-[14px] border border-border bg-card" />)}
        </div>
      </div>
    )
  }

  const isEdit = !!currentProposalId
  const presetsLeft = ITEM_NAME_PRESETS.filter((n) => !form.items.some((i) => i.name.trim() === n))
  const validUntil = form.validityDays
    ? new Date(Date.now() + form.validityDays * 86400000).toLocaleDateString("pt-BR")
    : null

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ ["--form-head" as string]: `${headH + 8}px` }}
    >
      {/* Cabecalho fixo: voltar, titulo, acoes e a faixa de etapas */}
      <div
        ref={headRef}
        className="fixed inset-x-0 top-0 z-30 mx-auto w-full max-w-[480px] border-b border-border bg-background/95 backdrop-blur-md"
      >
        <div className="flex min-h-10 items-center gap-3 px-4 pt-safe">
          <IconButton onClick={back} aria-label="Voltar">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-bold leading-tight tracking-[-0.01em]">
              {isEdit ? "Editar proposta" : "Nova proposta"}
            </h1>
            <p className="truncate text-[13px] text-muted-foreground">
              {form.clientName.trim() || "Preencha de cima para baixo"}
            </p>
          </div>
          {isEdit && (
            <>
              <IconButton onClick={duplicate} disabled={saving} aria-label="Duplicar proposta" className="disabled:opacity-45">
                <Copy className="h-[17px] w-[17px]" />
              </IconButton>
              <IconButton
                onClick={() => setConfirmDelete(true)}
                aria-label="Excluir proposta"
                className="text-destructive hover:border-destructive/35"
              >
                <Trash2 className="h-[17px] w-[17px]" />
              </IconButton>
            </>
          )}
        </div>
        <nav aria-label="Etapas da proposta">
          <div
            ref={stripRef}
            className="flex gap-1.5 overflow-x-auto px-4 pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {STEPS.map((s) => {
              const on = active === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  data-chip={s.id}
                  aria-current={on ? "step" : undefined}
                  onClick={() => goTo(s.id)}
                  className={cn(
                    "pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                    on ? "border-foreground/20 bg-raised text-foreground" : "border-transparent text-faint hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-200",
                      done[s.id] ? "bg-primary text-primary-foreground" : "border border-current opacity-60",
                    )}
                    aria-hidden
                  >
                    {done[s.id] && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                  </span>
                  {s.label}
                  <span className="sr-only">{done[s.id] ? " (preenchido)" : ""}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
      <div style={{ height: headH }} aria-hidden />

      <div className="flex-1 px-4" style={{ paddingBottom: barH + 24 }}>
        {copied && (
          <FormAlert tone="info" className="mb-0 mt-4">
            Cópia criada. Troque o cliente e ajuste os valores; a proposta original ficou como estava.
          </FormAlert>
        )}

        {/* CLIENTE */}
        <FormSection id="cliente" title="Para quem é a proposta">
          <Field label="Nome do cliente">
            <TextInput
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              placeholder="Ex.: Fábio Fukuda"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              autoFocus={!isEdit}
              aria-invalid={error?.step === "cliente" || undefined}
            />
          </Field>
          <Field label="Fazenda ou empreendimento (opcional)">
            <TextInput
              value={form.fazenda}
              onChange={(e) => set("fazenda", e.target.value)}
              placeholder="Ex.: Fazenda Vila Alta"
              autoCapitalize="words"
              enterKeyHint="next"
            />
          </Field>
          <Field label="Localização" className="mb-0">
            <TextInput value={form.location} onChange={(e) => set("location", e.target.value)} placeholder={DEFAULT_LOCATION} />
          </Field>
        </FormSection>

        {/* SERVICOS */}
        <FormSection
          id="servicos"
          title="Serviços"
          hint="Os itens prontos trazem o detalhamento técnico certo no PDF. Cada um pode ser cobrado por hectare, por metro ou como pacote fechado."
        >
          {form.items.length > 0 && (
            <div className="mb-3 flex flex-col gap-2.5">
              {form.items.map((item, idx) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  onChange={(patch) => updateItem(item.id, patch)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}
          <div className={cn(form.items.length === 0 && "rounded-[18px] border border-dashed border-foreground/15 p-4")}>
            {form.items.length === 0 && (
              <p className="mb-3 text-[14px] font-semibold">Escolha o primeiro serviço</p>
            )}
            <div className="flex flex-wrap gap-2">
              {presetsLeft.map((n) => (
                <button key={n} type="button" onClick={() => addItem(n)} className={chipBtn}>
                  <Plus className="h-4 w-4 text-primary" strokeWidth={2.4} /> {n}
                </button>
              ))}
              <button type="button" onClick={() => addItem("")} className={chipBtn}>
                <Plus className="h-4 w-4 text-primary" strokeWidth={2.4} /> Outro serviço
              </button>
            </div>
          </div>
        </FormSection>

        {/* VALORES */}
        <FormSection id="valores" title="Desconto e validade">
          <div className="rounded-[18px] border border-border bg-card px-4 py-3.5">
            <div className="flex items-baseline justify-between text-[14px] text-muted-foreground">
              <span>Soma dos serviços</span>
              <span className="num font-semibold text-foreground">{fmtMoney(live.subtotal)}</span>
            </div>
          </div>
          <Field label="Desconto (opcional)" className="mt-4" hint={
            live.disc > 0 && live.subtotal > 0
              ? `${((live.disc / live.subtotal) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da soma dos serviços.`
              : Number(form.discount || 0) > live.subtotal && live.subtotal > 0
                ? "O desconto ficou limitado à soma dos serviços."
                : undefined
          }>
            <DecimalInput
              label="Desconto em reais"
              prefix="R$"
              money
              value={form.discount}
              onValue={(n) => set("discount", n)}
              placeholder="0,00"
            />
          </Field>
          {Number(form.discount || 0) > 0 && (
            <Field label="Motivo do desconto (opcional)">
              <TextInput
                value={form.discountNote}
                onChange={(e) => set("discountNote", e.target.value)}
                placeholder="Ex.: pacote fechado, pagamento à vista"
              />
            </Field>
          )}
          <Field
            label="Validade da proposta"
            className="mb-0"
            hint={validUntil ? `Gerando o PDF hoje, vale até ${validUntil}.` : "Sem validade, o documento não mostra prazo."}
          >
            <div className="flex items-center gap-2">
              <div className="w-[132px] shrink-0">
                <DecimalInput
                  label="Validade em dias"
                  integer
                  suffix="dias"
                  value={form.validityDays}
                  onValue={(n) => set("validityDays", n)}
                  placeholder="—"
                />
              </div>
              <div className="flex flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
                {[15, 30, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("validityDays", d)}
                    aria-pressed={form.validityDays === d}
                    className={cn(
                      "pressable num min-h-10 shrink-0 rounded-full border px-3.5 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                      form.validityDays === d
                        ? "border-foreground/20 bg-raised text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </FormSection>

        {/* PAGAMENTO */}
        <FormSection
          id="pagamento"
          title="Pagamento"
          hint="Divida o total em parcelas ligadas a marcos do trabalho. O valor de cada uma sai do percentual e acompanha o total."
        >
          {form.paymentSchedule.length > 0 ? (
            <div className="overflow-hidden rounded-[18px] border border-border bg-card">
              <div className="divide-y divide-border">
                {form.paymentSchedule.map((ph, idx) => (
                  <div key={ph.id} className="px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="num w-5 shrink-0 text-[13px] font-semibold text-faint">{idx + 1}ª</span>
                      <TextInput
                        value={ph.label}
                        onChange={(e) => updatePhase(ph.id, { label: e.target.value })}
                        placeholder="Ex.: na assinatura do contrato"
                        aria-label={`Marco da parcela ${idx + 1}`}
                        className="min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => set("paymentSchedule", form.paymentSchedule.filter((p) => p.id !== ph.id))}
                        className={removeBtn}
                        aria-label={`Remover parcela ${idx + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3 pl-7 pr-12">
                      <div className="w-[112px] shrink-0">
                        <DecimalInput
                          label={`Percentual da parcela ${idx + 1}`}
                          suffix="%"
                          value={ph.percent}
                          onValue={(n) => updatePhase(ph.id, { percent: n ?? 0 })}
                        />
                      </div>
                      <span className="num ml-auto text-right text-[16px] font-bold">{fmtMoney(live.values[idx] || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border bg-raised/60 px-4 py-3">
                <span
                  className={cn(
                    "num text-[13px] font-semibold",
                    Math.abs(live.pctSum - 100) < 0.001 ? "text-muted-foreground" : "text-warning",
                  )}
                >
                  {Math.abs(live.pctSum - 100) < 0.001
                    ? "Fecha 100% do total"
                    : live.pctSum < 100
                      ? `Soma ${live.pctSum.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%: faltam ${(100 - live.pctSum).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
                      : `Soma ${live.pctSum.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%: passou ${(live.pctSum - 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                </span>
                <span className="num text-[15px] font-bold">{fmtMoney(live.values.reduce((s, v) => s + v, 0))}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-foreground/15 p-4">
              <p className="text-[14px] font-semibold">Parcelas</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                Comece por um modelo e ajuste os marcos e percentuais.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SCHEDULE_TEMPLATES.map((t) => (
                  <button key={t.label} type="button" onClick={() => applyTemplate(t.phases)} className={cn(chipBtn, "num")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.paymentSchedule.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <GhostButton onClick={addPhase} className="-ml-3">
                <Plus className="h-4 w-4" /> Adicionar parcela
              </GhostButton>
            </div>
          )}
          <Field
            label={form.paymentSchedule.length ? "Observação sobre o pagamento (opcional)" : "Condições de pagamento"}
            className="mb-0 mt-4"
          >
            <TextArea
              value={form.paymentTerms}
              onChange={(e) => set("paymentTerms", e.target.value)}
              placeholder="Ex.: PIX ou boleto"
              className="min-h-[76px]"
              rows={2}
            />
          </Field>
        </FormSection>

        {/* CRONOGRAMA */}
        <FormSection id="prazos" title="Cronograma estimado" hint="Ajuste os prazos à realidade desta proposta.">
          {form.timeline.length > 0 && (
            <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
              {form.timeline.map((phase, idx) => (
                <div key={phase.id} className="flex items-start gap-2 py-3 pl-3.5 pr-1.5">
                  <span className="num mt-3.5 w-4 shrink-0 text-[13px] font-semibold text-faint">{idx + 1}</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <TextInput
                      value={phase.label}
                      onChange={(e) => updateTimelinePhase(phase.id, { label: e.target.value })}
                      placeholder="Ex.: Operação de campo"
                      aria-label={`Etapa ${idx + 1}`}
                    />
                    <TextInput
                      value={phase.duration}
                      onChange={(e) => updateTimelinePhase(phase.id, { duration: e.target.value })}
                      placeholder="Ex.: 5-10 dias úteis"
                      aria-label={`Prazo da etapa ${idx + 1}`}
                      className="num"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set("timeline", form.timeline.filter((p) => p.id !== phase.id))}
                    className={cn(removeBtn, "mt-1")}
                    aria-label={`Remover etapa ${idx + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            <GhostButton
              className="-ml-3"
              onClick={() => set("timeline", [...form.timeline, { id: genId("tl"), label: "", duration: "" }])}
            >
              <Plus className="h-4 w-4" /> Adicionar etapa
            </GhostButton>
            {form.timeline.length === 0 && (
              <GhostButton onClick={() => set("timeline", DEFAULT_TIMELINE())}>Usar o cronograma padrão</GhostButton>
            )}
          </div>
        </FormSection>

        {/* ENTREGAS */}
        <FormSection id="entregas" title="O que será entregue" hint="Desmarque o que não fizer sentido nesta proposta.">
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {DELIVERABLE_OPTIONS.map((opt) => {
              const checked = !!form.deliverables[opt.key]
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => set("deliverables", { ...form.deliverables, [opt.key]: !checked })}
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

        {/* TEXTOS */}
        <FormSection id="textos" title="Textos do documento">
          <Field label="Responsabilidades do cliente" hint="Uma por linha. Vira lista no documento; em branco, a seção não aparece.">
            <TextArea
              value={form.clientResponsibilities}
              onChange={(e) => set("clientResponsibilities", e.target.value)}
              placeholder={"Ex.:\nDisponibilizar acesso à área\nGarantir segurança no local de decolagem"}
              className="min-h-[120px]"
            />
          </Field>
          <Field
            label="Experiência e números reais (opcional)"
            hint="Dado verificável: hectares já mapeados, tempo de atuação na região. Uma linha por item."
          >
            <TextArea
              value={form.experienceNote}
              onChange={(e) => set("experienceNote", e.target.value)}
              placeholder={"Ex.:\nMais de 20.000 ha mapeados em fazendas de Roraima"}
            />
          </Field>
          <Field label="Observações (opcional)" hint="Aparece no fim da proposta, antes das assinaturas." className="mb-0">
            <TextArea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ex.: restrições de acesso à área…" />
          </Field>
        </FormSection>
      </div>

      {/* Rodape fixo: total ao vivo e as duas acoes (fixed: o quadro do app tem overflow-hidden) */}
      <div
        ref={barRef}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-md"
      >
        {error && (
          <FormAlert className="mb-3">
            <button type="button" className="text-left" onClick={() => goTo(error.step)}>
              {error.msg}
            </button>
          </FormAlert>
        )}
        <div className="mb-2.5 flex items-end justify-between gap-3" aria-live="polite">
          <div className="min-w-0">
            <div className="text-[12px] text-muted-foreground">Total da proposta</div>
            {live.disc > 0 && (
              <div className="num truncate text-[12px] text-faint">
                {fmtMoney(live.subtotal)} − {fmtMoney(live.disc)}
              </div>
            )}
          </div>
          <div className="num text-[24px] font-extrabold leading-none tracking-[-0.02em]">{fmtMoney(live.total)}</div>
        </div>
        <div className="flex gap-2.5">
          <SecondaryButton className="flex-1" onClick={save} disabled={saving}>
            Salvar
          </SecondaryButton>
          <PrimaryButton className="flex-[2]" onClick={saveAndGenerate} disabled={saving}>
            <FileText className="h-4 w-4" /> Salvar e gerar PDF
          </PrimaryButton>
        </div>
      </div>

      {leaving && (
        <ModalSheet title="Sair sem salvar?" onClose={() => setLeaving(false)}>
          <p className="mb-5 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            As mudanças desta proposta ainda não foram salvas.
          </p>
          <PrimaryButton
            className="w-full"
            disabled={saving}
            onClick={async () => {
              setLeaving(false)
              await save()
            }}
          >
            Salvar e sair
          </PrimaryButton>
          <DangerButton className="mt-2.5 w-full" onClick={goProposals}>
            Descartar mudanças
          </DangerButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setLeaving(false)}>
            Continuar editando
          </GhostButton>
        </ModalSheet>
      )}

      {confirmDelete && (
        <ConfirmDeleteSheet
          title="Excluir proposta"
          confirmLabel="Excluir proposta"
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        >
          A proposta de <strong className="font-semibold text-foreground">{existing?.clientName || form.clientName}</strong> será
          apagada. Esta ação não pode ser desfeita.
        </ConfirmDeleteSheet>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cartao de um servico
// ---------------------------------------------------------------------------
function ItemCard({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: ProposalItem
  index: number
  onChange: (patch: Partial<ProposalItem>) => void
  onRemove: () => void
}) {
  const unit = item.billingType === "hectare" ? "ha" : "m"
  const total = proposalItemTotal(item)
  const qty = Number(item.quantity || 0)
  const math =
    item.billingType === "fixo"
      ? "Pacote fechado"
      : item.rate && qty
        ? `${fmtMoney(item.rate)}/${unit} × ${qty.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit}`
        : item.billingType === "hectare"
          ? "Valor por hectare × área"
          : "Valor por metro × extensão"

  return (
    <div data-item-card className="rounded-[18px] border border-border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <TextInput
          data-item-name
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nome do serviço"
          aria-label={`Nome do serviço ${index + 1}`}
          className="min-w-0 flex-1 font-semibold"
        />
        <button type="button" onClick={onRemove} className={removeBtn} aria-label={`Remover ${item.name || `serviço ${index + 1}`}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <Segmented<BillingType>
          label="Forma de cobrança"
          value={item.billingType}
          onChange={(v) => onChange({ billingType: v })}
          options={[
            { value: "hectare", label: "R$/ha" },
            { value: "metro", label: "R$/m" },
            { value: "fixo", label: "Fechado" },
          ]}
        />
      </div>

      <div className={cn("mt-3 grid gap-2.5", item.billingType === "fixo" ? "grid-cols-1" : "grid-cols-2")}>
        <label className="min-w-0" data-rate>
          <SubLabel>{item.billingType === "fixo" ? "Valor do pacote" : item.billingType === "hectare" ? "Valor por hectare" : "Valor por metro"}</SubLabel>
          <DecimalInput
            label={item.billingType === "fixo" ? "Valor do pacote" : `Valor por ${unit === "ha" ? "hectare" : "metro"}`}
            prefix="R$"
            money
            value={item.rate}
            onValue={(n) => onChange({ rate: n ?? 0 })}
            placeholder="0,00"
          />
        </label>
        {item.billingType !== "fixo" && (
          <label className="min-w-0">
            <SubLabel>{item.billingType === "hectare" ? "Área" : "Extensão"}</SubLabel>
            <DecimalInput
              label={item.billingType === "hectare" ? "Área em hectares" : "Extensão em metros"}
              suffix={unit}
              value={item.quantity}
              onValue={(n) => onChange({ quantity: n })}
            />
          </label>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span className="num min-w-0 text-[13px] text-muted-foreground">{math}</span>
        <span className={cn("num shrink-0 text-[17px] font-bold", !total && "text-faint")}>{fmtMoney(total)}</span>
      </div>

      <TextInput
        value={item.note || ""}
        onChange={(e) => onChange({ note: e.target.value })}
        placeholder="O que está incluso (opcional)"
        aria-label={`O que está incluso em ${item.name || `serviço ${index + 1}`}`}
        className="mt-3"
      />
    </div>
  )
}
