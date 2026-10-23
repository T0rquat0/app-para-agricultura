"use client"

import { useEffect, useState } from "react"
import { ChevronRight, FileText, Pencil, Receipt, Trash2 } from "lucide-react"
import { useNav, type Tab } from "../nav-context"
import { useProject, useRefresh } from "@/lib/hooks"
import { andamentoProjeto, mappedHa } from "@/lib/calculations"
import { fmtDate, fmtHa } from "@/lib/format"
import { deleteProjectById } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { TopBar, SectionTitle } from "../chrome"
import { IconButton } from "../buttons"
import { AreasTab } from "../tabs/areas-tab"
import { ServicesTab } from "../tabs/services-tab"
import { ExpensesTab } from "../tabs/expenses-tab"
import { TimelineTab } from "../tabs/timeline-tab"
import { EditProjectModal } from "../modals"
import { ProjectMap, hasMap } from "../project-map"

const TABS: { key: Tab; label: string }[] = [
  { key: "areas", label: "Matrículas" },
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
        <div className="mx-4 h-56 rounded-[22px] border border-border bg-card" />
      </div>
    )
  }

  const voado = mappedHa(project)
  const contratado = Number(project.totalHectares || 0)
  const { falta } = andamentoProjeto(project)
  const comMapa = hasMap(project)
  const ultimaArea = (project.areas || []).slice().sort((x, y) => (y.date || "").localeCompare(x.date || "") || (y.createdAt || "").localeCompare(x.createdAt || ""))[0]
  const ultimo = ultimaArea && {
    talhao: (project.talhoes || []).find((t) => t.id === ultimaArea.talhaoId)?.name,
    hectares: ultimaArea.hectares,
    date: ultimaArea.date,
  }

  async function removeProject() {
    if (!project) return
    if (!confirm(`Excluir o projeto de ${project.clientName}? Todos os dados serão removidos permanentemente.`)) return
    await deleteProjectById(project.id)
    refresh()
    goHome()
  }

  return (
    <div className="flex flex-1 flex-col">
      {comMapa ? (
        <ProjectMap project={project} onBack={goHome} onEdit={() => setEditingProject(true)} />
      ) : (
        <>
          <TopBar title={project.clientName} subtitle={project.fazenda || undefined} onBack={goHome}>
            <IconButton onClick={() => setEditingProject(true)} aria-label="Editar projeto">
              <Pencil className="h-4 w-4" />
            </IconButton>
          </TopBar>
          <ProjectMap project={project} onBack={goHome} onEdit={() => setEditingProject(true)} />
        </>
      )}

      {/* Com mapa, o conteudo sobe por cima da imagem como uma folha */}
      <div className={comMapa ? "relative z-10 -mt-6 rounded-t-[24px] border-t border-border bg-background pt-2" : ""}>
      {comMapa && <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-foreground/20" aria-hidden="true" />}
      <section className="mx-4 mt-4 grid grid-cols-[1.35fr_1fr_1fr] divide-x divide-border">
        <div className="pr-3">
          <p className="text-[13px] text-muted-foreground">Falta voar</p>
          <p className="num text-[30px] font-extrabold leading-tight tracking-[-0.02em]">
            {fmtHa(falta)}
            <span className="ml-1 text-[15px] font-semibold tracking-normal text-muted-foreground">ha</span>
          </p>
        </div>
        <div className="px-3">
          <p className="text-[13px] text-muted-foreground">Voado</p>
          <p className="num mt-1.5 text-[19px] font-bold">{fmtHa(voado)}</p>
        </div>
        <div className="pl-3">
          <p className="text-[13px] text-muted-foreground">Contratado</p>
          <p className="num mt-1.5 text-[19px] font-bold">{fmtHa(contratado)}</p>
        </div>
      </section>

      {ultimo && (
        <p className="mx-4 mt-3 flex justify-between gap-3 border-y border-border py-2.5 text-[13px] text-muted-foreground">
          <span>Último voo</span>
          <span className="num truncate font-semibold text-foreground">
            {ultimo.talhao ? `${ultimo.talhao} · ` : ""}
            {fmtHa(ultimo.hectares)} ha · {fmtDate(ultimo.date)}
          </span>
        </p>
      )}

      <div className="flex-1 px-4 pb-8 pt-5">
        <div role="tablist" aria-label="Partes do projeto" className="mb-5 grid grid-cols-4 gap-1 rounded-[14px] border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={activeTab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "min-h-9 rounded-[10px] text-[13px] font-semibold transition-colors duration-150",
                activeTab === t.key ? "bg-raised text-foreground" : "text-faint hover:text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "areas" && <AreasTab project={project} />}
        {activeTab === "services" && <ServicesTab project={project} />}
        {activeTab === "expenses" && <ExpensesTab project={project} />}
        {activeTab === "timeline" && <TimelineTab project={project} />}

        <SectionTitle className="mt-8">Relatórios</SectionTitle>
        <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          <ReportRow icon={<FileText className="h-[18px] w-[18px]" />} title="Progresso para o cliente" sub="PDF com áreas voadas e serviços" onClick={() => goReport("reportClient")} />
          <ReportRow icon={<Receipt className="h-[18px] w-[18px]" />} title="Gastos do projeto" sub="Uso interno" onClick={() => goReport("reportExpenses")} />
        </div>

        <button onClick={removeProject} className="pressable mx-auto mt-8 flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> Excluir projeto
        </button>
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

function ReportRow({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="pressable flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-raised">
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-faint" />
    </button>
  )
}
