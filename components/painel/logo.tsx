import Image from "next/image"

// Marca da AGS. Usa o simbolo (engrenagem + trator) recortado da logo real
// dentro de um badge claro para garantir contraste sobre o verde da marca.
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
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10"
        style={{ width: size, height: size }}
      >
        <Image
          src="/ags-mark.png"
          alt="Símbolo da AGS Soluções Agrícolas"
          width={size}
          height={size}
          className="h-full w-full object-contain p-1.5"
          priority
        />
      </span>
      {showText && (
        <span className="leading-none">
          <span className={`block text-lg font-extrabold tracking-tight ${titleColor}`}>AGS</span>
          <span className={`block text-[10.5px] font-semibold uppercase tracking-[0.14em] ${subColor}`}>
            Soluções Agrícolas
          </span>
        </span>
      )}
    </div>
  )
}

// Logo completa (simbolo + lettering) em cores originais, para fundos claros.
export function LogoFull({ width = 160, className }: { width?: number; className?: string }) {
  return (
    <Image
      src="/ags-logo-full.png"
      alt="AGS Soluções Agrícolas LTDA"
      width={width}
      height={Math.round((width * 978) / 1130)}
      className={className}
      priority
    />
  )
}
