"use client"

import { useState } from "react"
import { FileText, Plus, Trash2 } from "lucide-react"
import { useNav } from "../nav-context"
import { useProposals, useRefresh } from "@/lib/hooks"
import { deleteProposal } from "@/lib/storage"
import { proposalTotal } from "@/lib/calculations"
import { fmtDate, fmtMoney } from "@/lib/format"
import type { Proposal } from "@/lib/types"
import { TopBar, EmptyState, SectionTitle } from "../chrome"
import { ConfirmDeleteSheet } from "../modals"

export function ProposalsScreen() {
  const { openProposal, navigate } = useNav()
  const { proposals, isLoading } = useProposals()
  const refresh = useRefresh()
  const [pendingDelete, setPendingDelete] = useState<Proposal | null>(null)

  async function remove(p: Proposal) {
    await deleteProposal(p.id)
    setPendingDelete(null)
    refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Propostas" subtitle="Documentos comerciais para clientes" />

      <div className="flex-1 px-4 pb-8 pt-3">
        <SectionTitle
          action={
            <button
              onClick={() => openProposal(null)}
              className="pressable -my-2 -mr-2 flex min-h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} /> Nova proposta
            </button>
          }
        >
          Propostas salvas <span className="num ml-1 font-medium text-faint">{proposals.length || ""}</span>
        </SectionTitle>
        {isLoading ? (
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[68px]" />
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8 opacity-40" />}>
            Monte a primeira proposta: cliente, itens de serviço e valores. Depois é só gerar o PDF e enviar.
          </EmptyState>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
            {proposals.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 py-2 pl-1.5 pr-1.5">
                <button
                  data-proposal-row
                  onClick={() => openProposal(p.id)}
                  className="pressable min-w-0 flex-1 rounded-[12px] px-2.5 py-1.5 text-left hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <div className="text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{p.clientName}</div>
                  <div className="num mt-0.5 text-[13px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{fmtMoney(proposalTotal(p))}</span>
                    {p.fazenda ? ` · ${p.fazenda}` : ""} · {fmtDate((p.updatedAt || p.createdAt || "").slice(0, 10))}
                  </div>
                </button>
                <button
                  onClick={() => {
                    openProposal(p.id)
                    navigate("proposalDocument")
                  }}
                  aria-label={`Gerar PDF da proposta de ${p.clientName}`}
                  className="pressable flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary/12 px-3.5 text-[14px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <FileText className="h-4 w-4" /> PDF
                </button>
                <button
                  onClick={() => setPendingDelete(p)}
                  aria-label={`Excluir a proposta de ${p.clientName}`}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-faint hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDeleteSheet
          title="Excluir proposta"
          confirmLabel="Excluir proposta"
          onConfirm={() => remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        >
          A proposta de <strong className="font-semibold text-foreground">{pendingDelete.clientName}</strong> (
          <span className="num">{fmtMoney(proposalTotal(pendingDelete))}</span>) será apagada. Esta ação não pode ser
          desfeita.
        </ConfirmDeleteSheet>
      )}
    </div>
  )
}
