import sharp from "sharp"
import path from "node:path"

const PUB = path.join(process.cwd(), "public")
const SRC = path.join(PUB, "ags-geo-mark.png")

async function run() {
  // Normaliza e apara o transparente ao redor do simbolo
  const trimmed = await sharp(SRC).rotate().trim().png().toBuffer()
  await sharp(trimmed).toFile(path.join(PUB, "ags-geo-mark-trim.png"))
  const meta = await sharp(trimmed).metadata()
  console.log("[geo] simbolo aparado", meta.width, meta.height)

  // Icone do app: simbolo centralizado sobre fundo branco, com padding
  async function squareIcon(size, padRatio, out) {
    const inner = Math.round(size * (1 - padRatio * 2))
    const mark = await sharp(trimmed)
      .resize({ width: inner, height: inner, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer()
    await sharp({
      create: { width: size, height: size, channels: 4, background: "#ffffff" },
    })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toFile(path.join(PUB, out))
    console.log("[geo]", out, "ok")
  }

  await squareIcon(512, 0.12, "icon-512.png")
  await squareIcon(192, 0.12, "icon-192.png")
  await squareIcon(180, 0.1, "apple-icon.png")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
