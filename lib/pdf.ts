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
  const mod = await import("html2pdf.js")
  const html2pdf = (mod as { default: any }).default || (mod as any)

  const fname = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

  const elW = el.offsetWidth || 760
  const elH = el.scrollHeight || el.offsetHeight || 1075

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

  // Gera PDF e remove paginas em branco extras
  const pdfObj = await html2pdf().set(opts).from(el).toPdf().get("pdf")
  const totalPages: number = pdfObj.internal.getNumberOfPages()
  for (let i = totalPages; i > 1; i--) {
    pdfObj.deletePage(i)
  }
  const blob: Blob = pdfObj.output("blob")
  const file = new File([blob], fname, { type: "application/pdf" })

  // iOS: Web Share API — compartilha direto (WhatsApp, Arquivos, etc)
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
