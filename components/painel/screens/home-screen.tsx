"use client"

import { useRef } from "react"
import { Check, ChevronRight, Download, Map, Moon, Plus, Radar, Sun, Trash2, TrendingUp, Upload } from "lucide-react"
import { useFinancialOverview, useIndex, useRefresh } from "@/lib/hooks"
import { deleteProjectById, exportBackup, importBackup } from "@/lib/storage"
import { fmtDate, fmtHa, fmtMoney } from "@/lib/format"
import { useNav } from "../nav-context"
import { Logo } from "../logo"
import { Card, EmptyState, ProgressBar, SectionTitle } from "../chrome"
import { IconButton } from "../buttons"

export function HomeScreen() {
  const { index, isLoading } = useIndex()
  const { overview } = useFinancialOverview()
  const { openProject, goNewProject, goInvestments, dark, toggleDark } = useNav()
  const refresh = useRefresh()
  const fileRef = useRef<HTMLInputElement>(null)

  const totalHa = index.reduce((s, p) => s + Number(p.totalHectares || 0), 0)
  const mapped = index.reduce((s, p) => s + Number(p.mappedHectares || 0), 0)
  const globalPct = totalHa > 0 ? (mapped / totalHa) * 100 : 0

  const activeList = index.filter((p) => {
    const m = Number(p.mappedHectares || 0)
    const t = Number(p.totalHectares || 0)
    return m > 0 && m < t
  })
  const active = activeList.length
  const done = index.filter((p) => {
    const m = Number(p.mappedHectares || 0)
    const t = Number(p.totalHectares || 0)
    return t > 0 && m >= t
  }).length

  const balance = overview?.balance ?? 0
  const totalContract = overview?.totalContract ?? 0
  const totalOpEx = overview?.totalOpEx ?? 0
  const invested = overview?.invested ?? 0
  const isPositive = balance >= 0
  const margin = totalContract > 0 ? (balance / totalContract) * 100 : 0

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
      alert("Esse arquivo nao parece ser um backup valido.")
    }
  }

  async function onDeleteProject(id: string, name: string) {
    if (!confirm("Excluir o projeto de " + name + "? Todos os dados serao removidos permanentemente.")) return
    await deleteProjectById(id)
    refresh()
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="relative z-10 rounded-b-[28px] bg-topo px-5 pb-7 pt-safe text-white shadow-[0_12px_30px_-16px_rgba(0,0,0,0.5)]">
        <div className="mb-5 flex items-start justify-between">
          <Logo size={44} />
          <IconButton
            onClick={toggleDark}
            aria-label="Alternar modo escuro"
            className="bg-white/15 text-white hover:bg-white/25"
          >
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </IconButton>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2FD48A] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2FD48A]" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
            Centro de operacoes
          </p>
        </div>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight">
          {active > 0
            ? `${active} ${active === 1 ? "frente ativa" : "frentes ativas"} em campo`
            : "Operacao pronta para iniciar"}
        </h1>

        {/* Progresso global de mapeamento */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <div className="flex items-end justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
              Progresso do levantamento
            </span>
            <span className="num text-[13px] font-extrabold text-[#2FD48A]">{globalPct.toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#2FD48A] transition-[width] duration-700"
              style={{ width: `${Math.min(100, globalPct)}%` }}
            />
          </div>
          <p className="num mt-2 text-[11px] text-white/60">
            {fmtHa(mapped)} de {fmtHa(totalHa)} ha mapeados
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <HeaderStat label="Em campo" value={String(active)} unit={active !== 1 ? "projetos" : "projeto"} />
          <HeaderStat label="Concluidos" value={String(done)} unit={done !== 1 ? "projetos" : "projeto"} />
          <HeaderStat label="Clientes" value={String(index.length)} unit={index.length !== 1 ? "no total" : "no total"} />
        </div>
      </header>

      <div className="px-4 -mt-1 pt-5">
        <button
          onClick={goInvestments}
          className={
            "w-full rounded-3xl p-5 text-left shadow-lg transition-transform active:scale-[0.99] " +
            (isPositive
              ? "bg-gradient-to-br from-[#0c3a26] to-[#12694a]"
              : "bg-gradient-to-br from-[#4a1414] to-[#8a2626]")
          }
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                Saldo da operacao
              </p>
              <p className={"num mt-1.5 text-[34px] font-extrabold leading-none tracking-tight " + (isPositive ? "text-[#5fe3a0]" : "text-[#ffaaaa]")}>
                {fmtMoney(balance)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <TrendingUp className="h-5 w-5 text-white" />
              </span>
              {totalContract > 0 && (
                <span className="num rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/75">
                  {margin >= 0 ? "+" : ""}{margin.toFixed(0)}% margem
                </span>
              )}
            </div>
          </div>
          <div className="my-4 h-px bg-white/10" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <BalanceItem label="Faturado" value={fmtMoney(totalContract)} />
            <BalanceItem label="Gastos" value={fmtMoney(totalOpEx)} dimmed />
            <BalanceItem label="Investido" value={fmtMoney(invested)} dimmed />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-white/50">Toque para ver detalhes completos</p>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </div>
        </button>
      </div>

      <div className="flex-1 px-4 pb-24 pt-6">
        <div className="mb-6 flex gap-2">
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

        {/* Frentes ativas em destaque */}
        {activeList.length > 0 && (
          <div className="mb-6">
            <SectionTitle>Frentes ativas</SectionTitle>
            <div className="space-y-3">
              {activeList.slice(0, 3).map((p) => (
                <ActiveFrontCard key={p.id} summary={p} onClick={() => openProject(p.id)} />
              ))}
            </div>
          </div>
        )}

        <SectionTitle>Clientes</SectionTitle>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : index.length === 0 ? (
          <EmptyState icon={<Map className="h-9 w-9 opacity-40" />}>
            Nenhum projeto cadastrado ainda. Comece criando o levantamento do seu proximo cliente.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {index.map((p) => (
              <ProjectCard
                key={p.id}
                summary={p}
                onClick={() => openProject(p.id)}
                onDelete={() => onDeleteProject(p.id, p.clientName)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-4 pb-5">
        <button
          onClick={goNewProject}
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-cta py-3.5 text-sm font-bold text-cta-foreground shadow-lg shadow-black/25 transition-transform active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" /> Novo projeto
        </button>
      </div>
    </div>
  )
}

function HeaderStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/65">{label}</div>
      <div className="num text-[17px] font-bold leading-none">{value}</div>
      <div className="mt-1 text-[10px] text-white/70">{unit}</div>
    </div>
  )
}

function BalanceItem({ label, value, dimmed }: { label: string; value: string; dimmed?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</p>
      <p className={"num mt-0.5 text-[12.5px] font-bold " + (dimmed ? "text-white/60" : "text-white")}>{value}</p>
    </div>
  )
}

// Card de frente ativa — visual de "operacao em andamento" com radar e progresso
function ActiveFrontCard({
  summary,
  onClick,
}: {
  summary: ReturnType<typeof useIndex>["index"][number]
  onClick: () => void
}) {
  const m = Number(summary.mappedHectares || 0)
  const total = Number(summary.totalHectares || 0)
  const pct = total > 0 ? (m / total) * 100 : 0
  return (
    <Card interactive onClick={onClick} className="cursor-pointer p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Radar className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[15px] font-extrabold text-foreground">{summary.clientName}</span>
            <span className="num text-[13px] font-bold text-primary">{pct.toFixed(0)}%</span>
          </div>
          {summary.fazenda && <div className="truncate text-xs font-medium text-muted-foreground">{summary.fazenda}</div>}
          <ProgressBar value={pct} className="mt-2.5 h-[5px]" />
          <div className="num mt-1.5 text-[11px] text-muted-foreground">
            {fmtHa(m)} / {fmtHa(total)} ha
          </div>
        </div>
      </div>
    </Card>
  )
}

function ProjectCard({
  summary,
  onClick,
  onDelete,
}: {
  summary: ReturnType<typeof useIndex>["index"][number]
  onClick: () => void
  onDelete: () => void | Promise<void>
}) {
  const m = Number(summary.mappedHectares || 0)
  const total = Number(summary.totalHectares || 0)
  const pctReal = total > 0 ? (m / total) * 100 : 0
  const isDone = total > 0 && m >= total - 0.01

  return (
    <div
      className="relative rounded-2xl shadow-sm bg-card"
      style={isDone ? { boxShadow: "0 0 0 2px var(--color-primary)" } : { boxShadow: "0 0 0 1px var(--color-border)" }}
    >
      <button
        onClick={onClick}
        className="block w-full p-4 text-left transition-opacity active:opacity-70"
      >
        <div className="flex items-center justify-between gap-2 pr-6">
          <span className="text-[15px] font-extrabold text-foreground">{summary.clientName}</span>
          <span className="num flex items-center gap-1 text-[13px] font-bold text-primary">
            {isDone && <Check className="h-3.5 w-3.5" />}{pctReal.toFixed(0)}%
          </span>
        </div>
        {summary.fazenda && <div className="mt-0.5 text-xs font-medium text-muted-foreground">{summary.fazenda}</div>}
        <ProgressBar value={pctReal} className="mt-3 h-[5px]" />
        <div className="mt-2 flex justify-between text-[11.5px] text-muted-foreground">
          <span className="num">
            {fmtHa(m)} / {fmtHa(total)} ha
          </span>
          <span>{fmtDate((summary.updatedAt || summary.createdAt || "").slice(0, 10))}</span>
        </div>
      </button>
      <button
        onClick={onDelete}
        aria-label="Excluir projeto"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-30 transition-all hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
