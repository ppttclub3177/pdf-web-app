import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import ExcelJS from "exceljs";

const root = process.cwd();
const outputDir = path.join(root, "dev", "test-assets");

const tinyJpgBase64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHBwgHBgoICAkLCg0LDhgQDg0NDh0VFhEYIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQ0NDw0NDisZFRkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFhABAQEAAAAAAAAAAAAAAAAAAAER/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/Z";

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6wzR8AAAAASUVORK5CYII=";

async function createPdf(filePath, pageTexts) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = pdf.addPage([595, 842]);
    page.drawText(text, { x: 60, y: 760, size: 32, font });
  }
  await writeFile(filePath, Buffer.from(await pdf.save()));
}

async function createDocx(filePath) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun("Sample DOCX for conversion test")],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  await writeFile(filePath, buffer);
}

async function createPptx(filePath) {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText("Sample PPTX for conversion test", {
    x: 0.8,
    y: 0.8,
    w: 8,
    h: 1,
    fontSize: 24,
  });
  const buffer = await pptx.write({ outputType: "nodebuffer" });
  await writeFile(filePath, buffer);
}

async function createXlsx(filePath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("sample");
  sheet.addRow(["sample", "xlsx", "for", "conversion"]);
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(filePath, Buffer.from(buffer));
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  await createPdf(path.join(outputDir, "a.pdf"), ["A PAGE 1"]);
  await createPdf(path.join(outputDir, "b.pdf"), ["B PAGE 1", "B PAGE 2"]);
  await writeFile(path.join(outputDir, "sample.jpg"), Buffer.from(tinyJpgBase64, "base64"));
  await writeFile(path.join(outputDir, "sample.png"), Buffer.from(tinyPngBase64, "base64"));
  await createDocx(path.join(outputDir, "sample.docx"));
  await createPptx(path.join(outputDir, "sample.pptx"));
  await createXlsx(path.join(outputDir, "sample.xlsx"));
  await writeFile(
    path.join(outputDir, "sample.html"),
    "<html><body><h1>Sample HTML</h1><p>For html-to-pdf test.</p></body></html>",
  );

  console.log(`Generated test assets in: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
