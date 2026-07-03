"use client"

import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { useNav, type Tab } from "../nav-context"
import { useProject, useRefresh } from "@/lib/hooks"
import { TopBar, SectionTitle } from "../chrome"
import { SecondaryButton } from "../buttons"
import { AreasTab } from "../tabs/areas-tab"
import { ServicesTab } from "../tabs/services-tab"
import { ExpensesTab } from "../tabs/expenses-tab"
import { TimelineTab } from "../tabs/timeline-tab"
import { EditProjectModal } from "../modals"

const TABS: { key: Tab; label: string }[] = [
  { key: "areas", label: "Áreas" },
  { key: "services", label: "Serviços" },
  { key: "expenses", label: "Gastos" },
  { key: "timeline", label: "Histórico" },
]

export function ProjectScreen() {
  const { currentProjectId, activeTab, setTab, goHome, goReport } = useNav()
  const { project, isLoading } = useProject(currentProjectId)
  const refresh = useRefresh()
  const [editingProject, setEditingProject] = useState(false)

  useEffect(() => {
    if (!isLoading && !project) goHome()
  }, [isLoading, project, goHome])

  if (!project) {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar title="Carregando…" onBack={goHome} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative">
        <TopBar title={project.clientName} subtitle={project.fazenda || undefined} onBack={goHome} />
        <button
          onClick={() => setEditingProject(true)}
          aria-label="Editar projeto"
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 px-4 pb-10 pt-5">
        {/* Seletor de abas */}
        <div className="mb-5 flex gap-1 rounded-2xl bg-muted p-1 ring-1 ring-border/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl py-2 text-[12.5px] font-bold transition-all ${
                activeTab === t.key
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "areas" && <AreasTab project={project} />}
        {activeTab === "services" && <ServicesTab project={project} />}
        {activeTab === "expenses" && <ExpensesTab project={project} />}
        {activeTab === "timeline" && <TimelineTab project={project} />}

        <SectionTitle className="mt-6">Relatórios</SectionTitle>
        <div className="space-y-2.5">
          <SecondaryButton className="w-full" onClick={() => goReport("reportClient")}>
            <span>📄</span> Relatório de progresso (cliente)
          </SecondaryButton>
          <SecondaryButton className="w-full" onClick={() => goReport("reportExpenses")}>
            <span>🧾</span> Relatório de gastos (interno)
          </SecondaryButton>
        </div>
      </div>

      {editingProject && (
        <EditProjectModal
          project={project}
          onClose={() => setEditingProject(false)}
          onSaved={() => { setEditingProject(false); refresh() }}
        />
      )}
    </div>
  )
}
