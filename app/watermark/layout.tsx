import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watermark PDF",
  description: "Add diagonal text watermarks to every page in a PDF.",
};

export default function WatermarkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
