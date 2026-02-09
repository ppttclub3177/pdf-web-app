import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE_NAME}: mission, scope, and what makes this PDF tool site different.`,
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#070d15] px-6 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-[#0c1522] p-8">
        <h1 className="text-3xl font-semibold text-white">About {SITE_NAME}</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-300">
          {SITE_NAME} is a practical PDF tool station focused on fast workflows
          and transparent limits. The goal is simple: offer useful tools without
          login walls, usage counters, or paywall friction.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-white">What Makes It Different</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          Every tool card is backed by a real processor. Long-running tasks are
          executed via async jobs with clear status updates and explicit failure
          messages when runtime limits are hit.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-white">Safety and Limits</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          The platform enforces strict per-request limits for file count, file
          size, total upload, and pages. These controls keep the service stable
          on constrained infrastructure while remaining free for normal use.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-white">Contact</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          For support, policy questions, or business inquiries, use{" "}
          <a className="text-zinc-100 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            Contact Page
          </Link>
          <Link
            href="/privacy"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}

