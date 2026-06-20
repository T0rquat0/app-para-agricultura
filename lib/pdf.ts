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

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const fname = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

  // No iOS, abre a janela ANTES do async (enquanto ainda está no contexto do click)
  // para não ser bloqueado pelo Safari. Mostra mensagem de espera.
  let iosWin: Window | null = null
  if (isIOS()) {
    iosWin = window.open("", "_blank")
    if (iosWin) {
      iosWin.document.write(
        `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5">` +
        `<div style="text-align:center;color:#555"><div style="font-size:32px;margin-bottom:16px">⏳</div>` +
        `<p style="font-size:16px;font-weight:600">Gerando PDF…</p>` +
        `<p style="font-size:13px;color:#888">Aguarde alguns segundos</p></div></body></html>`
      )
    }
  }

  try {
    const mod = await import("html2pdf.js")
    const html2pdf = (mod as { default: any }).default || (mod as any)

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

    const blob: Blob = await html2pdf().set(opts).from(el).outputPdf("blob")
    const url = URL.createObjectURL(blob)

    if (iosWin) {
      // iOS: navega a janela já aberta para o PDF (Share Sheet aparece automaticamente)
      iosWin.location.href = url
    } else {
      // Desktop / Android: download direto via <a download>
      const a = document.createElement("a")
      a.href = url
      a.download = fname
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    }
  } catch (err) {
    // Se algo falhou, fecha a janela iOS para não deixar aba em branco
    if (iosWin) iosWin.close()
    throw err
  }
}
