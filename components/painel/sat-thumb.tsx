"use client"

import { useId } from "react"
import { corDoAndamento, parteVoada } from "@/lib/geo"
import { pixel, urlLadrilho } from "@/lib/satelite"
import type { FormaComAndamento } from "./geo-thumb"

// Miniatura de satelite: os ladrilhos que cobrem as matriculas e, por cima, o contorno
// riscado pela cor do andamento. Quadrada, `lado` px (CSS).
export function SatThumb({ formas, lado }: { formas: FormaComAndamento[]; lado: number }) {
  const id = useId().replace(/:/g, "")
  const pontos = formas.flatMap((f) => f.geometry.flatMap((pol) => pol[0]))
  if (!pontos.length) return null

  // Maior zoom em que a area cabe com folga (~85% do lado)
  let z = 18
  let caixa = { x0: 0, y0: 0, x1: 0, y1: 0 }
  for (; z >= 3; z--) {
    const px = pontos.map(([lon, lat]) => pixel(lon, lat, z))
    caixa = {
      x0: Math.min(...px.map((p) => p[0])),
      y0: Math.min(...px.map((p) => p[1])),
      x1: Math.max(...px.map((p) => p[0])),
      y1: Math.max(...px.map((p) => p[1])),
    }
    if (Math.max(caixa.x1 - caixa.x0, caixa.y1 - caixa.y0) <= lado * 0.85) break
  }
  const cx = (caixa.x0 + caixa.x1) / 2
  const cy = (caixa.y0 + caixa.y1) / 2
  const ox = cx - lado / 2
  const oy = cy - lado / 2
  const ladrilhos: { x: number; y: number }[] = []
  for (let tx = Math.floor(ox / 256); tx <= Math.floor((ox + lado) / 256); tx++)
    for (let ty = Math.floor(oy / 256); ty <= Math.floor((oy + lado) / 256); ty++) ladrilhos.push({ x: tx, y: ty })

  const caminho = (g: number[][][][]) =>
    g
      .map((pol) =>
        pol
          .map((anel) => "M" + anel.map(([lon, lat]) => pixel(lon, lat, z)).map(([x, y]) => `${(x - ox).toFixed(1)},${(y - oy).toFixed(1)}`).join("L") + "Z")
          .join(""),
      )
      .join("")

  return (
    <span className="relative block overflow-hidden bg-[#1b2026]" style={{ width: lado, height: lado }} aria-hidden="true">
      {ladrilhos.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${t.x}-${t.y}`}
          src={urlLadrilho(z, t.x, t.y)}
          alt=""
          loading="lazy"
          draggable={false}
          className="absolute max-w-none brightness-[0.82] saturate-[0.9]"
          style={{ left: t.x * 256 - ox, top: t.y * 256 - oy, width: 256, height: 256 }}
        />
      ))}
      <svg viewBox={`0 0 ${lado} ${lado}`} className="absolute inset-0 h-full w-full">
        <defs>
          {formas.map((f, i) => (
            <pattern key={i} id={`${id}s${i}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="1.7" height="5" fill={corDoAndamento(f.pct)} />
            </pattern>
          ))}
        </defs>
        {formas.map((f, i) => {
          const parte = parteVoada(f.geometry, f.pct)
          return (
            <g key={i}>
              {parte && <path d={caminho(parte)} fill={`url(#${id}s${i})`} fillRule="evenodd" />}
              <path d={caminho(f.geometry)} fill="none" stroke={f.pct > 0 ? corDoAndamento(f.pct) : "#ffffff"} strokeOpacity={f.pct > 0 ? 1 : 0.8} strokeWidth="1.4" strokeLinejoin="round" />
            </g>
          )
        })}
      </svg>
    </span>
  )
}
