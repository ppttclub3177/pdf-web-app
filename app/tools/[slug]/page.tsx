import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_NAME, getAbsoluteUrl } from "@/lib/site";
import { ToolRunner } from "@/components/tools/tool-runner";
import { PDF_TOOLS, getToolBySlug, getToolHref } from "@/lib/tools";

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return {
      title: "Tool Not Found",
    };
  }

  return {
    title: tool.seoTitle,
    description: tool.seoDescription,
    keywords: [tool.primaryKeyword, ...tool.secondaryKeywords],
    alternates: {
      canonical: getToolHref(tool.slug),
    },
  };
}

export function generateStaticParams() {
  return PDF_TOOLS.map((tool) => ({
    slug: tool.slug,
  }));
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const previousToolIndex = PDF_TOOLS.findIndex((item) => item.slug === tool.slug);
  const nextTool = PDF_TOOLS[(previousToolIndex + 1) % PDF_TOOLS.length];
  const relatedTools = PDF_TOOLS.filter((item) => item.slug !== tool.slug).slice(0, 5);
  const toolUrl = getAbsoluteUrl(getToolHref(tool.slug));

  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${tool.title} - ${SITE_NAME}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: tool.description,
    url: toolUrl,
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tool.faq.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#070d15] px-6 py-10 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              All Tools
            </Link>
            <Link
              href={getToolHref(nextTool.slug)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Next: {nextTool.title}
            </Link>
          </div>

          <div className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${tool.accentClassName}`}>
            {tool.iconLabel}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {tool.primaryKeyword}
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300">{tool.intro}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">
            Also searched: {tool.secondaryKeywords.slice(0, 3).join(" • ")}
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <ToolRunner tool={tool} />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <h2 className="text-xl font-semibold text-white">Popular searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {tool.secondaryKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
              >
                {keyword}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <h2 className="text-xl font-semibold text-white">FAQ</h2>
          <div className="mt-4 space-y-4">
            {tool.faq.map((entry) => (
              <article key={entry.q} className="rounded-lg border border-zinc-800 bg-[#0b121d] p-4">
                <h3 className="text-sm font-semibold text-zinc-100">{entry.q}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{entry.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <h2 className="text-xl font-semibold text-white">Related tools</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedTools.map((relatedTool) => (
              <Link
                key={relatedTool.slug}
                href={getToolHref(relatedTool.slug)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                {relatedTool.title}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
