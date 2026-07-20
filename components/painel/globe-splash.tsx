"use client"

import { useEffect, useRef } from "react"
import { geoOrthographic, geoDistance, geoGraticule10, geoPath, geoContains } from "d3-geo"
import { feature } from "topojson-client"
import land110m from "world-atlas/land-110m.json"

// Animacao de abertura AGS GEO:
// 1) globo girando e desacelerando (geografia real, projecao ortografica)
// 2) camera aproxima e o giro para focado em Roraima / Guiana / Venezuela
// 3) a superficie se dissolve em uma nuvem de pontos (o entregavel do geoprocessamento)

// Foco do levantamento atual (lon, lat) — regiao Roraima / Guiana / Venezuela
const FOCUS_LON = -62
const FOCUS_LAT = 4

// Linha do tempo (ms)
const ROT_SETTLE = 2100 // giro desacelera e assenta no foco
const ZOOM_START = 1150
const ZOOM_END = 2450
const CLOUD_START = 2700 // segura o terreno ampliado antes de dissolver
const CLOUD_END = 3550
const TOTAL = 3550

const TAU = Math.PI * 2

type P = { lon: number; lat: number; ox: number; oy: number; depth: number }

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3)
}
function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function GlobeSplash() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointsRef = useRef<P[] | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // ---- Geografia (uma vez): amostra pontos que caem em terra firme ----
    if (!pointsRef.current) {
      // topojson -> feature de terra (MultiPolygon unico)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const land = feature(land110m as any, (land110m as any).objects.land) as any
      const pts: P[] = []
      const push = (lon: number, lat: number) => {
        pts.push({
          lon,
          lat,
          ox: (Math.random() - 0.5) * 2,
          oy: (Math.random() - 0.5) * 2,
          depth: Math.random(),
        })
      }
      // 1) globo inteiro (resolucao media) — leve o suficiente p/ mobile
      const step = 2.3
      for (let lat = -78; lat <= 80; lat += step) {
        for (let lon = -180; lon <= 180; lon += step) {
          if (geoContains(land, [lon, lat])) push(lon, lat)
        }
      }
      // 2) foco Roraima / Guiana / Venezuela (mais denso p/ o zoom)
      const fStep = 0.7
      for (let lat = -12; lat <= 16; lat += fStep) {
        for (let lon = -78; lon <= -44; lon += fStep) {
          if (geoContains(land, [lon, lat])) push(lon, lat)
        }
      }
      pointsRef.current = pts
    }
    const points = pointsRef.current

    let raf = 0
    let elapsed = 0
    let last = 0
    let dpr = 1
    let w = 0
    let h = 0
    let cx = 0
    let cy = 0
    let baseScale = 1

    const projection = geoOrthographic().clipAngle(90)
    const graticule = geoGraticule10()

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = rect.width
      h = rect.height
      canvas!.width = Math.floor(w * dpr)
      canvas!.height = Math.floor(h * dpr)
      cx = w / 2
      cy = h * 0.44
      baseScale = Math.min(w, h) * 0.34
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const path = geoPath(projection, ctx!)

    function frame(now: number) {
      if (!last) last = now
      let dt = now - last
      last = now
      // se o frame atrasou muito (aba em 2o plano / carga lenta / throttling),
      // avanca so um passo pequeno em vez de "pular" a animacao inteira
      if (dt > 60) dt = 16
      elapsed += dt
      const t = elapsed

      ctx!.clearRect(0, 0, w, h)

      // --- rotacao: gira rapido e desacelera ate o foco ---
      const e = easeOutCubic(clamp01(t / ROT_SETTLE))
      const extraSpin = (1 - e) * 430 // graus que "desenrolam" conforme assenta
      const lambda = -FOCUS_LON - extraSpin
      const phi = lerp(-16, -FOCUS_LAT, e)
      projection.rotate([lambda, phi, 0])

      // --- zoom (camera aproxima) ---
      const z = easeInOutCubic(clamp01((t - ZOOM_START) / (ZOOM_END - ZOOM_START)))
      const scale = baseScale * (1 + z * 2.5)
      projection.scale(scale).translate([cx, cy])

      // --- fase nuvem de pontos ---
      const cp = clamp01((t - CLOUD_START) / (CLOUD_END - CLOUD_START))
      const cpE = easeInOutCubic(cp)
      const structAlpha = 1 - cp // graticula / contorno somem
      const spread = baseScale * 0.5

      const centerLon = -projection.rotate()[0]
      const centerLat = -projection.rotate()[1]
      const center: [number, number] = [centerLon, centerLat]

      // brilho de fundo (atmosfera)
      const glow = ctx!.createRadialGradient(cx, cy, scale * 0.2, cx, cy, scale * 1.5)
      glow.addColorStop(0, "rgba(47,212,138,0.16)")
      glow.addColorStop(0.5, "rgba(58,160,230,0.06)")
      glow.addColorStop(1, "rgba(0,0,0,0)")
      ctx!.fillStyle = glow
      ctx!.beginPath()
      ctx!.arc(cx, cy, scale * 1.5, 0, TAU)
      ctx!.fill()

      // esfera (disco escuro) enquanto estrutura visivel
      if (structAlpha > 0.02) {
        ctx!.globalAlpha = structAlpha
        ctx!.beginPath()
        path({ type: "Sphere" })
        ctx!.fillStyle = "rgba(8,16,20,0.85)"
        ctx!.fill()

        // graticula
        ctx!.beginPath()
        path(graticule)
        ctx!.strokeStyle = "rgba(120,160,180,0.14)"
        ctx!.lineWidth = 0.6
        ctx!.stroke()

        // contorno
        ctx!.beginPath()
        path({ type: "Sphere" })
        ctx!.strokeStyle = "rgba(47,212,138,0.35)"
        ctx!.lineWidth = 1
        ctx!.stroke()
        ctx!.globalAlpha = 1
      }

      // --- pontos de terra ---
      ctx!.fillStyle = "#2FD48A"
      const halfPi = Math.PI / 2
      for (let i = 0; i < points!.length; i++) {
        const p = points![i]
        const dist = geoDistance([p.lon, p.lat], center)
        if (dist > halfPi) continue
        const xy = projection([p.lon, p.lat])
        if (!xy) continue
        let x = xy[0]
        let y = xy[1]
        const facing = 1 - dist / halfPi // 1 no centro, 0 na borda

        if (cp > 0) {
          x += cpE * p.ox * spread * (0.5 + p.depth)
          y += cpE * (p.oy * spread * (0.5 + p.depth) - p.depth * 26)
        }

        const size = (0.7 + facing * 1.4) * (1 + z * 0.9)
        ctx!.globalAlpha = (0.28 + facing * 0.72) * (cp > 0 ? 1 - cp * 0.15 : 1)
        ctx!.fillRect(x - size / 2, y - size / 2, size, size)
      }
      ctx!.globalAlpha = 1

      // --- marcador do foco (Roraima) — visivel no zoom, some na nuvem ---
      const markAlpha = clamp01((t - 900) / 500) * (1 - cp)
      if (markAlpha > 0.02) {
        const fxy = projection([FOCUS_LON, FOCUS_LAT])
        if (fxy) {
          const pulse = (Math.sin(t / 260) + 1) / 2
          ctx!.globalAlpha = markAlpha
          // aneis
          ctx!.strokeStyle = "#3AA0E6"
          ctx!.lineWidth = 1.4
          ctx!.beginPath()
          ctx!.arc(fxy[0], fxy[1], 10 + pulse * 8, 0, TAU)
          ctx!.stroke()
          ctx!.globalAlpha = markAlpha * 0.9
          ctx!.fillStyle = "#3AA0E6"
          ctx!.beginPath()
          ctx!.arc(fxy[0], fxy[1], 2.4, 0, TAU)
          ctx!.fill()
          ctx!.globalAlpha = 1
          ctx!.fillStyle = "#2FD48A"
        }
      }

      if (t < TOTAL) {
        raf = requestAnimationFrame(frame)
      }
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
