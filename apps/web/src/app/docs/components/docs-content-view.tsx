import Link from "next/link";
import Image from "next/image";
import { DocItem, DOC_CATEGORIES } from "../docs-data";
import { CodeBlock } from "./code-block";
import { ChevronLeft, ChevronRight, Clock, ShieldCheck, AlertCircle, Info, CheckCircle2 } from "lucide-react";

interface DocsContentViewProps {
  item: DocItem;
}

export function DocsContentView({ item }: DocsContentViewProps) {
  // Compute flat list for Prev/Next navigation
  const allItems = DOC_CATEGORIES.flatMap((c) => c.items);
  const currentIndex = allItems.findIndex((i) => i.slug === item.slug);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  const getHref = (slug: string) => {
    return slug === "overview" ? "/docs" : `/docs/${slug}`;
  };

  return (
    <article className="max-w-3xl w-full mx-auto py-8 lg:py-10 px-4 sm:px-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 font-mono text-xs text-(--fg-subtle) mb-4">
        <Link href="/docs" className="hover:text-(--fg) transition-colors">
          Docs
        </Link>
        <span>/</span>
        <span className="text-(--fg-muted)">{item.category}</span>
        <span>/</span>
        <span className="text-(--fg) font-semibold">{item.title}</span>
      </div>

      {/* Title & Metadata */}
      <div className="space-y-3 pb-8 border-b border-(--line) mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-(--fg)">
            {item.title}
          </h1>
          {item.badge && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase bg-(--accent-solid) text-(--accent-fg)">
              {item.badge}
            </span>
          )}
        </div>
        <p className="text-base text-(--fg-muted) leading-relaxed">
          {item.content.lead}
        </p>
        <div className="flex items-center gap-4 text-xs font-mono text-(--fg-subtle) pt-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{item.readingTime} read</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-(--ok)" />
            <span>Production Verified</span>
          </div>
        </div>
      </div>

      {/* Sections Body */}
      <div className="space-y-10">
        {item.content.sections.map((sec) => (
          <section key={sec.id} id={sec.id} className="space-y-4 scroll-mt-24">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-(--fg) font-display flex items-center gap-2 border-l-2 border-(--accent) pl-3">
              {sec.title}
            </h2>

            {sec.text && (
              <p className="text-sm leading-relaxed text-(--fg) text-justify">
                {sec.text}
              </p>
            )}

            {/* Callouts */}
            {sec.callout && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 my-4 text-xs ${
                  sec.callout.type === "warn"
                    ? "border-(--warn)/40 bg-(--warn)/10 text-(--warn)"
                    : sec.callout.type === "danger"
                    ? "border-(--danger)/40 bg-(--danger)/10 text-(--danger)"
                    : sec.callout.type === "ok"
                    ? "border-(--ok)/40 bg-(--ok)/10 text-(--ok)"
                    : "border-(--accent)/40 bg-(--accent)/10 text-(--fg)"
                }`}
              >
                {sec.callout.type === "warn" ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : sec.callout.type === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-(--accent)" />
                )}
                <div className="space-y-1">
                  {sec.callout.title && (
                    <div className="font-semibold font-mono uppercase tracking-wider text-[11px]">
                      {sec.callout.title}
                    </div>
                  )}
                  <p className="leading-relaxed text-(--fg)">
                    {sec.callout.text}
                  </p>
                </div>
              </div>
            )}

            {/* Code Block */}
            {sec.codeBlock && (
              <CodeBlock
                code={sec.codeBlock.code}
                language={sec.codeBlock.language}
                title={sec.codeBlock.title}
              />
            )}

            {/* Table */}
            {sec.table && (
              <div className="my-4 rounded-xl border border-(--line) bg-(--surface) overflow-x-auto shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-(--line) bg-(--bg-raised)">
                      {sec.table.headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 font-mono font-semibold text-(--fg) uppercase tracking-wider text-[11px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--line)">
                    {sec.table.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-(--surface)/80 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-4 py-3 text-(--fg-muted) ${
                              cIdx === 0 ? "font-mono font-medium text-(--fg)" : ""
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Diagrams */}
            {sec.diagram && (
              <div className="my-6 rounded-xl border border-(--line) bg-(--surface) p-4 space-y-2 text-center">
                <div className="overflow-x-auto flex justify-center py-2 bg-white dark:bg-(--bg) rounded-lg border border-(--line)">
                  <img
                    src={sec.diagram.src}
                    alt={sec.diagram.alt}
                    className="max-w-full h-auto object-contain max-h-[500px]"
                    loading="lazy"
                  />
                </div>
                {sec.diagram.caption && (
                  <p className="font-mono text-[11px] text-(--fg-subtle) mt-2">
                    {sec.diagram.caption}
                  </p>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Prev / Next Footer Navigation */}
      <div className="mt-16 pt-8 border-t border-(--line) grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prevItem ? (
          <Link
            href={getHref(prevItem.slug)}
            className="p-4 rounded-xl border border-(--line) bg-(--surface) hover:bg-(--surface)/80 transition-all flex flex-col items-start gap-1 group"
          >
            <div className="flex items-center gap-1 text-[11px] font-mono text-(--fg-subtle)">
              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>PREVIOUS</span>
            </div>
            <span className="font-semibold text-sm text-(--fg) group-hover:text-(--accent) transition-colors">
              {prevItem.title}
            </span>
          </Link>
        ) : (
          <div />
        )}

        {nextItem ? (
          <Link
            href={getHref(nextItem.slug)}
            className="p-4 rounded-xl border border-(--line) bg-(--surface) hover:bg-(--surface)/80 transition-all flex flex-col items-end gap-1 group text-right sm:col-start-2"
          >
            <div className="flex items-center gap-1 text-[11px] font-mono text-(--fg-subtle)">
              <span>NEXT</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
            <span className="font-semibold text-sm text-(--fg) group-hover:text-(--accent) transition-colors">
              {nextItem.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </article>
  );
}
