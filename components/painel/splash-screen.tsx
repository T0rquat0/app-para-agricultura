"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

// Tela de abertura: identidade AGS com varredura de drone / radar topografico.
// Aparece no "cold start" do app, faz fade e some.
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), 1900)
    const done = setTimeout(onDone, 2450)
    return () => {
      clearTimeout(hold)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      className={`bg-topo fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden ${
        leaving ? "ags-splash-out" : ""
      }`}
      role="status"
      aria-label="Carregando AGS GEO"
    >
      {/* brilho radial suave — verde RTK */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: "radial-gradient(circle at 50% 42%, rgba(47,212,138,0.16), transparent 62%)",
        }}
      />

      {/* Emblema central com varredura */}
      <div className="relative flex h-64 w-64 items-center justify-center">
        {/* aneis de radar pulsando */}
        <span className="ags-ring absolute h-44 w-44 rounded-full border border-[#2FD48A]/50" />
        <span
          className="ags-ring absolute h-44 w-44 rounded-full border border-[#3AA0E6]/35"
          style={{ animationDelay: "0.9s" }}
        />

        {/* anel fixo */}
        <span className="absolute h-52 w-52 rounded-full border border-white/12" />

        {/* varredura giratoria (setor luminoso) */}
        <span
          className="ags-sweep absolute h-52 w-52 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, rgba(47,212,138,0.55), rgba(47,212,138,0) 90deg)",
            maskImage: "radial-gradient(circle, transparent 60%, #000 61%, #000 100%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 60%, #000 61%, #000 100%)",
          }}
        />

        {/* cartao branco com o simbolo AGS GEO */}
        <div className="ags-rise relative flex h-32 w-32 items-center justify-center rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
          <Image
            src="/ags-geo-mark-trim.png"
            alt="AGS GEO"
            width={104}
            height={104}
            className="h-auto w-[100px]"
            priority
          />
        </div>
      </div>

      {/* Wordmark */}
      <div className="ags-rise mt-7 text-center" style={{ animationDelay: "0.15s" }}>
        <div className="text-3xl font-extrabold tracking-tight text-white">
          AGS <span className="text-[#2FD48A]">GEO</span>
        </div>
        <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9FE7C4]">
          Levantamento e Geoprocessamento
        </div>
      </div>

      {/* Barra de carregamento */}
      <div className="ags-rise mt-8 h-1 w-44 overflow-hidden rounded-full bg-white/12" style={{ animationDelay: "0.3s" }}>
        <div className="ags-bar h-full w-1/2 rounded-full bg-[#2FD48A]" />
      </div>
    </div>
  )
}
