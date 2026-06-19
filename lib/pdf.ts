"use client"

// Exporta um elemento HTML para PDF usando html2pdf.js (import dinamico — so no cliente).
export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const mod = await import("html2pdf.js")
  const html2pdf = (mod as { default: any }).default || (mod as any)
  await html2pdf()
    .set({
      margin: [10, 10, 12, 10],
      filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css"] },
    })
    .from(el)
    .save()
}
