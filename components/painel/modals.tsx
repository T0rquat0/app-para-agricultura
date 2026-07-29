"use client"

import { useState } from "react"
import { CATEGORIES, FUEL_CATEGORY, SERVICE_PRESETS } from "@/lib/constants"
import { genId, todayISO, fmtHa } from "@/lib/format"
import { isAltimetricName, mappedHa, talhaoFlown } from "@/lib/calculations"
import { addVehicle, saveProject } from "@/lib/storage"
import type { Area, BillingType, Project, Service, Talhao } from "@/lib/types"
import { ModalSheet } from "./modal-sheet"
import { Field, Hint, Select, TextInput } from "./fields"
import { PrimaryButton, GhostButton } from "./buttons"

type AfterSave = () => void

// ---- Novo talhão ----
export function TalhaoModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: AfterSave }) {
  const [name, setName] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [target, setTarget] = useState("")

  async function confirm() {
    if (!name.trim()) {
      alert("Dê um nome ao talhão (ex: Floresta, Ipoeira, Vanilda).")
      return
    }
    const t = parseFloat(target)
    const p = { ...project }
    p.talhoes = [
      ...(p.talhoes || []),
      { id: genId("t"), name: name.trim(), identifier: identifier.trim(), targetHectares: isNaN(t) ? null : t, createdAt: new Date().toISOString() },
    ]
    await saveProject(p)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Novo talhão" onClose={onClose}>
      <Field label="Nome (matrícula)">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Floresta" autoFocus />
      </Field>
      <Field
        label="Identificador (opcional)"
        hint="Use isso quando o cliente repete o mesmo nome em várias matrículas — assim cada talhão fica fácil de identificar."
      >
        <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex: Estrada, Centro, Matrícula 04" />
      </Field>
      <Field label="Tamanho previsto (hectares, opcional)">
        <TextInput value={target} onChange={(e) => setTarget(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 1000" />
      </Field>
      <PrimaryButton className="w-full" onClick={confirm}>
        Criar talhão
      </PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>
        Cancelar
      </GhostButton>
    </ModalSheet>
  )
}

// ---- Editar talhão ----
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

  async function confirm() {
    if (!name.trim()) {
      alert("Dê um nome ao talhão.")
      return
    }
    const t = parseFloat(target)
    const p = { ...project }
    p.talhoes = (p.talhoes || []).map((x) =>
      x.id === talhao.id
        ? { ...x, name: name.trim(), identifier: identifier.trim(), targetHectares: isNaN(t) ? null : t }
        : x
    )
    await saveProject(p)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Editar talhão" onClose={onClose}>
      <Field label="Nome (matrícula)">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Floresta" autoFocus />
      </Field>
      <Field label="Identificador (opcional)">
        <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex: Estrada, Centro, Matrícula 04" />
      </Field>
      <Field label="Tamanho previsto (hectares)">
        <TextInput value={target} onChange={(e) => setTarget(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 1000" />
      </Field>
      <PrimaryButton className="w-full" onClick={confirm}>
        Salvar alterações
      </PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>
        Cancelar
      </GhostButton>
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

  const talhao = (project.talhoes || []).find((t) => t.id === talhaoId)
  const target = Number(talhao?.targetHectares || 0)
  const alreadyFlown = talhaoFlown(project, talhaoId)
  const remaining = target > 0 ? Math.max(0, target - alreadyFlown) : null

  async function confirm() {
    const h = parseFloat(ha)
    if (!h || h <= 0) {
      alert("Informe os hectares dessa parte.")
      return
    }
    const p = { ...project }
    p.areas = [...(p.areas || []), { id: genId("a"), talhaoId, hectares: h, date: date || todayISO(), note: note.trim() }]
    await saveProject(p)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Adicionar parte voada" onClose={onClose}>
      {/* Resumo do talhão */}
      {talhao && (
        <div className="mb-4 rounded-2xl bg-secondary/50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Talhão: {talhao.name}{talhao.identifier ? ` · ${talhao.identifier}` : ""}
          </p>
          {target > 0 ? (
            <div className="mt-1.5 flex items-baseline gap-3">
              <span className="text-[13px] text-muted-foreground">
                Já voados: <span className="font-bold text-foreground">{fmtHa(alreadyFlown)} ha</span>
              </span>
              <span className="text-[13px] text-muted-foreground">
                Restam: <span className={`font-bold ${remaining === 0 ? "text-primary" : "text-foreground"}`}>
                  {remaining === 0 ? "completo ✓" : `${fmtHa(remaining!)} ha`}
                </span>
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Voados até agora: <span className="font-bold text-foreground">{fmtHa(alreadyFlown)} ha</span>
            </p>
          )}
        </div>
      )}

      <Field label={remaining != null ? `Hectares (máx. sugerido: ${fmtHa(remaining)} ha)` : "Hectares"}>
        <TextInput
          value={ha}
          onChange={(e) => setHa(e.target.value)}
          type="number"
          inputMode="decimal"
          placeholder={remaining != null ? `Ex: ${fmtHa(remaining)}` : "Ex: 252.0"}
          autoFocus
        />
      </Field>
      <Field label="Data">
        <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" />
      </Field>
      <Field label="Observação (opcional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: lado esquerdo, manhã" />
      </Field>
      <PrimaryButton className="w-full" onClick={confirm}>
        Salvar parte
      </PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>
        Cancelar
      </GhostButton>
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

  const talhao = (project.talhoes || []).find((t) => t.id === area.talhaoId)
  const target = Number(talhao?.targetHectares || 0)
  const alreadyFlown = talhaoFlown(project, area.talhaoId) - area.hectares // sem contar esta parte
  const remaining = target > 0 ? Math.max(0, target - alreadyFlown) : null

  async function confirm() {
    const h = parseFloat(ha)
    if (!h || h <= 0) {
      alert("Informe os hectares dessa parte.")
      return
    }
    const p = { ...project }
    p.areas = (p.areas || []).map((a) =>
      a.id === area.id ? { ...a, hectares: h, date: date || todayISO(), note: note.trim() } : a
    )
    await saveProject(p)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Editar parte voada" onClose={onClose}>
      {talhao && (
        <div className="mb-4 rounded-2xl bg-secondary/50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Talhão: {talhao.name}{talhao.identifier ? ` · ${talhao.identifier}` : ""}
          </p>
          {target > 0 && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Disponível (sem esta parte): <span className="font-bold text-foreground">{fmtHa(remaining!)} ha</span>
            </p>
          )}
        </div>
      )}

      <Field label={remaining != null ? `Hectares (máx. sugerido: ${fmtHa(remaining!)} ha)` : "Hectares"}>
        <TextInput value={ha} onChange={(e) => setHa(e.target.value)} type="number" inputMode="decimal" autoFocus />
      </Field>
      <Field label="Data">
        <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" />
      </Field>
      <Field label="Observação (opcional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: lado esquerdo, manhã" />
      </Field>
      <PrimaryButton className="w-full" onClick={confirm}>
        Salvar alterações
      </PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>
        Cancelar
      </GhostButton>
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

  const isFuel = category === FUEL_CATEGORY
  const isOther = category === "Outros"

  async function confirm() {
    let cat = category
    if (isOther && custom.trim()) cat = custom.trim()
    let veh = ""
    if (cat === FUEL_CATEGORY) {
      if (!vehicle) {
        alert("Selecione o veículo.")
        return
      }
      if (vehicle === "__new__") {
        veh = newVehicle.trim()
        if (!veh) {
          alert("Informe o nome do veículo.")
          return
        }
        await addVehicle(veh)
      } else {
        veh = vehicle
      }
    }
    const v = parseFloat(value)
    if (!v || v <= 0) {
      alert("Informe o valor do gasto.")
      return
    }
    const p = { ...project }
    p.expenses = [
      ...(p.expenses || []),
      { id: genId("e"), category: cat, vehicle: veh, description: description.trim(), value: v, date: date || todayISO() },
    ]
    await saveProject(p)
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
        <Field label="Descrever categoria">
          <TextInput value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex: Pedágio" />
        </Field>
      )}
      {isFuel && (
        <Field label="Veículo / equipamento">
          <Select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
            <option value="" disabled>Selecionar veículo…</option>
            {vehicles.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
            <option value="__new__">+ Novo veículo…</option>
          </Select>
        </Field>
      )}
      {isFuel && vehicle === "__new__" && (
        <Field label="Nome do novo veículo">
          <TextInput value={newVehicle} onChange={(e) => setNewVehicle(e.target.value)} placeholder="Ex: L200, Caminhonete" />
        </Field>
      )}
      <Field label="Descrição">
        <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Diesel para deslocamento" />
      </Field>
      <Field label="Valor (R$)">
        <TextInput value={value} onChange={(e) => setValue(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 350.00" />
      </Field>
      <Field label="Data">
        <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" />
      </Field>
      <PrimaryButton className="w-full" onClick={confirm}>Salvar gasto</PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>Cancelar</GhostButton>
    </ModalSheet>
  )
}

// ---- Serviço ----
export function ServiceModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: AfterSave }) {
  const already = (project.services || []).map((s) => s.name.trim().toLowerCase())
  const available = SERVICE_PRESETS.filter((s) => !already.includes(s.trim().toLowerCase()))
  const [selected, setSelected] = useState(available[0] || "__custom__")
  const [custom, setCustom] = useState("")

  async function confirm() {
    const name = selected !== "__custom__" ? selected : custom.trim()
    if (!name) {
      alert("Escolha ou digite um serviço.")
      return
    }
    const defaultType: BillingType = name.trim().toLowerCase().includes("drenagem") ? "metro" : "hectare"
    const p = { ...project }
    p.services = [...(p.services || []), { id: genId("s"), name, status: "pendente", billingType: defaultType, rate: 0, quantity: null }]
    await saveProject(p)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Adicionar serviço" onClose={onClose}>
      {available.length > 0 ? (
        <Field label="Tipo de serviço">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {available.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="__custom__">Outro (digitar)</option>
          </Select>
        </Field>
      ) : (
        <Hint className="mb-3.5">Todos os serviços padrão já foram adicionados — digite um personalizado abaixo.</Hint>
      )}
      {(selected === "__custom__" || available.length === 0) && (
        <Field label="Nome do serviço">
          <TextInput value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex: Mapa de solo" />
        </Field>
      )}
      <PrimaryButton className="w-full" onClick={confirm}>Adicionar</PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>Cancelar</GhostButton>
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
    const p = { ...project }
    const s = (p.services || []).find((x) => x.id === service.id)
    if (!s) return
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
    await saveProject(p)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title={`Precificação — ${service.name}`} onClose={onClose}>
      <Field label="Tipo de cobrança">
        <Select value={type} onChange={(e) => setType(e.target.value as BillingType)}>
          <option value="hectare">Por hectare</option>
          <option value="metro">Por metro</option>
          <option value="fixo">Valor fixo (pacote)</option>
        </Select>
      </Field>
      {type === "hectare" && (
        <>
          <Field label="Valor por hectare (R$)">
            <TextInput value={rateHa} onChange={(e) => setRateHa(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 18.00" />
          </Field>
          {isAlt ? (
            <Hint className="-mt-1 mb-3.5">
              Multiplica automaticamente pelos hectares já mapeados neste projeto ({fmtHa(mappedHa(project))} ha agora) —
              atualiza sozinho conforme você lança áreas.
            </Hint>
          ) : (
            <Field label="Hectares considerados">
              <TextInput value={qtyHa} onChange={(e) => setQtyHa(e.target.value)} type="number" inputMode="decimal" placeholder={`Ex: ${project.totalHectares || 6500}`} />
            </Field>
          )}
        </>
      )}
      {type === "metro" && (
        <>
          <Field label="Valor por metro (R$)">
            <TextInput value={rateM} onChange={(e) => setRateM(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 4.50" />
          </Field>
          <Field label="Extensão (metros)">
            <TextInput value={qtyM} onChange={(e) => setQtyM(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 2000" />
          </Field>
        </>
      )}
      {type === "fixo" && (
        <Field label="Valor total do pacote (R$)">
          <TextInput value={rateFixo} onChange={(e) => setRateFixo(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 12000" />
        </Field>
      )}
      <PrimaryButton className="w-full" onClick={confirm}>Salvar</PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>Cancelar</GhostButton>
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

  async function confirm() {
    const name = clientName.trim()
    if (!name) { alert("Informe o nome do cliente."); return }
    const t = parseFloat(total)
    if (!t || t <= 0) { alert("Informe a área total em hectares."); return }
    const cr = parseFloat(commissionRate)
    const p = { ...project, clientName: name, fazenda: fazenda.trim(), totalHectares: t, commissionRate: isNaN(cr) ? undefined : cr }
    await saveProject(p)
    onSaved()
    onClose()
  }

  return (
    <ModalSheet title="Editar projeto" onClose={onClose}>
      <Field label="Nome do cliente">
        <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex: Fábio Fukuda" autoFocus />
      </Field>
      <Field label="Fazenda / local (opcional)">
        <TextInput value={fazenda} onChange={(e) => setFazenda(e.target.value)} placeholder="Ex: Fazenda Ipoeira" />
      </Field>
      <Field label="Área total contratada (hectares)">
        <TextInput value={total} onChange={(e) => setTotal(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 6500" />
      </Field>
      <Field
        label="Valor de comissão por hectare (R$, opcional)"
        hint="Usado para puxar a comissão automaticamente a partir das áreas mapeadas deste cliente."
      >
        <TextInput value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} type="number" inputMode="decimal" placeholder="Ex: 20.00" />
      </Field>
      <PrimaryButton className="w-full" onClick={confirm}>Salvar alterações</PrimaryButton>
      <GhostButton className="mt-1.5 w-full" onClick={onClose}>Cancelar</GhostButton>
    </ModalSheet>
  )
}
