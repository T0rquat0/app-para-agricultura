"use client"

import { useRef, useState, type ReactNode } from "react"
import { Download, Loader2 } from "lucide-react"
import { TopBar } from "./chrome"
import { exportElementToPdf } from "@/lib/pdf"

// Estrutura comum dos relatorios: barra superior, "folha" A4 pronta para PDF
// e botao fixo de download.
export function ReportShell({
  title,
  subtitle,
  filename,
  onBack,
  children,
  footerNote,
}: {
  title: string
  subtitle?: string
  filename: string
  onBack: () => void
  children: ReactNode
  footerNote?: string
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
        {/* Folha A4 (proporcao constante em qualquer largura) */}
        <div
          ref={paperRef}
          className="relative mx-auto flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-white text-[#1a1a1a]"
          style={{
            colorScheme: "light",
            aspectRatio: "1 / 1.414",
            boxShadow: "0 8px 30px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
          }}
        >
          {/* Selo / marca d'agua central bem tenue */}
          <img
            src="/ags-geo-mark-trim.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[56%] w-[60%] -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ opacity: 0.04 }}
          />
          {/* Corpo (cresce e empurra o rodape para baixo) */}
          <div className="relative flex flex-1 flex-col px-7 pb-5">{children}</div>
          {/* Rodape fixo no pe da folha */}
          <div style={{ borderTop: "2px solid #1A4228" }}>
            <div className="px-7 py-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#374151]">
                AGS GEO · uma divisão da AGS Soluções Agrícolas LTDA
              </div>
              {footerNote && <div className="mt-0.5 text-[9px] text-[#9ca3af]">{footerNote}</div>}
            </div>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        <button
          onClick={handleDownload}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cta py-3.5 text-sm font-bold text-cta-foreground shadow-sm transition-all hover:brightness-105 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-[18px] w-[18px]" />}
          {busy ? "Gerando PDF…" : "Baixar PDF"}
        </button>
      </div>
    </div>
  )
}

// Cabecalho do documento: faixa verde da marca + faixa do titulo do relatorio.
export function ReportHeader({
  heading,
  meta,
  docType,
}: {
  heading: string
  meta?: string
  docType?: string
}) {
  const date = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  return (
    <div className="mb-5">
      {/* Faixa de marca (sangra ate as bordas da folha) */}
      <div
        className="-mx-7 flex items-start justify-between gap-3 px-7 py-5 text-white"
        style={{ background: "linear-gradient(135deg, #163b22 0%, #225a37 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white"
            style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}
          >
            <img src="/ags-geo-mark-trim.png" alt="AGS GEO" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <div className="text-[16px] font-extrabold leading-none tracking-wide">
              AGS <span style={{ color: "#E3B53D" }}>GEO</span>
            </div>
            <div className="mt-1 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.78)" }}>
              Levantamento e Geoprocessamento
            </div>
          </div>
        </div>
        <div className="text-right">
          {docType && (
            <div
              className="mb-1.5 inline-block rounded-full px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.1em]"
              style={{ background: "rgba(255,255,255,0.16)" }}
            >
              {docType}
            </div>
          )}
          <div className="text-[9.5px]" style={{ color: "rgba(255,255,255,0.82)" }}>
            {date}
          </div>
        </div>
      </div>
      {/* Titulo do relatorio */}
      <div className="border-b border-[#e5e7eb] pb-4 pt-5">
        <h2 className="text-[20px] font-extrabold leading-tight text-[#111827]">{heading}</h2>
        {meta && <p className="mt-1 text-[12px] font-medium text-[#6b7280]">{meta}</p>}
      </div>
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
      <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1A4228]">{title}</h3>
      {children}
    </div>
  )
}

// Box de total em destaque (verde para valores positivos, vermelho para negativos).
export function ReportTotal({
  label,
  value,
  tone = "positive",
}: {
  label: string
  value: string
  tone?: "positive" | "negative"
}) {
  const negative = tone === "negative"
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3.5"
      style={{
        background: negative ? "#fdeceb" : "#eef6f0",
        border: `1px solid ${negative ? "#f3c2bf" : "#cfe7d8"}`,
      }}
    >
      <span className="text-[13px] font-bold text-[#1a1a1a]">{label}</span>
      <span className="text-[19px] font-extrabold tabular-nums" style={{ color: negative ? "#b42318" : "#1A4228" }}>
        {value}
      </span>
    </div>
  )
}
