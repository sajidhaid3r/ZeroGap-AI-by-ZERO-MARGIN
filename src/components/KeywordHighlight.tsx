import { useMemo } from "react";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function KeywordHighlight({
  text,
  present,
  missing,
}: {
  text: string;
  present: string[];
  missing: string[];
}) {
  const parts = useMemo(() => {
    if (!text) return [{ t: "", k: "n" as const }];
    const all: { word: string; cls: "p" | "m" }[] = [
      ...present.map((w) => ({ word: w, cls: "p" as const })),
      ...missing.map((w) => ({ word: w, cls: "m" as const })),
    ];
    if (all.length === 0) return [{ t: text, k: "n" as const }];
    // Sort longest-first to avoid partial-match overlap
    all.sort((a, b) => b.word.length - a.word.length);
    const re = new RegExp(`\\b(${all.map((a) => escapeRegex(a.word)).join("|")})\\b`, "gi");
    const out: { t: string; k: "p" | "m" | "n" }[] = [];
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIdx) out.push({ t: text.slice(lastIdx, m.index), k: "n" });
      const matched = m[0];
      const lower = matched.toLowerCase();
      const found = all.find((a) => a.word.toLowerCase() === lower);
      out.push({ t: matched, k: found?.cls ?? "n" });
      lastIdx = m.index + matched.length;
    }
    if (lastIdx < text.length) out.push({ t: text.slice(lastIdx), k: "n" });
    return out;
  }, [text, present, missing]);

  const presentCount = parts.filter((p) => p.k === "p").length;
  const missingCount = parts.filter((p) => p.k === "m").length;

  return (
    <div>
      <div className="flex items-center gap-4 text-xs mb-2">
        <span className="text-success">🟢 {presentCount} matched</span>
        <span className="text-destructive">🔴 {missingCount} flagged</span>
      </div>
      <div
        className="rounded-lg bg-background/60 border border-border/60 p-3 max-h-72 overflow-y-auto text-[12px] font-mono leading-relaxed whitespace-pre-wrap"
      >
        {parts.map((p, i) =>
          p.k === "p" ? (
            <span key={i} className="rounded px-0.5" style={{ background: "rgba(34,197,94,0.18)", color: "#86efac" }}>
              {p.t}
            </span>
          ) : p.k === "m" ? (
            <span key={i} className="rounded px-0.5 underline decoration-dotted" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
              {p.t}
            </span>
          ) : (
            <span key={i}>{p.t}</span>
          )
        )}
      </div>
    </div>
  );
}
