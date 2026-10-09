/**
 * Browser-side resume text extraction (PDF / DOCX / text). Same approach as the Resume page, but it THROWS when
 * nothing readable is found, so the agent never "analyses" a placeholder string.
 */
export async function extractResumeText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();

  if (["txt", "md", "rtf", "csv", "json"].includes(ext)) {
    const t = clean(await file.text());
    if (t.length > 80) return t;
  }
  if (ext === "pdf" || file.type === "application/pdf") {
    const pdfjs: any = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      out += content.items.map((it: any) => it.str).join(" ") + "\n";
    }
    const t = clean(out);
    if (t.length > 80) return t;
    throw new Error("This PDF has no readable text (it may be a scan). Paste the text instead.");
  }
  if (ext === "docx") {
    const mammoth: any = await import("mammoth/mammoth.browser");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const t = clean(value ?? "");
    if (t.length > 80) return t;
  }
  throw new Error("Could not read text from this file. Upload a PDF/DOCX/TXT or paste the text.");
}
