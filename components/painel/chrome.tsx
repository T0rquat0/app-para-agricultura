"use client"

import type { ReactNode } from "react"
import { ArrowLeft, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNav } from "./nav-context"
import { IconButton } from "./buttons"

export function TopBar({
  title,
  subtitle,
  onBack,
  showDarkToggle = true,
  children,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  showDarkToggle?: boolean
  children?: ReactNode
}) {
  const { dark, toggleDark } = useNav()
  return (
    <header className="relative z-10 rounded-b-[28px] bg-topo px-5 pb-5 pt-safe text-white shadow-[0_12px_30px_-16px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3">
        {onBack && (
          <IconButton onClick={onBack} aria-label="Voltar" className="bg-white/15 text-white hover:bg-white/25">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </IconButton>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-[13px] font-medium text-white/65">{subtitle}</p>}
        </div>
        {showDarkToggle && (
          <IconButton
            onClick={toggleDark}
            aria-label="Alternar modo escuro"
            className="bg-white/15 text-white hover:bg-white/25"
          >
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </IconButton>
        )}
        {children}
      </div>
    </header>
  )
}

// Cartao base — superficie padrao do "centro de operacoes" (hairline + sombra sutil)
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
        "rounded-2xl border border-border bg-card shadow-sm",
        interactive && "transition-all hover:border-primary/40 active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </div>
  )
}

// Indicador numerico compacto (KPI) com micro-rotulo tecnico
export function StatCard({
  label,
  value,
  unit,
  accent = false,
  className,
}: {
  label: string
  value: string
  unit?: string
  accent?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card",
        className,
      )}
    >
      <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className={cn("num text-[17px] font-bold leading-none", accent && "text-primary")}>{value}</div>
      {unit && <div className="mt-1 text-[10px] text-muted-foreground">{unit}</div>}
    </div>
  )
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "mb-3 mt-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-primary/60" />
      {children}
    </h2>
  )
}

export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-12 text-center text-muted-foreground">
      {icon}
      <p className="max-w-xs text-sm leading-relaxed text-pretty">{children}</p>
    </div>
  )
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn("overflow-hidden rounded-full bg-green-light", className)}>
      <div
        className="h-full rounded-full bg-cta transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
