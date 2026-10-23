"use client"

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4", className)}>
      {label && <label className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{label}</label>}
      {children}
      {hint && <div className="mt-1.5 text-[12.5px] leading-relaxed text-faint">{hint}</div>}
    </div>
  )
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-[13px] leading-relaxed text-muted-foreground", className)}>{children}</div>
}

// 16px no campo: o iPhone nao da zoom ao tocar
const fieldBase =
  "w-full min-h-12 rounded-[14px] border border-input bg-raised px-3.5 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/25"

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />
}

// Numeros (hectares, reais): algarismos tabulares
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input inputMode="decimal" {...props} className={cn(fieldBase, "num", props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, "min-h-[88px] resize-y", props.className)} />
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select {...props} className={cn(fieldBase, "appearance-none pr-10", props.className)}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
