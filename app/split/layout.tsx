import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Split PDF",
  description: "Split a PDF into one-page PDF files and download a ZIP archive.",
};

export default function SplitLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
