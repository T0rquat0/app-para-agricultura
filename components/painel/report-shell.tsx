"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Download, Loader2 } from "lucide-react"
import { TopBar } from "./chrome"
import { exportElementToPdf } from "@/lib/pdf"

// Largura fixa da "folha" (proporcao A4). A captura para PDF sempre acontece
// nesse tamanho — independente da tela — para o conteudo nunca ser cortado.
const PAPER_W = 760
const PAPER_MIN_H = Math.round(PAPER_W * 1.414) // ~1075

// Paleta do documento tecnico (impressao): verde escuro legivel + acento RTK.
const DOC_GREEN = "#0C3A26"
const DOC_GREEN_2 = "#12694A"
const RTK = "#0E9E63"

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [scale, setScale] = useState(1)
  const [paperH, setPaperH] = useState(PAPER_MIN_H)

  // Escala a folha (largura fixa) para caber na largura disponivel da tela.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const avail = el.clientWidth - 32 // padding lateral
      setScale(Math.min(1, avail / PAPER_W))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Mede a altura real da folha para reservar o espaco certo apos a escala.
  useEffect(() => {
    if (paperRef.current) setPaperH(paperRef.current.offsetHeight)
  })

  async function handleDownload() {
    const paper = paperRef.current
    if (!paper) return
    setBusy(true)

    // Espera React terminar o re-render do setBusy
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    // Clona fora do React — minHeight=0 nao sera resetado por re-renders
    const clone = paper.cloneNode(true) as HTMLElement
    clone.style.transform = "none"
    clone.style.transformOrigin = "top left"
    clone.style.minHeight = "0"
    clone.style.height = "auto"
    clone.style.width = `${PAPER_W}px`
    clone.style.position = "fixed"
    clone.style.top = "0"
    clone.style.left = "0"
    clone.style.zIndex = "9998"
    clone.style.opacity = "1"
    clone.style.pointerEvents = "none"

    // Overlay escuro cobre o clone enquanto captura
    const overlay = document.createElement("div")
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);pointer-events:none"

    document.body.appendChild(clone)
    document.body.appendChild(overlay)

    // Aguarda layout do clone estabilizar
    await new Promise<void>((r) => setTimeout(r, 300))

    try {
      await exportElementToPdf(clone, filename)
    } catch (e) {
      console.error("[v0] erro ao gerar PDF", e)
      alert("Nao foi possivel gerar o PDF. Tente novamente.")
    } finally {
      document.body.removeChild(clone)
      document.body.removeChild(overlay)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={title} subtitle={subtitle} onBack={onBack} showDarkToggle={false} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted px-4 py-5 pb-28">
        {/* Caixa que reserva o espaco da folha ja escalada e a centraliza */}
        <div className="mx-auto" style={{ width: PAPER_W * scale, height: paperH * scale }}>
          {/* Folha tamanho documento (proporcao A4). Cresce com o conteudo, nunca corta. */}
          <div
            ref={paperRef}
            className="relative flex flex-col overflow-hidden rounded-2xl bg-white text-[#1a1a1a]"
            style={{
              colorScheme: "light",
              width: PAPER_W,
              minHeight: PAPER_MIN_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              boxShadow: "0 8px 30px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
            }}
          >
          {/* Moldura interna (papel timbrado) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[7px] rounded-xl"
            style={{ border: `1px solid ${DOC_GREEN}29` }}
          />
          {/* Selo / marca d'agua central */}
          <img
            src="/ags-geo-mark-rtk.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ opacity: 0.04 }}
          />
          {/* Corpo (cresce e empurra o rodape para baixo) */}
          <div className="relative flex flex-1 flex-col px-7 pb-5">
            {children}
            {/* Area de assinatura do responsavel tecnico */}
            <div className="mt-auto pt-10">
              <div className="mx-auto w-[68%] max-w-[260px] text-center">
                <div style={{ borderTop: "1.5px solid #9ca3af" }} className="pt-2">
                  <div className="text-[11px] font-bold text-[#1f2937]">Responsável Técnico</div>
                  <div className="mt-0.5 text-[9.5px] text-[#6b7280]">AGS GEO · Geoprocessamento com Drone</div>
                </div>
              </div>
            </div>
          </div>
          {/* Rodape fixo no pe da folha */}
          <div className="relative" style={{ borderTop: `2px solid ${DOC_GREEN}` }}>
            <div className="px-7 py-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#374151]">
                AGS GEO · uma divisão da AGS Soluções Agrícolas LTDA
              </div>
              {footerNote && <div className="mt-0.5 text-[9px] text-[#9ca3af]">{footerNote}</div>}
            </div>
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
  const now = new Date()
  const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  // Codigo de documento tecnico (ex.: AGS-GEO-20260720-8421)
  const docCode = `AGS-GEO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`

  return (
    <div className="mb-5">
      {/* Faixa de marca (sangra ate as bordas da folha) */}
      <div
        className="-mx-7 flex items-start justify-between gap-3 px-7 py-4 text-white"
        style={{ background: `linear-gradient(135deg, ${DOC_GREEN} 0%, ${DOC_GREEN_2} 100%)` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "#06100b", boxShadow: "0 2px 6px rgba(0,0,0,0.28)" }}
          >
            <img src="/ags-geo-mark-rtk.png" alt="AGS GEO" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <div className="text-[16px] font-extrabold leading-none tracking-wide">
              AGS <span style={{ color: RTK }}>GEO</span>
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
          <div className="mt-0.5 font-mono text-[8px] tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
            {docCode}
          </div>
        </div>
      </div>
      {/* Titulo do relatorio */}
      <div className="border-b border-[#e5e7eb] pb-3 pt-4">
        <h2 className="text-[19px] font-extrabold leading-tight text-[#111827]">{heading}</h2>
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
          accent ? "font-extrabold" : strong ? "font-bold text-[#1a1a1a]" : "font-semibold text-[#1a1a1a]"
        }`}
        style={accent ? { color: DOC_GREEN } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

export function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3
        className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em]"
        style={{ color: DOC_GREEN }}
      >
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-[1px]" style={{ background: RTK }} />
        {title}
      </h3>
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
      <span className="text-[19px] font-extrabold tabular-nums" style={{ color: negative ? "#b42318" : DOC_GREEN }}>
        {value}
      </span>
    </div>
  )
}
