"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Download, Loader2, ArrowLeft } from "lucide-react"
import { exportElementToPdf } from "@/lib/pdf"

/**
 * Demonstracao de croqui de localizacao (A2 paisagem) no visual do app:
 * canvas claro + faixas escuras. Serve como gabarito para reproduzir no QGIS.
 * Todas as cores sao hex inline para o PDF sair fiel (sem oklch do Tailwind).
 */

// Paleta (a mesma da especificacao / identidade do app)
const DARK = "#0B1512" // faixas escuras (cabecalho / painel)
const DARK_2 = "#122A20" // gradiente da faixa
const CANVAS = "#F5F3EE" // fundo do mapa
const EMERALD = "#2FD48A" // acento RTK / agricultavel
const GREEN_DEEP = "#0E9E63" // contorno da agricultavel
const TEAL = "#0F766E" // reserva legal (verde azulado, distinto do agricultavel)
const BLUE = "#1F77BF" // APP / hidrografia
const GRID = "#C9CFC9" // malha de coordenadas
const CONTOUR = "#B7BEB4" // curvas de nivel
const TEXT_LIGHT = "#EAF2EC"
const TEXT_MUT = "#9DB0A6"

// Dimensoes da folha A2 paisagem (594 x 420 mm) em px de trabalho
const SHEET_W = 1400
const SHEET_H = Math.round(SHEET_W * (420 / 594)) // ~990

// Dados reais do levantamento
const DATA = {
  imovel: "VILA ALTA",
  municipio: "Boa Vista · RR",
  areaTotal: "1.220,92 ha",
  agricultavel: "736,28 ha",
  reserva: "441,73 ha",
  app: "42,91 ha",
  datum: "SIRGAS 2000 · UTM 20N · EPSG 31974",
  resp: "Anderson Arruda",
  drone: "DJI Matrice 4E + D-RTK 3",
  proc: "Metashape · AgroCAD · QGIS 3.x",
}

export default function CroquiPage() {
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [busy, setBusy] = useState(false)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setScale(Math.min(1, (el.clientWidth - 48) / SHEET_W))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function handleDownload() {
    const sheet = sheetRef.current
    if (!sheet) return
    setBusy(true)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    const clone = sheet.cloneNode(true) as HTMLElement
    clone.style.transform = "none"
    clone.style.transformOrigin = "top left"
    clone.style.width = `${SHEET_W}px`
    clone.style.height = `${SHEET_H}px`
    clone.style.position = "fixed"
    clone.style.top = "0"
    clone.style.left = "0"
    clone.style.zIndex = "9998"
    clone.style.pointerEvents = "none"

    const overlay = document.createElement("div")
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);pointer-events:none"

    document.body.appendChild(clone)
    document.body.appendChild(overlay)
    await new Promise<void>((r) => setTimeout(r, 300))

    try {
      await exportElementToPdf(clone, "croqui-vila-alta.pdf", { orientation: "landscape" })
    } catch (e) {
      console.error("[v0] erro ao gerar croqui", e)
      alert("Não foi possível gerar o PDF. Tente novamente.")
    } finally {
      document.body.removeChild(clone)
      document.body.removeChild(overlay)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Barra superior simples */}
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <a
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao app
        </a>
        <div className="text-center">
          <div className="text-[13px] font-extrabold text-foreground">Croqui de Localização</div>
          <div className="text-[11px] text-muted-foreground">Demonstração · gabarito para QGIS</div>
        </div>
        <button
          onClick={handleDownload}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-cta px-4 py-2.5 text-[13px] font-bold text-cta-foreground transition-all hover:brightness-105 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? "Gerando…" : "Baixar PDF"}
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto bg-muted px-6 py-6">
        <div className="mx-auto" style={{ width: SHEET_W * scale, height: SHEET_H * scale }}>
          <div
            ref={sheetRef}
            style={{
              width: SHEET_W,
              height: SHEET_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              background: CANVAS,
              colorScheme: "light",
              boxShadow: "0 12px 40px -12px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              fontFamily: "var(--font-manrope), system-ui, sans-serif",
            }}
          >
            <SheetHeader />
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <MapCanvas />
              <Sidebar />
            </div>
            <SheetFooter />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Cabecalho ---------- */
function SheetHeader() {
  return (
    <div
      style={{
        height: 96,
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_2} 100%)`,
        color: TEXT_LIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 34px",
        borderBottom: `3px solid ${EMERALD}`,
      }}
    >
      {/* Marca */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, width: 340 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img src="/ags-geo-mark-trim.png" alt="AGS GEO" style={{ width: 36, height: 36, objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, lineHeight: 1 }}>
            AGS <span style={{ color: EMERALD }}>GEO</span>
          </div>
          <div style={{ fontSize: 10, color: TEXT_MUT, marginTop: 4, letterSpacing: 0.4 }}>
            Levantamento e Geoprocessamento
          </div>
        </div>
      </div>

      {/* Titulo central */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: 3, lineHeight: 1 }}>CROQUI DE LOCALIZAÇÃO</div>
        <div
          style={{
            width: 120,
            height: 3,
            background: EMERALD,
            margin: "8px auto 7px",
            borderRadius: 2,
          }}
        />
        <div style={{ fontSize: 12, color: TEXT_MUT, letterSpacing: 4 }}>LEVANTAMENTO PLANIALTIMÉTRICO</div>
      </div>

      {/* Caixas folha / formato */}
      <div style={{ display: "flex", gap: 10, width: 340, justifyContent: "flex-end" }}>
        <HeaderBox label="FOLHA" value="ÚNICA" />
        <HeaderBox label="FORMATO" value="A2" />
      </div>
    </div>
  )
}

function HeaderBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${EMERALD}66`,
        borderRadius: 8,
        padding: "6px 12px",
        textAlign: "center",
        minWidth: 74,
      }}
    >
      <div style={{ fontSize: 8, color: TEXT_MUT, letterSpacing: 1.5, fontFamily: "var(--font-plex-mono), monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: TEXT_LIGHT, marginTop: 2 }}>{value}</div>
    </div>
  )
}

/* ---------- Canvas do mapa ---------- */
function MapCanvas() {
  // Perimetro do imovel (ilustrativo)
  const boundary =
    "M 150,120 L 380,80 L 560,120 L 720,95 L 760,300 L 720,470 L 560,600 L 360,640 L 210,580 L 140,400 Z"
  // Area agricultavel (interna, topo/direita)
  const agri = "M 200,150 L 560,120 L 715,150 L 745,300 L 690,410 L 470,430 L 300,360 L 210,300 Z"
  // Reserva legal (canto inferior esquerdo)
  const reserva = "M 210,590 L 300,370 L 470,435 L 520,560 L 470,610 L 340,645 Z"
  // Rio (hidrografia) atravessando
  const river = "M 150,190 C 320,260 380,340 470,360 C 590,388 660,470 740,520"

  return (
    <div style={{ flex: 1, position: "relative", background: CANVAS, overflow: "hidden" }}>
      <svg viewBox="0 0 820 700" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
        {/* Malha de coordenadas */}
        <g stroke={GRID} strokeWidth={0.6}>
          {[130, 230, 330, 430, 530, 630, 730].map((x) => (
            <line key={"v" + x} x1={x} y1={70} x2={x} y2={660} />
          ))}
          {[100, 200, 300, 400, 500, 600].map((y) => (
            <line key={"h" + y} x1={90} y1={y} x2={775} y2={y} />
          ))}
        </g>
        {/* Rotulos de coordenadas (UTM ilustrativas) */}
        <g fill={TEXT_MUT} fontSize={9} fontFamily="var(--font-plex-mono), monospace">
          {[
            [130, "720000"],
            [330, "722000"],
            [530, "724000"],
            [730, "726000"],
          ].map(([x, t]) => (
            <text key={"vx" + x} x={x as number} y={64} textAnchor="middle">
              {t}
            </text>
          ))}
          {[
            [100, "9764000"],
            [300, "9762000"],
            [500, "9760000"],
          ].map(([y, t]) => (
            <text key={"hy" + y} x={82} y={(y as number) + 3} textAnchor="end">
              {t}
            </text>
          ))}
        </g>

        {/* Curvas de nivel (planialtimetrico) */}
        <g stroke={CONTOUR} strokeWidth={0.8} fill="none" opacity={0.7}>
          <path d="M 200,250 C 320,220 460,240 600,210" />
          <path d="M 210,320 C 340,300 470,320 640,290" />
          <path d="M 240,400 C 360,380 500,400 660,370" />
          <path d="M 300,480 C 420,460 540,480 690,450" />
        </g>

        {/* Area total (base bem clara) */}
        <path d={boundary} fill="#ffffff" opacity={0.5} />

        {/* Reserva legal */}
        <path d={reserva} fill={TEAL} opacity={0.5} stroke={TEAL} strokeWidth={1} />
        {/* Area agricultavel */}
        <path d={agri} fill={EMERALD} opacity={0.4} stroke={GREEN_DEEP} strokeWidth={0.8} />

        {/* APP (buffer do rio) + rio */}
        <path d={river} fill="none" stroke={BLUE} strokeWidth={11} opacity={0.22} strokeLinecap="round" />
        <path d={river} fill="none" stroke={BLUE} strokeWidth={2.4} strokeLinecap="round" />

        {/* Perimetro (halo branco + linha esmeralda) */}
        <path d={boundary} fill="none" stroke="#ffffff" strokeWidth={5} strokeLinejoin="round" />
        <path d={boundary} fill="none" stroke={EMERALD} strokeWidth={2.6} strokeLinejoin="round" />

        {/* Vertices do perimetro */}
        {[
          [150, 120],
          [380, 80],
          [560, 120],
          [720, 95],
          [760, 300],
          [720, 470],
          [560, 600],
          [360, 640],
          [210, 580],
          [140, 400],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.2} fill="#ffffff" stroke={DARK} strokeWidth={1.2} />
        ))}
      </svg>

      {/* Rotulo do imovel sobre o mapa */}
      <div
        style={{
          position: "absolute",
          left: 34,
          bottom: 28,
          background: `${DARK}F2`,
          color: TEXT_LIGHT,
          padding: "12px 18px",
          borderRadius: 12,
          borderLeft: `4px solid ${EMERALD}`,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 2, color: TEXT_MUT }}>IMÓVEL RURAL</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, lineHeight: 1.05 }}>{DATA.imovel}</div>
        <div style={{ fontSize: 13, marginTop: 3, color: EMERALD, fontWeight: 700 }}>
          Área total {DATA.areaTotal}
        </div>
      </div>
    </div>
  )
}

/* ---------- Painel lateral ---------- */
function Sidebar() {
  return (
    <div
      style={{
        width: 380,
        background: DARK,
        color: TEXT_LIGHT,
        padding: "26px 26px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      {/* Convencoes */}
      <Section title="CONVENÇÕES">
        <LegendItem color={EMERALD} label="Área Agricultável" value={DATA.agricultavel} />
        <LegendItem color={TEAL} label="Reserva Legal" value={DATA.reserva} />
        <LegendItem color={BLUE} label="APP · Preservação" value={DATA.app} line />
        <LegendItem color="#ffffff" label="Perímetro / Área Total" value={DATA.areaTotal} outline />
      </Section>

      {/* Orientacao + Escala lado a lado */}
      <div style={{ display: "flex", gap: 22 }}>
        <div style={{ flex: 1 }}>
          <Section title="ORIENTAÇÃO">
            <NorthArrow />
          </Section>
        </div>
        <div style={{ flex: 1.4 }}>
          <Section title="ESCALA">
            <ScaleBar />
          </Section>
        </div>
      </div>

      {/* Sistema de coordenadas */}
      <Section title="SISTEMA DE COORDENADAS">
        <div style={{ fontFamily: "var(--font-plex-mono), monospace", fontSize: 11.5, lineHeight: 1.7, color: TEXT_LIGHT }}>
          {DATA.datum}
        </div>
      </Section>

      {/* Ficha tecnica */}
      <Section title="FICHA TÉCNICA">
        <Spec label="Aeronave" value={DATA.drone} />
        <Spec label="Processamento" value={DATA.proc} />
        <Spec label="Município" value={DATA.municipio} />
        <Spec label="Resp. Técnico" value={DATA.resp} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 2,
          color: EMERALD,
          paddingBottom: 8,
          marginBottom: 12,
          borderBottom: `1px solid ${EMERALD}33`,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function LegendItem({
  color,
  label,
  value,
  line,
  outline,
}: {
  color: string
  label: string
  value: string
  line?: boolean
  outline?: boolean
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
      <span
        style={{
          width: 22,
          height: line ? 5 : 16,
          borderRadius: line ? 3 : 4,
          background: outline ? "transparent" : color,
          border: outline ? `2px solid ${color}` : "none",
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-plex-mono), monospace", fontSize: 12.5, fontWeight: 700, color: EMERALD }}>
        {value}
      </span>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 7 }}>
      <span style={{ fontSize: 11.5, color: TEXT_MUT }}>{label}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  )
}

function NorthArrow() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
      <svg width="72" height="90" viewBox="0 0 72 90">
        <text x="36" y="16" textAnchor="middle" fill={TEXT_LIGHT} fontSize="16" fontWeight="800">
          N
        </text>
        <polygon points="36,24 50,74 36,62 22,74" fill={EMERALD} />
        <polygon points="36,24 36,62 22,74" fill="#ffffff" opacity={0.85} />
        <circle cx="36" cy="62" r="3" fill={DARK} stroke={TEXT_LIGHT} strokeWidth="1.2" />
      </svg>
    </div>
  )
}

function ScaleBar() {
  const segs = ["#ffffff", DARK, "#ffffff", DARK]
  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ display: "flex", border: `1px solid ${TEXT_LIGHT}`, width: 232 }}>
        {segs.map((c, i) => (
          <div key={i} style={{ width: 58, height: 12, background: c }} />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: 244,
          marginLeft: -6,
          marginTop: 5,
          fontFamily: "var(--font-plex-mono), monospace",
          fontSize: 10,
          color: TEXT_MUT,
        }}
      >
        <span>0</span>
        <span>500</span>
        <span>1.000</span>
        <span>2.000 m</span>
      </div>
      <div style={{ fontSize: 10.5, color: TEXT_MUT, marginTop: 8 }}>Escala aproximada 1:20.000</div>
    </div>
  )
}

/* ---------- Rodape ---------- */
function SheetFooter() {
  return (
    <div
      style={{
        height: 42,
        background: DARK,
        color: TEXT_MUT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderTop: `2px solid ${EMERALD}`,
        fontFamily: "var(--font-plex-mono), monospace",
        fontSize: 10.5,
        letterSpacing: 0.6,
      }}
    >
      AGS GEO · uma divisão da AGS Soluções Agrícolas LTDA · Levantamento {DATA.drone} · Elaboração QGIS 3.x
    </div>
  )
}
