"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Map as MapaLibre, GeoJSONSource, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { ArrowLeft, Expand, FileUp, Minimize2, Pencil, Plus } from "lucide-react"
import { metaMatricula, talhaoFlown } from "@/lib/calculations"
import { CORES_ANDAMENTO, corDoAndamento, limites, linhaDoCorte, parteVoada } from "@/lib/geo"
import { SATELITE } from "@/lib/satelite"
import { fmtHa } from "@/lib/format"
import { useRefresh } from "@/lib/hooks"
import type { Project, Talhao } from "@/lib/types"
import { cn } from "@/lib/utils"
import { KmlImportModal } from "./kml-import"
import { ParteModal } from "./modals"

interface Matricula {
  talhao: Talhao
  pct: number
  voado: number
  meta: number
}

function andamento(project: Project, t: Talhao): Matricula {
  const voado = talhaoFlown(project, t.id)
  const meta = metaMatricula(t)
  return { talhao: t, voado, meta, pct: meta > 0 ? Math.min(100, (voado / meta) * 100) : 0 }
}

const faixa = (pct: number) => CORES_ANDAMENTO.findIndex((f) => pct <= f.ate)
const fc = <T,>(features: T[]) => ({ type: "FeatureCollection" as const, features })

function contornos(lista: Matricula[], selecionada: string | null) {
  return fc(
    lista.map((m, i) => ({
      type: "Feature" as const,
      id: i,
      properties: { id: m.talhao.id, cor: m.pct > 0 ? corDoAndamento(m.pct) : "#FFFFFF", vazio: m.pct > 0 ? 0 : 1, sel: m.talhao.id === selecionada ? 1 : 0 },
      geometry: { type: "MultiPolygon" as const, coordinates: m.talhao.geometry! },
    })),
  )
}

// Riscos e linha do corte para um conjunto de percentuais (usado tambem a cada quadro da animacao)
function riscos(lista: Matricula[], pcts: number[]) {
  const partes = lista.map((m, i) => ({ m, pct: pcts[i], parte: parteVoada(m.talhao.geometry!, pcts[i]) }))
  return {
    riscos: fc(
      partes.flatMap(({ pct, parte }) =>
        parte && parte.length ? [{ type: "Feature" as const, properties: { faixa: faixa(pct) }, geometry: { type: "MultiPolygon" as const, coordinates: parte } }] : [],
      ),
    ),
    cortes: fc(
      partes.flatMap(({ m, pct, parte }) => {
        const linha = linhaDoCorte(m.talhao.geometry!, parte)
        return linha ? [{ type: "Feature" as const, properties: { cor: corDoAndamento(pct) }, geometry: { type: "LineString" as const, coordinates: linha } }] : []
      }),
    ),
  }
}

// Ladrilho de riscos a 45 graus em cada cor de andamento, desenhado em 2x para ficar nitido.
function riscoImagem(cor: string) {
  const L = 20
  const c = document.createElement("canvas")
  c.width = c.height = L
  const x = c.getContext("2d")!
  x.strokeStyle = cor
  x.lineWidth = 2.6
  x.lineCap = "square"
  x.beginPath()
  for (const o of [-L, 0, L]) {
    x.moveTo(o, L)
    x.lineTo(o + L, 0)
  }
  x.stroke()
  return { width: L, height: L, data: new Uint8Array(x.getImageData(0, 0, L, L).data.buffer) }
}

// Ponto para o rotulo: centro da caixa do maior poligono
function centro(t: Talhao): [number, number] {
  const anel = t.geometry![0][0]
  const xs = anel.map((p) => p[0])
  const ys = anel.map((p) => p[1])
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

export function hasMap(project: Project) {
  return (project.talhoes || []).some((t) => t.geometry?.length)
}

// Mapa do projeto: satelite em tela larga no topo, com as matriculas do KML riscadas pela
// cor do andamento. Sem KML ainda, um convite para importar.
export function ProjectMap({ project, onBack, onEdit }: { project: Project; onBack: () => void; onEdit: () => void }) {
  const refresh = useRefresh()
  const caixa = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLibre | null>(null)
  const rotulos = useRef<Marker[]>([])
  const pctsNaTela = useRef<number[]>([])
  const [pronto, setPronto] = useState(false)
  const [cheio, setCheio] = useState(false)
  const [importar, setImportar] = useState(false)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [lancarEm, setLancarEm] = useState<string | null>(null)

  const lista = useMemo(() => (project.talhoes || []).filter((t) => t.geometry?.length).map((t) => andamento(project, t)), [project])
  const temMapa = lista.length > 0
  const sel = lista.find((m) => m.talhao.id === selecionada) || null
  const caixaGeo = useMemo(() => limites(lista.map((m) => m.talhao.geometry!)), [lista])
  const coresNoMapa = new Set(lista.filter((m) => m.pct > 0).map((m) => faixa(m.pct)))

  // Cria o mapa uma vez (a biblioteca so carrega quando existe contorno para mostrar)
  useEffect(() => {
    if (!temMapa || !caixa.current || mapa.current) return
    let cancelado = false
    import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelado || !caixa.current) return
      const m = new maplibregl.Map({
        container: caixa.current,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        style: {
          version: 8,
          sources: { sat: { type: "raster", tileSize: 256, maxzoom: 19, ...SATELITE } },
          layers: [{ id: "sat", type: "raster", source: "sat", paint: { "raster-brightness-max": 0.86, "raster-saturation": -0.1 } }],
        },
        bounds: caixaGeo ?? undefined,
        fitBoundsOptions: { padding: { top: 96, bottom: 72, left: 28, right: 28 } },
      })
      m.touchZoomRotate.disableRotation()
      m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right")
      m.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 90 }), "bottom-right")
      m.on("load", () => {
        // O credito abre sozinho na primeira carga: comeca recolhido (so o "i")
        caixa.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show")
        CORES_ANDAMENTO.forEach((f, i) => m.addImage(`risco-${i}`, riscoImagem(f.cor), { pixelRatio: 2 }))
        const pcts = lista.map((x) => x.pct)
        pctsNaTela.current = pcts
        const r = riscos(lista, pcts)
        m.addSource("limite", { type: "geojson", data: contornos(lista, null) })
        m.addSource("riscos", { type: "geojson", data: r.riscos })
        m.addSource("cortes", { type: "geojson", data: r.cortes })
        m.addLayer({ id: "fundo", type: "fill", source: "limite", paint: { "fill-color": ["get", "cor"], "fill-opacity": ["case", ["==", ["get", "sel"], 1], 0.16, 0.05] } })
        m.addLayer({ id: "riscos", type: "fill", source: "riscos", paint: { "fill-pattern": ["concat", "risco-", ["to-string", ["get", "faixa"]]] } })
        m.addLayer({ id: "cortes", type: "line", source: "cortes", paint: { "line-color": ["get", "cor"], "line-width": 1.5, "line-dasharray": [2, 2] } })
        m.addLayer({
          id: "limite",
          type: "line",
          source: "limite",
          paint: {
            "line-color": ["get", "cor"],
            "line-opacity": ["case", ["==", ["get", "vazio"], 1], 0.8, 1],
            "line-width": ["case", ["==", ["get", "sel"], 1], 3.2, 2],
          },
        })
        m.on("click", "fundo", (e) => setSelecionada((e.features?.[0]?.properties?.id as string) ?? null))
        m.on("mouseenter", "fundo", () => (m.getCanvas().style.cursor = "pointer"))
        m.on("mouseleave", "fundo", () => (m.getCanvas().style.cursor = ""))
        setPronto(true)
      })
      mapa.current = m
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temMapa])

  useEffect(
    () => () => {
      mapa.current?.remove()
      mapa.current = null
    },
    [],
  )

  // Selecao: realca o contorno escolhido
  useEffect(() => {
    const m = mapa.current
    if (!m || !pronto) return
    ;(m.getSource("limite") as GeoJSONSource).setData(contornos(lista, selecionada))
  }, [lista, selecionada, pronto])

  // Voado mudou (lancamento novo): o risco avanca ate o novo ponto em vez de saltar
  useEffect(() => {
    const m = mapa.current
    if (!m || !pronto) return
    const de = lista.map((x, i) => pctsNaTela.current[i] ?? x.pct)
    const para = lista.map((x) => x.pct)
    const desenha = (pcts: number[]) => {
      const r = riscos(lista, pcts)
      ;(m.getSource("riscos") as GeoJSONSource).setData(r.riscos)
      ;(m.getSource("cortes") as GeoJSONSource).setData(r.cortes)
      pctsNaTela.current = pcts
    }
    const mudou = para.some((p, i) => Math.abs(p - de[i]) > 0.01)
    const calmo = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!mudou || calmo) {
      desenha(para)
      return
    }
    let quadro = 0
    const t0 = performance.now()
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 900)
      const e = 1 - Math.pow(1 - k, 3) // ease-out
      desenha(de.map((d, i) => d + (para[i] - d) * e))
      if (k < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [lista, pronto])

  // Tela cheia: recalcula o tamanho e mostra o nome e o % de cada matricula sobre o mapa
  useEffect(() => {
    const m = mapa.current
    if (!m || !pronto) return
    // Espera o layout novo (tela cheia ou nao) assentar antes de medir e enquadrar
    const t = setTimeout(() => {
      m.resize()
      if (caixaGeo) m.fitBounds(caixaGeo, { padding: cheio ? { top: 90, bottom: 90, left: 36, right: 36 } : { top: 96, bottom: 72, left: 28, right: 28 }, duration: 0 })
    }, 150)
    rotulos.current.forEach((r) => r.remove())
    rotulos.current = []
    let limpaRotulos = () => {}
    if (cheio) {
      import("maplibre-gl").then(({ default: maplibregl }) => {
        // Maiores primeiro: quando dois rotulos se encostam, fica o da area maior
        const ordem = lista.slice().sort((a, b) => b.meta - a.meta)
        rotulos.current = ordem.map((x) => {
          const el = document.createElement("span")
          el.className = "ags-rotulo"
          el.textContent = `${x.talhao.name} · ${Math.round(x.pct)}%`
          el.style.setProperty("--cor", x.pct > 0 ? corDoAndamento(x.pct) : "#ffffff")
          return new maplibregl.Marker({ element: el }).setLngLat(centro(x.talhao)).addTo(m)
        })
        const arruma = () => {
          const ocupados: { x0: number; y0: number; x1: number; y1: number }[] = []
          for (const r of rotulos.current) {
            const el = r.getElement()
            const p = m.project(r.getLngLat())
            const w = el.offsetWidth || 90
            const h = el.offsetHeight || 22
            const caixa = { x0: p.x - w / 2 - 4, y0: p.y - h / 2 - 3, x1: p.x + w / 2 + 4, y1: p.y + h / 2 + 3 }
            const bate = ocupados.some((o) => caixa.x0 < o.x1 && caixa.x1 > o.x0 && caixa.y0 < o.y1 && caixa.y1 > o.y0)
            el.style.visibility = bate ? "hidden" : "visible"
            if (!bate) ocupados.push(caixa)
          }
        }
        requestAnimationFrame(arruma)
        m.on("moveend", arruma)
        limpaRotulos = () => m.off("moveend", arruma)
      })
    }
    return () => {
      clearTimeout(t)
      limpaRotulos()
    }
  }, [cheio, caixaGeo, pronto, lista])

  if (!temMapa) {
    return (
      <>
        <div className="mx-4 flex flex-col items-start gap-3 overflow-hidden rounded-[22px] border border-border bg-card">
          <div className="relative h-28 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/satelite-cerrado.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          </div>
          <div className="px-5 pb-5">
            <div className="text-[16px] font-bold">Ver a fazenda no satélite</div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              Importe os KMLs das matrículas. O mapa mostra cada área sobre a imagem de satélite e vai riscando conforme você lança o que voou.
            </p>
            <button onClick={() => setImportar(true)} className="pressable mt-3 flex min-h-11 items-center gap-2 rounded-[14px] bg-primary px-4 text-[14px] font-bold text-primary-foreground">
              <FileUp className="h-4 w-4" /> Importar KML
            </button>
          </div>
        </div>
        {importar && <KmlImportModal project={project} onClose={() => setImportar(false)} onSaved={refresh} />}
      </>
    )
  }

  return (
    <>
      <div className={cn("ags-mapa relative bg-[#0b0d0f]", cheio ? "fixed inset-0 z-40" : "h-[58dvh] min-h-[360px]")}>
        {/* h-full/w-full: o CSS do maplibre troca o position do container para relative */}
        <div ref={caixa} className="absolute inset-0 h-full w-full" />
        {!cheio && <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(10,12,14,0.7),rgba(10,12,14,0))]" />} {/* taste-skill-ignore: pelicula sobre a imagem */}

        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+14px)] z-10 flex items-center gap-2">
          {!cheio && (
            <MapButton onClick={onBack} label="Voltar">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </MapButton>
          )}
          <div className={cn("min-w-0 flex-1 px-1 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]", cheio && "invisible")}>
            <div className="truncate text-[17px] font-bold text-[#F2F4F5]">{project.clientName}</div>
            <div className="truncate text-[13px] text-[#C9D0D6]">
              {project.fazenda ? `${project.fazenda} · ` : ""}
              {lista.length} {lista.length === 1 ? "matrícula" : "matrículas"}
            </div>
          </div>
          {!cheio && (
            <MapButton onClick={onEdit} label="Editar projeto">
              <Pencil className="h-4 w-4" />
            </MapButton>
          )}
          <MapButton onClick={() => setImportar(true)} label="Importar KML">
            <FileUp className="h-[18px] w-[18px]" />
          </MapButton>
          <MapButton onClick={() => setCheio((c) => !c)} label={cheio ? "Sair da tela cheia" : "Mapa em tela cheia"}>
            {cheio ? <Minimize2 className="h-[18px] w-[18px]" /> : <Expand className="h-[18px] w-[18px]" />}
          </MapButton>
        </div>

        <div className={cn("absolute left-3 z-10", sel ? "right-3" : "right-[118px]", cheio ? "bottom-[calc(env(safe-area-inset-bottom)+16px)]" : "bottom-9")}>
          {sel ? (
            <div className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-[#14171a]/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: sel.pct > 0 ? corDoAndamento(sel.pct) : "#ffffff66" }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-[#F2F4F5]">{sel.talhao.name}</span>
                <span className="num block text-[12.5px] text-[#A3ABB2]">
                  {fmtHa(sel.voado)} / {fmtHa(sel.meta)} ha · {Math.round(sel.pct)}%
                </span>
              </span>
              <button onClick={() => setLancarEm(sel.talhao.id)} className="pressable flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-[#4CC3FF] px-3 text-[13px] font-bold text-[#04141F]">
                <Plus className="h-4 w-4" strokeWidth={2.6} /> Lançar
              </button>
            </div>
          ) : (
            <Legenda faixas={coresNoMapa} />
          )}
        </div>
      </div>

      {importar && <KmlImportModal project={project} onClose={() => setImportar(false)} onSaved={refresh} />}
      {lancarEm && <ParteModal project={project} talhaoId={lancarEm} onClose={() => setLancarEm(null)} onSaved={refresh} />}
    </>
  )
}

function MapButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#14171a]/85 text-[#F2F4F5] backdrop-blur-md"
    >
      {children}
    </button>
  )
}

// Legenda: so as cores que aparecem no mapa agora
function Legenda({ faixas }: { faixas: Set<number> }) {
  const nomes = ["começo", "avançando", "metade", "quase", "fechada"]
  const itens = CORES_ANDAMENTO.map((f, i) => ({ cor: f.cor, txt: nomes[i], i })).filter((x) => faixas.has(x.i))
  return (
    <div className="inline-flex max-w-full items-center gap-3 overflow-hidden rounded-full border border-white/10 bg-[#14171a]/85 px-3 py-1.5 text-[12px] font-semibold text-[#C9D0D6] backdrop-blur-md">
      {itens.map((x) => (
        <span key={x.i} className="flex shrink-0 items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: x.cor }} />
          {x.txt}
        </span>
      ))}
      {itens.length < 3 && <span className="truncate text-[#868F97]">{itens.length ? "toque numa área" : "toque numa área para lançar"}</span>}
    </div>
  )
}
