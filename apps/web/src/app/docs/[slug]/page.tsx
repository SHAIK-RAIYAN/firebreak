import { notFound } from "next/navigation";
import { DOCS_DATA } from "../docs-data";
import { DocsContentView } from "../components/docs-content-view";
import type { Metadata } from "next";

interface DocPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return Object.keys(DOCS_DATA)
    .filter((slug) => slug !== "overview")
    .map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = DOCS_DATA[slug];

  if (!item) {
    return {
      title: "Page Not Found · Firebreak Docs",
    };
  }

  return {
    title: `${item.title} · Firebreak Docs`,
    description: item.description,
    alternates: {
      canonical: `/docs/${slug}`,
    },
    openGraph: {
      title: `${item.title} · Firebreak Docs`,
      description: item.description,
      type: "article",
    },
  };
}

export default async function DocSlugPage({ params }: DocPageProps) {
  const { slug } = await params;
  const item = DOCS_DATA[slug];

  if (!item) {
    notFound();
  }

  return <DocsContentView item={item} />;
}
