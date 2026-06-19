"use client"

import { useRef } from "react"
import { Check, ChevronRight, Download, Map, Moon, Plus, Sun, TrendingUp, Upload } from "lucide-react"
import { useIndex, useRefresh } from "@/lib/hooks"
import { exportBackup, importBackup } from "@/lib/storage"
import { fmtDate, fmtHa } from "@/lib/format"
import { useNav } from "../nav-context"
import { Logo } from "../logo"
import { EmptyState, ProgressBar, SectionTitle } from "../chrome"

export function HomeScreen() {
  const { index, isLoading } = useIndex()
  const { openProject, goNewProject, goInvestments, dark, toggleDark } = useNav()
  const refresh = useRefresh()
  const fileRef = useRef<HTMLInputElement>(null)

  const totalHa = index.reduce((s, p) => s + Number(p.totalHectares || 0), 0)
  const mapped = index.reduce((s, p) => s + Number(p.mappedHectares || 0), 0)
  const active = index.filter((p) => {
    const m = Number(p.mappedHectares || 0)
    const t = Number(p.totalHectares || 0)
    return m > 0 && m < t
  }).length
  const done = index.filter((p) => {
    const m = Number(p.mappedHectares || 0)
    const t = Number(p.totalHectares || 0)
    return t > 0 && m >= t
  }).length

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!confirm("Importar vai adicionar/atualizar os projetos desse backup no painel atual. Continuar?"))
        return
      await importBackup(data)
      refresh()
      alert("Backup importado com sucesso.")
    } catch {
      alert("Esse arquivo não parece ser um backup válido.")
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <header className="bg-topo px-5 pb-7 pt-6 text-white">
        <div className="mb-5 flex items-start justify-between">
          <Logo size={44} />
          <button
            onClick={toggleDark}
            aria-label="Alternar modo escuro"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          Painel de Levantamentos
        </p>
        <h1 className="mt-1 mb-5 text-[22px] font-extrabold tracking-tight">Visão geral da operação</h1>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Ha mapeados" value={fmtHa(mapped)} unit={`de ${fmtHa(totalHa)} ha`} />
          <Stat label="Em campo" value={String(active)} unit={`projeto${active !== 1 ? "s" : ""}`} />
          <Stat label="Concluídos" value={String(done)} unit={`projeto${done !== 1 ? "s" : ""}`} />
        </div>
      </header>

      {/* Conteudo */}
      <div className="flex-1 px-4 pb-24 pt-5">
        <div className="mb-3.5 flex gap-2">
          <button
            onClick={() => exportBackup()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Exportar backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <Upload className="h-3.5 w-3.5" /> Importar backup
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
        </div>

        {/* Atalho investimentos */}
        <button
          onClick={goInvestments}
          className="mb-5 flex w-full items-center gap-3.5 rounded-2xl bg-sand-bg p-4 text-left shadow-sm ring-1 ring-accent/20 transition-transform active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <TrendingUp className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-accent">Investimentos &amp; visão financeira</span>
            <span className="block text-xs text-muted-foreground">
              O que já foi investido nessa área e se está rendendo
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-accent/60" />
        </button>

        <SectionTitle>Clientes</SectionTitle>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : index.length === 0 ? (
          <EmptyState icon={<Map className="h-9 w-9 opacity-40" />}>
            Nenhum projeto cadastrado ainda. Comece criando o levantamento do seu próximo cliente.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {index.map((p) => (
              <ProjectCard key={p.id} summary={p} onClick={() => openProject(p.id)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-4 pb-5">
        <button
          onClick={goNewProject}
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" /> Novo projeto
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/65">{label}</div>
      <div className="num text-[17px] font-bold leading-none">{value}</div>
      <div className="mt-1 text-[10px] text-white/70">{unit}</div>
    </div>
  )
}

function ProjectCard({
  summary,
  onClick,
}: {
  summary: ReturnType<typeof useIndex>["index"][number]
  onClick: () => void
}) {
  const m = Number(summary.mappedHectares || 0)
  const total = Number(summary.totalHectares || 0)
  const pctReal = total > 0 ? (m / total) * 100 : 0
  const isDone = total > 0 && m >= total

  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-2xl p-4 text-left shadow-sm transition-transform active:scale-[0.99] ${
        isDone ? "bg-green-pale ring-1 ring-primary/40" : "bg-card ring-1 ring-border/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-extrabold text-foreground">{summary.clientName}</span>
        {isDone ? (
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            Concluído
          </span>
        ) : (
          <span className="num text-[13px] font-bold text-primary">{pctReal.toFixed(0)}%</span>
        )}
      </div>
      {summary.fazenda && <div className="mt-0.5 text-xs font-medium text-muted-foreground">{summary.fazenda}</div>}
      {isDone ? (
        <div className="mt-2 text-[11px] font-bold text-primary">✓ Levantamento concluído</div>
      ) : (
        <ProgressBar value={pctReal} className="mt-3 h-[5px]" />
      )}
      <div className="mt-2 flex justify-between text-[11.5px] text-muted-foreground">
        <span className="num">
          {fmtHa(m)} / {fmtHa(total)} ha
        </span>
        <span>{fmtDate((summary.updatedAt || summary.createdAt || "").slice(0, 10))}</span>
      </div>
    </button>
  )
}
