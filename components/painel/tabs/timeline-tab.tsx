"use client"

import type { Project } from "@/lib/types"
import { fmtDate, fmtHa, fmtMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmptyState, SectionTitle } from "../chrome"

type EventType = "voo" | "gasto" | "svc" | "svcDone" | "proj"
interface TLEvent {
  date: string
  type: EventType
  label: string
  detail: string
}

// Ponto de cada evento: voo no sinal, servico na mesma tinta do status (ambar andamento, verde concluido),
// gasto e criacao do projeto em neutro.
const DOT: Record<EventType, string> = {
  voo: "bg-primary",
  gasto: "bg-foreground/45",
  svc: "bg-warning",
  svcDone: "bg-positive",
  proj: "bg-faint",
}

export function TimelineTab({ project }: { project: Project }) {
  const events: TLEvent[] = []

  ;(project.areas || []).forEach((a) => {
    const talhao = (project.talhoes || []).find((t) => t.id === a.talhaoId)
    events.push({
      date: a.date || a.createdAt || "",
      type: "voo",
      label: `Parte voada${talhao ? " · " + talhao.name : ""}`,
      detail: fmtHa(a.hectares) + " ha" + (a.note ? " · " + a.note : ""),
    })
  })
  ;(project.expenses || []).forEach((e) => {
    events.push({
      date: e.date || e.createdAt || "",
      type: "gasto",
      label: e.category || "Gasto",
      detail: fmtMoney(e.value) + (e.note ? " · " + e.note : ""),
    })
  })
  ;(project.services || [])
    .filter((s) => s.status && s.status !== "pendente")
    .forEach((s) => {
      events.push({
        date: s.updatedAt || s.createdAt || "",
        type: s.status === "concluido" ? "svcDone" : "svc",
        label: `Serviço: ${s.name || ""}`,
        detail: s.status === "concluido" ? "Concluído" : "Em andamento",
      })
    })
  events.push({
    date: project.createdAt || "",
    type: "proj",
    label: "Projeto criado",
    detail: project.clientName + (project.fazenda ? " · " + project.fazenda : ""),
  })

  events.sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  return (
    <div>
      <SectionTitle count={events.length}>Histórico do projeto</SectionTitle>
      {events.length === 0 ? (
        <EmptyState>Nenhum evento registrado ainda.</EmptyState>
      ) : (
        <ol className="rounded-[18px] border border-border bg-card px-4 py-1">
          {events.map((ev, i) => (
            <li key={i} className="relative grid grid-cols-[12px_1fr_auto] gap-x-3 py-3">
              {/* trilho vertical ligando os pontos */}
              {i < events.length - 1 && (
                <span aria-hidden className="absolute bottom-0 left-[5.5px] top-[26px] w-px bg-border" />
              )}
              {i > 0 && <span aria-hidden className="absolute left-[5.5px] top-0 h-[16px] w-px bg-border" />}
              <span aria-hidden className={cn("relative mt-[5px] h-3 w-3 rounded-full ring-[3px] ring-card", DOT[ev.type])} />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-snug">{ev.label}</div>
                {ev.detail && <div className="num mt-0.5 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{ev.detail}</div>}
              </div>
              <div className="num pt-0.5 text-[13px] text-faint">{ev.date ? fmtDate(ev.date.slice(0, 10)) : "—"}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
