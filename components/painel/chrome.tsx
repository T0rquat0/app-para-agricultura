"use client"

import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtMoney } from "@/lib/format"
import { IconButton } from "./buttons"

// Cabecalho das telas internas: voltar, titulo e acoes, direto sobre o chao escuro.
export function TopBar({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  // mantido por compatibilidade; o tema agora troca no menu da conta, na tela inicial
  showDarkToggle?: boolean
  children?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 bg-background/95 px-4 pb-3 pt-safe">
      <div className="flex min-h-10 items-center gap-3">
        {onBack && (
          <IconButton onClick={onBack} aria-label="Voltar">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </IconButton>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
          {subtitle && <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  )
}

// Superficie padrao: um tom acima do chao e um filete; sem sombra (so o que flutua tem sombra).
export function Card({
  className,
  interactive = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[18px] border border-border bg-card",
        interactive && "pressable cursor-pointer hover:border-foreground/15",
        className,
      )}
    >
      {children}
    </div>
  )
}

// Numero com rotulo pequeno em cima (rotulo em caixa normal, numero tabular)
export function StatCard({
  label,
  value,
  unit,
  accent = false,
  valueClassName,
  className,
}: {
  label: string
  value: string
  unit?: string
  accent?: boolean
  // cor do numero (ex.: corDoFluxo para entrada/saida)
  valueClassName?: string
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card px-3.5 py-3", className)}>
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={cn("num mt-0.5 text-[19px] font-bold leading-tight", accent && "text-primary", valueClassName)}>{value}</div>
      {unit && <div className="text-[12px] text-faint">{unit}</div>}
    </div>
  )
}

export function SectionTitle({
  children,
  count,
  action,
  className = "",
}: {
  children: ReactNode
  count?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-2.5 mt-1 flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-[15px] font-bold">{children}</h2>
      {action ?? (count !== undefined && <span className="num text-[14px] text-faint">{count}</span>)}
    </div>
  )
}

export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-foreground/15 px-5 py-10 text-center text-muted-foreground">
      {icon}
      <p className="max-w-xs text-sm leading-relaxed text-pretty">{children}</p>
    </div>
  )
}

// Barra de andamento: trilho por tom, preenchimento no sinal (ou neutro quando ja fechou)
export function ProgressBar({
  value,
  done = false,
  cor,
  className = "",
}: {
  value: number
  done?: boolean
  cor?: string
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn("h-1 overflow-hidden rounded-full bg-track", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", done ? "bg-foreground/45" : "bg-primary")}
        style={{ width: `${pct}%`, ...(cor ? { background: cor } : {}) }}
      />
    </div>
  )
}

// ---- Dinheiro com cor de fluxo ----
// Entrada (faturado, comissao a receber) em verde; saida (gasto, investimento, desconto,
// adiantamento) em vermelho com "−"; saldo/margem verde se positivo, vermelho se negativo.
export type Fluxo = "entrada" | "saida" | "saldo"

export function corDoFluxo(fluxo: Fluxo, valor: number): string {
  if (fluxo === "entrada") return valor === 0 ? "" : "text-positive"
  if (fluxo === "saida") return valor === 0 ? "" : "text-destructive"
  return valor > 0 ? "text-positive" : valor < 0 ? "text-destructive" : ""
}

export function Dinheiro({ valor, fluxo, className }: { valor: number; fluxo: Fluxo; className?: string }) {
  const negativo = fluxo === "saida" ? valor !== 0 : valor < 0
  return (
    <span className={cn("num whitespace-nowrap", corDoFluxo(fluxo, valor), className)}>
      {negativo ? "− " : ""}
      {fmtMoney(Math.abs(valor))}
    </span>
  )
}
