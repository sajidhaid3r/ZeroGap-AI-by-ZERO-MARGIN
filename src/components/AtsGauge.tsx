import { useEffect, useRef, useState } from "react";

type Props = { score: number; size?: number };

const C = 2 * Math.PI * 90; // ≈ 565.5

const colorFor = (s: number) =>
  s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";

const gradeFor = (s: number) =>
  s >= 90 ? "Excellent" : s >= 75 ? "Good" : s >= 50 ? "Fair" : "Poor";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function AtsGauge({ score, size = 220 }: Props) {
  const [n, setN] = useState(0);
  const [pop, setPop] = useState(false);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setN(score); return; }
    const start = performance.now();
    const dur = 2000;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setN(Math.round(easeOutCubic(t) * score));
      if (t < 1) requestAnimationFrame(step);
      else { setPop(true); setTimeout(() => setPop(false), 250); }
    };
    requestAnimationFrame(step);
  }, [score, tick]);

  const color = colorFor(n);
  const offset = C - (n / 100) * C;

  return (
    <div className="flex flex-col items-center gap-2" ref={ref}>
      <div
        className="relative cursor-pointer"
        title="Calculated from 6 ATS criteria"
        style={{ width: size, height: size }}
        onClick={() => setTick((t) => t + 1)}
      >
        <svg width={size} height={size} viewBox="0 0 220 220" className="-rotate-90">
          <circle cx="110" cy="110" r="90" stroke="#1e293b" strokeWidth="12" fill="none" />
          <circle
            cx="110" cy="110" r="90"
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: "stroke 0.4s ease" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: pop ? "scale(1.05)" : "scale(1)", transition: "transform 0.2s ease" }}
        >
          <div className="font-mono font-bold text-white" style={{ fontSize: 48, lineHeight: 1 }}>{n}</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">ATS SCORE</div>
        </div>
      </div>
      <div className="text-sm font-semibold" style={{ color }}>{gradeFor(n)}</div>
    </div>
  );
}
