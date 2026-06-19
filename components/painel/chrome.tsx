"use client"

import type { ReactNode } from "react"
import { ArrowLeft, Moon, Sun } from "lucide-react"
import { useNav } from "./nav-context"

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
    <header className="bg-topo px-5 pb-5 pt-safe text-white">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-[13px] font-medium text-white/65">{subtitle}</p>}
        </div>
        {showDarkToggle && (
          <button
            onClick={toggleDark}
            aria-label="Alternar modo escuro"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        )}
        {children}
      </div>
    </header>
  )
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`mb-3 mt-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground ${className}`}>
      {children}
    </h2>
  )
}

export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center text-muted-foreground">
      {icon}
      <p className="max-w-xs text-sm leading-relaxed text-pretty">{children}</p>
    </div>
  )
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-green-light ${className}`}>
      <div
        className="h-full rounded-full bg-cta transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
