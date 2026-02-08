import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for the PDF tools website.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#070d15] px-6 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-[#0c1522] p-8">
        <h1 className="text-3xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-300">
          These tools are provided as-is for lawful document workflows. You are
          responsible for ensuring you have rights to process uploaded files.
        </p>
        <h2 className="mt-6 text-xl font-semibold text-white">Acceptable Use</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          Do not use this service for abuse, malware distribution, password
          cracking, or illegal data processing. PDF unlock supports only
          user-provided correct passwords.
        </p>
        <h2 className="mt-6 text-xl font-semibold text-white">Liability</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          Service availability and output quality are provided without warranty.
          Use backups for important files.
        </p>
      </div>
    </main>
  );
}
