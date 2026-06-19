"use client"

import type { Project } from "@/lib/types"
import { fmtDate, fmtHa, fmtMoney } from "@/lib/format"
import { EmptyState, SectionTitle } from "../chrome"

type EventType = "voo" | "gasto" | "svc" | "proj"
interface TLEvent {
  date: string
  type: EventType
  label: string
  detail: string
}

export function TimelineTab({ project }: { project: Project }) {
  const events: TLEvent[] = []

  ;(project.areas || []).forEach((a) => {
    const talhao = (project.talhoes || []).find((t) => t.id === a.talhaoId)
    events.push({
      date: a.date || a.createdAt || "",
      type: "voo",
      label: `Parte voada${talhao ? " — " + talhao.name : ""}`,
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
        type: "svc",
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

  const dotColor: Record<EventType, string> = {
    voo: "bg-primary",
    gasto: "bg-accent",
    svc: "bg-amber-status",
    proj: "bg-muted-foreground",
  }

  return (
    <div>
      <SectionTitle className="mb-4">Histórico do projeto</SectionTitle>
      {events.length === 0 ? (
        <EmptyState>Nenhum evento registrado ainda.</EmptyState>
      ) : (
        <div className="relative ml-1.5 border-l-2 border-border pl-5">
          {events.map((ev, i) => (
            <div key={i} className="relative pb-5 last:pb-0">
              <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-background ${dotColor[ev.type]}`} />
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {ev.date ? fmtDate(ev.date.slice(0, 10)) : "—"}
              </div>
              <div className="text-[13.5px] font-bold text-foreground">{ev.label}</div>
              {ev.detail && <div className="text-[12px] text-muted-foreground">{ev.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
