"use client"

import { FileText, Plus, Trash2 } from "lucide-react"
import { useNav } from "../nav-context"
import { useProposals, useRefresh } from "@/lib/hooks"
import { deleteProposal } from "@/lib/storage"
import { proposalTotal } from "@/lib/calculations"
import { fmtDate, fmtMoney } from "@/lib/format"
import type { Proposal } from "@/lib/types"
import { TopBar, EmptyState, SectionTitle } from "../chrome"

export function ProposalsScreen() {
  const { openProposal, navigate } = useNav()
  const { proposals } = useProposals()
  const refresh = useRefresh()

  async function remove(p: Proposal) {
    if (!confirm(`Excluir a proposta de "${p.clientName}"?`)) return
    await deleteProposal(p.id)
    refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Propostas" subtitle="Documentos comerciais para clientes" />

      <div className="flex-1 px-4 pb-6 pt-2">
        <SectionTitle
          action={
            <button onClick={() => openProposal(null)} className="pressable -my-1 flex items-center gap-1 rounded-full px-2 py-1 text-[14px] font-bold text-primary">
              <Plus className="h-4 w-4" strokeWidth={2.4} /> Nova proposta
            </button>
          }
        >
          Propostas salvas <span className="num ml-1 font-medium text-faint">{proposals.length || ""}</span>
        </SectionTitle>
        {proposals.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8 opacity-40" />}>
            Monte a primeira proposta: cliente, itens de serviço e valores. Depois é só gerar o PDF pra enviar.
          </EmptyState>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {proposals.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 py-3 pl-4 pr-2">
                <button onClick={() => openProposal(p.id)} className="min-w-0 flex-1 text-left">
                  <div className="text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{p.clientName}</div>
                  <div className="text-[13px] text-muted-foreground">
                    <span className="num font-semibold text-foreground">{fmtMoney(proposalTotal(p))}</span>
                    {p.fazenda ? ` · ${p.fazenda}` : ""} · {fmtDate((p.updatedAt || p.createdAt || "").slice(0, 10))}
                  </div>
                </button>
                <button
                  onClick={() => {
                    openProposal(p.id)
                    navigate("proposalDocument")
                  }}
                  aria-label={`Gerar PDF da proposta de ${p.clientName}`}
                  className="pressable flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary/12 px-3 text-[13px] font-bold text-primary"
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </button>
                <button
                  onClick={() => remove(p)}
                  aria-label={`Excluir a proposta de ${p.clientName}`}
                  className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-faint hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
