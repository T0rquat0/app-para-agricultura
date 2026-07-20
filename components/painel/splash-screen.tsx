"use client"

import { useEffect, useState } from "react"
import { GlobeSplash } from "./globe-splash"

// Tela de abertura AGS GEO: globo geoespacial que gira, aproxima do foco
// (Roraima / Guiana / Venezuela) e se dissolve em nuvem de pontos.
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // segura ~2s depois que o nome surge (aos ~2,4s) p/ dar tempo de ler
    const hold = setTimeout(() => setLeaving(true), 5000)
    const done = setTimeout(onDone, 5550)
    return () => {
      clearTimeout(hold)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#05090c] ${
        leaving ? "ags-splash-out" : ""
      }`}
      role="status"
      aria-label="Carregando AGS GEO"
    >
      {/* Globo animado em canvas (fundo cinematografico) */}
      <GlobeSplash />

      {/* Scrim: escurece a base p/ o nome da empresa se destacar sobre a nuvem */}
      <div
        className="ags-wordmark pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{
          background: "linear-gradient(to top, #05090c 8%, rgba(5,9,12,0.85) 38%, rgba(5,9,12,0) 100%)",
        }}
      />

      {/* Camada de conteudo */}
      <div className="pointer-events-none relative flex h-full w-full flex-col items-center justify-end pb-16">
        {/* Wordmark surge ao final da aproximacao */}
        <div className="ags-wordmark text-center [text-shadow:0_2px_12px_rgba(0,0,0,0.85)]">
          <div className="text-3xl font-extrabold tracking-tight text-white">
            AGS <span className="text-[#2FD48A]">GEO</span>
          </div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9FE7C4]">
            Levantamento e Geoprocessamento
          </div>
        </div>

        {/* Barra de carregamento */}
        <div className="ags-wordmark mt-6 h-1 w-44 overflow-hidden rounded-full bg-white/12" style={{ animationDelay: "0.1s" }}>
          <div className="ags-bar h-full w-1/2 rounded-full bg-[#2FD48A]" />
        </div>
      </div>
    </div>
  )
}
