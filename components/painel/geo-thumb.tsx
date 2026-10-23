"use client"

import { useId } from "react"
import { corDoAndamento, limites, parteVoada } from "@/lib/geo"
import type { Geometria } from "@/lib/types"

export interface FormaComAndamento {
  geometry: Geometria
  pct: number
}

// Desenho do contorno real (sem satelite), riscado pela cor do andamento.
// Serve para miniaturas: lista de projetos, importacao de KML.
export function GeoThumb({ formas, className = "" }: { formas: FormaComAndamento[]; className?: string }) {
  const id = useId().replace(/:/g, "")
  const caixa = limites(formas.map((f) => f.geometry))
  if (!caixa) return null
  const [[x0, y0], [x1, y1]] = caixa
  // Corrige a largura pela latitude para a forma nao sair esticada.
  const k = Math.cos(((y0 + y1) / 2) * (Math.PI / 180))
  const w = Math.max((x1 - x0) * k, 1e-9)
  const h = Math.max(y1 - y0, 1e-9)
  const escala = 100 / Math.max(w, h)
  const ox = (100 - w * escala) / 2
  const oy = (100 - h * escala) / 2
  const px = (p: number[]) => `${(ox + (p[0] - x0) * k * escala).toFixed(2)},${(oy + (y1 - p[1]) * escala).toFixed(2)}`
  const caminho = (g: Geometria) => g.map((pol) => pol.map((anel) => "M" + anel.map(px).join("L") + "Z").join("")).join("")

  return (
    <svg viewBox="-6 -6 112 112" className={className} aria-hidden="true">
      <defs>
        {formas.map((f, i) => (
          <pattern key={i} id={`${id}r${i}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="1.8" height="5" fill={corDoAndamento(f.pct)} />
          </pattern>
        ))}
      </defs>
      {formas.map((f, i) => {
        const parte = parteVoada(f.geometry, f.pct)
        return (
          <g key={i}>
            {parte && <path d={caminho(parte)} fill={`url(#${id}r${i})`} fillRule="evenodd" />}
            <path
              d={caminho(f.geometry)}
              fill="none"
              fillRule="evenodd"
              stroke={f.pct > 0 ? corDoAndamento(f.pct) : "currentColor"}
              strokeOpacity={f.pct > 0 ? 1 : 0.55}
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </g>
        )
      })}
    </svg>
  )
}
