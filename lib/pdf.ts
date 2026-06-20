"use client"

const OKLAB_RE = /(oklab|oklch|color-mix)/i

function sanitizeColors(root: HTMLElement) {
  const els = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]
  for (const el of els) {
    const cs = getComputedStyle(el)
    if (OKLAB_RE.test(cs.boxShadow)) el.style.boxShadow = "none"
    if (OKLAB_RE.test(cs.outlineColor)) el.style.outlineColor = "transparent"
    const ring = cs.getPropertyValue("--tw-ring-color")
    if (ring && OKLAB_RE.test(ring)) el.style.setProperty("--tw-ring-color", "rgba(0,0,0,0.06)")
    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      const prop = `border${side}Color` as "borderTopColor"
      if (OKLAB_RE.test(cs[prop])) el.style[prop] = "#e5e7eb"
    }
    if (OKLAB_RE.test(cs.backgroundColor)) el.style.backgroundColor = "transparent"
    if (OKLAB_RE.test(cs.color)) {
      el.style.color = isLightOk(cs.color) ? "#ffffff" : "#1f2937"
    }
  }
}

function isLightOk(value: string): boolean {
  const m = value.match(/okl(?:ab|ch)\(\s*([0-9.]+)/i)
  const l = m ? Number.parseFloat(m[1]) : 1
  return l >= 0.6
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    await new Promise((r) => setTimeout(r, 1500))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const mod = await import("html2pdf.js")
  const html2pdf = (mod as { default: any }).default || (mod as any)

  const fname = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

  // Usa a largura e altura REAIS do elemento para nao cortar nada
  const elW = el.offsetWidth || 760
  const elH = Math.max(el.scrollHeight, el.offsetHeight) || 1075

  // Converte px -> mm (96dpi: 1px = 0.2646mm)
  const PX_TO_MM = 0.2646
  const pageW = Math.ceil(elW * PX_TO_MM) + 2   // +2mm folga lateral
  const pageH = Math.ceil(elH * PX_TO_MM) + 4   // +4mm folga vertical

  const opts = {
    margin: [2, 1, 2, 1],
    filename: fname,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: elW,
      height: elH,
      windowWidth: elW,
      windowHeight: elH,
      onclone: (_doc: Document, element?: HTMLElement) => {
        try { sanitizeColors(element ?? _doc.body) } catch { /* nunca bloquear */ }
      },
    },
    // Pagina do tamanho exato do conteudo — sem cortes
    jsPDF: { unit: "mm", format: [pageW, pageH], orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css"] },
  }

  // Gera blob do PDF
  const blob: Blob = await html2pdf().set(opts).from(el).outputPdf("blob")

  // Tenta download direto (funciona no Android e iOS 16+)
  try {
    await downloadBlob(blob, fname)
  } catch {
    // Fallback para iOS antigo: abre em nova aba para salvar via Share Sheet
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }
}
