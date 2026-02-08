export type ToolSlug =
  | "merge-pdf"
  | "split-pdf"
  | "compress-pdf"
  | "pdf-to-word"
  | "pdf-to-powerpoint"
  | "pdf-to-excel"
  | "word-to-pdf"
  | "powerpoint-to-pdf"
  | "excel-to-pdf"
  | "edit-pdf"
  | "pdf-to-jpg"
  | "jpg-to-pdf"
  | "sign-pdf"
  | "watermark"
  | "rotate-pdf"
  | "html-to-pdf"
  | "unlock-pdf"
  | "protect-pdf";

export type PdfTool = {
  slug: ToolSlug;
  title: string;
  description: string;
  iconLabel: string;
  accentClassName: string;
  apiPath: string;
  outputExtension:
    | "pdf"
    | "zip"
    | "docx"
    | "pptx"
    | "xlsx"
    | "jpg";
  systemDependencies?: string[];
  faq: Array<{ q: string; a: string }>;
};

function faqDefault(title: string): Array<{ q: string; a: string }> {
  return [
    {
      q: `Is ${title} unlimited?`,
      a: "Yes. There is no login, no paywall, and no usage counter. Only resource safety limits apply.",
    },
    {
      q: "Can I use this locally?",
      a: "Yes. All tools run locally in this project. Use Docker full mode for system-binary features.",
    },
  ];
}

export const PDF_TOOLS: PdfTool[] = [
  {
    slug: "merge-pdf",
    title: "Merge PDF",
    description: "Combine PDFs in the order you choose.",
    iconLabel: "M",
    accentClassName: "bg-orange-500/20 text-orange-300",
    apiPath: "/api/merge-pdf",
    outputExtension: "pdf",
    faq: faqDefault("Merge PDF"),
  },
  {
    slug: "split-pdf",
    title: "Split PDF",
    description: "Split by each page or by custom page ranges.",
    iconLabel: "S",
    accentClassName: "bg-red-500/20 text-red-300",
    apiPath: "/api/split-pdf",
    outputExtension: "zip",
    faq: faqDefault("Split PDF"),
  },
  {
    slug: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce PDF size with Ghostscript profiles.",
    iconLabel: "C",
    accentClassName: "bg-lime-500/20 text-lime-300",
    apiPath: "/api/compress",
    outputExtension: "pdf",
    systemDependencies: ["ghostscript"],
    faq: faqDefault("Compress PDF"),
  },
  {
    slug: "pdf-to-word",
    title: "PDF to Word",
    description: "Generate DOCX with page images and optional OCR text.",
    iconLabel: "W",
    accentClassName: "bg-sky-500/20 text-sky-300",
    apiPath: "/api/pdf-to-word",
    outputExtension: "docx",
    systemDependencies: ["poppler-utils", "tesseract-ocr(optional)"],
    faq: faqDefault("PDF to Word"),
  },
  {
    slug: "pdf-to-powerpoint",
    title: "PDF to PowerPoint",
    description: "Create PPTX with one slide per PDF page image.",
    iconLabel: "P",
    accentClassName: "bg-amber-500/20 text-amber-300",
    apiPath: "/api/pdf-to-powerpoint",
    outputExtension: "pptx",
    systemDependencies: ["poppler-utils", "tesseract-ocr(optional)"],
    faq: faqDefault("PDF to PowerPoint"),
  },
  {
    slug: "pdf-to-excel",
    title: "PDF to Excel",
    description: "Create XLSX sheets from page OCR text.",
    iconLabel: "X",
    accentClassName: "bg-emerald-500/20 text-emerald-300",
    apiPath: "/api/pdf-to-excel",
    outputExtension: "xlsx",
    systemDependencies: ["poppler-utils", "tesseract-ocr(optional)"],
    faq: faqDefault("PDF to Excel"),
  },
  {
    slug: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert DOC/DOCX to PDF using LibreOffice.",
    iconLabel: "W",
    accentClassName: "bg-blue-500/20 text-blue-300",
    apiPath: "/api/word-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["libreoffice"],
    faq: faqDefault("Word to PDF"),
  },
  {
    slug: "powerpoint-to-pdf",
    title: "PowerPoint to PDF",
    description: "Convert PPT/PPTX to PDF using LibreOffice.",
    iconLabel: "P",
    accentClassName: "bg-orange-500/20 text-orange-300",
    apiPath: "/api/powerpoint-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["libreoffice"],
    faq: faqDefault("PowerPoint to PDF"),
  },
  {
    slug: "excel-to-pdf",
    title: "Excel to PDF",
    description: "Convert XLS/XLSX to PDF using LibreOffice.",
    iconLabel: "X",
    accentClassName: "bg-green-500/20 text-green-300",
    apiPath: "/api/excel-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["libreoffice"],
    faq: faqDefault("Excel to PDF"),
  },
  {
    slug: "edit-pdf",
    title: "Edit PDF",
    description: "Add text and highlight marks on a chosen page.",
    iconLabel: "E",
    accentClassName: "bg-fuchsia-500/20 text-fuchsia-300",
    apiPath: "/api/edit",
    outputExtension: "pdf",
    faq: faqDefault("Edit PDF"),
  },
  {
    slug: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Render each PDF page as JPG with 150/300 DPI.",
    iconLabel: "J",
    accentClassName: "bg-yellow-500/20 text-yellow-300",
    apiPath: "/api/pdf-to-jpg",
    outputExtension: "zip",
    systemDependencies: ["poppler-utils"],
    faq: faqDefault("PDF to JPG"),
  },
  {
    slug: "jpg-to-pdf",
    title: "JPG/PNG to PDF",
    description: "Combine images into one PDF with orientation and margin.",
    iconLabel: "J",
    accentClassName: "bg-yellow-600/20 text-yellow-200",
    apiPath: "/api/jpg-to-pdf",
    outputExtension: "pdf",
    faq: faqDefault("JPG/PNG to PDF"),
  },
  {
    slug: "sign-pdf",
    title: "Sign PDF",
    description: "Place signature image on selected page and position.",
    iconLabel: "G",
    accentClassName: "bg-cyan-500/20 text-cyan-300",
    apiPath: "/api/sign",
    outputExtension: "pdf",
    faq: faqDefault("Sign PDF"),
  },
  {
    slug: "watermark",
    title: "Watermark",
    description: "Apply text/image watermark with opacity and position.",
    iconLabel: "W",
    accentClassName: "bg-violet-500/20 text-violet-300",
    apiPath: "/api/watermark",
    outputExtension: "pdf",
    faq: faqDefault("Watermark"),
  },
  {
    slug: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate all pages or selected page ranges.",
    iconLabel: "R",
    accentClassName: "bg-pink-500/20 text-pink-300",
    apiPath: "/api/rotate-pdf",
    outputExtension: "pdf",
    faq: faqDefault("Rotate PDF"),
  },
  {
    slug: "html-to-pdf",
    title: "HTML to PDF",
    description: "Convert a URL or raw HTML to PDF via Playwright.",
    iconLabel: "H",
    accentClassName: "bg-yellow-500/20 text-yellow-300",
    apiPath: "/api/html-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["playwright", "chromium"],
    faq: faqDefault("HTML to PDF"),
  },
  {
    slug: "unlock-pdf",
    title: "Unlock PDF",
    description: "Decrypt PDF with the correct password only.",
    iconLabel: "U",
    accentClassName: "bg-blue-500/20 text-blue-300",
    apiPath: "/api/unlock-pdf",
    outputExtension: "pdf",
    systemDependencies: ["qpdf"],
    faq: faqDefault("Unlock PDF"),
  },
  {
    slug: "protect-pdf",
    title: "Protect PDF",
    description: "Encrypt PDF with a user password.",
    iconLabel: "P",
    accentClassName: "bg-indigo-500/20 text-indigo-300",
    apiPath: "/api/protect-pdf",
    outputExtension: "pdf",
    systemDependencies: ["qpdf"],
    faq: faqDefault("Protect PDF"),
  },
];

export function getToolBySlug(slug: string): PdfTool | undefined {
  return PDF_TOOLS.find((tool) => tool.slug === slug);
}

export function getToolHref(slug: ToolSlug): string {
  return `/tools/${slug}`;
}
