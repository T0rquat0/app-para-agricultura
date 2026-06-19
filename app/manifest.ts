import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AGS GEO · Levantamento e Geoprocessamento",
    short_name: "AGS GEO",
    description:
      "AGS GEO — divisão de levantamento e geoprocessamento com drone da AGS Soluções Agrícolas. Projetos, talhões, serviços, gastos e visão financeira.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1A4228",
    theme_color: "#1A4228",
    lang: "pt-BR",
    categories: ["business", "productivity", "agriculture"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
