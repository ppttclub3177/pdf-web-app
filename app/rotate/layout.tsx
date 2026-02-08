import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotate PDF",
  description: "Rotate every page of a PDF file by 90, 180, or 270 degrees.",
};

export default function RotateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
