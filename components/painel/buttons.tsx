"use client"

import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(base, "bg-primary px-5 py-3 text-primary-foreground shadow-sm hover:brightness-105", className)}
    />
  )
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "border border-border bg-card px-5 py-3 text-secondary-foreground shadow-sm hover:bg-muted",
        className,
      )}
    />
  )
}

export function GhostButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(base, "px-3 py-2 text-primary hover:bg-muted", className)}
    />
  )
}
