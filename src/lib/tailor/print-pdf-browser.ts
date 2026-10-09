/**
 * Turns the final plain-text resume into a PDF using the browser's own "Save as PDF".
 * Renamed from print-pdf.client.ts so TanStack Start's import-protection plugin
 * does not block it when imported from SSR-bundled route files.
 * This function only ever runs inside browser event-handlers and is never invoked on the server.
 */
export function printResumeAsPdf(text: string, title = "Resume") {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) throw new Error("Your browser blocked the pop-up. Allow pop-ups for this site and try again.");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 16mm; }
  body { font: 11pt/1.4 Arial, Helvetica, sans-serif; color: #000; margin: 0; }
  pre { font: inherit; white-space: pre-wrap; word-wrap: break-word; margin: 0; }
</style></head><body><pre>${esc(text)}</pre></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}
