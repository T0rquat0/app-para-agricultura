"use client"

import { useState } from "react"
import { useNav } from "../nav-context"
import { useRefresh } from "@/lib/hooks"
import { saveProject } from "@/lib/storage"
import { genId } from "@/lib/format"
import type { Project } from "@/lib/types"
import { TopBar } from "../chrome"
import { Field, Hint, TextInput } from "../fields"
import { PrimaryButton } from "../buttons"

export function NewProjectScreen() {
  const { goHome, openProject } = useNav()
  const refresh = useRefresh()
  const [clientName, setClientName] = useState("")
  const [fazenda, setFazenda] = useState("")
  const [total, setTotal] = useState("")

  async function createProject() {
    const name = clientName.trim()
    const totalHectares = parseFloat(total)
    if (!name) {
      alert("Informe o nome do cliente.")
      return
    }
    if (!totalHectares || totalHectares <= 0) {
      alert("Informe a área total em hectares.")
      return
    }
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
    await saveProject(p)
    refresh()
    openProject(p.id)
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Novo projeto" onBack={goHome} showDarkToggle={false} />
      <div className="flex-1 px-5 pb-10 pt-6">
        <Field label="Nome do cliente">
          <TextInput
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: João Tvanilda"
            autoFocus
          />
        </Field>
        <Field label="Fazenda / local (opcional)">
          <TextInput value={fazenda} onChange={(e) => setFazenda(e.target.value)} placeholder="Ex: Fazenda Ipoeira" />
        </Field>
        <Field label="Área total contratada (hectares)" hint="Pode ajustar depois se precisar.">
          <TextInput
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            type="number"
            inputMode="decimal"
            placeholder="Ex: 6500"
          />
        </Field>
        <Hint className="-mt-1 mb-4">
          O valor cobrado é configurado depois, na aba Serviços — cada serviço pode ter sua própria forma de cobrança
          (por hectare, por metro ou pacote fechado).
        </Hint>
        <PrimaryButton className="mt-2 w-full" onClick={createProject}>
          Criar projeto
        </PrimaryButton>
      </div>
    </div>
  )
}
