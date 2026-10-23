"use client"

import { useState } from "react"
import { ChevronDown, Pencil, Plus, X } from "lucide-react"
import type { Area, Talhao } from "@/lib/types"
import type { Project } from "@/lib/types"
import { effectiveCommissionRate, talhaoBadge, talhaoFlown, ungroupedAreas } from "@/lib/calculations"
import { fmtDate, fmtHa, fmtMoney } from "@/lib/format"
import { deleteArea, deleteTalhao, updateTalhao } from "@/lib/storage"
import { useRefresh } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { areaHa, corDoAndamento } from "@/lib/geo"
import { GeoThumb } from "../geo-thumb"
import { EmptyState, SectionTitle } from "../chrome"
import { SecondaryButton, GhostButton } from "../buttons"
import { EditParteModal, EditTalhaoModal, ParteModal, TalhaoModal } from "../modals"

export function AreasTab({ project }: { project: Project }) {
  const refresh = useRefresh()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showTalhao, setShowTalhao] = useState(false)
  const [parteFor, setParteFor] = useState<string | null>(null)
  const [editingTalhao, setEditingTalhao] = useState<Talhao | null>(null)
  const [editingParte, setEditingParte] = useState<Area | null>(null)

  const commissionRate = effectiveCommissionRate(project)

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
    await deleteArea(project.id, areaId)
    refresh()
  }

  async function removeTalhao(talhaoId: string) {
    const count = (project.areas || []).filter((a) => a.talhaoId === talhaoId).length
    const msg =
      count > 0
        ? `Essa matrícula tem ${count} parte(s) voada(s) lançada(s). Remover a matrícula e todas as partes?`
        : "Remover esta matrícula?"
    if (!confirm(msg)) return
    await deleteTalhao(project.id, talhaoId)
    refresh()
  }

  async function removeContorno(t: Talhao) {
    if (!confirm(`Remover o contorno do KML de ${t.name}? Os hectares voados continuam; só o desenho sai do mapa.`)) return
    await updateTalhao(project.id, { ...t, geometry: [], geometryNames: [] })
    refresh()
  }

  const talhoes = (project.talhoes || []).slice().sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
  const ungrouped = ungroupedAreas(project)
  const fechadas = talhoes.filter((t) => Number(t.targetHectares || 0) > 0 && talhaoFlown(project, t.id) >= Number(t.targetHectares)).length

  return (
    <div>
      <SectionTitle count={talhoes.length > 0 ? `${fechadas} de ${talhoes.length} fechadas` : undefined}>Matrículas</SectionTitle>
      {talhoes.length === 0 ? (
        <EmptyState>
          Nenhuma matrícula ainda. Crie uma para cada matrícula ou área grande, e lance nela os pedaços que for voando.
        </EmptyState>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          {talhoes.map((t) => {
            const flown = talhaoFlown(project, t.id)
            const target = Number(t.targetHectares || 0)
            const badge = talhaoBadge(project, t)
            const isOpen = expanded.has(t.id)
            const isDone = target > 0 && flown >= target
            const pct = target > 0 ? Math.min(100, (flown / target) * 100) : 0
            const partes = (project.areas || [])
              .filter((a) => a.talhaoId === t.id)
              .sort((a, b) => (a.date || "").localeCompare(b.date || ""))

            return (
              <div key={t.id}>
                <div className="flex items-center gap-1 pr-2">
                  <button onClick={() => toggle(t.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 text-left">
                    <Hatch pct={pct} talhao={t} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("flex items-center gap-2 text-[15px] font-bold", isDone && "font-semibold text-muted-foreground")}>
                        <span className="truncate">{t.name}</span>
                        {badge && (
                          <span className="shrink-0 rounded-md bg-raised px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{badge}</span>
                        )}
                      </span>
                      <span className="num block text-[13px] text-muted-foreground">
                        {target > 0 ? `${fmtHa(flown)} de ${fmtHa(target)} ha · ${Math.round((flown / target) * 100)}%` : `${fmtHa(flown)} ha voados`}
                      </span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-faint transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>
                  <button
                    onClick={() => setEditingTalhao(t)}
                    aria-label="Editar matrícula"
                    className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-faint hover:bg-raised hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="bg-background/40 px-3.5 pb-2">
                    {partes.length === 0 ? (
                      <div className="py-2.5 text-[13px] text-muted-foreground">Nenhuma parte voada ainda.</div>
                    ) : (
                      partes.map((a, i) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-semibold">
                              Parte {i + 1}
                              {a.note ? ` · ${a.note}` : ""}
                            </div>
                            <div className="text-[12.5px] text-muted-foreground">{fmtDate(a.date)}</div>
                          </div>
                          <span className="num text-[14px] font-bold">{fmtHa(a.hectares)} ha</span>
                          <button
                            onClick={() => setEditingParte(a)}
                            aria-label="Editar parte"
                            className="pressable flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-raised hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <DelButton onClick={() => removeArea(a.id)} />
                        </div>
                      ))
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <GhostButton className="px-0" onClick={() => setParteFor(t.id)}>
                        <Plus className="h-4 w-4" /> Lançar parte voada
                      </GhostButton>
                      <GhostButton className="px-2 text-destructive hover:bg-destructive/10" onClick={() => removeTalhao(t.id)}>
                        Excluir matrícula
                      </GhostButton>
                    </div>
                    {t.geometry?.length ? <KmlAreas talhao={t} onRemove={() => removeContorno(t)} /> : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <SecondaryButton className="mt-3 w-full" onClick={() => setShowTalhao(true)}>
        <Plus className="h-4 w-4" /> Nova matrícula
      </SecondaryButton>

      <p className="mt-3 px-1 text-[12.5px] text-faint">
        {commissionRate > 0 ? (
          <>
            Comissão: <span className="num font-semibold text-muted-foreground">{fmtMoney(commissionRate)}/ha</span>
            {project.commissionRate ? " (valor manual)" : " (do serviço por hectare)"}
          </>
        ) : (
          <>Valor de comissão não identificado: defina o valor por hectare em Serviços ou no lápis do topo.</>
        )}
      </p>

      {ungrouped.length > 0 && (
        <>
          <SectionTitle className="mt-6">Outras áreas</SectionTitle>
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {ungrouped.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold">{a.name || "Área"}</div>
                  <div className="text-[12.5px] text-muted-foreground">{fmtDate(a.date)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="num text-[14px] font-bold">{fmtHa(a.hectares)} ha</span>
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
            setExpanded((prev) => new Set(prev).add(parteFor!))
            refresh()
          }}
        />
      )}
      {editingTalhao && (
        <EditTalhaoModal
          project={project}
          talhao={editingTalhao}
          onClose={() => setEditingTalhao(null)}
          onSaved={() => { setEditingTalhao(null); refresh() }}
        />
      )}
      {editingParte && (
        <EditParteModal
          project={project}
          area={editingParte}
          onClose={() => setEditingParte(null)}
          onSaved={() => { setEditingParte(null); refresh() }}
        />
      )}
    </div>
  )
}

// Quadrinho da matricula riscado pela cor do andamento: o contorno do KML quando existe
function Hatch({ pct, talhao }: { pct: number; talhao: Talhao }) {
  if (talhao.geometry?.length) {
    return (
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-raised">
        <GeoThumb formas={[{ geometry: talhao.geometry, pct }]} className="h-9 w-9 text-foreground" />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-[7px] border-[1.5px] bg-raised"
      style={{ borderColor: pct > 0 ? corDoAndamento(pct) : "color-mix(in srgb, var(--foreground) 35%, transparent)" }}
    >
      <span className="bg-risco absolute inset-y-0 left-0" style={{ width: `${pct}%`, color: corDoAndamento(pct) }} />
    </span>
  )
}

// As areas (trilhas) do KML guardadas dentro da matricula: so aparecem quando ela esta aberta
function KmlAreas({ talhao, onRemove }: { talhao: Talhao; onRemove: () => void }) {
  const [aberto, setAberto] = useState(false)
  const g = talhao.geometry || []
  const nomes = talhao.geometryNames || []
  const total = areaHa(g)
  return (
    <div className="mt-1 border-t border-border pt-1">
      <button onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="flex w-full items-center justify-between py-2 text-[13.5px] font-semibold text-muted-foreground">
        <span>
          Áreas do KML <span className="num font-normal text-faint">· {g.length} · {fmtHa(total)} ha</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", aberto && "rotate-180")} />
      </button>
      {aberto && (
        <>
          <ul className="divide-y divide-border rounded-[12px] border border-border bg-card">
            {g.map((pol, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2">
                <GeoThumb formas={[{ geometry: [pol], pct: 0 }]} className="h-7 w-7 shrink-0 text-foreground" />
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{nomes[i] || `Área ${i + 1}`}</span>
                <span className="num shrink-0 text-[13px] font-semibold">{fmtHa(areaHa([pol]))} ha</span>
              </li>
            ))}
          </ul>
          <GhostButton className="mt-1 px-0 text-[14px] text-muted-foreground" onClick={onRemove}>
            Remover contorno do mapa
          </GhostButton>
        </>
      )}
    </div>
  )
}

function DelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Remover"
      className="pressable flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-destructive/10 hover:text-destructive"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
