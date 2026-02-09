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
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intro: string;
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

function faqDefault(
  title: string,
  primaryKeyword: string,
  secondaryKeywords: string[],
): Array<{ q: string; a: string }> {
  const secondaryA = secondaryKeywords[0] ?? `${title.toLowerCase()} no login`;
  const secondaryB = secondaryKeywords[1] ?? `${title.toLowerCase()} mobile`;
  return [
    {
      q: `Is ${primaryKeyword} free with no account?`,
      a: "Yes. There is no login, no paywall, and no usage counter. Only resource safety limits apply.",
    },
    {
      q: `Can I use ${primaryKeyword} on mobile browser?`,
      a: "Yes. The tool works in modern mobile and desktop browsers without installing an app.",
    },
    {
      q: `What is the file size limit for ${primaryKeyword}?`,
      a: "Each file and total upload are protected by strict limits. If exceeded, the tool returns a clear error immediately.",
    },
    {
      q: `Why did ${primaryKeyword} fail with a limit error?`,
      a: "The file count, file size, total upload, page count, or runtime limit was exceeded. Split or compress the input and retry.",
    },
    {
      q: `Does ${secondaryA} keep output quality?`,
      a: "The service prioritizes valid output and stable runtime. Quality depends on input and selected options.",
    },
    {
      q: `Does ${secondaryB} support scanned files and OCR?`,
      a: "OCR is optional and limited for stability. Text-layer extraction is always attempted first where applicable.",
    },
    {
      q: `How long does ${primaryKeyword} take?`,
      a: "Most files complete quickly. Long jobs run asynchronously with queued/running/done/error status updates.",
    },
    {
      q: `Are uploaded files deleted after ${primaryKeyword}?`,
      a: "Yes. Temporary files are stored in /tmp and automatically cleaned up after a short retention window.",
    },
    {
      q: `Can I chain ${primaryKeyword} with other PDF tools?`,
      a: "Yes. A common flow is unlock or split first, process with this tool, then protect or watermark the output.",
    },
    {
      q: `What should I do if ${primaryKeyword} returns an explicit error?`,
      a: "Use the error message directly: reduce file size/pages, reduce file count, or switch to a compatible format.",
    },
  ];
}

export const PDF_TOOLS: PdfTool[] = [
  {
    slug: "merge-pdf",
    title: "Merge PDF",
    description: "Merge PDF files in exact order for email, print, and sharing.",
    seoTitle: "Merge PDF Online Free - No Login, Keep Page Order",
    seoDescription:
      "Combine PDF files online with no signup. Merge in exact order, fast output, clear limits, and auto cleanup.",
    primaryKeyword: "merge pdf online",
    secondaryKeywords: [
      "combine pdf files in order",
      "merge pdf free no login",
      "merge pdf mobile browser",
      "merge multiple pdf into one file",
      "merge pdf no watermark",
    ],
    intro:
      "Use this merge PDF online tool to combine multiple files into one document while preserving page order. It is built for quick workflows like submission packets, print-ready files, and shareable reports.",
    iconLabel: "M",
    accentClassName: "bg-orange-500/20 text-orange-300",
    apiPath: "/api/merge-pdf",
    outputExtension: "pdf",
    faq: faqDefault(
      "Merge PDF",
      "merge pdf online",
      ["combine pdf files in order", "merge pdf mobile browser"],
    ),
  },
  {
    slug: "split-pdf",
    title: "Split PDF",
    description: "Split PDF by page range or extract every page as separate files.",
    seoTitle: "Split PDF by Page Range - Free, No Signup",
    seoDescription:
      "Split PDF pages online by custom ranges or every page. Download ZIP output fast with explicit limit errors.",
    primaryKeyword: "split pdf by page range",
    secondaryKeywords: [
      "extract pages from pdf free",
      "split pdf every page",
      "split pdf and download zip",
      "split large pdf into smaller files",
      "split pdf mobile no app",
    ],
    intro:
      "Use split PDF by page range to break a large document into smaller parts, extract specific pages, or export every page as an individual file in one ZIP download.",
    iconLabel: "S",
    accentClassName: "bg-red-500/20 text-red-300",
    apiPath: "/api/split-pdf",
    outputExtension: "zip",
    faq: faqDefault(
      "Split PDF",
      "split pdf by page range",
      ["extract pages from pdf free", "split pdf every page"],
    ),
  },
  {
    slug: "compress-pdf",
    title: "Compress PDF",
    description: "Compress PDF size for email and uploads while preserving readability.",
    seoTitle: "Compress PDF Online - Reduce Size for Email",
    seoDescription:
      "Reduce PDF file size online for upload and email. Fast processing with quality-focused profiles and clear limits.",
    primaryKeyword: "compress pdf online",
    secondaryKeywords: [
      "reduce pdf size for email",
      "compress pdf under 1mb",
      "compress pdf keep quality",
      "shrink scanned pdf file size",
      "pdf too large to send fix",
    ],
    intro:
      "Use compress PDF online to reduce file size for email attachments and upload forms. The tool prioritizes stable, readable output and returns clear errors when the environment cannot run compression dependencies.",
    iconLabel: "C",
    accentClassName: "bg-lime-500/20 text-lime-300",
    apiPath: "/api/compress",
    outputExtension: "pdf",
    systemDependencies: ["ghostscript"],
    faq: faqDefault(
      "Compress PDF",
      "compress pdf online",
      ["reduce pdf size for email", "compress pdf keep quality"],
    ),
  },
  {
    slug: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert PDF to Word DOCX with optional OCR fallback for scanned pages.",
    seoTitle: "PDF to Word Converter - Editable DOCX, No Login",
    seoDescription:
      "Convert PDF to Word online. Generate DOCX with page images and optional OCR text extraction when needed.",
    primaryKeyword: "pdf to word converter",
    secondaryKeywords: [
      "pdf to docx no login",
      "scanned pdf to word with ocr",
      "convert pdf to editable document",
      "pdf to word keep layout",
      "image pdf to editable word",
    ],
    intro:
      "Use this PDF to Word converter to create editable DOCX output. The processor first tries text-layer extraction for speed, then optional OCR for scanned pages within safe limits.",
    iconLabel: "W",
    accentClassName: "bg-sky-500/20 text-sky-300",
    apiPath: "/api/pdf-to-word",
    outputExtension: "docx",
    systemDependencies: ["poppler-utils", "tesseract-ocr(optional)"],
    faq: faqDefault(
      "PDF to Word",
      "pdf to word converter",
      ["pdf to docx no login", "scanned pdf to word with ocr"],
    ),
  },
  {
    slug: "pdf-to-powerpoint",
    title: "PDF to PowerPoint",
    description: "Convert PDF to PowerPoint with one page per slide and optional notes.",
    seoTitle: "PDF to PowerPoint Online - One Page per Slide",
    seoDescription:
      "Convert PDF to PPTX online with one slide per page image and optional extracted text notes.",
    primaryKeyword: "pdf to powerpoint online",
    secondaryKeywords: [
      "convert pdf to pptx slides",
      "one page per slide pdf to ppt",
      "pdf to presentation no signup",
      "pdf to ppt with notes text",
      "turn report pdf into slides",
    ],
    intro:
      "Use PDF to PowerPoint online to transform document pages into presentation slides. This tool creates one slide per page image and can append extracted text as notes where available.",
    iconLabel: "P",
    accentClassName: "bg-amber-500/20 text-amber-300",
    apiPath: "/api/pdf-to-powerpoint",
    outputExtension: "pptx",
    systemDependencies: ["poppler-utils", "tesseract-ocr(optional)"],
    faq: faqDefault(
      "PDF to PowerPoint",
      "pdf to powerpoint online",
      ["convert pdf to pptx slides", "one page per slide pdf to ppt"],
    ),
  },
  {
    slug: "pdf-to-excel",
    title: "PDF to Excel",
    description: "Convert PDF to Excel with one sheet per page and optional OCR.",
    seoTitle: "PDF to Excel Converter - Extract Text to XLSX",
    seoDescription:
      "Convert PDF to Excel online. Build one sheet per page using text layer first, with optional OCR fallback.",
    primaryKeyword: "pdf to excel converter",
    secondaryKeywords: [
      "convert pdf table to xlsx",
      "scanned pdf to excel with ocr",
      "extract text layer to excel",
      "bank statement pdf to excel",
      "pdf to excel no signup",
    ],
    intro:
      "Use PDF to Excel converter for structured extraction workflows. The tool creates one worksheet per page, uses text-layer extraction first, and applies OCR only when requested and allowed by limits.",
    iconLabel: "X",
    accentClassName: "bg-emerald-500/20 text-emerald-300",
    apiPath: "/api/pdf-to-excel",
    outputExtension: "xlsx",
    systemDependencies: ["poppler-utils", "tesseract-ocr(optional)"],
    faq: faqDefault(
      "PDF to Excel",
      "pdf to excel converter",
      ["convert pdf table to xlsx", "scanned pdf to excel with ocr"],
    ),
  },
  {
    slug: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert Word DOC or DOCX to PDF while preserving layout.",
    seoTitle: "Word to PDF Online - Keep Formatting",
    seoDescription:
      "Convert DOC and DOCX to PDF online with no login. Layout-focused output and explicit limit messages.",
    primaryKeyword: "word to pdf online",
    secondaryKeywords: [
      "docx to pdf keep formatting",
      "convert word file to pdf no login",
      "word to pdf mobile browser",
      "doc to pdf for print",
      "office file to pdf converter",
    ],
    intro:
      "Use Word to PDF online to turn DOC and DOCX files into shareable PDFs. This converter is designed for stable output with clear size and page limits on free-tier infrastructure.",
    iconLabel: "W",
    accentClassName: "bg-blue-500/20 text-blue-300",
    apiPath: "/api/word-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["libreoffice"],
    faq: faqDefault(
      "Word to PDF",
      "word to pdf online",
      ["docx to pdf keep formatting", "word to pdf mobile browser"],
    ),
  },
  {
    slug: "powerpoint-to-pdf",
    title: "PowerPoint to PDF",
    description: "Convert PPT and PPTX slides to PDF for print or sharing.",
    seoTitle: "PowerPoint to PDF - Convert PPT/PPTX Online",
    seoDescription:
      "Convert PowerPoint to PDF online with no signup. Keep slide order and generate download-ready output.",
    primaryKeyword: "powerpoint to pdf online",
    secondaryKeywords: [
      "ppt to pdf converter",
      "pptx slides to pdf",
      "presentation to pdf no login",
      "convert slides to printable pdf",
      "export ppt to pdf quickly",
    ],
    intro:
      "Use PowerPoint to PDF online for distribution-ready slides. Upload a PPT or PPTX file, run conversion, and download a PDF optimized for sharing and printing workflows.",
    iconLabel: "P",
    accentClassName: "bg-orange-500/20 text-orange-300",
    apiPath: "/api/powerpoint-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["libreoffice"],
    faq: faqDefault(
      "PowerPoint to PDF",
      "powerpoint to pdf online",
      ["ppt to pdf converter", "pptx slides to pdf"],
    ),
  },
  {
    slug: "excel-to-pdf",
    title: "Excel to PDF",
    description: "Convert Excel spreadsheets to PDF for reporting and sharing.",
    seoTitle: "Excel to PDF Converter - XLS/XLSX to PDF",
    seoDescription:
      "Convert Excel to PDF online from XLS or XLSX. Built for shareable output with explicit free-tier limits.",
    primaryKeyword: "excel to pdf converter",
    secondaryKeywords: [
      "xlsx to pdf online",
      "spreadsheet to pdf no login",
      "convert excel for print",
      "excel sheet to pdf quickly",
      "office to pdf converter",
    ],
    intro:
      "Use Excel to PDF converter to turn spreadsheets into static, easy-to-share documents. It supports XLS and XLSX input and returns explicit limit errors instead of hanging requests.",
    iconLabel: "X",
    accentClassName: "bg-green-500/20 text-green-300",
    apiPath: "/api/excel-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["libreoffice"],
    faq: faqDefault(
      "Excel to PDF",
      "excel to pdf converter",
      ["xlsx to pdf online", "spreadsheet to pdf no login"],
    ),
  },
  {
    slug: "edit-pdf",
    title: "Edit PDF",
    description: "Edit PDF by adding text and highlight marks on selected pages.",
    seoTitle: "Edit PDF Online - Add Text and Highlights",
    seoDescription:
      "Edit PDF online by placing text and highlight marks on chosen pages. Fast output with clear limits.",
    primaryKeyword: "edit pdf online",
    secondaryKeywords: [
      "add text to pdf",
      "highlight text in pdf online",
      "annotate pdf quickly",
      "edit selected page pdf",
      "pdf markup tool no login",
    ],
    intro:
      "Use edit PDF online for lightweight document markup. Add custom text or highlight marks on specific pages without needing desktop software.",
    iconLabel: "E",
    accentClassName: "bg-fuchsia-500/20 text-fuchsia-300",
    apiPath: "/api/edit",
    outputExtension: "pdf",
    faq: faqDefault(
      "Edit PDF",
      "edit pdf online",
      ["add text to pdf", "highlight text in pdf online"],
    ),
  },
  {
    slug: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Convert PDF pages to JPG images at web-friendly DPI settings.",
    seoTitle: "PDF to JPG - Export Pages as Images Online",
    seoDescription:
      "Convert PDF to JPG online. Export each page as image files and download as ZIP when multiple pages exist.",
    primaryKeyword: "pdf to jpg online",
    secondaryKeywords: [
      "convert pdf pages to jpg",
      "pdf to image 150 dpi",
      "pdf to image 300 dpi",
      "export each page as jpg",
      "pdf to jpg zip download",
    ],
    intro:
      "Use PDF to JPG online to export document pages as image files. Select a supported DPI setting for quality and receive a ZIP when multiple pages are generated.",
    iconLabel: "J",
    accentClassName: "bg-yellow-500/20 text-yellow-300",
    apiPath: "/api/pdf-to-jpg",
    outputExtension: "zip",
    systemDependencies: ["poppler-utils"],
    faq: faqDefault(
      "PDF to JPG",
      "pdf to jpg online",
      ["convert pdf pages to jpg", "pdf to image 150 dpi"],
    ),
  },
  {
    slug: "jpg-to-pdf",
    title: "JPG/PNG to PDF",
    description: "Convert JPG or PNG images into a single ordered PDF.",
    seoTitle: "JPG to PDF Online - Combine Images into One PDF",
    seoDescription:
      "Convert JPG and PNG files to one PDF online. Keep image order and produce share-ready output with no signup.",
    primaryKeyword: "jpg to pdf online",
    secondaryKeywords: [
      "png to pdf converter",
      "combine images into one pdf",
      "photo to pdf no login",
      "multi image to pdf in order",
      "mobile image to pdf tool",
    ],
    intro:
      "Use JPG to PDF online to combine photos, screenshots, and PNG files into a single PDF. This tool preserves file order and returns fast downloadable output.",
    iconLabel: "J",
    accentClassName: "bg-yellow-600/20 text-yellow-200",
    apiPath: "/api/jpg-to-pdf",
    outputExtension: "pdf",
    faq: faqDefault(
      "JPG/PNG to PDF",
      "jpg to pdf online",
      ["png to pdf converter", "combine images into one pdf"],
    ),
  },
  {
    slug: "sign-pdf",
    title: "Sign PDF",
    description: "Sign PDF by placing a signature image on chosen page coordinates.",
    seoTitle: "Sign PDF Online - Add Signature Image",
    seoDescription:
      "Sign PDF online by uploading a signature image and placing it on a selected page position.",
    primaryKeyword: "sign pdf online",
    secondaryKeywords: [
      "add signature to pdf",
      "place signature image pdf",
      "sign pdf no account",
      "custom position signature pdf",
      "sign contract pdf quickly",
    ],
    intro:
      "Use sign PDF online to place a signature image on the exact page and coordinates you choose. This is designed for quick form and contract workflows.",
    iconLabel: "G",
    accentClassName: "bg-cyan-500/20 text-cyan-300",
    apiPath: "/api/sign",
    outputExtension: "pdf",
    faq: faqDefault(
      "Sign PDF",
      "sign pdf online",
      ["add signature to pdf", "place signature image pdf"],
    ),
  },
  {
    slug: "watermark",
    title: "Watermark",
    description: "Add text watermark to PDF with opacity and position controls.",
    seoTitle: "Watermark PDF - Add Text Watermark Online",
    seoDescription:
      "Add text watermark to PDF online. Control opacity, placement, and page selection for draft or confidential labels.",
    primaryKeyword: "watermark pdf online",
    secondaryKeywords: [
      "add text watermark to pdf",
      "confidential watermark pdf",
      "watermark all pages pdf",
      "watermark selected pages pdf",
      "set watermark opacity pdf",
    ],
    intro:
      "Use watermark PDF online to apply reusable text marks such as Draft or Confidential. You can choose placement, opacity, and target pages for consistent output.",
    iconLabel: "W",
    accentClassName: "bg-violet-500/20 text-violet-300",
    apiPath: "/api/watermark",
    outputExtension: "pdf",
    faq: faqDefault(
      "Watermark",
      "watermark pdf online",
      ["add text watermark to pdf", "watermark all pages pdf"],
    ),
  },
  {
    slug: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate PDF pages globally or by selected page ranges.",
    seoTitle: "Rotate PDF Pages Online - Selected Pages or All",
    seoDescription:
      "Rotate PDF online for all pages or selected ranges. Fix upside-down scans quickly with clear output.",
    primaryKeyword: "rotate pdf pages online",
    secondaryKeywords: [
      "rotate selected pages in pdf",
      "rotate all pages 90 degrees",
      "fix upside down pdf",
      "rotate page range pdf",
      "rotate pdf for printing",
    ],
    intro:
      "Use rotate PDF pages online to fix upside-down scans or mixed page orientations. Rotate all pages or just a specific range for print-ready output.",
    iconLabel: "R",
    accentClassName: "bg-pink-500/20 text-pink-300",
    apiPath: "/api/rotate-pdf",
    outputExtension: "pdf",
    faq: faqDefault(
      "Rotate PDF",
      "rotate pdf pages online",
      ["rotate selected pages in pdf", "fix upside down pdf"],
    ),
  },
  {
    slug: "html-to-pdf",
    title: "HTML to PDF",
    description: "Convert HTML or URL to PDF with resource-safe browser rendering.",
    seoTitle: "HTML to PDF Online - URL or Raw HTML",
    seoDescription:
      "Convert URL or raw HTML to PDF online with safe browser flags, strict limits, and explicit error messages.",
    primaryKeyword: "html to pdf online",
    secondaryKeywords: [
      "url to pdf converter",
      "webpage to pdf online",
      "convert raw html to pdf",
      "save web page as pdf",
      "html string to pdf file",
    ],
    intro:
      "Use HTML to PDF online to print web pages or raw markup into downloadable PDFs. This tool enforces strict size and timeout limits for stable free-tier performance.",
    iconLabel: "H",
    accentClassName: "bg-yellow-500/20 text-yellow-300",
    apiPath: "/api/html-to-pdf",
    outputExtension: "pdf",
    systemDependencies: ["playwright", "chromium"],
    faq: faqDefault(
      "HTML to PDF",
      "html to pdf online",
      ["url to pdf converter", "webpage to pdf online"],
    ),
  },
  {
    slug: "unlock-pdf",
    title: "Unlock PDF",
    description: "Unlock PDF with the correct password for editing and reuse.",
    seoTitle: "Unlock PDF Online - Remove Password with Correct Key",
    seoDescription:
      "Unlock PDF online by entering the correct password. Generate an unlocked copy for merge, edit, or print workflows.",
    primaryKeyword: "unlock pdf online",
    secondaryKeywords: [
      "remove pdf password with correct password",
      "decrypt protected pdf",
      "unlock pdf for printing",
      "unlock pdf no signup",
      "open locked pdf file",
    ],
    intro:
      "Use unlock PDF online when you already have the correct password and need an editable or printable copy. The tool fails fast with explicit errors on incorrect credentials.",
    iconLabel: "U",
    accentClassName: "bg-blue-500/20 text-blue-300",
    apiPath: "/api/unlock-pdf",
    outputExtension: "pdf",
    systemDependencies: ["qpdf"],
    faq: faqDefault(
      "Unlock PDF",
      "unlock pdf online",
      ["remove pdf password with correct password", "decrypt protected pdf"],
    ),
  },
  {
    slug: "protect-pdf",
    title: "Protect PDF",
    description: "Protect PDF with password encryption before sharing.",
    seoTitle: "Protect PDF with Password - Encrypt PDF Online",
    seoDescription:
      "Encrypt PDF online with a user password for secure sharing. No login required, clear limits and fast output.",
    primaryKeyword: "protect pdf with password",
    secondaryKeywords: [
      "encrypt pdf online",
      "lock pdf before sending",
      "secure pdf sharing",
      "add password to pdf no signup",
      "set user password on pdf",
    ],
    intro:
      "Use protect PDF with password to secure sensitive files before email or cloud sharing. This tool creates an encrypted copy quickly with clear runtime feedback.",
    iconLabel: "P",
    accentClassName: "bg-indigo-500/20 text-indigo-300",
    apiPath: "/api/protect-pdf",
    outputExtension: "pdf",
    systemDependencies: ["qpdf"],
    faq: faqDefault(
      "Protect PDF",
      "protect pdf with password",
      ["encrypt pdf online", "lock pdf before sending"],
    ),
  },
];

export function getToolBySlug(slug: string): PdfTool | undefined {
  return PDF_TOOLS.find((tool) => tool.slug === slug);
}

export function getToolHref(slug: ToolSlug): string {
  return `/tools/${slug}`;
}
