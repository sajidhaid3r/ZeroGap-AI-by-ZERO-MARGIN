import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, FileSearch, MessagesSquare, TrendingUp, Calendar, ArrowRight, Home } from "lucide-react";
import { useAuth, calculateStreak } from "@/lib/auth";
import { localDb } from "@/lib/local-db";
import { StreakWidget } from "@/components/StreakWidget";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ZeroGap AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [streak, setStreak] = useState(0);
  const [scores, setScores] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState({ done: 0, total: 0 });
  const [streakRow, setStreakRow] = useState<{ streak_count: number; longest_streak: number; last_active_date: string | null } | null>(null);
  const [recent, setRecent] = useState<{ activity_type: string; created_at: string }[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const activity = localDb.getActivity(user.id);
    const dates = activity.map((a) => a.activity_date);
    setStreak(calculateStreak(dates));
    setRecent(activity.slice(0, 5));

    const analyses = localDb.getAnalyses(user.id);
    setScores(analyses.slice().reverse().map((r, i) => ({ n: `#${i + 1}`, ATS: r.ats_score, Trend: r.trend_score })));

    const tasks = localDb.getTasks(user.id);
    setTaskStats({ done: tasks.filter((t) => t.completed).length, total: tasks.length });

    // Ping streak
    const today = new Date().toISOString().slice(0, 10);
    const row = localDb.getStreak(user.id);
    const last = row.last_active_date;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    let newRow = { ...row };
    if (last !== today) {
      if (last === yStr) {
        newRow.streak_count += 1;
        newRow.longest_streak = Math.max(newRow.longest_streak, newRow.streak_count);
        if (newRow.streak_count === 3) toast.success("3 days in! You're building a habit 💪");
        if (newRow.streak_count === 7) toast.success("One week strong! 🎉");
      } else if (last && last < yStr) {
        newRow.streak_count = 1;
      } else if (!last) {
        newRow.streak_count = 1;
      }
      newRow.last_active_date = today;
      localDb.saveStreak(user.id, newRow);
    }
    setStreakRow(newRow);
  }, [user]);

  if (authLoading || !user) return null;

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const activeSet = new Set(localDb.getActivity(user.id).map((a) => a.activity_date));

  return (
    <PageShell>
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
              08 &mdash; CANDIDATE DASHBOARD &amp; STREAK
            </div>
            <h1 className="font-display font-black text-3xl md:text-5xl text-foreground tracking-tight">
              Welcome back.<em className="font-serif italic font-light text-primary ml-3 font-normal">Candidate board.</em>
            </h1>
            <p className="font-mono text-muted-foreground text-xs mt-1">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="font-mono text-xs rounded-sm uppercase tracking-wider"><Link to="/"><Home className="size-3.5 mr-1.5" /> Home</Link></Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground font-mono text-xs rounded-sm uppercase tracking-wider">
              <Link to="/resume-analysis"><FileSearch className="size-3.5 mr-1.5" /> New analysis</Link>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-5 gradient-card border-border/60">
            <div className="flex items-center justify-between mb-2"><Flame className="size-5 text-warning" /><span className="text-xs text-muted-foreground">Streak</span></div>
            <div className="text-3xl font-display font-bold">{streak}<span className="text-base font-normal text-muted-foreground"> days</span></div>
          </Card>
          <Card className="p-5 gradient-card border-border/60">
            <div className="flex items-center justify-between mb-2"><FileSearch className="size-5 text-primary" /><span className="text-xs text-muted-foreground">Resumes</span></div>
            <div className="text-3xl font-display font-bold">{scores.length}</div>
          </Card>
          <Card className="p-5 gradient-card border-border/60">
            <div className="flex items-center justify-between mb-2"><Calendar className="size-5 text-success" /><span className="text-xs text-muted-foreground">Tasks done</span></div>
            <div className="text-3xl font-display font-bold">{taskStats.done}<span className="text-base font-normal text-muted-foreground">/{taskStats.total}</span></div>
          </Card>
          <Card className="p-5 gradient-card border-border/60">
            <div className="flex items-center justify-between mb-2"><MessagesSquare className="size-5 text-silver-glow" /><span className="text-xs text-muted-foreground">Days active</span></div>
            <div className="text-3xl font-display font-bold">{activeSet.size}</div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 p-6 gradient-card border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-primary uppercase tracking-wider">Score trend</div>
                <h2 className="font-semibold text-lg">ATS & Market alignment over time</h2>
              </div>
              <TrendingUp className="size-5 text-primary" />
            </div>
            {scores.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No analyses yet — <Link to="/resume-analysis" className="text-primary ml-1 hover:underline">upload a resume</Link>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scores}>
                    <defs>
                      <linearGradient id="ats" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.78 0.14 200)" stopOpacity={0.5} /><stop offset="100%" stopColor="oklch(0.78 0.14 200)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.75 0.18 155)" stopOpacity={0.5} /><stop offset="100%" stopColor="oklch(0.75 0.18 155)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 250)" />
                    <XAxis dataKey="n" stroke="oklch(0.68 0.03 230)" />
                    <YAxis domain={[0, 100]} stroke="oklch(0.68 0.03 230)" />
                    <Tooltip contentStyle={{ background: "oklch(0.22 0.045 250)", border: "1px solid oklch(0.32 0.04 250)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="ATS" stroke="oklch(0.78 0.14 200)" fill="url(#ats)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Trend" stroke="oklch(0.75 0.18 155)" fill="url(#tr)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-6 gradient-card border-border/60">
            <div className="text-xs text-primary uppercase tracking-wider mb-1">Activity</div>
            <h2 className="font-semibold text-lg mb-4">Last 30 days</h2>
            <div className="grid grid-cols-10 gap-1">
              {last30.map((d) => (
                <div key={d} title={d} className={`aspect-square rounded-sm ${activeSet.has(d) ? "bg-primary" : "bg-border/60"}`} />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <div className="size-3 rounded-sm bg-border/60" /> none
              <div className="size-3 rounded-sm bg-primary ml-2" /> active
            </div>
          </Card>
        </div>

        {streakRow && (
          <div className="mb-6">
            <StreakWidget streak={streakRow.streak_count} longest={streakRow.longest_streak} last={streakRow.last_active_date} />
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: "Analyze resume", d: "Get fresh ATS score", to: "/resume-analysis" as const, i: FileSearch },
            { t: "Map a role", d: "Trend & probability", to: "/market-mapping" as const, i: TrendingUp },
            { t: "48h roadmap", d: "Build your plan", to: "/micro-roadmap" as const, i: Calendar },
            { t: "Talk to coach", d: "Confidence boost", to: "/confidence-coach" as const, i: MessagesSquare },
          ].map((q) => (
            <Link key={q.t} to={q.to}>
              <Card className="p-5 gradient-card border-border/60 hover:border-primary/50 transition group h-full">
                <q.i className="size-6 text-primary mb-3" />
                <div className="font-semibold">{q.t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{q.d}</div>
                <div className="flex items-center gap-1 text-xs text-primary mt-3 group-hover:gap-2 transition-all">Open <ArrowRight className="size-3" /></div>
              </Card>
            </Link>
          ))}
        </div>

        {recent.length > 0 && (
          <Card className="mt-6 p-6 gradient-card border-border/60">
            <div className="text-xs text-primary uppercase tracking-wider mb-1">Recent activity</div>
            <h2 className="font-semibold text-lg mb-4">Last {recent.length} actions</h2>
            <ul className="divide-y divide-border/40">
              {recent.map((r, i) => {
                const label = r.activity_type.replace(/_/g, " ");
                const when = new Date(r.created_at);
                const ago = Math.floor((Date.now() - when.getTime()) / 60000);
                const human = ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago / 60)}h ago` : `${Math.floor(ago / 1440)}d ago`;
                return (
                  <li key={i} className="py-2.5 flex justify-between items-center text-sm">
                    <span className="capitalize">• {label}</span>
                    <span className="text-xs text-muted-foreground">{human}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
