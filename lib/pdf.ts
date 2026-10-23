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

// ---- Paginacao A4 ----
// O html2pdf.js fatia a imagem em alturas fixas sem olhar onde as linhas terminam (ja cortou
// a proposta no meio). Aqui a folha e renderizada inteira numa imagem so e o corte de cada
// pagina e escolhido no DOM: nunca dentro de um bloco marcado (linha de tabela, paragrafo,
// figura, [data-pdf-keep]) e nunca logo depois de um titulo ([data-pdf-keep-next]).

const A4_W_MM = 210
const A4_H_MM = 297
const TOP_PX = 60 // topo das paginas 2+ (cabecalho corrido)
const BOTTOM_PX = 60 // rodape de todas as paginas
const KEEP_NEXT_MIN = 90 // espaco minimo que um titulo precisa ter embaixo na mesma pagina

type Faixa = { top: number; bottom: number }
// Uma pagina: o trecho [inicio, fim) da folha e, se ele comeca no meio de uma tabela,
// o cabecalho dessa tabela repetido no topo.
type Pagina = { inicio: number; fim: number; cabeca?: Faixa }

function medirBlocos(el: HTMLElement) {
  const base = el.getBoundingClientRect().top
  const rel = (n: Element): Faixa => {
    const r = n.getBoundingClientRect()
    return { top: r.top - base, bottom: r.bottom - base }
  }
  const keep = Array.from(el.querySelectorAll("[data-pdf-keep], tr, p, li, h1, h2, h3, img, svg")).map(rel)
  const keepNext = Array.from(el.querySelectorAll("[data-pdf-keep-next]")).map(rel)
  const tabelas = Array.from(el.querySelectorAll("table")).flatMap((t) => {
    const head = t.querySelector("thead")
    return head ? [{ ...rel(t), head: rel(head) }] : []
  })
  return { keep, keepNext, tabelas }
}

function escolherPaginas(altura: number, alturaPagina: number, blocos: ReturnType<typeof medirBlocos>): Pagina[] {
  const paginas: Pagina[] = []
  let inicio = 0
  let cabeca: Faixa | undefined
  for (;;) {
    const primeira = paginas.length === 0
    const util = alturaPagina - BOTTOM_PX - (primeira ? 0 : TOP_PX) - (cabeca ? cabeca.bottom - cabeca.top : 0)
    if (altura - inicio <= util) {
      paginas.push({ inicio, fim: altura, cabeca })
      return paginas
    }
    const limite = inicio + util
    let y = limite
    for (let guarda = 0; guarda < 200; guarda++) {
      let mudou = false
      for (const b of blocos.keep) {
        if (b.top > inicio + 1 && b.top < y && b.bottom > y + 0.5) {
          y = b.top
          mudou = true
        }
      }
      for (const h of blocos.keepNext) {
        if (h.top > inicio + 1 && h.top < y && h.bottom + KEEP_NEXT_MIN > y) {
          y = h.top
          mudou = true
        }
      }
      if (!mudou) break
    }
    // Bloco maior que a pagina: corta no limite mesmo, para nao travar.
    if (y - inicio < util * 0.35) y = limite
    paginas.push({ inicio, fim: y, cabeca })
    // A proxima pagina comeca dentro do corpo de uma tabela? Repete o cabecalho dela.
    const t = blocos.tabelas.find((tb) => tb.head.bottom <= y + 0.5 && tb.bottom > y + 1)
    cabeca = t?.head
    inicio = y
  }
}

export async function exportElementToPdf(el: HTMLElement, filename: string): Promise<void> {
  const mod = await import("html2pdf.js")
  const html2pdf = (mod as { default: any }).default || (mod as any)

  const fname = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

  const elW = el.offsetWidth || 760
  const elH = el.scrollHeight || el.offsetHeight || 1075

  // Pagina "do tamanho do conteudo" so para o html2pdf montar o container na largura exata
  // da folha; a imagem sai inteira e e paginada aqui embaixo.
  const PX_TO_MM = 0.2646
  const opts = {
    margin: 0,
    filename: fname,
    image: { type: "jpeg", quality: 0.95 },
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
    jsPDF: { unit: "mm", format: [Math.ceil(elW * PX_TO_MM), Math.ceil(elH * PX_TO_MM)], orientation: "portrait" },
    pagebreak: { mode: [] },
  }

  const blocos = medirBlocos(el)
  const running = el.dataset.pdfRunning || ""
  const code = el.dataset.pdfCode || ""
  const fonte = getComputedStyle(el).fontFamily || "system-ui, sans-serif"

  // O preflight do Tailwind poe `img { display: block }`, e o html2canvas mede a linha de base
  // do texto com uma <img> de 1px em linha, dentro de uma div escondida no documento real (nao no
  // clone). Com a img em bloco a medida sai errada e todo texto desce ~6px. So enquanto renderiza.
  const ajuste = document.createElement("style")
  ajuste.textContent = 'body > div[style*="hidden"] > img { display: inline !important; }'
  document.head.appendChild(ajuste)

  let inteira: HTMLCanvasElement | null = null
  const tiny = document.createElement("canvas")
  tiny.width = tiny.height = 1
  // Renderiza a folha inteira; troca o canvas por 1px antes do toPdf so para obter o documento
  // jsPDF (a lib nao exporta o construtor) sem embutir a imagem gigante nele.
  let base: any
  try {
    base = await html2pdf()
      .set(opts)
      .from(el)
      .toCanvas()
      .then(function (this: any) {
        inteira = this.prop.canvas as HTMLCanvasElement
        this.prop.canvas = tiny
      })
      .toPdf()
      .get("pdf")
  } finally {
    ajuste.remove()
  }
  if (!inteira) throw new Error("falha ao renderizar o documento")
  const canvas: HTMLCanvasElement = inteira

  // As paginas A4 entram depois das que o toPdf criou (1px); no fim essas sao removidas.
  const pdf = base
  const iniciais: number = pdf.internal.getNumberOfPages()

  const k = canvas.width / elW // pixels de canvas por px CSS
  const pagH = (elW * A4_H_MM) / A4_W_MM // altura da pagina A4 em px CSS
  // A folha termina no fim do ultimo bloco: o respiro de baixo da folha nao deve empurrar
  // o fecho do documento para uma pagina nova (o rodape de cada pagina ja da esse espaco).
  const fimConteudo = Math.min(elH, Math.max(0, ...blocos.keep.map((b) => b.bottom)) + 8)
  const paginas = escolherPaginas(fimConteudo, pagH, blocos)
  const total = paginas.length

  paginas.forEach(({ inicio, fim, cabeca }, i) => {
    const page = document.createElement("canvas")
    page.width = canvas.width
    page.height = Math.round(pagH * k)
    const ctx = page.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, page.width, page.height)
    let topo = i === 0 ? 0 : TOP_PX
    if (cabeca) {
      const hy = Math.ceil(cabeca.top * k) + 1 // sem o filete do titulo que fica logo acima
      const ch = Math.floor(cabeca.bottom * k) - hy
      ctx.drawImage(canvas, 0, hy, canvas.width, ch, 0, Math.round(topo * k), canvas.width, ch)
      topo += cabeca.bottom - cabeca.top
    }
    // floor nas duas pontas: um filete que comeca exatamente no corte fica inteiro na pagina seguinte
    const sy = Math.floor(inicio * k)
    const sh = Math.max(1, Math.floor(fim * k) - sy)
    ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, Math.round(topo * k), canvas.width, sh)

    const mx = 48 * k // mesma margem lateral da folha
    const texto = (t: string, x: number, y: number, peso: number, tam: number, cor: string, alinhar: CanvasTextAlign) => {
      ctx.font = `${peso} ${tam * k}px ${fonte}`
      ctx.fillStyle = cor
      ctx.textAlign = alinhar
      ctx.textBaseline = "alphabetic"
      ctx.fillText(t, x, y)
    }
    // Cabecalho corrido (paginas 2+)
    if (i > 0) {
      const y = 34 * k
      texto("AGS GEO", mx, y, 800, 11, "#0b1218", "left")
      texto(running, page.width - mx, y, 600, 10.5, "#4f5a64", "right")
      ctx.fillStyle = "#dde1e5"
      ctx.fillRect(mx, 44 * k, page.width - 2 * mx, Math.max(1, k))
    }
    // Rodape: divisao e numero da pagina
    const fy = page.height - 26 * k
    ctx.fillStyle = "#dde1e5"
    ctx.fillRect(mx, fy - 16 * k, page.width - 2 * mx, Math.max(1, k))
    texto(`AGS GEO · Levantamento e Geoprocessamento${code ? ` · ${code}` : ""}`, mx, fy, 500, 10, "#66717b", "left")
    texto(`Página ${i + 1} de ${total}`, page.width - mx, fy, 600, 10, "#4f5a64", "right")

    pdf.addPage("a4", "portrait")
    pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W_MM, A4_H_MM, undefined, "FAST")
  })
  for (let n = iniciais; n >= 1; n--) pdf.deletePage(n)

  const blob: Blob = pdf.output("blob")
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
