// Contornos de KML: leitura, area em hectares e a parte "riscada" proporcional ao voado.
// Tudo roda no aparelho; nada e enviado para fora.

import type { Geometria } from "./types"

export interface PoligonoKml {
  nome: string
  arquivo: string
  geometry: Geometria
  hectares: number
}

type Ponto = number[]
type Anel = Ponto[]

const RAIO = 6378137
const rad = (d: number) => (d * Math.PI) / 180

// Area esferica de um anel (lon/lat), em m2.
function areaAnel(anel: Anel): number {
  let a = 0
  for (let i = 0; i < anel.length - 1; i++) {
    const [x1, y1] = anel[i]
    const [x2, y2] = anel[i + 1]
    a += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)))
  }
  return Math.abs((a * RAIO * RAIO) / 2)
}

export function areaHa(g: Geometria): number {
  let m2 = 0
  for (const poligono of g) {
    poligono.forEach((anel, i) => (m2 += i === 0 ? areaAnel(anel) : -areaAnel(anel)))
  }
  return Math.max(0, m2) / 10000
}

function fecha(anel: Anel): Anel {
  const a = anel[0]
  const b = anel[anel.length - 1]
  return a[0] === b[0] && a[1] === b[1] ? anel : [...anel, a]
}

function leCoordenadas(texto: string): Anel {
  return texto
    .trim()
    .split(/\s+/)
    .map((t) => t.split(",").slice(0, 2).map(Number))
    .filter((p) => p.length === 2 && p.every(Number.isFinite))
}

// Le um KML e devolve cada Placemark com poligono (Polygon ou MultiGeometry com Polygons).
export function lerKml(texto: string, arquivo: string): PoligonoKml[] {
  const doc = new DOMParser().parseFromString(texto, "application/xml")
  if (doc.getElementsByTagName("parsererror").length) throw new Error(`${arquivo}: o arquivo não é um KML válido`)
  const base = arquivo.replace(/\.km[lz]$/i, "").trim()
  const saida: PoligonoKml[] = []
  const placemarks = Array.from(doc.getElementsByTagName("Placemark"))
  placemarks.forEach((pm, i) => {
    const poligonos: Geometria = []
    for (const pol of Array.from(pm.getElementsByTagName("Polygon"))) {
      const aneis: Anel[] = []
      const externo = pol.getElementsByTagName("outerBoundaryIs")[0]?.getElementsByTagName("coordinates")[0]
      if (!externo?.textContent) continue
      aneis.push(fecha(leCoordenadas(externo.textContent)))
      for (const interno of Array.from(pol.getElementsByTagName("innerBoundaryIs"))) {
        const c = interno.getElementsByTagName("coordinates")[0]?.textContent
        if (c) aneis.push(fecha(leCoordenadas(c)))
      }
      if (aneis[0].length >= 4) poligonos.push(aneis)
    }
    if (!poligonos.length) return
    const nomeTag = Array.from(pm.children).find((c) => c.tagName === "name")?.textContent?.trim()
    // Um placemark so no arquivo: o nome do arquivo costuma ser o da matricula.
    // Varios: vale o nome de cada placemark (o arquivo aparece a parte na importacao).
    const nome = placemarks.length === 1 || !nomeTag ? base : nomeTag
    saida.push({ nome, arquivo, geometry: poligonos, hectares: areaHa(poligonos) })
  })
  return saida
}

// Ignora poligonos repetidos (mesmos vertices), comuns em exportacoes do GPS TrackMaker.
export function semRepetidos(lista: PoligonoKml[]): PoligonoKml[] {
  const vistos = new Set<string>()
  return lista.filter((p) => {
    const chave = JSON.stringify(p.geometry[0][0].map((pt) => pt.map((n) => n.toFixed(7))))
    if (vistos.has(chave)) return false
    vistos.add(chave)
    return true
  })
}

function dentro(pt: number[], anel: number[][]): boolean {
  let r = false
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i]
    const [xj, yj] = anel[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) r = !r
  }
  return r
}

// Para cada poligono, se ele fica inteiro dentro de outro maior da mesma lista
// (sede, lago, APP desenhados dentro da area) — esses nao somam area por padrao.
export function contidosEmOutro(lista: PoligonoKml[]): boolean[] {
  return lista.map((a, i) =>
    lista.some((b, j) => {
      if (i === j || b.hectares <= a.hectares) return false
      const pts = a.geometry[0][0]
      return pts.filter((p) => dentro(p, b.geometry[0][0])).length >= pts.length * 0.9
    }),
  )
}

export function limites(gs: Geometria[]): [[number, number], [number, number]] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const g of gs) for (const pol of g) for (const [x, y] of pol[0]) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  return Number.isFinite(x0) ? [[x0, y0], [x1, y1]] : null
}

// ---- Cor do andamento: vermelho no comeco, amarelo no meio, verde quando fecha ----
// Faixas fixas (nao degrade), para cada cor querer dizer sempre a mesma coisa.
export const CORES_ANDAMENTO = [
  { ate: 25, cor: "#FF5A4E" }, // comecando
  { ate: 50, cor: "#FF9A3C" },
  { ate: 75, cor: "#FFD23F" }, // metade
  { ate: 99.999, cor: "#A8E05F" }, // quase
  { ate: Infinity, cor: "#34D17A" }, // fechado
]

export function corDoAndamento(pct: number): string {
  return (CORES_ANDAMENTO.find((f) => pct <= f.ate) ?? CORES_ANDAMENTO[CORES_ANDAMENTO.length - 1]).cor
}

// ---- Parte riscada: recorta o contorno por uma linha vertical (oeste -> leste) ----

// Sutherland-Hodgman contra o semiplano x <= corte.
function recorta(anel: Anel, corte: number): Anel {
  const out: Anel = []
  for (let i = 0; i < anel.length - 1; i++) {
    const a = anel[i]
    const b = anel[i + 1]
    const ai = a[0] <= corte
    const bi = b[0] <= corte
    if (ai) out.push(a)
    if (ai !== bi) {
      const t = (corte - a[0]) / (b[0] - a[0])
      out.push([corte, a[1] + t * (b[1] - a[1])])
    }
  }
  if (out.length) out.push(out[0])
  return out
}

// Area plana (graus2): so serve para comparar partes do mesmo contorno, que e pequeno.
function areaPlana(anel: Anel): number {
  let s = 0
  for (let i = 0; i < anel.length - 1; i++) s += anel[i][0] * anel[i + 1][1] - anel[i + 1][0] * anel[i][1]
  return Math.abs(s / 2)
}

function areaPlanaGeo(g: Geometria, corte = Infinity): number {
  let s = 0
  for (const pol of g) pol.forEach((anel, i) => (s += (i === 0 ? 1 : -1) * areaPlana(corte === Infinity ? anel : recorta(anel, corte))))
  return s
}

// Devolve a parte do contorno que corresponde a `pct`% da area, a partir do oeste.
// 0% -> nada; 100% -> o contorno inteiro. A linha do corte e achada por busca binaria.
export function parteVoada(g: Geometria, pct: number): Geometria | null {
  if (!(pct > 0)) return null
  if (pct >= 100) return g
  const alvo = (areaPlanaGeo(g) * pct) / 100
  const xs = g.flatMap((pol) => pol[0].map((p) => p[0]))
  let lo = Math.min(...xs)
  let hi = Math.max(...xs)
  for (let k = 0; k < 40; k++) {
    const meio = (lo + hi) / 2
    if (areaPlanaGeo(g, meio) < alvo) lo = meio
    else hi = meio
  }
  return g
    .map((pol) => pol.map((anel) => recorta(anel, hi)).filter((anel) => anel.length >= 4))
    .filter((pol) => pol.length > 0 && areaPlana(pol[0]) > 0)
}

// Linha do corte (onde o voo parou), para desenhar tracejada no mapa.
export function linhaDoCorte(g: Geometria, parte: Geometria | null): number[][] | null {
  if (!parte || parte === g) return null
  const xs = parte.flatMap((pol) => pol[0].map((p) => p[0]))
  const x = Math.max(...xs)
  const ys = g.flatMap((pol) => pol[0].map((p) => p[1]))
  return [[x, Math.min(...ys)], [x, Math.max(...ys)]]
}
