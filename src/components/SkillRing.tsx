import { useMemo } from "react";

const REQUIRED_SKILLS_BY_ROLE: Record<string, string[]> = {
  default: ["DSA", "React", "Node.js", "SQL", "Git", "REST APIs", "OOP", "System Design"],
  "sde": ["DSA", "React", "Node.js", "SQL", "Git", "REST APIs", "OOP", "System Design"],
  "ai": ["Python", "PyTorch", "NumPy", "Pandas", "SQL", "Git", "ML basics", "Transformers"],
  "data": ["Python", "SQL", "Pandas", "Spark", "Airflow", "Git", "Statistics", "BigQuery"],
  "cloud": ["AWS", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD", "Networking", "Git"],
};

function pickRequired(targetRole?: string): string[] {
  const t = (targetRole ?? "").toLowerCase();
  if (t.includes("ai") || t.includes("ml")) return REQUIRED_SKILLS_BY_ROLE.ai;
  if (t.includes("data")) return REQUIRED_SKILLS_BY_ROLE.data;
  if (t.includes("cloud") || t.includes("devops")) return REQUIRED_SKILLS_BY_ROLE.cloud;
  if (t) return REQUIRED_SKILLS_BY_ROLE.sde;
  return REQUIRED_SKILLS_BY_ROLE.default;
}

export function SkillRing({
  acquiredKeywords,
  targetRole,
}: {
  acquiredKeywords: string[];
  targetRole?: string;
}) {
  const { required, acquired, missing, pct } = useMemo(() => {
    const req = pickRequired(targetRole);
    const have = new Set(acquiredKeywords.map((k) => k.toLowerCase()));
    const acquired = req.filter((s) => have.has(s.toLowerCase()));
    const missing = req.filter((s) => !have.has(s.toLowerCase()));
    return { required: req, acquired, missing, pct: Math.round((acquired.length / req.length) * 100) };
  }, [acquiredKeywords, targetRole]);

  const r = 90;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 75 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--destructive)";

  return (
    <div className="rounded-2xl border border-border/60 gradient-card p-5">
      <div className="text-xs text-primary uppercase tracking-wider mb-3">Skill gap ring</div>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative size-[180px] shrink-0">
          <svg viewBox="0 0 220 220" className="size-full -rotate-90">
            <circle cx="110" cy="110" r={r} stroke="currentColor" strokeWidth="14" fill="none" className="text-border/60" />
            <circle
              cx="110" cy="110" r={r} stroke={color} strokeWidth="14" fill="none"
              strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-display font-bold">{acquired.length}<span className="text-sm font-normal text-muted-foreground">/{required.length}</span></div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{targetRole ?? "skills"}</div>
          </div>
        </div>
        <div className="flex-1 w-full text-xs space-y-1.5">
          {required.slice(0, 8).map((s) => {
            const has = acquired.includes(s);
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={has ? "text-success" : "text-destructive"}>{has ? "✓" : "✗"}</span>
                <span className={has ? "" : "text-muted-foreground"}>{s}</span>
              </div>
            );
          })}
          {missing.length > 0 && (
            <a href="/micro-roadmap" className="inline-block mt-2 text-[11px] text-primary hover:underline">
              → Learn missing skills in 48h
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
