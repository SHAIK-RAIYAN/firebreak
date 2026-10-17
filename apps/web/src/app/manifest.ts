import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Firebreak",
    short_name: "Firebreak",
    description: "Autonomous diagnosis and rollback verification for Vercel and GitHub.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0B0A0F",
    theme_color: "#0B0A0F",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
