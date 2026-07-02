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
  const html2pdf = (mod as any).default || mod

  const elW = el.offsetWidth || 760

  const PX_TO_MM = 0.2646
  const pageW = Math.ceil(elW * PX_TO_MM) + 2

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
    jsPDF: {
      unit: "mm",
      format: [pageW, pageW * 2], // altura generosa, sera ajustada
      orientation: "portrait",
      compress: true,
    },
  }

  // Primeiro pega o canvas para medir a altura real renderizada
  const canvas = await html2pdf().set(opts).from(el).toCanvas()
  const imgH_mm = pageW * (canvas.height / canvas.width)

  // Agora gera o PDF com as dimensoes exatas do canvas
  const finalOpts = {
    ...opts,
    jsPDF: {
      unit: "mm",
      format: [pageW, imgH_mm + 2],
      orientation: "portrait",
      compress: true,
    },
  }

  const pdfObj = await html2pdf().set(finalOpts).from(el).toPdf().get("pdf")

  // Garante que so tem 1 pagina
  const totalPages: number = pdfObj.internal.getNumberOfPages()
  for (let i = totalPages; i > 1; i--) {
    pdfObj.deletePage(i)
  }

  const blob: Blob = pdfObj.output("blob")
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

  // Android / Desktop
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
