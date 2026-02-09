import Link from "next/link";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, getAbsoluteUrl } from "@/lib/site";
import { PDF_TOOLS, getToolHref } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Online PDF Tools - Merge, Split, Compress, Convert",
  description:
    "Online PDF tools for merge, split, compress, convert, sign, watermark, rotate, unlock, protect, and HTML to PDF.",
  keywords: [
    "online pdf tools",
    "merge pdf online",
    "split pdf by page range",
    "compress pdf size",
    "pdf converter no login",
    "sign pdf online",
    "watermark pdf",
    "unlock pdf",
    "protect pdf with password",
    "html to pdf online",
  ],
  alternates: {
    canonical: "/",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const itemListStructuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: PDF_TOOLS.map((tool, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: tool.title,
    url: getAbsoluteUrl(getToolHref(tool.slug)),
  })),
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070d15] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }}
      />

      <div className="mx-auto w-full max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white">
            {SITE_NAME}
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/pdf-tools"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              Keyword Hub
            </Link>
            <p className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
              Unlimited use. No login. No paywall.
            </p>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-[#0c1522] px-6 py-7">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Online PDF Tools for High-Intent Workflows
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-300 sm:text-base">
            Merge PDF online, split PDF by page range, compress PDF for email,
            convert PDF to Word, PowerPoint, Excel, JPG, and secure files with
            sign, watermark, unlock, and protect workflows.
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            Configure resource guard in <code>.env</code>: <code>MAX_FILES</code>,{" "}
            <code>MAX_FILE_MB</code>, <code>MAX_PAGES</code>,{" "}
            <code>MAX_TOTAL_MB</code>.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {PDF_TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={getToolHref(tool.slug)}
              className="group rounded-2xl border border-zinc-800 bg-[#0b121d] p-6 transition hover:border-zinc-600 hover:bg-[#0f1726]"
            >
              <div
                className={`mb-5 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold ${tool.accentClassName}`}
              >
                {tool.iconLabel}
              </div>
              <h2 className="text-[27px] leading-tight font-semibold tracking-tight text-white">
                {tool.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {tool.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
