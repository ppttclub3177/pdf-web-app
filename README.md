# PDF Web App (iLovePDF-style, self-hosted, unlimited)

Next.js 16 (App Router) + TypeScript + Tailwind PDF tool station.

- No login
- No paywall
- No usage counter
- All cards are functional tools that produce downloadable files
- Google-indexable when deployed with a real public domain and HTTPS

## Requirements

### Local dev mode (`npm run dev`)

- Node.js 20+
- Works for pure Node/pdf-lib tools immediately
- Tools requiring system binaries will return a clear error with Docker hint

### Docker full mode (`docker compose up --build`)

Full toolset with all dependencies preinstalled:

- `poppler-utils` (`pdftoppm`)
- `ghostscript`
- `qpdf`
- `libreoffice`
- `tesseract-ocr`
- `playwright` + Chromium

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Copy environment config

```bash
cp .env.example .env.local
```

3. Start app

```bash
npm run dev
```

4. Open

`http://localhost:3000`

## Docker Full Mode

```bash
docker compose up --build
```

Open `http://localhost:3000`.

This mode enables all system-binary tools out of the box.

### Windows note (LibreOffice)

If Office->PDF shows missing LibreOffice command:

1. Install LibreOffice
2. Add LibreOffice `program` folder to PATH, or set:

```env
LIBREOFFICE_CMD=C:\Program Files\LibreOffice\program\soffice.exe
```

## Resource Guard (configurable)

Set in `.env.local` (or compose env):

```env
MAX_FILES=20
MAX_FILE_MB=100
MAX_PAGES=500
MAX_TOTAL_MB=300
REQUEST_TIMEOUT_SEC=120
MAX_HTML_FETCH_MB=15
TMP_DIR=data/tmp
TMP_TTL_MINUTES=20
ENABLE_OCR=1
LIBREOFFICE_CMD=
```

UI applies these limits early, API enforces them server-side.

These are safety limits only, not usage limits. Visitors can use tools unlimited times.

## Dev Test Assets & Smoke Tests

Generate assets:

```bash
npm run test:assets
```

Run smoke tests:

```bash
npm run test:smoke
```

For strict full-mode verification, run in Docker and set:

```bash
SMOKE_FULL=1 npm run test:smoke
```

Smoke tests cover:

- merge page count
- split zip file count
- rotate output openable
- watermark output openable
- pdf->jpg output image/zip
- office->pdf output openable (full mode)
- protect/unlock correct + wrong password behavior

## Tool Matrix

| Tool | Route | API | Output | Implementation | Dependencies |
|---|---|---|---|---|---|
| Merge PDF | `/tools/merge-pdf` | `/api/merge-pdf` | PDF | `pdf-lib` copyPages | `pdf-lib` |
| Split PDF | `/tools/split-pdf` | `/api/split-pdf` | ZIP | per-page or range groups | `pdf-lib`, `jszip` |
| Rotate PDF | `/tools/rotate-pdf` | `/api/rotate-pdf` | PDF | rotate all/selected pages | `pdf-lib` |
| Watermark | `/tools/watermark` | `/api/watermark` | PDF | text/image watermark, opacity/position/scale/pages | `pdf-lib` |
| Sign PDF | `/tools/sign-pdf` | `/api/sign` | PDF | signature image insertion with coordinate picker | `pdf-lib` |
| Edit PDF | `/tools/edit-pdf` | `/api/edit` | PDF | add text + highlight rectangle | `pdf-lib` |
| JPG/PNG to PDF | `/tools/jpg-to-pdf` | `/api/jpg-to-pdf` | PDF | multi-image fit to A4 portrait/landscape + margin | `pdf-lib` |
| PDF to JPG | `/tools/pdf-to-jpg` | `/api/pdf-to-jpg` | JPG/ZIP | rasterize each page | `pdftoppm` |
| HTML to PDF | `/tools/html-to-pdf` | `/api/html-to-pdf` | PDF | URL or raw HTML render | `playwright` Chromium |
| Compress PDF | `/tools/compress-pdf` | `/api/compress` | PDF | quality profiles | `ghostscript` |
| Word to PDF | `/tools/word-to-pdf` | `/api/word-to-pdf` | PDF | headless office convert | `libreoffice` |
| PowerPoint to PDF | `/tools/powerpoint-to-pdf` | `/api/powerpoint-to-pdf` | PDF | headless office convert | `libreoffice` |
| Excel to PDF | `/tools/excel-to-pdf` | `/api/excel-to-pdf` | PDF | headless office convert | `libreoffice` |
| PDF to Word | `/tools/pdf-to-word` | `/api/pdf-to-word` | DOCX | one page image per section + optional OCR text | `pdftoppm`, `docx`, `tesseract`(optional) |
| PDF to PowerPoint | `/tools/pdf-to-powerpoint` | `/api/pdf-to-powerpoint` | PPTX | one page image per slide + optional OCR text | `pdftoppm`, `pptxgenjs`, `tesseract`(optional) |
| PDF to Excel | `/tools/pdf-to-excel` | `/api/pdf-to-excel` | XLSX | OCR lines per page sheet | `pdftoppm`, `exceljs`, `tesseract`(optional) |
| Protect PDF | `/tools/protect-pdf` | `/api/protect-pdf` | PDF | encrypt with user password | `qpdf` |
| Unlock PDF | `/tools/unlock-pdf` | `/api/unlock-pdf` | PDF | decrypt only with provided password | `qpdf` |

## Security Notes

- Unlock route does **not** do brute-force or dictionary attempts.
- HTML->PDF URL mode enforces SSRF guard:
  - only `http/https`
  - blocks localhost and private network IP ranges
  - DNS resolution check for internal addresses
  - redirect re-validation
  - request timeout and max HTML size guard

## Production Deployment (Recommended: Render Docker Web Service)

1. Push this repo to GitHub.
2. In Render, create a new **Web Service** from repo.
3. Runtime: **Docker** (Render uses your `Dockerfile`).
4. Set environment variables in Render dashboard:
   - `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
   - `NEXT_PUBLIC_SITE_NAME=YourBrand`
   - `MAX_FILES=20`
   - `MAX_FILE_MB=100`
   - `MAX_TOTAL_MB=300`
   - `MAX_PAGES=500`
   - `REQUEST_TIMEOUT_SEC=120`
   - `MAX_HTML_FETCH_MB=15`
   - `TMP_DIR=data/tmp`
   - `TMP_TTL_MINUTES=20`
   - `ENABLE_OCR=1`
5. Deploy service and confirm app opens over HTTPS on Render domain.
6. Add your custom domain in Render and enable HTTPS.
7. Update DNS records at your domain provider as instructed by Render.
8. After DNS/SSL are active, verify:
   - `https://your-domain.com/robots.txt`
   - `https://your-domain.com/sitemap.xml`

## Google Indexing Checklist

1. Set `NEXT_PUBLIC_SITE_URL` to your public HTTPS domain (not localhost).
2. Confirm production pages return `200` and are crawlable:
   - `/robots.txt` allows crawl
   - `/sitemap.xml` contains canonical HTTPS URLs for your domain
3. Confirm there is no `noindex` meta tag on home/tools.
4. Confirm canonical URLs are correct on home and tool pages.
5. In Google Search Console:
   - Add property for your domain (`Domain` property recommended)
   - Verify ownership (DNS TXT)
6. Submit sitemap:
   - Search Console -> Sitemaps -> submit `https://your-domain.com/sitemap.xml`
7. Use URL Inspection for:
   - homepage
   - 2-3 tool pages
   - privacy and terms
8. Request indexing for key URLs and monitor coverage reports.
9. Re-submit sitemap after adding new tools/pages.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test:assets`
- `npm run test:smoke`
- `npm run cleanup:tmp`
