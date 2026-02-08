import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JPG to PDF",
  description: "Combine JPG images into a single PDF file.",
};

export default function JpgToPdfLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
