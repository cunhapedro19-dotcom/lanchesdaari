import type { MetadataRoute } from "next";

/**
 * App do CARDÁPIO — o que o cliente pode instalar no celular.
 *
 * O link deste arquivo entra sozinho nas páginas do site. O painel usa o manifest
 * dele (admin-manifest.webmanifest), que sobrepõe este nas rotas /admin.
 * O slug está fixo porque o site é de um estabelecimento só (Lanches da Ari).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lanches da Ari",
    short_name: "Lanches da Ari",
    description: "Cardápio da Lanches da Ari: monte seu pedido e envie pelo WhatsApp.",
    start_url: "/lanches-da-ari",
    scope: "/lanches-da-ari",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
