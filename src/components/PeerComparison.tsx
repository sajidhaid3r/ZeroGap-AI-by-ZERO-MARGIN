import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { localDb } from "@/lib/local-db";

export function PeerComparison({ score, college, city }: { score: number; college?: string | null; city?: string | null }) {
  // Use local analyses as peer data
  const allAnalyses = Object.keys(localStorage)
    .filter(k => k.startsWith("zerogap_analyses_"))
    .flatMap(k => { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } });

  const scores = allAnalyses.map((a: any) => a.ats_score as number).filter(Boolean);
  if (scores.length < 2) return null;

  const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const pct = Math.round((scores.filter((s: number) => s < score).length / scores.length) * 100);
  const pos = Math.max(0, Math.min(100, ((score - min) / Math.max(1, max - min)) * 100));

  return (
    <Card className="p-5 gradient-card border-border/60">
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-primary" />
        <div className="font-semibold text-sm">How you compare</div>
      </div>
      <p className="text-sm">
        You scored higher than <span className="text-primary font-bold">~{pct}%</span> of {scores.length} analyses on this device.
      </p>
      <div className="mt-4 relative h-2 rounded-full bg-border/60">
        <div className="absolute size-3 rounded-full bg-primary -top-0.5" style={{ left: `calc(${pos}% - 6px)`, boxShadow: "0 0 12px rgba(0,229,255,0.6)" }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
        <span>min {min}</span>
        <span>avg {avg}</span>
        <span>top {max}</span>
      </div>
    </Card>
  );
}
