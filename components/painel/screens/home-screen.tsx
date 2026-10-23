"use client"

import { useRef, useState } from "react"
import { ChevronRight, Download, LogOut, Map, Moon, Plus, Sun, Upload } from "lucide-react"
import { useAllProjects, useFinancialOverview, useIndex, useRefresh } from "@/lib/hooks"
import { exportBackup, importBackup } from "@/lib/storage"
import { andamentoProjeto, isProjectComplete, metaMatricula, projectPercent, talhaoFlown } from "@/lib/calculations"
import { corDoAndamento } from "@/lib/geo"
import { fmtHa, fmtMoney } from "@/lib/format"
import type { Project, ProjectSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useNav } from "../nav-context"
import { useAuth } from "../auth-gate"
import { EmptyState, ProgressBar, SectionTitle, Dinheiro } from "../chrome"
import { ModalSheet } from "../modal-sheet"
import { GhostButton } from "../buttons"
import { SatThumb } from "../sat-thumb"

// Andamento de um projeto: pelas matriculas quando o projeto completo ja carregou,
// senao pelo resumo (contratado menos voado), que chega antes.
function andamento(s: ProjectSummary, full?: Project) {
  if (full) return { ...andamentoProjeto(full), voado: Number(s.mappedHectares || 0) }
  const m = Number(s.mappedHectares || 0)
  const t = Number(s.totalHectares || 0)
  return { falta: Math.max(0, t - m), pct: projectPercent(m, t), fechado: isProjectComplete(m, t), voado: m }
}

export function HomeScreen() {
  const { index, isLoading } = useIndex()
  const { projects } = useAllProjects()
  const { overview } = useFinancialOverview()
  const { openProject, goNewProject, goInvestments } = useNav()
  const { email } = useAuth()
  const [account, setAccount] = useState(false)

  const linhas = index.map((s) => ({ s, full: projects.find((x) => x.id === s.id), a: andamento(s, projects.find((x) => x.id === s.id)) }))
  const emCampo = linhas.filter((l) => !l.a.fechado && l.a.voado > 0)
  const totalFalta = linhas.reduce((s, l) => s + l.a.falta, 0)
  const totalVoado = linhas.reduce((s, l) => s + l.a.voado, 0)
  // Em campo primeiro, depois os que nem comecaram, por ultimo os fechados
  const ordem = (l: (typeof linhas)[number]) => (l.a.fechado ? 2 : l.a.voado > 0 ? 0 : 1)
  const lista = linhas.slice().sort((a, b) => ordem(a) - ordem(b))

  const balance = overview?.balance ?? 0

  return (
    <div className="flex flex-1 flex-col px-4 pt-safe">
      <header className="flex h-10 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[16px] font-extrabold tracking-[-0.01em]">AGS GEO</span>
        </div>
        <button
          onClick={() => setAccount(true)}
          aria-label="Conta e ajustes"
          className="pressable flex h-9 w-9 items-center justify-center rounded-full border border-border bg-raised text-[13px] font-bold text-muted-foreground"
        >
          {(email || "A").slice(0, 1).toUpperCase()}
        </button>
      </header>

      <section className="mt-7 px-1">
        <p className="text-[14px] text-muted-foreground">Falta voar</p>
        {isLoading ? (
          <div className="mt-2 h-[52px] w-48 rounded-lg bg-raised" />
        ) : (
          <p className="num text-[56px] font-extrabold leading-[1.02] tracking-[-0.035em]">
            {fmtHa(totalFalta)}
            <span className="ml-1.5 text-[22px] font-semibold tracking-normal text-muted-foreground">ha</span>
          </p>
        )}
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {emCampo.length === 0 ? "Nenhuma frente em campo" : `${emCampo.length} ${emCampo.length === 1 ? "frente" : "frentes"} em campo`}
          </span>
          <span className="num"> · {fmtHa(totalVoado)} ha voados</span>
        </p>
      </section>

      <div className="mt-8 pb-4">
        <SectionTitle
          action={
            <button onClick={goNewProject} className="pressable -my-1 flex items-center gap-1 rounded-full px-2 py-1 text-[14px] font-bold text-primary">
              <Plus className="h-4 w-4" strokeWidth={2.4} /> Novo projeto
            </button>
          }
        >
          Projetos <span className="num ml-1 font-medium text-faint">{index.length || ""}</span>
        </SectionTitle>

        {isLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[92px] rounded-[18px] border border-border bg-card" />
            ))}
          </div>
        ) : index.length === 0 ? (
          <EmptyState icon={<Map className="h-8 w-8 opacity-40" />}>
            Nenhum projeto ainda. Toque em “Novo projeto” para cadastrar o levantamento do próximo cliente.
          </EmptyState>
        ) : (
          <div className="space-y-2.5">
            {lista.map((l) => (
              <ProjectRow key={l.s.id} summary={l.s} full={l.full} a={l.a} onClick={() => openProject(l.s.id)} />
            ))}
          </div>
        )}
      </div>

      {!isLoading && index.length > 0 && (
        <button onClick={goInvestments} className="pressable mb-6 flex items-center justify-between gap-2 rounded-xl px-1 py-2 text-left text-[14px] text-muted-foreground">
          <span>
            Saldo da operação <Dinheiro valor={balance} fluxo="saldo" className="font-semibold" />
          </span>
          <ChevronRight className="h-4 w-4 text-faint" />
        </button>
      )}

      {account && <AccountSheet onClose={() => setAccount(false)} />}
    </div>
  )
}

// Simbolo da marca: um alvo de levantamento (losango no sinal)
function Mark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-raised" aria-hidden="true">
      <span className="h-2.5 w-2.5 rotate-45 border-2 border-primary" />
    </span>
  )
}

function ProjectRow({
  summary,
  full,
  a,
  onClick,
}: {
  summary: ProjectSummary
  full?: Project
  a: ReturnType<typeof andamento>
  onClick: () => void
}) {
  const done = a.fechado
  return (
    <button
      onClick={onClick}
      className="pressable grid w-full grid-cols-[88px_1fr] overflow-hidden rounded-[18px] border border-border bg-card text-left hover:border-foreground/15"
    >
      <AreaThumb project={full} />
      <span className="min-w-0 px-3.5 py-3">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-[16px] font-bold", done && "font-semibold text-muted-foreground")}>{summary.clientName}</span>
          <span className={cn("num shrink-0 text-[16px] font-bold", done && "font-semibold text-muted-foreground")}>
            {done ? fmtHa(a.voado) : fmtHa(a.falta)}
          </span>
        </span>
        <span className="mt-0.5 flex justify-between gap-2 text-[13px] text-muted-foreground">
          <span className="truncate">{summary.fazenda || "Sem fazenda"}</span>
          <span className="shrink-0">{done ? "ha · fechado" : "ha a voar"}</span>
        </span>
        <ProgressBar value={a.pct} cor={a.pct > 0 ? corDoAndamento(a.pct) : undefined} className="mt-2.5" />
      </span>
    </button>
  )
}

// Miniatura: a fazenda no satelite com as matriculas riscadas pela cor do andamento.
// Sem KML ainda, um quadro neutro que diz isso (nada de desenho que pareca terra).
function AreaThumb({ project }: { project?: Project }) {
  const formas = (project?.talhoes || [])
    .filter((t) => t.geometry?.length)
    .map((t) => {
      const meta = metaMatricula(t)
      return { geometry: t.geometry!, pct: meta > 0 ? Math.min(100, (talhaoFlown(project!, t.id) / meta) * 100) : 0 }
    })
  if (formas.length) {
    return (
      <span className="relative block h-full min-h-[88px] overflow-hidden">
        <span className="absolute inset-0 flex items-center justify-center">
          <SatThumb formas={formas} lado={112} />
        </span>
      </span>
    )
  }
  return (
    <span className="flex h-full min-h-[88px] flex-col items-center justify-center gap-1 bg-raised text-faint" aria-label="Sem KML">
      <Map className="h-5 w-5" strokeWidth={1.7} />
      <span className="text-[11px] font-semibold">sem KML</span>
    </span>
  )
}

function AccountSheet({ onClose }: { onClose: () => void }) {
  const { email, signOut } = useAuth()
  const { dark, toggleDark } = useNav()
  const refresh = useRefresh()
  const fileRef = useRef<HTMLInputElement>(null)

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!confirm("Importar vai adicionar/atualizar os projetos desse backup no painel atual. Continuar?")) return
      await importBackup(data)
      refresh()
      alert("Backup importado com sucesso.")
    } catch {
      alert("Esse arquivo não parece ser um backup válido.")
    }
  }

  const row = "pressable flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-semibold hover:bg-raised"
  return (
    <ModalSheet title="Conta e ajustes" onClose={onClose}>
      {email && <p className="-mt-3 mb-4 truncate text-[13px] text-muted-foreground">Conectado como {email}</p>}
      <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
        <button onClick={toggleDark} className={row}>
          {dark ? <Sun className="h-[18px] w-[18px] text-muted-foreground" /> : <Moon className="h-[18px] w-[18px] text-muted-foreground" />}
          {dark ? "Usar tema claro (para o sol)" : "Usar tema escuro"}
        </button>
        <button onClick={() => exportBackup()} className={row}>
          <Download className="h-[18px] w-[18px] text-muted-foreground" /> Exportar backup
        </button>
        <button onClick={() => fileRef.current?.click()} className={row}>
          <Upload className="h-[18px] w-[18px] text-muted-foreground" /> Importar backup
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
      </div>
      {signOut && (
        <GhostButton className="mt-3 w-full text-destructive" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" /> Sair da conta
        </GhostButton>
      )}
    </ModalSheet>
  )
}
