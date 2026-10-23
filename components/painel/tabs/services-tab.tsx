"use client"

import { useState } from "react"
import { Briefcase, Check, ChevronRight, Plus, Tag, Trash2 } from "lucide-react"
import type { Project, Service, ServiceStatus } from "@/lib/types"
import { pricingSummary, projectDiscount, projectNetRevenue, projectRevenue } from "@/lib/calculations"
import { fmtMoney, todayISO } from "@/lib/format"
import { deleteService, updateProject, updateService } from "@/lib/storage"
import { useRefresh } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { EmptyState, SectionTitle } from "../chrome"
import { Field, Hint, NumberInput, TextInput } from "../fields"
import { SecondaryButton } from "../buttons"
import { ModalSheet } from "../modal-sheet"
import { ConfirmDeleteSheet, FormAlert, SheetActions, ServiceModal, ServicePricingModal } from "../modals"

export function ServicesTab({ project }: { project: Project }) {
  const refresh = useRefresh()
  const [showAdd, setShowAdd] = useState(false)
  const [pricingFor, setPricingFor] = useState<Service | null>(null)
  const [pendingRemove, setPendingRemove] = useState<Service | null>(null)
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
    await updateProject(project.id, {
      discount: safe || undefined,
      discountNote: safe ? discountNoteInput.trim() || undefined : undefined,
    })
    setDiscountOpen(false)
    refresh()
  }

  async function setStatus(serviceId: string, status: ServiceStatus) {
    const s = (project.services || []).find((x) => x.id === serviceId)
    if (!s) return
    await updateService(project.id, { ...s, status, updatedAt: todayISO() })
    refresh()
  }

  async function removeService(serviceId: string) {
    await deleteService(project.id, serviceId)
    setPendingRemove(null)
    refresh()
  }

  return (
    <div>
      {revenue > 0 && (
        <div className="mb-6 overflow-hidden rounded-[18px] border border-border bg-card">
          <div className="px-4 py-3.5">
            <div className="text-[13px] text-muted-foreground">Faturamento estimado</div>
            <div className="num mt-0.5 text-[26px] font-extrabold leading-tight tracking-[-0.02em]">{fmtMoney(netRevenue)}</div>
            {discount > 0 && (
              <div className="num mt-0.5 text-[13px] text-muted-foreground">
                {fmtMoney(revenue)} menos {fmtMoney(discount)} de desconto
              </div>
            )}
          </div>
          <button
            onClick={openDiscount}
            className="pressable flex min-h-14 w-full items-center gap-3 border-t border-border px-4 py-3 text-left hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
          >
            <Tag className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">Desconto ao cliente</div>
              <div className="truncate text-[13px] text-muted-foreground">
                {discount > 0 ? project.discountNote || "Abatido do total dos serviços" : "Conceder um desconto no total"}
              </div>
            </div>
            {discount > 0 ? (
              <span className="num shrink-0 text-[15px] font-bold">− {fmtMoney(discount)}</span>
            ) : (
              <Plus className="h-4 w-4 shrink-0 text-faint" />
            )}
          </button>
        </div>
      )}

      <SectionTitle count={services.length || undefined}>Serviços contratados</SectionTitle>
      {services.length === 0 ? (
        <EmptyState icon={<Briefcase className="h-8 w-8 opacity-40" />}>
          Nenhum serviço no projeto. Adicione o que foi contratado para calcular o faturamento.
        </EmptyState>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          {services.map((s) => (
            <div key={s.id} className="px-4 pb-4 pt-3">
              <div className="mb-3 flex items-start gap-1">
                <button
                  onClick={() => setPricingFor(s)}
                  className="pressable -ml-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-2 py-1 text-left hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold leading-snug">{s.name}</div>
                    <div className="num mt-0.5 text-[13px] leading-snug text-muted-foreground">{pricingSummary(project, s).replace(/R$ /g, "R$00a0")}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                </button>
                <button
                  onClick={() => setPendingRemove(s)}
                  aria-label={`Remover ${s.name}`}
                  className="pressable -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-faint hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <StatusTrack status={s.status} onChange={(st) => setStatus(s.id, st)} />
            </div>
          ))}
        </div>
      )}

      {services.length > 0 && (
        <Hint className="mt-2.5 px-0.5">Toque no serviço para definir o preço e no status para marcar o andamento.</Hint>
      )}

      <SecondaryButton className="mt-4 w-full" onClick={() => setShowAdd(true)}>
        <Plus className="h-4 w-4" /> Adicionar serviço
      </SecondaryButton>

      {showAdd && <ServiceModal project={project} onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {pricingFor && (
        <ServicePricingModal project={project} service={pricingFor} onClose={() => setPricingFor(null)} onSaved={refresh} />
      )}
      {pendingRemove && (
        <ConfirmDeleteSheet
          title="Remover serviço"
          confirmLabel="Remover serviço"
          onConfirm={() => removeService(pendingRemove.id)}
          onClose={() => setPendingRemove(null)}
        >
          <strong className="font-semibold text-foreground">{pendingRemove.name}</strong> sai do projeto e deixa de contar
          no faturamento.
        </ConfirmDeleteSheet>
      )}

      {discountOpen && (
        <ModalSheet title="Desconto ao cliente" onClose={() => setDiscountOpen(false)}>
          <p className="mb-5 text-[15px] leading-relaxed text-muted-foreground">
            Abatido do subtotal de <span className="num font-semibold text-foreground">{fmtMoney(revenue)}</span>. Aparece no
            relatório do cliente e reduz o total dos serviços.
          </p>
          <Field label="Valor do desconto (R$)" hint="Em branco ou 0 remove o desconto.">
            <NumberInput
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              type="number"
              placeholder="Ex.: 5000"
              autoFocus
            />
          </Field>
          <Field label="Motivo (opcional)">
            <TextInput
              value={discountNoteInput}
              onChange={(e) => setDiscountNoteInput(e.target.value)}
              placeholder="Ex.: parceria, negociação de fechamento"
            />
          </Field>
          {discountInput && !Number.isNaN(Number(discountInput)) && Number(discountInput) > 0 && (
            <FormAlert tone="info" className="flex items-baseline justify-between gap-3">
              <span>Total ao cliente</span>
              <span className="num shrink-0 whitespace-nowrap text-[17px] font-bold text-foreground">
                {fmtMoney(Math.max(0, revenue - Number(discountInput)))}
              </span>
            </FormAlert>
          )}
          <SheetActions label="Salvar desconto" onConfirm={saveDiscount} onCancel={() => setDiscountOpen(false)} />
        </ModalSheet>
      )}
    </div>
  )
}

// Status do servico: controle segmentado; o ativo ganha a tinta palida do estado.
function StatusTrack({ status, onChange }: { status: ServiceStatus; onChange: (s: ServiceStatus) => void }) {
  const segs: { key: ServiceStatus; label: string; sel: string }[] = [
    { key: "pendente", label: "Pendente", sel: "bg-raised text-foreground" },
    { key: "andamento", label: "Em andamento", sel: "bg-warning/12 text-warning" },
    { key: "concluido", label: "Concluído", sel: "bg-positive/12 text-positive" },
  ]
  return (
    <div role="radiogroup" aria-label="Status do serviço" className="flex gap-1 rounded-[14px] border border-border bg-background p-1">
      {segs.map((seg) => {
        const on = status === seg.key
        return (
          <button
            key={seg.key}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(seg.key)}
            className={cn(
              "pressable flex min-h-10 flex-1 items-center justify-center gap-1 rounded-[10px] px-1 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              on ? seg.sel : "text-faint hover:text-foreground",
            )}
          >
            {on && seg.key === "concluido" && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
