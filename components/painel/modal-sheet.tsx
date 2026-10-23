"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"

// Folha que sobe de baixo (no computador, centralizada). Fecha no X, no Esc ou tocando fora.
export function ModalSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 duration-200 animate-in fade-in sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] border-t border-border bg-popover px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3 shadow-[0_-16px_40px_rgba(0,0,0,0.5)] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in slide-in-from-bottom-8 sm:rounded-[24px] sm:border">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-foreground/20 sm:hidden" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-bold tracking-[-0.01em] text-balance">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-raised text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
