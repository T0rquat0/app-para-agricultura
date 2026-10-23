"use client"

import { useState, type ReactNode } from "react"
import { Trash2 } from "lucide-react"
import { CATEGORIES, FUEL_CATEGORY, SERVICE_PRESETS } from "@/lib/constants"
import { genId, todayISO, fmtHa } from "@/lib/format"
import { isAltimetricName, mappedHa, talhaoFlown } from "@/lib/calculations"
import { addArea, addExpense, addService, addTalhao, addVehicle, updateArea, updateProject, updateService, updateTalhao } from "@/lib/storage"
import type { Area, BillingType, Project, Service, Talhao } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ModalSheet } from "./modal-sheet"
import { Field, Hint, NumberInput, Select, TextInput } from "./fields"
import { PrimaryButton, GhostButton } from "./buttons"

type AfterSave = () => void

// ---- Pecas pequenas das folhas (usadas tambem nas telas de comissao, dinheiro e propostas) ----

// Caixa de aviso acima do botao: erro (perigo), aviso (ambar) ou nota neutra.
export function FormAlert({
  tone = "danger",
  children,
  className,
}: {
  tone?: "danger" | "warning" | "info"
  children: ReactNode
  className?: string
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "mb-4 rounded-[14px] border px-3.5 py-3 text-[14px] leading-snug",
        tone === "danger" && "border-destructive/30 bg-destructive/10 font-semibold text-destructive",
        tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
        tone === "info" && "border-border bg-card text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  )
}

// Rodape padrao da folha: acao principal cheia e "Cancelar" fantasma logo abaixo.
export function SheetActions({
  label,
  onConfirm,
  onCancel,
  cancelLabel = "Cancelar",
  disabled,
}: {
  label: ReactNode
  onConfirm: () => void
  onCancel: () => void
  cancelLabel?: string
  disabled?: boolean
}) {
  return (
    <div className="mt-2">
      <PrimaryButton className="w-full" onClick={onConfirm} disabled={disabled}>
        {label}
      </PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onCancel}>
        {cancelLabel}
      </GhostButton>
    </div>
  )
}

// Confirmacao de exclusao numa folha (no lugar do confirm() do navegador).
export function ConfirmDeleteSheet({
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <ModalSheet title={title} onClose={onClose}>
      <p className="mb-5 text-[15px] leading-relaxed text-muted-foreground text-pretty">{children}</p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onConfirm()
          } finally {
            setBusy(false)
          }
        }}
        className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-destructive text-[15px] font-bold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover disabled:opacity-45"
      >
        <Trash2 className="h-[18px] w-[18px]" /> {confirmLabel}
      </button>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>
        Cancelar
      </GhostButton>
    </ModalSheet>
  )
}

// Controle segmentado (escolha entre 2 a 4 opcoes curtas)
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[14px] border border-border bg-card p-1">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "pressable min-h-10 flex-1 rounded-[10px] px-2 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              on ? "bg-raised text-foreground" : "text-faint hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Resumo da matricula no topo das folhas de parte voada
function TalhaoSummary({ talhao, items }: { talhao: Talhao; items: { label: string; value: string; good?: boolean }[] }) {
  return (
    <div className="mb-5 rounded-[18px] border border-border bg-card px-4 py-3">
      <p className="truncate text-[15px] font-bold">
        {talhao.name}
        {talhao.identifier ? <span className="font-normal text-muted-foreground"> · {talhao.identifier}</span> : null}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.label}>
            <div className="text-[13px] text-muted-foreground">{it.label}</div>
            <div className={cn("num text-[17px] font-bold leading-tight", it.good && "text-positive")}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Nova matrícula (talhão) ----
export function TalhaoModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: AfterSave }) {
  const [name, setName] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [target, setTarget] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!name.trim()) {
      setError("Dê um nome à matrícula (ex.: Floresta, Ipoeira, Vanilda).")
      return
    }
    const t = parseFloat(target)
    await addTalhao(project.id, {
      id: genId("t"),
      name: name.trim(),
      identifier: identifier.trim(),
      targetHectares: isNaN(t) ? null : t,
      createdAt: new Date().toISOString(),
    })
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Nova matrícula" onClose={onClose}>
      <Field label="Nome">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Floresta" autoFocus />
      </Field>
      <Field
        label="Identificador (opcional)"
        hint="Útil quando o cliente repete o mesmo nome em várias matrículas."
      >
        <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex.: Estrada, Centro, Matrícula 04" />
      </Field>
      <Field label="Tamanho previsto em ha (opcional)">
        <NumberInput value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder="Ex.: 1000" />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SheetActions label="Criar matrícula" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}

// ---- Editar matrícula (talhão) ----
export function EditTalhaoModal({
  project,
  talhao,
  onClose,
  onSaved,
}: {
  project: Project
  talhao: Talhao
  onClose: () => void
  onSaved: AfterSave
}) {
  const [name, setName] = useState(talhao.name)
  const [identifier, setIdentifier] = useState(talhao.identifier || "")
  const [target, setTarget] = useState(talhao.targetHectares != null ? String(talhao.targetHectares) : "")
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!name.trim()) {
      setError("Dê um nome à matrícula.")
      return
    }
    const t = parseFloat(target)
    await updateTalhao(project.id, {
      ...talhao,
      name: name.trim(),
      identifier: identifier.trim(),
      targetHectares: isNaN(t) ? null : t,
    })
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Editar matrícula" onClose={onClose}>
      <Field label="Nome">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Floresta" autoFocus />
      </Field>
      <Field label="Identificador (opcional)">
        <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex.: Estrada, Centro, Matrícula 04" />
      </Field>
      <Field label="Tamanho previsto em ha">
        <NumberInput value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder="Ex.: 1000" />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SheetActions label="Salvar alterações" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}

// ---- Parte voada ----
export function ParteModal({
  project,
  talhaoId,
  onClose,
  onSaved,
}: {
  project: Project
  talhaoId: string
  onClose: () => void
  onSaved: AfterSave
}) {
  const [ha, setHa] = useState("")
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const talhao = (project.talhoes || []).find((t) => t.id === talhaoId)
  const target = Number(talhao?.targetHectares || 0)
  const alreadyFlown = talhaoFlown(project, talhaoId)
  const remaining = target > 0 ? Math.max(0, target - alreadyFlown) : null

  async function confirm() {
    const h = parseFloat(ha)
    if (!h || h <= 0) {
      setError("Informe os hectares dessa parte.")
      return
    }
    await addArea(project.id, { id: genId("a"), talhaoId, hectares: h, date: date || todayISO(), note: note.trim() })
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Adicionar parte voada" onClose={onClose}>
      {talhao && (
        <TalhaoSummary
          talhao={talhao}
          items={
            target > 0
              ? [
                  { label: "Já voado", value: `${fmtHa(alreadyFlown)} ha` },
                  {
                    label: "Falta",
                    value: remaining === 0 ? "Completa" : `${fmtHa(remaining!)} ha`,
                    good: remaining === 0,
                  },
                ]
              : [{ label: "Voado até agora", value: `${fmtHa(alreadyFlown)} ha` }]
          }
        />
      )}

      <Field label="Hectares voados" hint={remaining != null && remaining > 0 ? `Máximo sugerido: ${fmtHa(remaining)} ha` : undefined}>
        <NumberInput
          value={ha}
          onChange={(e) => setHa(e.target.value)}
          type="number"
          placeholder={remaining != null ? `Ex.: ${fmtHa(remaining)}` : "Ex.: 252.0"}
          autoFocus
        />
      </Field>
      <Field label="Data">
        <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" className="num" />
      </Field>
      <Field label="Observação (opcional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: lado esquerdo, manhã" />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SheetActions label="Salvar parte" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}

// ---- Editar parte voada ----
export function EditParteModal({
  project,
  area,
  onClose,
  onSaved,
}: {
  project: Project
  area: Area
  onClose: () => void
  onSaved: AfterSave
}) {
  const [ha, setHa] = useState(String(area.hectares))
  const [date, setDate] = useState(area.date || todayISO())
  const [note, setNote] = useState(area.note || "")
  const [error, setError] = useState<string | null>(null)

  const talhao = (project.talhoes || []).find((t) => t.id === area.talhaoId)
  const target = Number(talhao?.targetHectares || 0)
  const alreadyFlown = talhaoFlown(project, area.talhaoId) - area.hectares // sem contar esta parte
  const remaining = target > 0 ? Math.max(0, target - alreadyFlown) : null

  async function confirm() {
    const h = parseFloat(ha)
    if (!h || h <= 0) {
      setError("Informe os hectares dessa parte.")
      return
    }
    await updateArea(project.id, { ...area, hectares: h, date: date || todayISO(), note: note.trim() })
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Editar parte voada" onClose={onClose}>
      {talhao && (
        <TalhaoSummary
          talhao={talhao}
          items={
            target > 0
              ? [
                  { label: "Meta", value: `${fmtHa(target)} ha` },
                  { label: "Disponível sem esta parte", value: `${fmtHa(remaining!)} ha` },
                ]
              : [{ label: "Voado sem esta parte", value: `${fmtHa(Math.max(0, alreadyFlown))} ha` }]
          }
        />
      )}

      <Field label="Hectares voados" hint={remaining != null ? `Máximo sugerido: ${fmtHa(remaining)} ha` : undefined}>
        <NumberInput value={ha} onChange={(e) => setHa(e.target.value)} type="number" autoFocus />
      </Field>
      <Field label="Data">
        <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" className="num" />
      </Field>
      <Field label="Observação (opcional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: lado esquerdo, manhã" />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SheetActions label="Salvar alterações" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}

// ---- Gasto ----
export function ExpenseModal({
  project,
  vehicles,
  onClose,
  onSaved,
}: {
  project: Project
  vehicles: string[]
  onClose: () => void
  onSaved: AfterSave
}) {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [custom, setCustom] = useState("")
  const [vehicle, setVehicle] = useState("")
  const [newVehicle, setNewVehicle] = useState("")
  const [description, setDescription] = useState("")
  const [value, setValue] = useState("")
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState<string | null>(null)

  const isFuel = category === FUEL_CATEGORY
  const isOther = category === "Outros"

  async function confirm() {
    let cat = category
    if (isOther && custom.trim()) cat = custom.trim()
    let veh = ""
    if (cat === FUEL_CATEGORY) {
      if (!vehicle) {
        setError("Selecione o veículo.")
        return
      }
      if (vehicle === "__new__") {
        veh = newVehicle.trim()
        if (!veh) {
          setError("Informe o nome do veículo.")
          return
        }
        await addVehicle(veh)
      } else {
        veh = vehicle
      }
    }
    const v = parseFloat(value)
    if (!v || v <= 0) {
      setError("Informe o valor do gasto.")
      return
    }
    await addExpense(project.id, {
      id: genId("e"),
      category: cat,
      vehicle: veh,
      description: description.trim(),
      value: v,
      date: date || todayISO(),
    })
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Adicionar gasto" onClose={onClose}>
      <Field label="Categoria">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </Field>
      {isOther && (
        <Field label="Qual categoria">
          <TextInput value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex.: Pedágio" />
        </Field>
      )}
      {isFuel && (
        <Field label="Veículo ou equipamento">
          <Select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
            <option value="" disabled>Selecionar veículo…</option>
            {vehicles.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
            <option value="__new__">Novo veículo…</option>
          </Select>
        </Field>
      )}
      {isFuel && vehicle === "__new__" && (
        <Field label="Nome do novo veículo">
          <TextInput value={newVehicle} onChange={(e) => setNewVehicle(e.target.value)} placeholder="Ex.: L200, caminhonete" />
        </Field>
      )}
      <Field label="Descrição">
        <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: diesel para deslocamento" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <NumberInput value={value} onChange={(e) => setValue(e.target.value)} type="number" placeholder="350.00" />
        </Field>
        <Field label="Data">
          <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" className="num" />
        </Field>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <SheetActions label="Salvar gasto" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}

// ---- Serviço ----
export function ServiceModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: AfterSave }) {
  const already = (project.services || []).map((s) => s.name.trim().toLowerCase())
  const available = SERVICE_PRESETS.filter((s) => !already.includes(s.trim().toLowerCase()))
  const [selected, setSelected] = useState(available[0] || "__custom__")
  const [custom, setCustom] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    const name = selected !== "__custom__" ? selected : custom.trim()
    if (!name) {
      setError("Escolha ou digite um serviço.")
      return
    }
    const defaultType: BillingType = name.trim().toLowerCase().includes("drenagem") ? "metro" : "hectare"
    await addService(project.id, { id: genId("s"), name, status: "pendente", billingType: defaultType, rate: 0, quantity: null })
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Adicionar serviço" onClose={onClose}>
      {available.length > 0 ? (
        <Field label="Tipo de serviço" hint="O preço você define depois, tocando no serviço.">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {available.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="__custom__">Outro (digitar)</option>
          </Select>
        </Field>
      ) : (
        <Hint className="mb-4">Todos os serviços padrão já estão no projeto. Digite um personalizado abaixo.</Hint>
      )}
      {(selected === "__custom__" || available.length === 0) && (
        <Field label="Nome do serviço">
          <TextInput value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex.: Mapa de solo" autoFocus />
        </Field>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <SheetActions label="Adicionar serviço" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}

// ---- Precificação de serviço ----
export function ServicePricingModal({
  project,
  service,
  onClose,
  onSaved,
}: {
  project: Project
  service: Service
  onClose: () => void
  onSaved: AfterSave
}) {
  const isAlt = isAltimetricName(service.name)
  const [type, setType] = useState<BillingType>(service.billingType || "hectare")
  const [rateHa, setRateHa] = useState(service.billingType === "hectare" && service.rate ? String(service.rate) : "")
  const [qtyHa, setQtyHa] = useState(service.quantity != null ? String(service.quantity) : String(project.totalHectares || ""))
  const [rateM, setRateM] = useState(service.billingType === "metro" && service.rate ? String(service.rate) : "")
  const [qtyM, setQtyM] = useState(service.billingType === "metro" && service.quantity != null ? String(service.quantity) : "")
  const [rateFixo, setRateFixo] = useState(service.billingType === "fixo" && service.rate ? String(service.rate) : "")

  async function confirm() {
    // Copia: antes o servico era alterado direto no objeto em cache das telas.
    const s: Service = { ...service }
    s.billingType = type
    if (type === "hectare") {
      s.rate = parseFloat(rateHa) || 0
      if (isAltimetricName(s.name)) {
        s.quantity = null
      } else {
        const q = parseFloat(qtyHa)
        s.quantity = isNaN(q) ? null : q
      }
    } else if (type === "metro") {
      s.rate = parseFloat(rateM) || 0
      const q = parseFloat(qtyM)
      s.quantity = isNaN(q) ? null : q
    } else {
      s.rate = parseFloat(rateFixo) || 0
      s.quantity = null
    }
    await updateService(project.id, s)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title={service.name} onClose={onClose}>
      <Field label="Como cobrar">
        <Segmented<BillingType>
          label="Tipo de cobrança"
          value={type}
          onChange={setType}
          options={[
            { value: "hectare", label: "Por hectare" },
            { value: "metro", label: "Por metro" },
            { value: "fixo", label: "Pacote" },
          ]}
        />
      </Field>
      {type === "hectare" && (
        <>
          <Field
            label="Valor por hectare (R$)"
            hint={
              isAlt ? (
                <>
                  Multiplica pelos hectares já mapeados neste projeto (
                  <span className="num">{fmtHa(mappedHa(project))} ha</span> agora) e se atualiza a cada área lançada.
                </>
              ) : undefined
            }
          >
            <NumberInput value={rateHa} onChange={(e) => setRateHa(e.target.value)} type="number" placeholder="Ex.: 18.00" autoFocus />
          </Field>
          {!isAlt && (
            <Field label="Hectares considerados">
              <NumberInput value={qtyHa} onChange={(e) => setQtyHa(e.target.value)} type="number" placeholder={`Ex.: ${project.totalHectares || 6500}`} />
            </Field>
          )}
        </>
      )}
      {type === "metro" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor por metro (R$)">
            <NumberInput value={rateM} onChange={(e) => setRateM(e.target.value)} type="number" placeholder="4.50" autoFocus />
          </Field>
          <Field label="Extensão (m)">
            <NumberInput value={qtyM} onChange={(e) => setQtyM(e.target.value)} type="number" placeholder="2000" />
          </Field>
        </div>
      )}
      {type === "fixo" && (
        <Field label="Valor total do pacote (R$)">
          <NumberInput value={rateFixo} onChange={(e) => setRateFixo(e.target.value)} type="number" placeholder="Ex.: 12000" autoFocus />
        </Field>
      )}
      <SheetActions label="Salvar preço" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}

// ---- Editar dados do projeto ----
export function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project
  onClose: () => void
  onSaved: () => void
}) {
  const [clientName, setClientName] = useState(project.clientName)
  const [fazenda, setFazenda] = useState(project.fazenda || "")
  const [total, setTotal] = useState(project.totalHectares ? String(project.totalHectares) : "")
  const [commissionRate, setCommissionRate] = useState(project.commissionRate ? String(project.commissionRate) : "")
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    const name = clientName.trim()
    if (!name) {
      setError("Informe o nome do cliente.")
      return
    }
    const t = parseFloat(total)
    if (!t || t <= 0) {
      setError("Informe a área total em hectares.")
      return
    }
    const cr = parseFloat(commissionRate)
    await updateProject(project.id, {
      clientName: name,
      fazenda: fazenda.trim(),
      totalHectares: t,
      commissionRate: isNaN(cr) ? undefined : cr,
    })
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Editar projeto" onClose={onClose}>
      <Field label="Nome do cliente">
        <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex.: Fábio Fukuda" autoFocus />
      </Field>
      <Field label="Fazenda ou local (opcional)">
        <TextInput value={fazenda} onChange={(e) => setFazenda(e.target.value)} placeholder="Ex.: Fazenda Ipoeira" />
      </Field>
      <Field label="Área total contratada (ha)">
        <NumberInput value={total} onChange={(e) => setTotal(e.target.value)} type="number" placeholder="Ex.: 6500" />
      </Field>
      <Field
        label="Comissão por hectare (R$, opcional)"
        hint='Em branco, usa o valor do serviço "Levantamento Altimétrico" (aba Serviços). Preencha só se a comissão for diferente do valor faturado.'
      >
        <NumberInput value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} type="number" placeholder="Ex.: 20.00" />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SheetActions label="Salvar alterações" onConfirm={confirm} onCancel={onClose} />
    </ModalSheet>
  )
}
