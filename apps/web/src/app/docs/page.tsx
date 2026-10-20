import { notFound } from "next/navigation";
import { DOCS_DATA } from "./docs-data";
import { DocsContentView } from "./components/docs-content-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation Overview · Firebreak",
  description:
    "Introduction to Firebreak: closed-loop incident detection, deterministic git bisection, and verified rollbacks on Vercel.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  const item = DOCS_DATA.overview;
  if (!item) {
    notFound();
  }
  return <DocsContentView item={item} />;
}
