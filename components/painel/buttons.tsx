"use client"

import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const base =
  "pressable inline-flex items-center justify-center gap-2 rounded-[14px] text-[15px] font-bold disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

// Acao principal da tela: o unico botao cheio no sinal
export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cn(base, "min-h-12 bg-primary px-5 text-primary-foreground", className)} />
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(base, "min-h-12 border border-border bg-raised px-5 text-foreground hover:border-foreground/20", className)}
    />
  )
}

export function GhostButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cn(base, "min-h-10 px-3 text-primary hover:bg-raised", className)} />
}

export function DangerButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(base, "min-h-12 border border-destructive/35 bg-destructive/10 px-5 text-destructive hover:bg-destructive/15", className)}
    />
  )
}

// Botao de icone: quadrado arredondado de 40px (voltar, editar, camadas...)
export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-raised text-foreground hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        className,
      )}
    />
  )
}
