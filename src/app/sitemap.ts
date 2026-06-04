import type { MetadataRoute } from "next";

const siteUrl = "https://vardia.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date("2026-06-04"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}