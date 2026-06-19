"use client"

import { useRef, useState, type ReactNode } from "react"
import { Download, Loader2 } from "lucide-react"
import { TopBar } from "./chrome"
import { exportElementToPdf } from "@/lib/pdf"

// Estrutura comum dos relatorios: barra superior, area branca "papel"
// pronta para PDF e botao fixo de download.
export function ReportShell({
  title,
  subtitle,
  filename,
  onBack,
  children,
}: {
  title: string
  subtitle?: string
  filename: string
  onBack: () => void
  children: ReactNode
}) {
  const paperRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleDownload() {
    if (!paperRef.current) return
    setBusy(true)
    try {
      await exportElementToPdf(paperRef.current, filename)
    } catch (e) {
      console.error("[v0] erro ao gerar PDF", e)
      alert("Não foi possível gerar o PDF. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={title} subtitle={subtitle} onBack={onBack} showDarkToggle={false} />
      <div className="flex-1 overflow-y-auto bg-muted px-4 py-5 pb-28">
        <div
          ref={paperRef}
          className="relative mx-auto w-full max-w-[440px] overflow-hidden rounded-2xl bg-white p-6 text-[#1a1a1a] shadow-sm ring-1 ring-black/5"
          style={{ colorScheme: "light" }}
        >
          {/* Marca d'agua (fundo branco do logo some sobre o papel branco) */}
          <img
            src="/ags-mark.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 bottom-8 w-72 select-none opacity-[0.06]"
          />
          <div className="relative">{children}</div>
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        <button
          onClick={handleDownload}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-[18px] w-[18px]" />}
          {busy ? "Gerando PDF…" : "Baixar PDF"}
        </button>
      </div>
    </div>
  )
}

// Cabecalho do "papel" do relatorio (logo textual + data).
export function ReportHeader({ heading, meta }: { heading: string; meta?: string }) {
  return (
    <div className="mb-5 border-b-2 border-[#1A4228] pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/ags-mark.png"
            alt="AGS"
            className="h-10 w-10 shrink-0 rounded-lg object-contain ring-1 ring-black/5"
          />
          <div>
            <div className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#1A4228]">
              AGS Soluções Agrícolas
            </div>
            <div className="text-[10px] font-medium text-[#6b7280]">Geoprocessamento com Drone</div>
          </div>
        </div>
        <div className="text-right text-[10px] text-[#6b7280]">
          {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>
      <h2 className="mt-3 text-lg font-extrabold text-[#1a1a1a]">{heading}</h2>
      {meta && <p className="text-xs font-medium text-[#6b7280]">{meta}</p>}
    </div>
  )
}

export function ReportRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string
  value: string
  strong?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 ${strong ? "border-t border-[#e5e7eb]" : ""}`}
      style={{ borderBottom: "1px solid #f1f1f1" }}
    >
      <span className={`text-[13px] ${strong ? "font-bold text-[#1a1a1a]" : "text-[#4b5563]"}`}>{label}</span>
      <span
        className={`text-[13px] tabular-nums ${
          accent ? "font-extrabold text-[#1A4228]" : strong ? "font-bold text-[#1a1a1a]" : "font-semibold text-[#1a1a1a]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1A4228]">{title}</h3>
      {children}
    </div>
  )
}
