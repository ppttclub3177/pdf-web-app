import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the PDF tools website.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#070d15] px-6 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-[#0c1522] p-8">
        <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-300">
          This website processes uploaded files only to generate requested output
          files. Temporary processing files are automatically deleted after
          completion and periodic cleanup.
        </p>
        <h2 className="mt-6 text-xl font-semibold text-white">Data Handling</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          Uploaded files are not used for advertising or sold to third parties.
          We do not require account registration.
        </p>
        <h2 className="mt-6 text-xl font-semibold text-white">
          Cookies and Telemetry
        </h2>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          No tracking cookies are required for core functionality. If analytics
          is enabled in deployment, aggregate traffic telemetry should avoid
          storing document content.
        </p>
      </div>
    </main>
  );
}
