import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { PDF_TOOLS, getToolHref } from "@/lib/tools";

export const metadata: Metadata = {
  title: "PDF Tools Hub - Keywords, Use Cases, and Quick Actions",
  description:
    "Explore online PDF tools by intent: merge, split, compress, convert, sign, watermark, rotate, unlock, protect, and HTML to PDF.",
  keywords: [
    "pdf tools hub",
    "free pdf tools no login",
    "merge split compress convert pdf",
    "secure pdf workflow",
    "pdf long tail keywords",
  ],
  alternates: {
    canonical: "/pdf-tools",
  },
};

const CROSS_TOOL_QUERIES = [
  "pdf too large to email",
  "reduce pdf size without losing quality",
  "combine many files into one pdf",
  "split one big pdf into smaller parts",
  "convert scanned document to editable format",
  "free pdf converter no watermark",
  "pdf tools for mobile browser",
  "secure pdf processing online",
  "auto delete uploaded files",
  "process pdf with strict file limits",
  "unlock then merge pdf workflow",
  "protect pdf before sharing",
];

export default function PdfToolsHubPage() {
  return (
    <main className="min-h-screen bg-[#070d15] px-6 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <h1 className="text-3xl font-semibold text-white">PDF Tools Hub</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            {SITE_NAME} groups high-intent online PDF tools by real workflows:
            merge, split, compress, convert, and secure document files. Use this
            hub to find the fastest path from problem to output.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <h2 className="text-xl font-semibold text-white">Tool pages</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PDF_TOOLS.map((tool) => (
              <Link
                key={tool.slug}
                href={getToolHref(tool.slug)}
                className="rounded-xl border border-zinc-800 bg-[#0b121d] p-4 transition hover:border-zinc-600"
              >
                <h3 className="text-sm font-semibold text-white">{tool.title}</h3>
                <p className="mt-2 text-xs leading-6 text-zinc-300">
                  {tool.primaryKeyword}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {tool.secondaryKeywords.slice(0, 2).join(" • ")}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <h2 className="text-xl font-semibold text-white">Cross-tool searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {CROSS_TOOL_QUERIES.map((query) => (
              <span
                key={query}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
              >
                {query}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
