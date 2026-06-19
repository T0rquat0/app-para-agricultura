"use client"

import { useState } from "react"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import type { Project } from "@/lib/types"
import { mappedHa, talhaoBadge, talhaoFlown, ungroupedAreas } from "@/lib/calculations"
import { fmtDate, fmtHa } from "@/lib/format"
import { saveProject } from "@/lib/storage"
import { useRefresh } from "@/lib/hooks"
import { EmptyState, ProgressBar, SectionTitle } from "../chrome"
import { SecondaryButton, GhostButton } from "../buttons"
import { ParteModal, TalhaoModal } from "../modals"

export function AreasTab({ project }: { project: Project }) {
  const refresh = useRefresh()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showTalhao, setShowTalhao] = useState(false)
  const [parteFor, setParteFor] = useState<string | null>(null)

  const mapped = mappedHa(project)
  const pctVal = project.totalHectares ? (mapped / project.totalHectares) * 100 : 0

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function removeArea(areaId: string) {
    if (!confirm("Remover este lançamento?")) return
    const p = { ...project, areas: (project.areas || []).filter((a) => a.id !== areaId) }
    await saveProject(p)
    refresh()
  }

  async function removeTalhao(talhaoId: string) {
    const count = (project.areas || []).filter((a) => a.talhaoId === talhaoId).length
    const msg =
      count > 0
        ? `Esse talhão tem ${count} parte(s) voada(s) lançada(s). Remover o talhão e todas as partes?`
        : "Remover este talhão?"
    if (!confirm(msg)) return
    const p = {
      ...project,
      talhoes: (project.talhoes || []).filter((t) => t.id !== talhaoId),
      areas: (project.areas || []).filter((a) => a.talhaoId !== talhaoId),
    }
    await saveProject(p)
    refresh()
  }

  const talhoes = (project.talhoes || []).slice().sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
  const ungrouped = ungroupedAreas(project)

  return (
    <div>
      {/* Resumo */}
      <div className="mb-3 grid grid-cols-3 gap-2.5">
        <SummaryStat label="Mapeado" value={`${fmtHa(mapped)} ha`} />
        <SummaryStat label="Contratado" value={`${fmtHa(project.totalHectares)} ha`} />
        <SummaryStat label="Progresso" value={`${pctVal.toFixed(0)}%`} />
      </div>
      <ProgressBar value={pctVal} className="mb-5 h-2.5" />

      <SectionTitle>Talhões / matrículas</SectionTitle>
      {talhoes.length === 0 ? (
        <EmptyState>
          Nenhum talhão cadastrado ainda. Crie um pra cada matrícula ou área grande, e lance dentro dele os pedaços que
          for voando.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {talhoes.map((t) => {
            const flown = talhaoFlown(project, t.id)
            const target = Number(t.targetHectares || 0)
            const badge = talhaoBadge(project, t)
            const isOpen = expanded.has(t.id)
            const isDone = target > 0 && flown >= target
            const ringPct = target > 0 ? Math.min(100, (flown / target) * 100) : 0
            const partes = (project.areas || [])
              .filter((a) => a.talhaoId === t.id)
              .sort((a, b) => (a.date || "").localeCompare(b.date || ""))

            return (
              <div key={t.id} className={`overflow-hidden rounded-2xl shadow-sm ring-1 ${isDone ? "bg-green-pale ring-primary/30" : "bg-card ring-border/60"}`}>
                <button onClick={() => toggle(t.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                      <span className="truncate">{t.name}</span>
                      {badge && (
                        <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                          {badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {target > 0
                        ? `${fmtHa(flown)} / ${fmtHa(target)} ha · ${Math.round((flown / target) * 100)}%`
                        : `${fmtHa(flown)} ha voados`}
                    </div>
                  </div>
                  {isDone ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  ) : (
                    <Ring pct={ringPct} />
                  )}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {target > 0 && <ProgressBar value={(flown / target) * 100} className="mx-4 mb-1 h-1" />}
                {isOpen && (
                  <div className="border-t border-border px-4 py-2">
                    {partes.length === 0 ? (
                      <div className="py-2 text-[13px] text-muted-foreground">Nenhuma parte voada ainda.</div>
                    ) : (
                      partes.map((a, i) => (
                        <div key={a.id} className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0">
                          <div>
                            <div className="text-[13.5px] font-bold text-foreground">
                              Parte {i + 1}
                              {a.note ? ` — ${a.note}` : ""}
                            </div>
                            <div className="text-[11.5px] text-muted-foreground">{fmtDate(a.date)}</div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="num text-[13.5px] font-bold text-foreground">{fmtHa(a.hectares)} ha</span>
                            <DelButton onClick={() => removeArea(a.id)} />
                          </div>
                        </div>
                      ))
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <GhostButton className="px-0" onClick={() => setParteFor(t.id)}>
                        <Plus className="h-4 w-4" /> Adicionar parte voada
                      </GhostButton>
                      <GhostButton className="px-0 text-destructive hover:bg-destructive/10" onClick={() => removeTalhao(t.id)}>
                        Excluir talhão
                      </GhostButton>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3">
        <SecondaryButton className="w-full" onClick={() => setShowTalhao(true)}>
          <Plus className="h-4 w-4" /> Novo talhão
        </SecondaryButton>
      </div>

      {ungrouped.length > 0 && (
        <>
          <SectionTitle className="mt-5">Outras áreas</SectionTitle>
          <div className="rounded-2xl bg-card p-1 shadow-sm ring-1 ring-border/60">
            {ungrouped.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-border/60 px-3 py-2.5 last:border-0">
                <div>
                  <div className="text-[13.5px] font-bold text-foreground">{a.name || "Área"}</div>
                  <div className="text-[11.5px] text-muted-foreground">{fmtDate(a.date)}</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="num text-[13.5px] font-bold text-foreground">{fmtHa(a.hectares)} ha</span>
                  <DelButton onClick={() => removeArea(a.id)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showTalhao && <TalhaoModal project={project} onClose={() => setShowTalhao(false)} onSaved={refresh} />}
      {parteFor && (
        <ParteModal
          project={project}
          talhaoId={parteFor}
          onClose={() => setParteFor(null)}
          onSaved={() => {
            setExpanded((prev) => new Set(prev).add(parteFor))
            refresh()
          }}
        />
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-sm ring-1 ring-border/60">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="num mt-1 text-base font-bold text-foreground">{value}</div>
    </div>
  )
}

function DelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Remover"
      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <X className="h-4 w-4" />
    </button>
  )
}

function Ring({ pct }: { pct: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  const gap = circ - dash
  return (
    <svg width="40" height="40" viewBox="0 0 46 46" className="shrink-0">
      <circle cx="23" cy="23" r={r} fill="none" stroke="var(--green-light)" strokeWidth="4" />
      {pct > 0 && (
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeDasharray={`${dash.toFixed(1)} ${gap.toFixed(1)}`}
          strokeLinecap="round"
          transform="rotate(-90 23 23)"
        />
      )}
      <text x="23" y="24" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="800" fill="var(--muted-foreground)" className="num">
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}
