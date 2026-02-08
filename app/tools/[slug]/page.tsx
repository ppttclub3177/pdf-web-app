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
    title: `${tool.title}`,
    description: `${tool.title} on ${SITE_NAME}. ${tool.description}`,
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
            {tool.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-300">{tool.description}</p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-[#0c1522] p-6">
          <ToolRunner tool={tool} />
        </section>
      </div>
    </main>
  );
}
