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
MAX_FILES=5
MAX_FILE_MB=25
MAX_PAGES=50
MAX_TOTAL_MB=50
REQUEST_TIMEOUT_SEC=600
MAX_HTML_FETCH_MB=1
HTML_TO_PDF_MAX_KB=300
TMP_DIR=data/tmp
TMP_TTL_MINUTES=15
ENABLE_OCR=1
OCR_MAX_PAGES=10
OCR_DPI=150
JOB_TIMEOUT_MINUTES=10
JOB_RETENTION_MINUTES=15
OFFICE_MAX_FILE_MB=10
OFFICE_MAX_PAGES=30
LIBREOFFICE_CMD=
```

UI applies these limits early, API enforces them server-side.

These are safety limits only, not usage limits. Visitors can use tools unlimited times.

## Async Job API

All long-running tools use async jobs (no long blocking HTTP request):

- `POST /api/jobs/:tool` -> `202 { jobId }`
- `GET /api/jobs/:jobId` -> `{ status: queued|running|done|error, progress, message, downloadUrl? }`
- `GET /api/jobs/:jobId/download` -> streams output file after `done`

Queue concurrency is `1` by default for Render Free stability. Job temp files are stored under `/tmp/pdf-web-app-jobs` and auto-cleaned after retention.

## Dev Test Assets & Smoke Tests

Generate assets:

```bash
npm run test:assets
```

Run smoke tests:

```bash
npm run test:smoke
```

Run async job smoke tests against all tools:

```bash
npm run test:smoke:jobs
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
| Merge PDF | `/tools/merge-pdf` | `POST /api/jobs/merge-pdf` | PDF | `pdf-lib` copyPages | `pdf-lib` |
| Split PDF | `/tools/split-pdf` | `POST /api/jobs/split-pdf` | ZIP | page-range split + zip | `pdf-lib`, `archiver` |
| Rotate PDF | `/tools/rotate-pdf` | `POST /api/jobs/rotate-pdf` | PDF | rotate all/selected pages | `pdf-lib` |
| Watermark | `/tools/watermark` | `POST /api/jobs/watermark` | PDF | text/image watermark | `pdf-lib` |
| Sign PDF | `/tools/sign-pdf` | `POST /api/jobs/sign-pdf` | PDF | signature image insertion | `pdf-lib` |
| Edit PDF | `/tools/edit-pdf` | `POST /api/jobs/edit-pdf` | PDF | add text + highlight rectangle | `pdf-lib` |
| JPG/PNG to PDF | `/tools/jpg-to-pdf` | `POST /api/jobs/jpg-to-pdf` | PDF | multi-image to PDF | `pdf-lib` |
| PDF to JPG | `/tools/pdf-to-jpg` | `POST /api/jobs/pdf-to-jpg` | JPG/ZIP | rasterize each page | `pdftoppm`, `archiver` |
| HTML to PDF | `/tools/html-to-pdf` | `POST /api/jobs/html-to-pdf` | PDF | URL or raw HTML render | `playwright` Chromium |
| Compress PDF | `/tools/compress-pdf` | `POST /api/jobs/compress-pdf` | PDF | Ghostscript quality profiles | `ghostscript` |
| Word to PDF | `/tools/word-to-pdf` | `POST /api/jobs/word-to-pdf` | PDF | headless office convert | `libreoffice` |
| PowerPoint to PDF | `/tools/powerpoint-to-pdf` | `POST /api/jobs/powerpoint-to-pdf` | PDF | headless office convert | `libreoffice` |
| Excel to PDF | `/tools/excel-to-pdf` | `POST /api/jobs/excel-to-pdf` | PDF | headless office convert | `libreoffice` |
| PDF to Word | `/tools/pdf-to-word` | `POST /api/jobs/pdf-to-word` | DOCX | one page image per section + extracted text | `pdftoppm`, `docx`, `tesseract`(optional) |
| PDF to PowerPoint | `/tools/pdf-to-powerpoint` | `POST /api/jobs/pdf-to-powerpoint` | PPTX | one page image per slide + notes text | `pdftoppm`, `pptxgenjs`, `tesseract`(optional) |
| PDF to Excel | `/tools/pdf-to-excel` | `POST /api/jobs/pdf-to-excel` | XLSX | text-layer first, OCR fallback | `pdftoppm`, `exceljs`, `tesseract`(optional) |
| Protect PDF | `/tools/protect-pdf` | `POST /api/jobs/protect-pdf` | PDF | encrypt with user password | `qpdf` |
| Unlock PDF | `/tools/unlock-pdf` | `POST /api/jobs/unlock-pdf` | PDF | decrypt with provided password | `qpdf` |

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
4. Use production startup (do not run `next dev` on Render):
   - Docker runtime: this `Dockerfile` runs `npm run build` and starts with `npm run start`.
   - Node runtime (alternative): Build command `npm ci && npm run build`, Start command `npm run start`.
5. Set environment variables in Render dashboard:
   - `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
   - `NEXT_PUBLIC_SITE_NAME=YourBrand`
   - `MAX_FILES=5`
   - `MAX_FILE_MB=25`
   - `MAX_TOTAL_MB=50`
   - `MAX_PAGES=50`
   - `REQUEST_TIMEOUT_SEC=600`
   - `MAX_HTML_FETCH_MB=1`
   - `HTML_TO_PDF_MAX_KB=300`
   - `TMP_DIR=data/tmp`
   - `TMP_TTL_MINUTES=15`
   - `ENABLE_OCR=1`
   - `OCR_MAX_PAGES=10`
   - `OCR_DPI=150`
   - `JOB_TIMEOUT_MINUTES=10`
   - `JOB_RETENTION_MINUTES=15`
   - `OFFICE_MAX_FILE_MB=10`
   - `OFFICE_MAX_PAGES=30`
   - `NODE_OPTIONS=--max-old-space-size=256`
   - `NEXT_TELEMETRY_DISABLED=1`
6. Deploy service and confirm app opens over HTTPS on Render domain.
7. Add your custom domain in Render and enable HTTPS.
8. Update DNS records at your domain provider as instructed by Render.
9. After DNS/SSL are active, verify:
   - `https://your-domain.com/healthz`
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
- `npm run start`
- `npm run lint`
- `npm run test:assets`
- `npm run test:smoke`
- `npm run test:smoke:jobs`
- `npm run cleanup:tmp`
