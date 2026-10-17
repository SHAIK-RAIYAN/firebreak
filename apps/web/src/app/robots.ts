import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://firebreak.dev";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/", "/login"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/llms.txt", "/llms-full.txt", "/docs/"],
        disallow: ["/app/", "/api/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
