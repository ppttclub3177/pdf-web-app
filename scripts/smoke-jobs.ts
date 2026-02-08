import path from "node:path";
import { readFile } from "node:fs/promises";
import { POST as jobsPost, GET as jobsGet } from "../app/api/jobs/[id]/route";
import { GET as jobDownloadGet } from "../app/api/jobs/[id]/download/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type JobStatusPayload = {
  jobId: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  message: string;
  downloadUrl?: string;
};

const fixturesDir = path.join(process.cwd(), "tests", "fixtures");

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function routeContext(id: string): RouteContext {
  return {
    params: Promise.resolve({ id }),
  };
}

async function fixtureFile(name: string, type: string): Promise<File> {
  const bytes = await readFile(path.join(fixturesDir, name));
  return new File([bytes], name, { type });
}

async function createJob(tool: string, formData: FormData): Promise<string> {
  const request = new Request(`http://localhost/api/jobs/${tool}`, {
    method: "POST",
    body: formData,
  });
  const response = await jobsPost(request, routeContext(tool));
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed creating job for ${tool}: ${response.status} ${text}`);
  }
  const payload = (await response.json()) as { jobId?: string };
  if (!payload.jobId) {
    throw new Error(`Missing jobId for ${tool}`);
  }
  return payload.jobId;
}

async function waitForJob(jobId: string): Promise<JobStatusPayload> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10 * 60 * 1000) {
    const response = await jobsGet(
      new Request(`http://localhost/api/jobs/${jobId}`, { method: "GET" }),
      routeContext(jobId),
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Status failed for ${jobId}: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as JobStatusPayload;
    if (payload.status === "done") {
      return payload;
    }
    if (payload.status === "error") {
      throw new Error(`Job ${jobId} failed: ${payload.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Job ${jobId} timed out in smoke test.`);
}

async function downloadJob(jobId: string): Promise<Uint8Array> {
  const response = await jobDownloadGet(
    new Request(`http://localhost/api/jobs/${jobId}/download`, {
      method: "GET",
    }),
    routeContext(jobId),
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Download failed for ${jobId}: ${response.status} ${text}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function runJob(
  tool: string,
  formData: FormData,
  label: string,
): Promise<Uint8Array> {
  const jobId = await createJob(tool, formData);
  const status = await waitForJob(jobId);
  assert(status.status === "done", `${label}: status should be done`);
  const bytes = await downloadJob(jobId);
  assert(bytes.length > 0, `${label}: output should be non-empty`);
  return bytes;
}

async function main() {
  const mergeFd = new FormData();
  mergeFd.append("files", await fixtureFile("tiny-a.pdf", "application/pdf"));
  mergeFd.append("files", await fixtureFile("tiny-b.pdf", "application/pdf"));
  await runJob("merge-pdf", mergeFd, "merge-pdf");

  const splitFd = new FormData();
  splitFd.append("file", await fixtureFile("tiny-b.pdf", "application/pdf"));
  splitFd.append("ranges", "1");
  await runJob("split-pdf", splitFd, "split-pdf");

  const compressFd = new FormData();
  compressFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  compressFd.append("quality", "ebook");
  await runJob("compress-pdf", compressFd, "compress-pdf");

  const pdfToWordFd = new FormData();
  pdfToWordFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  pdfToWordFd.append("includeOcr", "0");
  await runJob("pdf-to-word", pdfToWordFd, "pdf-to-word");

  const pdfToPptFd = new FormData();
  pdfToPptFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  pdfToPptFd.append("includeOcr", "0");
  await runJob("pdf-to-powerpoint", pdfToPptFd, "pdf-to-powerpoint");

  const pdfToExcelFd = new FormData();
  pdfToExcelFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  pdfToExcelFd.append("includeOcr", "0");
  await runJob("pdf-to-excel", pdfToExcelFd, "pdf-to-excel");

  const wordToPdfFd = new FormData();
  wordToPdfFd.append(
    "file",
    await fixtureFile(
      "tiny.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
  );
  await runJob("word-to-pdf", wordToPdfFd, "word-to-pdf");

  const pptToPdfFd = new FormData();
  pptToPdfFd.append(
    "file",
    await fixtureFile(
      "tiny.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ),
  );
  await runJob("powerpoint-to-pdf", pptToPdfFd, "powerpoint-to-pdf");

  const excelToPdfFd = new FormData();
  excelToPdfFd.append(
    "file",
    await fixtureFile(
      "tiny.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
  );
  await runJob("excel-to-pdf", excelToPdfFd, "excel-to-pdf");

  const editFd = new FormData();
  editFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  editFd.append("page", "1");
  editFd.append("text", "Hello");
  editFd.append("textX", "20");
  editFd.append("textY", "70");
  editFd.append("highlightX", "15");
  editFd.append("highlightY", "65");
  editFd.append("highlightWidth", "40");
  editFd.append("highlightHeight", "10");
  editFd.append("highlightColor", "yellow");
  await runJob("edit-pdf", editFd, "edit-pdf");

  const pdfToJpgFd = new FormData();
  pdfToJpgFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  pdfToJpgFd.append("dpi", "150");
  await runJob("pdf-to-jpg", pdfToJpgFd, "pdf-to-jpg");

  const jpgToPdfFd = new FormData();
  jpgToPdfFd.append("files", await fixtureFile("tiny.jpg", "image/jpeg"));
  jpgToPdfFd.append("files", await fixtureFile("tiny.png", "image/png"));
  jpgToPdfFd.append("orientation", "portrait");
  jpgToPdfFd.append("margin", "24");
  await runJob("jpg-to-pdf", jpgToPdfFd, "jpg-to-pdf");

  const signFd = new FormData();
  signFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  signFd.append("signature", await fixtureFile("tiny.png", "image/png"));
  signFd.append("page", "1");
  signFd.append("xPercent", "40");
  signFd.append("yPercent", "25");
  signFd.append("widthPercent", "20");
  await runJob("sign-pdf", signFd, "sign-pdf");

  const watermarkFd = new FormData();
  watermarkFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  watermarkFd.append("text", "CONFIDENTIAL");
  watermarkFd.append("opacity", "0.3");
  watermarkFd.append("scale", "0.35");
  watermarkFd.append("position", "center");
  watermarkFd.append("pages", "all");
  await runJob("watermark", watermarkFd, "watermark");

  const rotateFd = new FormData();
  rotateFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  rotateFd.append("angle", "90");
  rotateFd.append("pages", "all");
  await runJob("rotate-pdf", rotateFd, "rotate-pdf");

  const htmlFd = new FormData();
  htmlFd.append("mode", "html");
  htmlFd.append("html", "<html><body><h1>Tiny</h1><p>Smoke</p></body></html>");
  await runJob("html-to-pdf", htmlFd, "html-to-pdf");

  const protectFd = new FormData();
  protectFd.append("file", await fixtureFile("tiny-a.pdf", "application/pdf"));
  protectFd.append("password", "1234");
  const protectedBytes = await runJob("protect-pdf", protectFd, "protect-pdf");

  const unlockFd = new FormData();
  unlockFd.append(
    "file",
    new File([Buffer.from(protectedBytes)], "protected.pdf", {
      type: "application/pdf",
    }),
  );
  unlockFd.append("password", "1234");
  await runJob("unlock-pdf", unlockFd, "unlock-pdf");

  console.log("Job smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
