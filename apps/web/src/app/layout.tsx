import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AsciiFireTransitionProvider } from "@/components/transitions/ascii-fire-transition";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://firebreak.dev"),
  title: { default: "Firebreak — Roll back bad deploys with proof", template: "%s · Firebreak" },
  description: "Firebreak finds the deploy that broke production, rolls it back on Vercel when you approve, and proves it recovered. With an MCP server built on NitroStack.",
  applicationName: "Firebreak",
  keywords: ["incident response", "rollback", "Vercel", "GitHub", "MCP", "NitroStack", "on-call", "deploy"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Firebreak",
    url: "/",
    title: "Firebreak — Stop the spread.",
    description: "Find the bad deploy, roll back with approval, prove recovery.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Firebreak — Stop the spread.",
    description: "Find the bad deploy, roll back with approval, prove recovery.",
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0A0F" },
    { media: "(prefers-color-scheme: light)", color: "#F6F4F0" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-(--bg) text-(--fg)">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AsciiFireTransitionProvider>
            {children}
          </AsciiFireTransitionProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
