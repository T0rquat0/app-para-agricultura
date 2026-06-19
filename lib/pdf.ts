"use client"

// Exporta um elemento HTML para PDF usando html2pdf.js (import dinamico — so no cliente).
//
// IMPORTANTE: o html2canvas (por baixo do html2pdf) NAO entende cores em oklab/oklch
// (padrao do Tailwind v4). Se qualquer elemento capturado tiver uma cor nesse formato,
// a geracao quebra com: 'Attempting to parse an unsupported color function "oklab"'.
// Por isso, antes de renderizar, varremos o clone e neutralizamos cores oklab/oklch
// em propriedades puramente visuais (sombra, anel, contorno e fundo translucido).
const OKLAB_RE = /(oklab|oklch|color-mix)/i

function sanitizeColors(root: HTMLElement) {
  const els = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]
  for (const el of els) {
    const cs = getComputedStyle(el)

    // Sombras e contornos: cores oklab aqui sao decorativas — removemos com seguranca.
    if (OKLAB_RE.test(cs.boxShadow)) el.style.boxShadow = "none"
    if (OKLAB_RE.test(cs.outlineColor)) el.style.outlineColor = "transparent"

    // Variavel de "ring" do Tailwind (renderiza como box-shadow).
    const ring = cs.getPropertyValue("--tw-ring-color")
    if (ring && OKLAB_RE.test(ring)) el.style.setProperty("--tw-ring-color", "rgba(0,0,0,0.06)")

    // Bordas translucidas (ex.: border-black/10) — caem para um cinza claro seguro.
    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      const prop = `border${side}Color` as "borderTopColor"
      if (OKLAB_RE.test(cs[prop])) el.style[prop] = "#e5e7eb"
    }

    // Fundos translucidos definidos via color-mix.
    if (OKLAB_RE.test(cs.backgroundColor)) el.style.backgroundColor = "transparent"

    // Cor do texto em oklab: mapeia pela luminosidade (claro -> branco, escuro -> cinza).
    if (OKLAB_RE.test(cs.color)) {
      el.style.color = isLightOk(cs.color) ? "#ffffff" : "#1f2937"
    }
  }
}

// Extrai a luminosidade (primeiro valor de oklab/oklch) para decidir branco x escuro.
function isLightOk(value: string): boolean {
  const m = value.match(/okl(?:ab|ch)\(\s*([0-9.]+)/i)
  const l = m ? Number.parseFloat(m[1]) : 1
  return l >= 0.6
}

export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const mod = await import("html2pdf.js")
  const html2pdf = (mod as { default: any }).default || (mod as any)
  await html2pdf()
    .set({
      margin: [10, 10, 12, 10],
      filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (doc: Document, element?: HTMLElement) => {
          try {
            sanitizeColors(element ?? doc.body)
          } catch {
            /* nunca bloquear a exportacao por causa da sanitizacao */
          }
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css"] },
    })
    .from(el)
    .save()
}
