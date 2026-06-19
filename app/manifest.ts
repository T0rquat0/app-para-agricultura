import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AGS · Painel de Levantamentos",
    short_name: "AGS Levantamentos",
    description:
      "Painel de levantamentos topográficos com drone da AGS Soluções Agrícolas — projetos, talhões, serviços, gastos e visão financeira.",
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
        src: "/icon-512.png",
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
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
