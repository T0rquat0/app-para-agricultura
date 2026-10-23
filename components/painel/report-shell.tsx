"use client"

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Download, Loader2 } from "lucide-react"
import { TopBar } from "./chrome"
import { PrimaryButton } from "./buttons"
import { exportElementToPdf } from "@/lib/pdf"
import { corDoAndamento } from "@/lib/geo"

// Largura fixa da "folha" (proporcao A4). A captura para PDF sempre acontece
// nesse tamanho — independente da tela — para o conteudo nunca ser cortado.
const PAPER_W = 760
const PAPER_MIN_H = Math.round((PAPER_W * 297) / 210) // uma pagina A4 (~1075px)

// Papel: cores fixas (o PDF e impresso e enviado por e-mail, sempre claro).
// Mesma tinta e mesmo sinal do tema claro do app (DESIGN.md), em hex puro porque
// o html2canvas nao entende oklch/color-mix.
export const DOC = {
  ink: "#0b1218",
  muted: "#4f5a64",
  faint: "#66717b",
  rule: "#dde1e5",
  ruleStrong: "#0b1218",
  wash: "#f3f5f7",
  track: "#e6e9ec",
  signal: "#0a7fbf",
  positive: "#1d7a4f",
  danger: "#c4242a",
}

const NUM: CSSProperties = { fontVariantNumeric: "tabular-nums" }

// Codigo do documento (ex.: AGS-GEO-20261023), o mesmo do cabecalho e do rodape das paginas.
function docCode(now = new Date()) {
  return `AGS-GEO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
}

// Estrutura comum dos documentos: barra superior, "folha" pronta para PDF e botao de download.
// `docType` + `subtitle` viram o cabecalho e o rodape de cada pagina do PDF.
export function ReportShell({
  title,
  subtitle,
  docType,
  filename,
  onBack,
  children,
  footerNote,
  signature = true,
}: {
  title: string
  subtitle?: string
  docType?: string
  filename: string
  onBack: () => void
  children: ReactNode
  footerNote?: string
  // Linha do responsavel tecnico no fim do documento (a proposta tem o aceite proprio).
  signature?: boolean
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
    clone.style.borderRadius = "0"
    clone.style.boxShadow = "none"
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

    // Aguarda layout do clone estabilizar (e as imagens do clone carregarem)
    await new Promise<void>((r) => setTimeout(r, 300))

    try {
      await exportElementToPdf(clone, filename)
    } catch (e) {
      console.error("[pdf] erro ao gerar PDF", e)
      alert("Não foi possível gerar o PDF. Tente novamente.")
    } finally {
      document.body.removeChild(clone)
      document.body.removeChild(overlay)
      setBusy(false)
    }
  }

  const running = [docType || title, subtitle].filter(Boolean).join(" · ")

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={title} subtitle={subtitle} onBack={onBack} showDarkToggle={false} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted px-4 py-5 pb-28">
        {/* Caixa que reserva o espaco da folha ja escalada e a centraliza */}
        <div className="mx-auto" style={{ width: PAPER_W * scale, height: paperH * scale }}>
          {/* Folha (proporcao A4). Cresce com o conteudo, nunca corta; o PDF pagina em A4. */}
          <div
            ref={paperRef}
            data-pdf-running={running}
            data-pdf-code={docCode()}
            className="relative flex flex-col overflow-hidden rounded-[4px] bg-white"
            style={{
              colorScheme: "light",
              color: DOC.ink,
              width: PAPER_W,
              minHeight: PAPER_MIN_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              boxShadow: "0 12px 32px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex flex-1 flex-col px-12 pb-10 pt-10">
              {children}
              {/* Fecho do documento: responsavel tecnico e a empresa */}
              <div className="mt-auto pt-14" data-pdf-keep>
                {signature && (
                  <div className="mb-8 w-[260px]">
                    <div className="h-14" />
                    <div style={{ borderTop: `1px solid ${DOC.ink}` }} className="pt-2">
                      <div className="text-[12px] font-bold">Responsável técnico</div>
                      <div className="mt-0.5 text-[11px]" style={{ color: DOC.muted }}>
                        AGS GEO · Levantamento e Geoprocessamento
                      </div>
                    </div>
                  </div>
                )}
                <div
                  className="flex items-baseline justify-between gap-6 pt-3 text-[11px]"
                  style={{ borderTop: `1px solid ${DOC.rule}`, color: DOC.muted }}
                >
                  <span>
                    <span className="font-bold" style={{ color: DOC.ink }}>
                      AGS GEO
                    </span>{" "}
                    · uma divisão da AGS Soluções Agrícolas LTDA
                  </span>
                  {footerNote && <span className="text-right">{footerNote}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <PrimaryButton onClick={handleDownload} disabled={busy} className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-[18px] w-[18px]" />}
          {busy ? "Gerando PDF…" : "Baixar PDF"}
        </PrimaryButton>
      </div>
    </div>
  )
}

// Marca do app no papel: o losango do sinal dentro do quadrado escuro (mesma da tela inicial).
function DocMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
      style={{ background: DOC.ink }}
    >
      <span className="block h-3 w-3" style={{ border: "2.2px solid #4cc3ff", transform: "rotate(45deg)" }} />
    </span>
  )
}

// Cabecalho do documento: marca e divisao a esquerda; tipo, data e numero a direita;
// filete forte; depois o titulo (cliente ou periodo) grande, com a linha de contexto.
export function ReportHeader({
  heading,
  meta,
  docType,
  children,
}: {
  heading: string
  meta?: string
  docType?: string
  // Linha extra abaixo do titulo (ex.: faixa de numeros)
  children?: ReactNode
}) {
  const now = new Date()
  const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  return (
    <header className="mb-9" data-pdf-keep>
      <div className="flex items-start justify-between gap-6 pb-4" style={{ borderBottom: `2px solid ${DOC.ruleStrong}` }}>
        <div className="flex items-center gap-3">
          <DocMark />
          <div>
            <div className="text-[17px] font-extrabold leading-none tracking-[-0.01em]">AGS GEO</div>
            <div className="mt-1 text-[11.5px]" style={{ color: DOC.muted }}>
              Levantamento e Geoprocessamento
            </div>
          </div>
        </div>
        <div className="text-right">
          {docType && <div className="text-[13px] font-bold leading-tight">{docType}</div>}
          <div className="mt-1 text-[11.5px]" style={{ color: DOC.muted, ...NUM }}>
            {date}
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: DOC.faint, ...NUM }}>
            Nº {docCode(now)}
          </div>
        </div>
      </div>
      <div className="pt-7">
        <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.025em] [text-wrap:balance]">{heading}</h1>
        {meta && (
          <p className="mt-2 text-[14px]" style={{ color: DOC.muted, ...NUM }}>
            {meta}
          </p>
        )}
      </div>
      {children}
    </header>
  )
}

// Faixa de numeros-chave: divididos por filetes verticais, o primeiro maior (como no app).
export function ReportFigures({
  items,
}: {
  items: { label: string; value: string; unit?: string; tone?: "signal" | "negative" | "positive"; bar?: number }[]
}) {
  return (
    <div
      className="mt-7 grid"
      data-pdf-keep
      style={{
        gridTemplateColumns: items.map((_, i) => (i === 0 ? "1.35fr" : "1fr")).join(" "),
        borderTop: `1px solid ${DOC.rule}`,
        borderBottom: `1px solid ${DOC.rule}`,
      }}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`py-4 ${i === 0 ? "pr-5" : "px-5"}`}
          style={i > 0 ? { borderLeft: `1px solid ${DOC.rule}` } : undefined}
        >
          <div className="text-[12px] font-semibold" style={{ color: DOC.muted }}>
            {it.label}
          </div>
          <div
            className={`mt-1.5 font-extrabold leading-none tracking-[-0.02em] ${i === 0 ? "text-[30px]" : "text-[22px]"}`}
            style={{
              ...NUM,
              color:
                it.tone === "signal" ? DOC.signal : it.tone === "negative" ? DOC.danger : it.tone === "positive" ? DOC.positive : DOC.ink,
            }}
          >
            {it.value}
            {it.unit && (
              <span className={`ml-1 font-semibold tracking-normal ${i === 0 ? "text-[15px]" : "text-[13px]"}`} style={{ color: DOC.muted }}>
                {it.unit}
              </span>
            )}
          </div>
          {it.bar != null && (
            <div className="mt-3">
              <ReportProgress pct={it.bar} width={150} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Linha rotulo / valor (dados do projeto, calculos). Valor alinhado a direita, tabular.
export function ReportRow({
  label,
  value,
  strong,
  accent,
  hint,
}: {
  label: string
  value: string
  strong?: boolean
  accent?: boolean
  hint?: string
}) {
  return (
    <div
      data-pdf-keep
      className="flex items-baseline justify-between gap-6 py-2.5"
      style={{ borderBottom: `1px solid ${DOC.rule}` }}
    >
      <span className={`text-[13px] ${strong ? "font-bold" : ""}`} style={{ color: strong ? DOC.ink : DOC.muted }}>
        {label}
        {hint && (
          <span className="block text-[11.5px]" style={{ color: DOC.faint }}>
            {hint}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 text-right text-[13.5px] ${accent || strong ? "font-bold" : "font-semibold"}`}
        style={{ ...NUM, color: accent ? DOC.signal : DOC.ink }}
      >
        {value}
      </span>
    </div>
  )
}

// Secao: titulo em caixa normal com filete forte embaixo, conteudo logo abaixo.
export function ReportSection({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-9">
      <div
        data-pdf-keep-next
        className="flex items-baseline justify-between gap-4 pb-2"
        style={{ borderBottom: `1.5px solid ${DOC.ruleStrong}` }}
      >
        <h2 className="text-[15px] font-bold leading-tight tracking-[-0.005em]">{title}</h2>
        {aside && (
          <span className="text-[12px]" style={{ color: DOC.muted, ...NUM }}>
            {aside}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

// Subtitulo dentro de uma secao (ex.: "Coleta de dados em campo").
export function ReportSubhead({ children }: { children: ReactNode }) {
  return (
    <div data-pdf-keep-next className="mt-5 pb-1 text-[12.5px] font-bold" style={{ color: DOC.muted }}>
      {children}
    </div>
  )
}

export interface ReportColumn {
  label: string
  align?: "left" | "right" | "center"
  width?: string
}

// Tabela do documento: filetes, numeros a direita, sem zebra. `foot` vira a linha de total.
export function ReportTable({
  columns,
  rows,
  foot,
}: {
  columns: ReportColumn[]
  rows: { key: string; cells: ReactNode[] }[]
  foot?: ReactNode[]
}) {
  const align = (c: ReportColumn) => (c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left")
  return (
    <table className="w-full border-collapse text-[13px]" style={{ tableLayout: "fixed", ...NUM }}>
      <colgroup>
        {columns.map((c, i) => (
          <col key={i} style={c.width ? { width: c.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr data-pdf-keep-next>
          {columns.map((c, i) => (
            <th
              key={i}
              className={`pb-2 pt-3 align-bottom text-[11.5px] font-semibold ${align(c)} ${i > 0 ? "pl-3" : ""}`}
              style={{ color: DOC.faint, borderBottom: `1px solid ${DOC.rule}` }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} data-pdf-keep>
            {r.cells.map((cell, i) => (
              <td
                key={i}
                className={`py-2.5 align-top ${align(columns[i])} ${i > 0 ? "pl-3" : ""}`}
                style={{ borderBottom: `1px solid ${DOC.rule}` }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {foot && (
        <tfoot>
          <tr data-pdf-keep>
            {foot.map((cell, i) => (
              <td
                key={i}
                className={`pb-1 pt-3 align-top font-bold ${align(columns[i])} ${i > 0 ? "pl-3" : ""}`}
                style={{ borderTop: `1.5px solid ${DOC.ruleStrong}` }}
              >
                {cell}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  )
}

// Texto secundario dentro de uma celula (detalhe abaixo do nome).
export function CellNote({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 block text-[11.5px] font-normal leading-snug" style={{ color: DOC.faint }}>
      {children}
    </span>
  )
}

// Lista com marcador: o losango pequeno da marca.
export function ReportList({ items, tone = "muted" }: { items: ReactNode[]; tone?: "muted" | "ink" }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed" style={{ color: tone === "ink" ? DOC.ink : DOC.muted }}>
          <span
            aria-hidden="true"
            className="mt-[8px] block h-[5px] w-[5px] shrink-0"
            style={{ background: DOC.faint, transform: "rotate(45deg)" }}
          />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

// Caixa de observacao (fundo lavado, sem cor de marca).
export function ReportNote({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div data-pdf-keep className="mt-3 rounded-[10px] px-4 py-3 text-[12.5px] leading-relaxed" style={{ background: DOC.wash }}>
      {label && <span className="font-bold">{label} </span>}
      <span style={{ color: DOC.muted }}>{children}</span>
    </div>
  )
}

// Barra de andamento: trilho claro e preenchimento na cor da faixa do percentual voado.
export function ReportProgress({ pct, width = 120 }: { pct: number; width?: number }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    // Larguras em px (nao em %): o html2canvas as vezes perde o preenchimento percentual.
    <span className="relative inline-block h-[6px] shrink-0 rounded-full align-middle" style={{ width, background: DOC.track }}>
      {p > 0 && (
        <span
          className="absolute left-0 top-0 block h-[6px] rounded-full"
          style={{ width: Math.max(6, (width * p) / 100), background: corDoAndamento(p) }}
        />
      )}
    </span>
  )
}

// Total em destaque: filete forte em cima, rotulo a esquerda, valor grande a direita.
export function ReportTotal({
  label,
  value,
  tone = "positive",
  hint,
}: {
  label: string
  value: string
  tone?: "positive" | "negative"
  hint?: string
}) {
  const negative = tone === "negative"
  return (
    <div
      data-pdf-keep
      className="mt-4 flex items-end justify-between gap-6 pt-3"
      style={{ borderTop: `2px solid ${DOC.ruleStrong}` }}
    >
      <span>
        <span className="block text-[14px] font-bold">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11.5px]" style={{ color: DOC.faint }}>
            {hint}
          </span>
        )}
      </span>
      <span
        className="text-[26px] font-extrabold leading-none tracking-[-0.02em]"
        style={{ ...NUM, color: negative ? DOC.danger : DOC.ink }}
      >
        {value}
      </span>
    </div>
  )
}

// Ficha tecnica: rotulo em coluna fixa, descricao ao lado.
export function ReportSpecs({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div>
      {items.map((item) => (
        <div
          key={item.label}
          data-pdf-keep
          className="grid grid-cols-[150px_1fr] gap-4 py-2 text-[12.5px]"
          style={{ borderBottom: `1px solid ${DOC.rule}` }}
        >
          <span className="font-semibold">{item.label}</span>
          <span style={{ color: DOC.muted }}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
