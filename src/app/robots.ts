import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/auth", "/hosting-guide"],
    },
    sitemap: "https://snupai.me/sitemap.xml",
  };
}
