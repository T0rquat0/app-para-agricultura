import sharp from "sharp"
import path from "node:path"

const PUB = path.resolve("public")
const SRC = path.join(PUB, "ags-logo.png")

const GREEN = { r: 14, g: 92, b: 30, alpha: 1 } // brand-dark #0E5C1E aprox

async function run() {
  // Normaliza orientacao (remove EXIF) para evitar erro de extract
  const base = await sharp(SRC).rotate().png().toBuffer()
  const meta = await sharp(base).metadata()
  const W = meta.width
  const H = meta.height
  console.log("[assets] origem", W, H)

  // 1) Logo completa "apertada" (remove transparencia/branco ao redor) sobre branco
  await sharp(base)
    .flatten({ background: "#ffffff" })
    .trim()
    .toFile(path.join(PUB, "ags-logo-full.png"))
  console.log("[assets] ags-logo-full.png ok")

  // 2) Apenas o simbolo (engrenagem + trator) — recorta a metade superior e apara
  const markTop = Math.min(H, Math.round(H * 0.6))
  const markRegion = await sharp(base)
    .extract({ left: 0, top: 0, width: W, height: markTop })
    .png()
    .toBuffer()
  await sharp(markRegion)
    .flatten({ background: "#ffffff" })
    .trim({ threshold: 25 })
    .toFile(path.join(PUB, "ags-mark.png"))
  console.log("[assets] ags-mark.png ok")

  // helper: gera icone quadrado com a logo completa centralizada sobre branco
  async function squareIcon(size, padRatio, outName) {
    const inner = Math.round(size * (1 - padRatio * 2))
    const logo = await sharp(path.join(PUB, "ags-logo-full.png"))
      .resize({ width: inner, height: inner, fit: "inside", background: "#ffffff" })
      .toBuffer()
    const lm = await sharp(logo).metadata()
    await sharp({
      create: { width: size, height: size, channels: 4, background: "#ffffff" },
    })
      .composite([{ input: logo, left: Math.round((size - lm.width) / 2), top: Math.round((size - lm.height) / 2) }])
      .png()
      .toFile(path.join(PUB, outName))
    console.log("[assets]", outName, "ok")
  }

  await squareIcon(512, 0.14, "icon-512.png")
  await squareIcon(192, 0.14, "icon-192.png")
  await squareIcon(180, 0.12, "apple-icon.png")

  void GREEN
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
