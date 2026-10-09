import { Flame } from "lucide-react";

export function StreakWidget({ streak, longest, last }: { streak: number; longest: number; last: string | null }) {
  // Build last 7 days
  const days: { d: string; label: string; active: boolean }[] = [];
  const lastDate = last ? new Date(last) : null;
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const ds = date.toISOString().slice(0, 10);
    let active = false;
    if (lastDate && streak > 0) {
      const diff = Math.round((+new Date(last!) - +new Date(ds)) / 86_400_000);
      if (diff >= 0 && diff < streak) active = true;
    }
    days.push({ d: ds, label: "MTWTFSS"[date.getDay() === 0 ? 6 : date.getDay() - 1], active });
  }

  return (
    <div className="rounded-2xl border border-border/60 gradient-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-center">
            <Flame className="size-5 text-warning" />
          </div>
          <div>
            <div className="text-2xl font-display font-bold leading-none">{streak}<span className="text-sm font-normal text-muted-foreground"> day{streak === 1 ? "" : "s"}</span></div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Longest: {longest}</div>
          </div>
        </div>
        {streak >= 7 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/15 border border-warning/40 text-warning">🏆 On fire</span>
        )}
      </div>
      <div className="flex justify-between gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-medium ${d.active ? "bg-primary text-primary-foreground" : "bg-border/40 text-muted-foreground"}`}>
              {d.active ? "✓" : ""}
            </div>
            <span className="text-[9px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      {streak === 1 && <p className="text-[11px] text-muted-foreground mt-3 text-center">Day 1 — keep going! 💪</p>}
      {streak === 0 && <p className="text-[11px] text-muted-foreground mt-3 text-center">Visit daily to build a streak.</p>}
    </div>
  );
}
