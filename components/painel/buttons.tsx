"use client"

import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "bg-cta px-5 py-3 text-cta-foreground shadow-sm shadow-primary/20 hover:brightness-110",
        className,
      )}
    />
  )
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "border border-border bg-card px-5 py-3 text-secondary-foreground shadow-sm hover:border-primary/40 hover:bg-muted",
        className,
      )}
    />
  )
}

export function GhostButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cn(base, "px-3 py-2 text-primary hover:bg-muted", className)} />
}

export function DangerButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "border border-destructive/30 bg-destructive/10 px-5 py-3 text-destructive hover:bg-destructive/15",
        className,
      )}
    />
  )
}

// Botao de icone circular — usado em barras e cabecalhos (voltar, tema, etc.)
export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95",
        className,
      )}
    />
  )
}
