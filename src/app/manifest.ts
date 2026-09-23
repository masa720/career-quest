import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareerQuest",
    short_name: "CareerQuest",
    description: "次のキャリアへ、今日の一歩。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5ef",
    theme_color: "#1d4b42",
    lang: "ja",
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
        purpose: "maskable",
      },
    ],
  };
}
