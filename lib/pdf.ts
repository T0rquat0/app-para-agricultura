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

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const fname = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

  const mod = await import("html2pdf.js")
  const html2pdf = (mod as { default: any }).default || (mod as any)

  const elW = el.offsetWidth || 760
  const elH = Math.max(el.scrollHeight, el.offsetHeight, 1075)

  // Largura A4 (210mm) para que o celular preencha a tela automaticamente.
  // Altura calculada proporcionalmente para caber todo o conteudo em 1 pagina.
  const A4_W_MM = 210
  const PX_TO_MM = 0.2646
  const contentW_mm = elW * PX_TO_MM         // largura do elemento em mm
  const ratio = A4_W_MM / contentW_mm        // fator de escala para A4
  const pageH_mm = Math.ceil(elH * PX_TO_MM * ratio) + 10  // altura proporcional + buffer

  const opts = {
    margin: 0,
    filename: fname,
    image: { type: "jpeg", quality: 0.97 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: elW,
      windowWidth: elW,
      scrollX: 0,
      scrollY: 0,
      onclone: (_doc: Document, element?: HTMLElement) => {
        try { sanitizeColors(element ?? _doc.body) } catch { /* ok */ }
      },
    },
    // Largura A4 + altura exata do conteudo = 1 pagina unica
    // O celular escala A4 para preencher a tela, user so rola para baixo
    jsPDF: {
      unit: "mm",
      format: [A4_W_MM, pageH_mm],
      orientation: "portrait",
      compress: true,
    },
  }

  const blob: Blob = await html2pdf().set(opts).from(el).outputPdf("blob")
  const file = new File([blob], fname, { type: "application/pdf" })

  // iOS: Web Share API
  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: fname })
      return
    } catch (err: any) {
      if (err?.name === "AbortError") return
    }
  }

  // Android / Desktop: download direto
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fname
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
