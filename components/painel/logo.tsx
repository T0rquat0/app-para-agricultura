import Image from "next/image"

export function Logo({
  size = 40,
  showText = true,
  variant = "light",
}: {
  size?: number
  showText?: boolean
  variant?: "light" | "dark"
}) {
  const textColor = variant === "light" ? "text-white" : "text-brand-dark"
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5"
        style={{ width: size, height: size }}
      >
        <Image
          src="/ags-logo.png"
          alt="Logotipo da AGS Soluções Agrícolas"
          width={size}
          height={size}
          className="h-full w-full object-contain p-1"
          priority
        />
      </span>
      {showText && (
        <span className={`leading-none ${textColor}`}>
          <span className="block text-lg font-extrabold tracking-tight">AGS</span>
          <span className="block text-[11px] font-semibold opacity-70">Soluções Agrícolas</span>
        </span>
      )}
    </div>
  )
}
