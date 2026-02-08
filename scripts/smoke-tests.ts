import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { POST as mergePost } from "../app/api/merge/route";
import { POST as splitPost } from "../app/api/split/route";
import { POST as rotatePost } from "../app/api/rotate/route";
import { POST as watermarkPost } from "../app/api/watermark/route";
import { POST as pdfToJpgPost } from "../app/api/pdf-to-jpg/route";
import { POST as wordToPdfPost } from "../app/api/word-to-pdf/route";
import { POST as protectPost } from "../app/api/protect/route";
import { POST as unlockPost } from "../app/api/unlock/route";

const assetsDir = path.join(process.cwd(), "dev", "test-assets");
const requireSystem = process.env.SMOKE_FULL === "1";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileFromAsset(name: string, type: string): Promise<File> {
  const data = await readFile(path.join(assetsDir, name));
  return new File([data], name, { type });
}

async function responsePdfPageCount(response: Response): Promise<number> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPageCount();
}

function buildRequest(formData: FormData): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body: formData,
  });
}

async function ensureGeneratedAssets() {
  const required = ["a.pdf", "b.pdf", "sample.jpg", "sample.docx"];
  for (const file of required) {
    await readFile(path.join(assetsDir, file));
  }
}

async function runMergeTest() {
  const fd = new FormData();
  fd.append("files", await fileFromAsset("a.pdf", "application/pdf"));
  fd.append("files", await fileFromAsset("b.pdf", "application/pdf"));
  const response = await mergePost(buildRequest(fd));
  assert(response.ok, "merge should return 200");
  const pages = await responsePdfPageCount(response);
  assert(pages === 3, `merge output pages should be 3, got ${pages}`);
}

async function runSplitTest() {
  const fd = new FormData();
  fd.append("file", await fileFromAsset("b.pdf", "application/pdf"));
  const response = await splitPost(buildRequest(fd));
  assert(response.ok, "split should return 200");
  const zipData = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(zipData);
  const pdfFiles = Object.keys(zip.files).filter((name) => name.endsWith(".pdf"));
  assert(pdfFiles.length === 2, `split zip should contain 2 pdfs, got ${pdfFiles.length}`);
}

async function runRotateTest() {
  const fd = new FormData();
  fd.append("file", await fileFromAsset("a.pdf", "application/pdf"));
  fd.append("angle", "90");
  fd.append("pages", "all");
  const response = await rotatePost(buildRequest(fd));
  assert(response.ok, "rotate should return 200");
  const pages = await responsePdfPageCount(response);
  assert(pages === 1, `rotate output pages should be 1, got ${pages}`);
}

async function runWatermarkTest() {
  const fd = new FormData();
  fd.append("file", await fileFromAsset("a.pdf", "application/pdf"));
  fd.append("text", "TEST");
  fd.append("opacity", "0.3");
  fd.append("scale", "0.4");
  fd.append("position", "center");
  fd.append("pages", "all");
  const response = await watermarkPost(buildRequest(fd));
  assert(response.ok, "watermark should return 200");
  const pages = await responsePdfPageCount(response);
  assert(pages === 1, `watermark output pages should be 1, got ${pages}`);
}

async function runPdfToJpgTest() {
  const fd = new FormData();
  fd.append("file", await fileFromAsset("a.pdf", "application/pdf"));
  fd.append("dpi", "150");
  const response = await pdfToJpgPost(buildRequest(fd));
  if (!response.ok) {
    const errorMessage = await response.text();
    if (!requireSystem) {
      console.warn(`skip pdf->jpg (non-system mode): ${errorMessage}`);
      return;
    }
    throw new Error(`pdf->jpg failed: ${errorMessage}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/zip")) {
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const jpgCount = Object.keys(zip.files).filter((name) => name.endsWith(".jpg")).length;
    assert(jpgCount >= 1, "pdf->jpg zip should contain at least one jpg");
  } else {
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert(bytes.length > 0, "pdf->jpg should produce non-empty output");
  }
}

async function runOfficeToPdfTest() {
  const fd = new FormData();
  fd.append(
    "file",
    await fileFromAsset(
      "sample.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
  );
  const response = await wordToPdfPost(buildRequest(fd));
  if (!response.ok) {
    const errorMessage = await response.text();
    if (!requireSystem) {
      console.warn(`skip office->pdf (non-system mode): ${errorMessage}`);
      return;
    }
    throw new Error(`office->pdf failed: ${errorMessage}`);
  }
  const pages = await responsePdfPageCount(response);
  assert(pages >= 1, "office->pdf should output at least one page");
}

async function runProtectUnlockTest() {
  const protectFd = new FormData();
  protectFd.append("file", await fileFromAsset("a.pdf", "application/pdf"));
  protectFd.append("password", "1234");
  const protectedResponse = await protectPost(buildRequest(protectFd));

  if (!protectedResponse.ok) {
    const errorMessage = await protectedResponse.text();
    if (!requireSystem) {
      console.warn(`skip protect/unlock (non-system mode): ${errorMessage}`);
      return;
    }
    throw new Error(`protect failed: ${errorMessage}`);
  }

  const protectedBytes = await protectedResponse.arrayBuffer();
  const protectedFile = new File([protectedBytes], "protected.pdf", {
    type: "application/pdf",
  });

  const unlockFd = new FormData();
  unlockFd.append("file", protectedFile);
  unlockFd.append("password", "1234");
  const unlockResponse = await unlockPost(buildRequest(unlockFd));
  assert(unlockResponse.ok, "unlock with correct password should succeed");

  const wrongUnlockFd = new FormData();
  wrongUnlockFd.append("file", protectedFile);
  wrongUnlockFd.append("password", "wrong");
  const wrongUnlockResponse = await unlockPost(buildRequest(wrongUnlockFd));
  assert(!wrongUnlockResponse.ok, "unlock with wrong password should fail");
}

async function main() {
  await ensureGeneratedAssets();
  await runMergeTest();
  await runSplitTest();
  await runRotateTest();
  await runWatermarkTest();
  await runPdfToJpgTest();
  await runOfficeToPdfTest();
  await runProtectUnlockTest();
  console.log("Smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
