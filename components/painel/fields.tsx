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
        <label className="mb-1.5 block text-[13px] font-bold text-foreground">{label}</label>
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
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={cn(fieldBase, "appearance-none pr-9", props.className)}>
      {children}
    </select>
  )
}
