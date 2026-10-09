import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Linkedin } from "lucide-react";

export function BadgeShare({ score }: { score: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const variant =
    score >= 90 ? { label: "ATS Optimized ⭐", tint: "from-amber-500/20 to-stone-400/20", border: "border-amber-400/60" } :
    score >= 75 ? { label: "ATS Ready", tint: "from-emerald-500/20 to-stone-400/20", border: "border-emerald-400/60" } :
    score >= 50 ? { label: "Getting There", tint: "from-amber-500/20 to-stone-400/20", border: "border-amber-400/60" } :
                  { label: "Needs Work", tint: "from-red-500/20 to-stone-400/20", border: "border-red-400/60" };

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: null, useCORS: true });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zerogap-ats-${score}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } finally {
      setBusy(false);
    }
  };

  const linkedin = () => {
    const url = "https://zerogap.ai";
    const text = `My resume just scored ${score}/100 on ATS readiness with ZeroGap AI! Bridging my skill gap one step at a time. #CareerGrowth #ATSReady`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="rounded-2xl border border-border/60 gradient-card p-5">
      <div className="text-xs text-primary uppercase tracking-wider mb-3">Share your score</div>
      <div className="overflow-hidden rounded-xl">
        <div
          ref={ref}
          className={`relative w-[420px] h-[220px] max-w-full bg-gradient-to-br ${variant.tint} ${variant.border} border rounded-xl overflow-hidden`}
          style={{ background: "linear-gradient(135deg, #0a0f1a 0%, #1c1c1c 100%)" }}
        >
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(200,200,200,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(200,200,200,0.15) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 text-white">
            <span className="size-2 rounded-full bg-stone-300 shadow-[0_0_6px_#d6d3d1]" />
            <span className="text-xs font-semibold tracking-wide">ZeroGap <span className="text-stone-300">AI</span></span>
          </div>
          <div className="absolute top-3 right-3 text-[10px] text-stone-300/80 uppercase tracking-wider">{variant.label}</div>

          <div className="absolute inset-0 flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/60 mb-1">ATS Readiness</div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 72, color: "#d6d3d1", lineHeight: 1 }}>
                {score}
              </div>
              <div className="text-[10px] text-white/60 mt-1">out of 100</div>
            </div>
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
              <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
              <circle cx="40" cy="40" r="34" stroke="#F5F4F1" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 - (score / 100) * 2 * Math.PI * 34} />
            </svg>
          </div>

          <div className="absolute bottom-3 left-3 right-3 text-[10px] text-white/50 flex justify-between">
            <span>Resume analyzed by ZeroGap AI</span>
            <span>zerogap.ai</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button size="sm" disabled={busy} onClick={download} className="gradient-silver text-primary-foreground">
          <Download className="size-3.5 mr-1.5" /> {busy ? "Rendering…" : "PNG"}
        </Button>
        <Button size="sm" variant="outline" onClick={linkedin}>
          <Linkedin className="size-3.5 mr-1.5" /> LinkedIn
        </Button>
      </div>
    </div>
  );
}
