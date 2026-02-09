import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SITE_NAME} for support, policy questions, and collaboration requests.`,
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#070d15] px-6 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-[#0c1522] p-8">
        <h1 className="text-3xl font-semibold text-white">Contact {SITE_NAME}</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-300">
          Need help with a tool output, policy clarification, or a partnership
          request? Email us directly.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-700 bg-[#0b121d] p-5">
          <p className="text-sm text-zinc-300">Email</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-1 inline-block text-lg font-medium text-white underline"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-3 text-xs text-zinc-400">
            Include your tool name, upload type, and exact error message to speed
            up support.
          </p>
        </div>

        <div className="mt-8 space-y-2 text-sm text-zinc-300">
          <p>Website: {SITE_NAME}</p>
          <p>Response target: within 1-3 business days</p>
        </div>
      </div>
    </main>
  );
}

