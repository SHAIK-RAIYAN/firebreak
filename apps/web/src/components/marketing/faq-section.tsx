"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
    <section id="faq" className="py-16 lg:py-20 border-t border-(--line) bg-(--bg-raised) relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2 font-mono text-xs text-(--accent) tracking-wider">
            <span>[06]</span>
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display tracking-tight text-(--fg)">
              Answers to common questions.
            </h2>
            <p className="text-(--fg-muted) text-sm sm:text-base max-w-md">
              Everything you need to know about safety, permissions, and rollback mechanics.
            </p>
          </div>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="border border-(--line) rounded-xl overflow-hidden bg-(--surface) transition-colors hover:border-(--line-strong)"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left font-semibold text-base text-(--fg) flex items-center justify-between gap-4 hover:bg-(--bg-raised)/60 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-(--fg-subtle) font-normal">
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-colors ${
                        isOpen ? "text-(--accent)" : "text-(--fg-subtle)"
                      }`}
                    />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-sm text-(--fg-muted) leading-relaxed border-t border-(--line)/50 bg-(--bg-raised)/30">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
