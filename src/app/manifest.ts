import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vardia - Vardiya Planlayıcısı",
    short_name: "Vardia",
    description:
      "Mağaza, depo ve operasyon ekipleri için haftalık vardiya planı ve personel çizelgeleme aracı.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#4f46e5",
    lang: "tr-TR",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
