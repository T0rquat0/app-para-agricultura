// Helpers de formatacao — identicos ao app original.

export function genId(prefix: string): string {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)
}

export function fmtHa(n: number): string {
  return (Math.round((n || 0) * 10) / 10).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export function fmtMoney(n: number): string {
  return (
    "R$ " +
    (n || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("pt-BR")
}

// Data de hoje (AAAA-MM-DD) no horario do aparelho. Nao usar toISOString(): ele esta em
// UTC, e no Brasil (UTC-3/-4) virava o dia seguinte a partir das 20h/21h.
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function slug(s?: string): string {
  return (
    String(s || "relatorio")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "relatorio"
  )
}
