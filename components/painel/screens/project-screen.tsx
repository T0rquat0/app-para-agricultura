"use client"

import { useEffect } from "react"
import { FileText, Wallet } from "lucide-react"
import { useNav, type Tab } from "../nav-context"
import { useProject } from "@/lib/hooks"
import { TopBar, SectionTitle } from "../chrome"
import { SecondaryButton } from "../buttons"
import { AreasTab } from "../tabs/areas-tab"
import { ServicesTab } from "../tabs/services-tab"
import { ExpensesTab } from "../tabs/expenses-tab"
import { TimelineTab } from "../tabs/timeline-tab"

const TABS: { key: Tab; label: string }[] = [
  { key: "areas", label: "Áreas" },
  { key: "services", label: "Serviços" },
  { key: "expenses", label: "Gastos" },
  { key: "timeline", label: "Histórico" },
]

export function ProjectScreen() {
  const { currentProjectId, activeTab, setTab, goHome, goReport } = useNav()
  const { project, isLoading } = useProject(currentProjectId)

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
      <TopBar title={project.clientName} subtitle={project.fazenda || undefined} onBack={goHome} />

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

        <SectionTitle className="mt-7">Relatórios</SectionTitle>
        <div className="flex flex-col gap-2.5">
          <SecondaryButton className="w-full justify-start" onClick={() => goReport("reportClient")}>
            <FileText className="h-4 w-4 text-primary" /> Relatório de progresso (cliente)
          </SecondaryButton>
          <SecondaryButton className="w-full justify-start" onClick={() => goReport("reportExpenses")}>
            <Wallet className="h-4 w-4 text-accent" /> Relatório de gastos (interno)
          </SecondaryButton>
        </div>
      </div>
    </div>
  )
}
