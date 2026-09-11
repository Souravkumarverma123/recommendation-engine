/**
 * Client-side tender PDF text extraction (pdfjs-dist). Runs entirely in the
 * browser — no upload endpoint exists on the backend, so extracted text is
 * sent to `recommend.run` as ordinary `specText`.
 */

const MAX_CHARS = 8000;

export type PdfExtractionResult = {
  text: string;
  pageCount: number;
  truncated: boolean;
};

export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  try {
    const pageTexts: string[] = [];
    let charCount = 0;
    let pagesRead = 0;
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pageTexts.push(pageText);
      charCount += pageText.length;
      pagesRead += 1;
      if (charCount >= MAX_CHARS) break;
    }

    const fullText = pageTexts.join("\n\n").trim();
    const truncated = fullText.length > MAX_CHARS || pagesRead < doc.numPages;

    return {
      text: truncated ? fullText.slice(0, MAX_CHARS) : fullText,
      pageCount: doc.numPages,
      truncated,
    };
  } finally {
    void doc.destroy();
  }
}
