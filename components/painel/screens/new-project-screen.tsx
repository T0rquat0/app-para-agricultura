"use client"

import { useState } from "react"
import { useNav } from "../nav-context"
import { useRefresh } from "@/lib/hooks"
import { createProject as storeProject } from "@/lib/storage"
import { genId } from "@/lib/format"
import type { Project } from "@/lib/types"
import { TopBar } from "../chrome"
import { Field, NumberInput, TextInput } from "../fields"
import { PrimaryButton } from "../buttons"
import { FormAlert } from "../modals"

export function NewProjectScreen() {
  const { goHome, openProject } = useNav()
  const refresh = useRefresh()
  const [clientName, setClientName] = useState("")
  const [fazenda, setFazenda] = useState("")
  const [total, setTotal] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function createProject() {
    const name = clientName.trim()
    const totalHectares = parseFloat(total)
    if (!name) {
      setError("Informe o nome do cliente.")
      return
    }
    if (!totalHectares || totalHectares <= 0) {
      setError("Informe a área total em hectares.")
      return
    }
    setError(null)
    setSaving(true)
    const p: Project = {
      id: genId("p"),
      clientName: name,
      fazenda: fazenda.trim(),
      totalHectares,
      areas: [],
      expenses: [],
      talhoes: [],
      services: [
        { id: genId("s"), name: "Levantamento Altimétrico", status: "andamento", billingType: "hectare", rate: 0, quantity: null },
      ],
      createdAt: new Date().toISOString(),
    }
    try {
      await storeProject(p)
      refresh()
      openProject(p.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Novo projeto" subtitle="Cliente e área contratada" onBack={goHome} />
      <form
        className="flex-1 px-4 pb-10 pt-4"
        onSubmit={(e) => {
          e.preventDefault()
          createProject()
        }}
      >
        <Field label="Nome do cliente">
          <TextInput
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex.: João Tvanilda"
            autoComplete="off"
            autoFocus
          />
        </Field>
        <Field label="Fazenda ou local (opcional)">
          <TextInput value={fazenda} onChange={(e) => setFazenda(e.target.value)} placeholder="Ex.: Fazenda Ipoeira" />
        </Field>
        <Field label="Área total contratada (ha)" hint="Pode ajustar depois, em Editar projeto.">
          <NumberInput value={total} onChange={(e) => setTotal(e.target.value)} type="number" placeholder="Ex.: 6500" />
        </Field>

        <FormAlert tone="info" className="mt-6">
          O valor cobrado se define depois, na aba Serviços. Cada serviço tem sua forma de cobrança: por hectare, por
          metro ou pacote fechado.
        </FormAlert>

        {error && <FormAlert>{error}</FormAlert>}
        <PrimaryButton type="submit" className="w-full" disabled={saving}>
          {saving ? "Criando…" : "Criar projeto"}
        </PrimaryButton>
      </form>
    </div>
  )
}
