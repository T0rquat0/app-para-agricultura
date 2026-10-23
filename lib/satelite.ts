// Imagem de satelite em ladrilhos 256px (Web Mercator). MapTiler quando houver chave
// (producao, conta do dono); senao a Esri World Imagery (prototipo e testes).

const MAPTILER = process.env.NEXT_PUBLIC_MAPTILER_KEY

export const SATELITE = MAPTILER
  ? {
      tiles: [`https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key=${MAPTILER}`],
      attribution: "© MapTiler © Maxar",
    }
  : {
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      attribution: "Imagem © Esri, Maxar, Earthstar Geographics",
    }

export function urlLadrilho(z: number, x: number, y: number): string {
  return SATELITE.tiles[0].replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y))
}

// Longitude/latitude -> pixel do mundo no zoom z (ladrilho de 256px)
export function pixel(lon: number, lat: number, z: number): [number, number] {
  const n = 256 * 2 ** z
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}
