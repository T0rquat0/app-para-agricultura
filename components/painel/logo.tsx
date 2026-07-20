import Image from "next/image"

// Marca AGS GEO — Inteligência Geoespacial.
// Simbolo: engrenagem + drone + curvas do terreno + pin, em verde RTK (#2FD48A)
// com arco de varredura em azul satelite (#3AA0E6). Miolo grafite p/ tema escuro.
export function Logo({
  size = 40,
  showText = true,
  variant = "light",
}: {
  size?: number
  showText?: boolean
  variant?: "light" | "dark"
}) {
  const titleColor = variant === "light" ? "text-white" : "text-brand-dark"
  const subColor = variant === "light" ? "text-white/70" : "text-muted-foreground"
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0A0E11] shadow-sm ring-1 ring-primary/25"
        style={{ width: size, height: size }}
      >
        <Image
          src="/ags-geo-mark-rtk.png"
          alt="Símbolo da AGS GEO"
          width={size}
          height={size}
          className="h-full w-full object-contain p-1"
          priority
        />
      </span>
      {showText && (
        <span className="leading-none">
          <span className={`block text-lg font-extrabold tracking-tight ${titleColor}`}>
            AGS <span className="text-gold">GEO</span>
          </span>
          <span className={`mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.14em] ${subColor}`}>
            Inteligência Geoespacial
          </span>
        </span>
      )}
    </div>
  )
}

// Lockup completo (simbolo grande + lettering empilhado), para splash e telas amplas.
export function LogoFull({
  size = 96,
  variant = "light",
  className,
}: {
  size?: number
  variant?: "light" | "dark"
  className?: string
}) {
  const titleColor = variant === "light" ? "text-white" : "text-brand-dark"
  const subColor = variant === "light" ? "text-white/75" : "text-muted-foreground"
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <span
        className="flex items-center justify-center overflow-hidden rounded-3xl bg-[#0A0E11] shadow-md ring-1 ring-primary/25"
        style={{ width: size, height: size }}
      >
        <Image
          src="/ags-geo-mark-rtk.png"
          alt="AGS GEO"
          width={size}
          height={size}
          className="h-full w-full object-contain p-2"
          priority
        />
      </span>
      <span className="text-center leading-none">
        <span className={`block text-2xl font-extrabold tracking-tight ${titleColor}`}>
          AGS <span className="text-gold">GEO</span>
        </span>
        <span className={`mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] ${subColor}`}>
          Inteligência Geoespacial
        </span>
      </span>
    </div>
  )
}
