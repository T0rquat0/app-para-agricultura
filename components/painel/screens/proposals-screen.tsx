"use client"

import { FileText, Pencil, Plus, Trash2 } from "lucide-react"
import { useNav } from "../nav-context"
import { useProposals, useRefresh } from "@/lib/hooks"
import { deleteProposal } from "@/lib/storage"
import { proposalTotal } from "@/lib/calculations"
import { fmtDate, fmtMoney } from "@/lib/format"
import type { Proposal } from "@/lib/types"
import { TopBar, EmptyState, SectionTitle } from "../chrome"

export function ProposalsScreen() {
  const { goHome, openProposal, navigate } = useNav()
  const { proposals } = useProposals()
  const refresh = useRefresh()

  async function remove(p: Proposal) {
    if (!confirm(`Excluir a proposta de "${p.clientName}"?`)) return
    await deleteProposal(p.id)
    refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Propostas" subtitle="Documentos comerciais para clientes" onBack={goHome} />

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
        <SectionTitle>Propostas salvas</SectionTitle>
        {proposals.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8 text-muted-foreground/50" />}>
            Monte a primeira proposta: cliente, itens de serviço e valores. Depois é só gerar o PDF pra enviar.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5">
            {proposals.map((p) => (
              <div key={p.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-foreground">{p.clientName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.fazenda ? `${p.fazenda} · ` : ""}
                      {fmtDate((p.updatedAt || p.createdAt || "").slice(0, 10))}
                    </div>
                  </div>
                  <div className="num shrink-0 text-[15px] font-extrabold text-primary">
                    {fmtMoney(proposalTotal(p))}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openProposal(p.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/70"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      openProposal(p.id)
                      navigate("proposalDocument")
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                  >
                    <FileText className="h-3.5 w-3.5" /> Gerar PDF
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        <button
          onClick={() => openProposal(null)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cta py-3.5 text-sm font-bold text-cta-foreground shadow-sm transition-all hover:brightness-105"
        >
          <Plus className="h-[18px] w-[18px]" /> Nova proposta
        </button>
      </div>
    </div>
  )
}
