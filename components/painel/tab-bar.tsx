"use client"

import { useState } from "react"
import { BadgeDollarSign, ChartColumn, ChevronRight, FileText, Fuel, Map, Plus, Radar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIndex, useProject, useRefresh, useVehicles } from "@/lib/hooks"
import { isProjectComplete } from "@/lib/calculations"
import { fmtHa } from "@/lib/format"
import { useNav, type Screen } from "./nav-context"
import { ModalSheet } from "./modal-sheet"
import { ExpenseModal, ParteModal } from "./modals"

// Telas de primeiro nivel: ficam com a barra de abas embaixo
export const TAB_SCREENS: Screen[] = ["home", "investments", "commission", "proposals"]

export function TabBar() {
  const { screen, goHome, goInvestments, goCommission, goProposals } = useNav()
  const [launching, setLaunching] = useState(false)

  const tabs = [
    { key: "home", label: "Campo", icon: Map, go: goHome },
    { key: "investments", label: "Dinheiro", icon: ChartColumn, go: goInvestments },
    { key: "commission", label: "Comissão", icon: BadgeDollarSign, go: goCommission },
    { key: "proposals", label: "Propostas", icon: FileText, go: goProposals },
  ] as const

  const tab = (t: (typeof tabs)[number]) => {
    const Icon = t.icon
    const on = screen === t.key
    return (
      <button
        key={t.key}
        onClick={t.go}
        aria-current={on ? "page" : undefined}
        className={cn(
          "pressable flex flex-col items-center justify-center gap-1 pt-2 text-[11px] font-semibold",
          on ? "text-foreground" : "text-faint hover:text-muted-foreground",
        )}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.1 : 1.8} />
        {t.label}
      </button>
    )
  }

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-[480px] grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] lg:bottom-6 lg:rounded-b-3xl"
        style={{ height: "var(--tabbar)" }}
      >
        {tab(tabs[0])}
        {tab(tabs[1])}
        <button onClick={() => setLaunching(true)} className="pressable flex flex-col items-center justify-start gap-1 text-[11px] font-semibold text-foreground">
          <span className="-mt-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
            <Plus className="h-6 w-6" strokeWidth={2.4} />
          </span>
          Lançar
        </button>
        {tab(tabs[2])}
        {tab(tabs[3])}
      </nav>
      {launching && <LaunchFlow onClose={() => setLaunching(false)} />}
    </>
  )
}

// Atalho de lancamento: escolhe o projeto, depois a matricula (area voada) ou o gasto.
function LaunchFlow({ onClose }: { onClose: () => void }) {
  const { index } = useIndex()
  const refresh = useRefresh()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [kind, setKind] = useState<"area" | "gasto" | null>(null)
  const [talhaoId, setTalhaoId] = useState<string | null>(null)
  const { project } = useProject(projectId)
  const { vehicles } = useVehicles()

  // Em campo primeiro: e quase sempre ali que o lancamento vai
  const ordered = index.slice().sort((a, b) => {
    const da = isProjectComplete(Number(a.mappedHectares || 0), Number(a.totalHectares || 0)) ? 1 : 0
    const db = isProjectComplete(Number(b.mappedHectares || 0), Number(b.totalHectares || 0)) ? 1 : 0
    return da - db
  })

  const saved = () => refresh()

  if (project && kind === "gasto") return <ExpenseModal project={project} vehicles={vehicles} onClose={onClose} onSaved={saved} />
  if (project && kind === "area" && talhaoId) return <ParteModal project={project} talhaoId={talhaoId} onClose={onClose} onSaved={saved} />

  if (project && kind === "area") {
    return (
      <ModalSheet title="Qual matrícula voou?" onClose={onClose}>
        <p className="-mt-3 mb-4 text-[13px] text-muted-foreground">{project.clientName}{project.fazenda ? ` · ${project.fazenda}` : ""}</p>
        {project.talhoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esse projeto ainda não tem matrículas. Abra o projeto e crie a primeira.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {project.talhoes.map((t) => (
              <li key={t.id}>
                <button onClick={() => setTalhaoId(t.id)} className="pressable flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-raised">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{t.name}</span>
                    {t.identifier && <span className="block truncate text-[13px] text-muted-foreground">{t.identifier}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[13px] text-faint">
                    {t.targetHectares ? <span className="num">{fmtHa(t.targetHectares)} ha</span> : null}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ModalSheet>
    )
  }

  if (projectId) {
    return (
      <ModalSheet title="O que lançar?" onClose={onClose}>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setKind("area")} className="pressable flex flex-col items-start gap-3 rounded-[18px] border border-border bg-card p-4 text-left hover:border-foreground/20">
            <Radar className="h-6 w-6 text-primary" />
            <span><span className="block text-[15px] font-bold">Área voada</span><span className="text-[13px] text-muted-foreground">Hectares do dia</span></span>
          </button>
          <button onClick={() => setKind("gasto")} className="pressable flex flex-col items-start gap-3 rounded-[18px] border border-border bg-card p-4 text-left hover:border-foreground/20">
            <Fuel className="h-6 w-6 text-muted-foreground" />
            <span><span className="block text-[15px] font-bold">Gasto</span><span className="text-[13px] text-muted-foreground">Combustível e outros</span></span>
          </button>
        </div>
        {!project && <p className="mt-3 text-[13px] text-faint">Carregando o projeto…</p>}
      </ModalSheet>
    )
  }

  return (
    <ModalSheet title="Lançar em qual projeto?" onClose={onClose}>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum projeto ainda. Crie um projeto na tela Campo.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          {ordered.map((p) => {
            const done = isProjectComplete(Number(p.mappedHectares || 0), Number(p.totalHectares || 0))
            return (
              <li key={p.id}>
                <button onClick={() => setProjectId(p.id)} className="pressable flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-raised">
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[15px] font-semibold", done && "text-muted-foreground")}>{p.clientName}</span>
                    {p.fazenda && <span className="block truncate text-[13px] text-muted-foreground">{p.fazenda}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[13px] text-faint">
                    {done ? "fechado" : <span className="num text-primary">{fmtHa(Math.max(0, Number(p.totalHectares || 0) - Number(p.mappedHectares || 0)))} ha</span>}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </ModalSheet>
  )
}
