import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Square, Check, X, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractResumeText } from "@/lib/agent/resume-text.client";
import type { AgentEvent, FinalReport, HistoryItem, Source, ToolCallAction } from "@/lib/agent/types";

export const Route = createFileRoute("/agent")({
  head: () => ({ meta: [{ title: "Career Gap Agent — ZeroGap AI" }] }),
  component: AgentPage,
});

const TOOL_LABEL: Record<string, string> = {
  analyze_resume: "Read your resume",
  get_market_trend: "Check role outlook",
  get_city_skills: "Check city demand",
  search_jobs: "Search openings",
  match_resume_to_job: "Compare with a job",
  check_github_evidence: "Check GitHub proof",
  generate_roadmap: "Plan the 48h roadmap",
  draft_cover_note: "Draft a cover note",
  save_to_tracker: "Save to tracker",
};

const SOURCE: Record<Source, { label: string; cls: string }> = {
  live: { label: "Live data", cls: "border-success/50 text-success" },
  deterministic: { label: "Rule-based", cls: "border-primary/50 text-primary" },
  model_estimate: { label: "Model estimate", cls: "border-warning/60 text-warning" },
  sample: { label: "Sample data", cls: "border-dashed border-muted-foreground/60 text-muted-foreground" },
  user_data: { label: "Your data", cls: "border-success/50 text-success" },
};

function summarize(tool: string, d: any): string {
  try {
    switch (tool) {
      case "analyze_resume": return `ATS ${d.ats_score} · trend fit ${d.trend_score} · ${d.detected_skills?.length ?? 0} skills found`;
      case "get_market_trend": return `${String(d.trend_direction).replace("_", " ")} · about ₹${d.avg_salary_inr_lakhs} LPA · ${d.top_skills?.slice(0, 4).join(", ")}`;
      case "get_city_skills": return `Most asked: ${d.hot_skills?.slice(0, 5).join(", ")}`;
      case "search_jobs": return `${d.count} openings${d.note ? ` (${d.note})` : ""}`;
      case "match_resume_to_job": return `${d.company}: ${d.match_pct}% match · missing ${d.missing?.length ? d.missing.join(", ") : "nothing"}`;
      case "check_github_evidence": return `${d.original_repos} repos · proof for ${Object.keys(d.evidence ?? {}).join(", ") || "no listed skills"}${d.no_visible_evidence?.length ? ` · none for ${d.no_visible_evidence.join(", ")}` : ""}`;
      case "generate_roadmap": return `${d.tasks?.length ?? 0} tasks · ${d.intro}`;
      case "draft_cover_note": return d.subject;
      case "save_to_tracker": return `Saved ${d.role} at ${d.company}`;
    }
  } catch {}
  return JSON.stringify(d).slice(0, 140);
}

type Row =
  | { kind: "step"; item: HistoryItem }
  | { kind: "repair"; reason: string };

function AgentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [role, setRole] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [github, setGithub] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [thinking, setThinking] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<{ action: ToolCallAction; preview: any; history: HistoryItem[]; scratch: Record<string, any> } | null>(null);
  const [final, setFinal] = useState<{ report: FinalReport; provenance: Record<string, number>; partial: boolean } | null>(null);
  const [meta, setMeta] = useState<{ model: string; maxSteps: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onFile = async (f: File | null) => {
    setFile(f);
    if (!f) return;
    try {
      setResumeText(await extractResumeText(f));
      toast.success("Resume read in your browser");
    } catch (e: any) {
      setFile(null);
      toast.error(e.message ?? "Could not read that file");
    }
  };

  const run = async (resume?: { decision: "approve" | "reject" }) => {
    if (!resume) {
      setRows([]); setFinal(null); setPending(null); setMeta(null);
    }
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/agent", {
        method: "POST",
        signal: ac.signal,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          resumeText, targetRole: role.trim(), city: city.trim(), githubUsername: github.trim(),
          ...(resume && pending ? { resume: { decision: resume.decision, pending: pending.action, history: pending.history, scratch: pending.scratch } } : {}),
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed (${res.status})`);
      setPending(null);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (chunk.startsWith("data: ")) handle(JSON.parse(chunk.slice(6)) as AgentEvent);
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error(e.message ?? "The agent stopped unexpectedly");
    } finally {
      setRunning(false);
      setThinking(null);
    }
  };

  const handle = (e: AgentEvent) => {
    switch (e.type) {
      case "start": setMeta({ model: e.model, maxSteps: e.maxSteps }); break;
      case "thinking": setThinking(e.step); break;
      case "repair": setRows((r) => [...r, { kind: "repair", reason: e.reason }]); break;
      case "step": setThinking(null); setRows((r) => [...r, { kind: "step", item: e.item }]); break;
      case "needs_approval": setThinking(null); setPending({ action: e.action, preview: e.preview, history: e.history, scratch: e.scratch }); break;
      case "final": setFinal({ report: e.report, provenance: e.provenance, partial: e.partial }); break;
      case "fatal": toast.error(e.error); break;
    }
  };

  const ready = resumeText.length >= 80 && role.trim().length >= 2 && city.trim().length >= 2;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 lg:grid-cols-[360px_1fr]">
        <section className="lg:sticky lg:top-24 self-start space-y-5">
          <header>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Career Gap Agent</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Give it your resume and a target role. It reads, searches, checks and plans on its own, and asks you before it saves anything.
            </p>
          </header>

          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="resume-file" className="text-sm font-medium">Resume</label>
              <label htmlFor="resume-file" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm hover:border-primary focus-within:ring-1 focus-within:ring-ring">
                <Upload className="h-4 w-4" aria-hidden />
                <span className="truncate">{file ? file.name : "Upload PDF, DOCX or TXT"}</span>
                <input id="resume-file" type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              </label>
              <Textarea
                aria-label="Or paste resume text"
                placeholder="Or paste the text of your resume"
                className="min-h-[96px]"
                value={resumeText}
                onChange={(e) => { setResumeText(e.target.value); setFile(null); }}
              />
              <p className="text-xs text-muted-foreground">Files are read in your browser. Only the text is sent to the agent.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">Target role</label>
              <Input id="role" placeholder="e.g. AI/ML intern" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium">City</label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="gh" className="text-sm font-medium">GitHub (optional)</label>
                <Input id="gh" placeholder="username" value={github} onChange={(e) => setGithub(e.target.value)} />
              </div>
            </div>
            {running ? (
              <Button variant="outline" className="w-full" onClick={() => abortRef.current?.abort()}>
                <Square className="mr-2 h-4 w-4" aria-hidden /> Stop the agent
              </Button>
            ) : (
              <Button className="w-full" disabled={!ready || !!pending} onClick={() => run()}>
                {rows.length || final ? <RotateCcw className="mr-2 h-4 w-4" aria-hidden /> : null}
                {rows.length || final ? "Run again" : "Run the agent"}
              </Button>
            )}
            {meta && <p className="text-xs text-muted-foreground font-mono">Model: {meta.model} · up to {meta.maxSteps} steps</p>}
          </Card>
        </section>

        <section aria-live="polite" aria-label="Agent run" className="min-w-0">
          {!rows.length && !running && !final && (
            <Card className="p-8 text-sm text-muted-foreground">
              Each step the agent takes will appear here with its tool, where the data came from, and any retries or recoveries. Add a resume and a role to begin.
            </Card>
          )}

          <ol className="relative space-y-4 border-l border-border pl-6">
            {rows.map((r, idx) =>
              r.kind === "repair" ? (
                <li key={idx} className="relative text-xs text-muted-foreground">
                  <span className="absolute -left-[29px] top-1.5 h-2 w-2 rounded-full bg-warning" aria-hidden />
                  The model's reply didn't match the required format ({r.reason}). The agent asked it to try again.
                </li>
              ) : (
                <StepCard key={r.item.id} item={r.item} />
              ),
            )}
            {thinking !== null && (
              <li className="relative flex items-center gap-2 text-sm text-muted-foreground">
                <span className="absolute -left-[29px] top-1.5 h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden />
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden /> Deciding the next action
              </li>
            )}
          </ol>

          {pending && (
            <Card className="mt-6 border-primary p-5" role="alertdialog" aria-labelledby="approve-title">
              <h2 id="approve-title" className="font-display text-lg font-bold">The agent wants to {TOOL_LABEL[pending.action.tool]?.toLowerCase() ?? pending.action.tool}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{pending.action.thought}</p>
              <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap">{JSON.stringify(pending.preview, null, 2)}</pre>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => run({ decision: "approve" })} disabled={running}><Check className="mr-2 h-4 w-4" aria-hidden /> Save it</Button>
                <Button variant="outline" onClick={() => run({ decision: "reject" })} disabled={running}><X className="mr-2 h-4 w-4" aria-hidden /> Don't save</Button>
              </div>
            </Card>
          )}

          {final && <Report {...final} />}
        </section>
      </div>
    </PageShell>
  );
}

function StepCard({ item }: { item: HistoryItem }) {
  const ok = item.obs.ok;
  const src = ok ? SOURCE[(item.obs as any).source as Source] : null;
  return (
    <li className="relative">
      <span className={`absolute -left-[29px] top-2 h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-destructive"}`} aria-hidden />
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-semibold">{TOOL_LABEL[item.action.tool] ?? item.action.tool}</h3>
          {src && <span className={`rounded-full border px-2 py-0.5 text-xs ${src.cls}`}>{src.label}</span>}
          {item.attempts > 1 && <span className="text-xs text-warning">recovered after {item.attempts} attempts</span>}
          <span className="ml-auto text-xs font-mono text-muted-foreground">{item.ms} ms</span>
        </div>
        {item.action.thought && <p className="mt-1 text-sm text-muted-foreground">{item.action.thought}</p>}
        {ok ? (
          <>
            <p className="mt-2 text-sm">{summarize(item.action.tool, (item.obs as any).data)}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Raw result</summary>
              <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap">{JSON.stringify((item.obs as any).data, null, 2)}</pre>
            </details>
          </>
        ) : (
          <p className="mt-2 text-sm text-destructive">
            {(item.obs as any).error}
            <span className="block text-xs text-muted-foreground">The agent was told about this and chose how to continue.</span>
          </p>
        )}
      </Card>
    </li>
  );
}

function Report({ report, provenance, partial }: { report: FinalReport; provenance: Record<string, number>; partial: boolean }) {
  return (
    <Card className="mt-8 p-6 space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold">{partial ? "Partial result" : "Your plan"}</h2>
        <p className="mt-2">{report.summary}</p>
      </div>
      {report.top_gaps.length > 0 && (
        <div>
          <h3 className="font-semibold">Biggest gaps</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {report.top_gaps.map((g) => <li key={g} className="rounded-md bg-muted px-2 py-1 text-sm font-mono">{g}</li>)}
          </ul>
        </div>
      )}
      {report.recommended_jobs.length > 0 && (
        <div>
          <h3 className="font-semibold">Openings worth applying to</h3>
          <ul className="mt-2 space-y-2">
            {report.recommended_jobs.map((j) => (
              <li key={j.role + j.company} className="text-sm">
                <span className="font-medium">{j.role}</span> at {j.company}
                {j.url && <a href={j.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary underline underline-offset-4">Open <ExternalLink className="h-3 w-3" aria-hidden /></a>}
                <span className="block text-muted-foreground">{j.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {report.next_steps.length > 0 && (
        <div>
          <h3 className="font-semibold">Next steps</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{report.next_steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      )}
      <div className="border-t border-border pt-4">
        <h3 className="font-semibold">What to trust</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {Object.entries(provenance).map(([k, n]) => `${n} × ${SOURCE[k as Source]?.label.toLowerCase() ?? k}`).join(" · ") || "No tool data was gathered."}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{report.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
    </Card>
  );
}
