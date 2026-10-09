import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Calendar, Loader2, Sparkles, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth, logActivity } from "@/lib/auth";
import { localDb } from "@/lib/local-db";

export const Route = createFileRoute("/micro-roadmap")({
  head: () => ({ meta: [{ title: "48h Micro-Roadmap — ZeroGap AI" }] }),
  component: RoadmapPage,
});

type Task = {
  id: string;
  goal: string;
  hour_block: number;
  title: string;
  description: string | null;
  udemy_query?: string;
  completed: boolean;
};

function RoadmapPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const load = () => {
    if (!user) return;
    setTasks(localDb.getTasks(user.id) as Task[]);
  };
  useEffect(() => { load(); }, [user]);

  const generate = async () => {
    if (!goal.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Clear previous tasks for this goal-style flow? Append for simplicity.
      const newTasks: Task[] = data.tasks.map((t: any) => ({
        id: crypto.randomUUID(),
        goal,
        hour_block: t.hour_block,
        title: t.title,
        description: t.description,
        udemy_query: t.udemy_query ?? "",
        completed: false,
      }));
      const existing = localDb.getTasks(user!.id) as Task[];
      localDb.saveTasks(user!.id, [...existing, ...newTasks]);
      await logActivity("roadmap_generated");
      toast.success(`Generated ${newTasks.length} tasks!`);
      setGoal("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggle = async (t: Task) => {
    const updated = tasks.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x));
    setTasks(updated);
    localDb.saveTasks(user!.id, updated);
    if (!t.completed) await logActivity("task_completed");
  };

  const remove = (id: string) => {
    const updated = tasks.filter((x) => x.id !== id);
    setTasks(updated);
    localDb.saveTasks(user!.id, updated);
  };

  const grouped = tasks.reduce((acc, t) => {
    (acc[t.goal] ||= []).push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  if (authLoading || !user) return null;

  return (
    <PageShell>
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
            <Calendar className="size-3.5" /> 06 &mdash; 48H MICRO-ROADMAP &amp; SKILL BRIDGE
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl text-foreground tracking-tight">
            Micro-roadmap.<em className="font-serif italic font-light text-primary ml-3 font-normal">48-hour plan.</em>
          </h1>
          <p className="font-serif text-muted-foreground mt-2 max-w-2xl text-base">
            Tell us your target role. We&rsquo;ll generate a 48-hour plan to master the exact skills recruiters want &mdash; with concrete artifacts to put on your resume.
          </p>
        </div>

        <Card className="p-5 gradient-card border-border/60 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="e.g. Get an AI/ML internship at a startup"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
            <Button onClick={generate} disabled={generating || !goal.trim()} className="gradient-silver text-primary-foreground">
              {generating ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Sparkles className="size-4 mr-1.5" />}
              Generate 48H Roadmap
            </Button>
          </div>
        </Card>

        {Object.entries(grouped).length === 0 && (
          <Card className="p-12 text-center gradient-card border-border/60">
            <Calendar className="size-10 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">No roadmap yet. Set a goal above to begin.</div>
          </Card>
        )}

        {Object.entries(grouped).map(([g, list]) => {
          const done = list.filter((t) => t.completed).length;
          const pct = list.length ? Math.round((done / list.length) * 100) : 0;
          return (
            <Card key={g} className="p-6 gradient-card border-border/60 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-primary uppercase tracking-wider">Goal</div>
                  <h2 className="font-semibold text-lg">{g}</h2>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold text-gradient-silver">{pct}%</div>
                  <div className="text-xs text-muted-foreground">{done}/{list.length} done</div>
                </div>
              </div>
              <Progress value={pct} className="mb-5" />

              <div className="space-y-2">
                {list.sort((a, b) => a.hour_block - b.hour_block).map((t) => (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border transition ${t.completed ? "border-success/40 bg-success/5" : "border-border bg-background/40"}`}>
                    <div className="flex flex-col items-center gap-0.5 mt-0.5">
                      <Checkbox
                        checked={t.completed}
                        onCheckedChange={() => toggle(t)}
                        aria-label={t.completed ? "Mark as incomplete" : "Mark as complete"}
                        title={t.completed ? "Mark as incomplete" : "Mark as complete"}
                      />
                      <span className="font-mono text-[8px] text-muted-foreground/50 uppercase tracking-widest leading-none">
                        {t.completed ? "done" : "todo"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">H+{t.hour_block}</span>
                        <span className={`font-medium text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                      </div>
                      {t.description && <p className={`text-xs mt-1 ${t.completed ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{t.description}</p>}
                      {t.udemy_query && (
                        <a
                          href={`https://www.udemy.com/courses/search/?q=${encodeURIComponent(t.udemy_query)}&sort=highest-rated`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition"
                        >
                          <BookOpen className="size-2.5" /> Udemy: {t.udemy_query}
                        </a>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive" title="Remove task">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </section>
    </PageShell>
  );
}
