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

// Cria um link de download invisível e clica nele — funciona na maioria dos browsers
function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const mod = await import("html2pdf.js")
  const html2pdf = (mod as { default: any }).default || (mod as any)

  const fname = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

  const elW = el.offsetWidth || 760
  const elH = Math.max(el.scrollHeight, el.offsetHeight) || 1075

  const PX_TO_MM = 0.2646
  const pageW = Math.ceil(elW * PX_TO_MM) + 4
  const pageH = Math.ceil(elH * PX_TO_MM) + 8

  const opts = {
    margin: [4, 2, 4, 2],
    filename: fname,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: elW,
      windowWidth: elW,
      height: elH,
      windowHeight: elH,
      onclone: (_doc: Document, element?: HTMLElement) => {
        try { sanitizeColors(element ?? _doc.body) } catch { /* nunca bloquear */ }
      },
    },
    jsPDF: { unit: "mm", format: [pageW, pageH], orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css"] },
  }

  // Gera o blob
  const blob: Blob = await html2pdf().set(opts).from(el).outputPdf("blob")
  const url = URL.createObjectURL(blob)

  try {
    // Tenta download direto via <a download> — funciona no Android e browsers modernos
    triggerDownload(url, fname)

    // No iOS Safari, o <a download> não funciona para blob URLs
    // Detectamos se o download não iniciou e abrimos na aba atual como fallback
    await new Promise<void>((resolve) => {
      // Dá 800ms para o download iniciar; se não iniciar (iOS), navega para o blob
      const timer = setTimeout(() => {
        // Fallback iOS: navega na aba atual para o blob (usuário usa Share Sheet para salvar)
        window.location.href = url
        resolve()
      }, 800)

      // Se o documento perder foco, o download iniciou — cancela o fallback
      const onBlur = () => {
        clearTimeout(timer)
        window.removeEventListener("blur", onBlur)
        resolve()
      }
      window.addEventListener("blur", onBlur)
    })
  } finally {
    // Revoga após 10s para dar tempo de download
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
}
