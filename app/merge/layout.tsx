import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merge PDF",
  description:
    "Merge up to 10 PDF files in your chosen order and download one merged.pdf file.",
};

export default function MergeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
