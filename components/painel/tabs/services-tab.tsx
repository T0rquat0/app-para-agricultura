"use client"

import { useState } from "react"
import { ArrowUpRight, Check, Plus, Tag, X } from "lucide-react"
import type { Project, Service, ServiceStatus } from "@/lib/types"
import { pricingSummary, projectDiscount, projectNetRevenue, projectRevenue } from "@/lib/calculations"
import { fmtMoney } from "@/lib/format"
import { saveProject } from "@/lib/storage"
import { useRefresh } from "@/lib/hooks"
import { SectionTitle } from "../chrome"
import { Field, Hint, TextInput } from "../fields"
import { PrimaryButton, GhostButton, SecondaryButton } from "../buttons"
import { ModalSheet } from "../modal-sheet"
import { ServiceModal, ServicePricingModal } from "../modals"

export function ServicesTab({ project }: { project: Project }) {
  const refresh = useRefresh()
  const [showAdd, setShowAdd] = useState(false)
  const [pricingFor, setPricingFor] = useState<Service | null>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState("")
  const [discountNoteInput, setDiscountNoteInput] = useState("")

  const services = project.services || []
  const revenue = projectRevenue(project)
  const discount = projectDiscount(project)
  const netRevenue = projectNetRevenue(project)

  function openDiscount() {
    setDiscountInput(project.discount ? String(project.discount) : "")
    setDiscountNoteInput(project.discountNote || "")
    setDiscountOpen(true)
  }

  async function saveDiscount() {
    const value = Number(discountInput)
    const safe = Number.isNaN(value) || value < 0 ? 0 : value
    const p = { ...project, discount: safe || undefined, discountNote: safe ? discountNoteInput.trim() || undefined : undefined }
    await saveProject(p)
    setDiscountOpen(false)
    refresh()
  }

  async function setStatus(serviceId: string, status: ServiceStatus) {
    const p = { ...project }
    const s = (p.services || []).find((x) => x.id === serviceId)
    if (!s) return
    s.status = status
    s.updatedAt = new Date().toISOString().slice(0, 10)
    await saveProject(p)
    refresh()
  }

  async function removeService(serviceId: string) {
    if (!confirm("Remover este serviço?")) return
    const p = { ...project, services: (project.services || []).filter((s) => s.id !== serviceId) }
    await saveProject(p)
    refresh()
  }

  return (
    <div>
      {revenue > 0 && (
        <div className="mb-3 rounded-2xl bg-card p-3 text-center shadow-sm ring-1 ring-border/60">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Faturamento estimado</div>
          <div className="num mt-1 text-lg font-bold text-primary">{fmtMoney(netRevenue)}</div>
          {discount > 0 && (
            <div className="num mt-0.5 text-[11px] text-muted-foreground">
              {fmtMoney(revenue)} − {fmtMoney(discount)} de desconto
            </div>
          )}
        </div>
      )}

      {revenue > 0 && (
        <button
          onClick={openDiscount}
          className="mb-3 flex w-full items-center justify-between gap-2 rounded-2xl bg-card px-3.5 py-3 text-left shadow-sm ring-1 ring-border/60 transition-colors hover:bg-muted/40"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Tag className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-foreground">Desconto ao cliente</div>
              <div className="truncate text-[11.5px] text-muted-foreground">
                {discount > 0
                  ? `− ${fmtMoney(discount)}${project.discountNote ? ` · ${project.discountNote}` : ""}`
                  : "Toque para conceder um desconto no total"}
              </div>
            </div>
          </div>
          {discount > 0 ? (
            <span className="num shrink-0 text-[13px] font-extrabold text-accent">− {fmtMoney(discount)}</span>
          ) : (
            <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      )}

      <SectionTitle>Serviços contratados</SectionTitle>
      {services.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border/60">
          Nenhum serviço cadastrado.
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-1 shadow-sm ring-1 ring-border/60">
          {services.map((s) => (
            <div key={s.id} className="border-b border-border/60 px-3 py-3.5 last:border-0">
              <div className="mb-2.5 flex items-start gap-2">
                <button onClick={() => setPricingFor(s)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                    {s.name}
                    <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{pricingSummary(project, s)}</div>
                </button>
                <button
                  onClick={() => removeService(s.id)}
                  aria-label="Remover serviço"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <StatusTrack status={s.status} onChange={(st) => setStatus(s.id, st)} />
            </div>
          ))}
        </div>
      )}

      <Hint className="mx-0.5 mt-2">
        Toque no nome pra configurar o preço · toque no status pra avançar Pendente → Em andamento → Concluído.
      </Hint>

      <div className="mt-3.5">
        <SecondaryButton className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Adicionar serviço
        </SecondaryButton>
      </div>

      {showAdd && <ServiceModal project={project} onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {pricingFor && (
        <ServicePricingModal project={project} service={pricingFor} onClose={() => setPricingFor(null)} onSaved={refresh} />
      )}

      {discountOpen && (
        <ModalSheet title="Desconto ao cliente" onClose={() => setDiscountOpen(false)}>
          <p className="mb-3.5 text-[13px] leading-relaxed text-muted-foreground">
            Abatido do subtotal de <strong>{fmtMoney(revenue)}</strong>. Aparece no relatório do cliente como desconto e
            reduz o valor total dos serviços.
          </p>
          <Field label="Valor do desconto (R$)" hint="Deixe em branco ou 0 para remover o desconto.">
            <TextInput
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="Ex: 5000"
            />
          </Field>
          <Field label="Motivo (opcional)" hint="Ex.: parceria, negociação de fechamento.">
            <TextInput
              value={discountNoteInput}
              onChange={(e) => setDiscountNoteInput(e.target.value)}
              placeholder="Ex: negociação"
            />
          </Field>
          {discountInput && !Number.isNaN(Number(discountInput)) && Number(discountInput) > 0 && (
            <div className="mb-3.5 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] font-semibold text-foreground">
              Total ao cliente:{" "}
              <span className="text-primary">{fmtMoney(Math.max(0, revenue - Number(discountInput)))}</span>
            </div>
          )}
          <PrimaryButton className="w-full" onClick={saveDiscount}>
            Salvar desconto
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => setDiscountOpen(false)}>
            Cancelar
          </GhostButton>
        </ModalSheet>
      )}
    </div>
  )
}

function StatusTrack({ status, onChange }: { status: ServiceStatus; onChange: (s: ServiceStatus) => void }) {
  const segs: { key: ServiceStatus; label: string; sel: string }[] = [
    { key: "pendente", label: "Pendente", sel: "bg-secondary text-secondary-foreground" },
    { key: "andamento", label: "Andamento", sel: "bg-amber-status text-white" },
    { key: "concluido", label: "✓ Concluído", sel: "bg-primary text-primary-foreground" },
  ]
  return (
    <div className="flex h-8 overflow-hidden rounded-full border border-border bg-background">
      {segs.map((seg, i) => (
        <button
          key={seg.key}
          onClick={() => onChange(seg.key)}
          className={`flex-1 text-[11.5px] font-bold transition-colors ${i > 0 ? "border-l border-border" : ""} ${
            status === seg.key ? seg.sel : "text-muted-foreground"
          }`}
        >
          {seg.key === "concluido" && status === "concluido" ? (
            <span className="flex items-center justify-center gap-1">
              <Check className="h-3 w-3" strokeWidth={3} /> Concluído
            </span>
          ) : (
            seg.label
          )}
        </button>
      ))}
    </div>
  )
}
