"use client"

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Field({
  label,
  hint,
  children,
}: {
  label?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mb-3.5">
      {label && (
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </label>
      )}
      {children}
      {hint && <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-xs leading-relaxed text-muted-foreground", className)}>{children}</div>
}

const fieldBase =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/25"

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />
}

// Entrada de dados numericos/coordenadas — monoespacada (tabular)
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input inputMode="decimal" {...props} className={cn(fieldBase, "num tracking-tight", props.className)} />
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select {...props} className={cn(fieldBase, "appearance-none pr-9", props.className)}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
