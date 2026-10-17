"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Does Firebreak change production on its own?",
    a: "No. Every rollback requires explicit human approval, and Firebreak validates live production for drift milliseconds before executing the alias mutation.",
  },
  {
    q: "What does Firebreak need access to?",
    a: "A GitHub App with read access to the repositories you select, and a Vercel token with deployment alias permissions. Nothing else.",
  },
  {
    q: "How does it rank the bad commit without guessing?",
    a: "Firebreak runs a deterministic scoring engine: files and functions in the stack trace, lines in diff hunks, risky file patterns (e.g. migration, pricing, auth), and recency. Identical inputs always yield the exact same ranking.",
  },
  {
    q: "What is AI used for in Firebreak?",
    a: "AI is strictly used as an advisory explainer to summarize the diff and suggest potential code patches for the human operator. AI never decides or executes rollbacks.",
  },
  {
    q: "Which AI providers are supported?",
    a: "You can bring your own API key for Anthropic (Claude 3.5 Sonnet), OpenAI (GPT-4o), Google Gemini (2.5 Flash), or xAI (Grok), or use the platform default.",
  },
  {
    q: "What is MCP?",
    a: "Model Context Protocol (MCP) is an open standard that allows coding assistants like Claude Code and Cursor to use secure tools. Firebreak provides a dedicated NitroStack MCP server with 9 standardized tools.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 border-t border-[var(--line)] bg-[var(--bg-raised)] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4 font-mono text-xs text-[var(--accent)] tracking-wider">
          <span>[06]</span>
          <span>FREQUENTLY ASKED QUESTIONS</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--fg)] mb-4">
          Answers to common questions.
        </h2>
        <p className="text-[var(--fg-muted)] text-base sm:text-lg mb-12">
          Everything you need to know about safety, permissions, and rollback mechanics.
        </p>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--surface)] transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left font-semibold text-base text-[var(--fg)] flex items-center justify-between gap-4 hover:bg-[var(--bg-raised)]/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[var(--fg-subtle)] shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[var(--accent)]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-[var(--fg-muted)] leading-relaxed border-t border-[var(--line)]/50 bg-[var(--bg-raised)]/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
