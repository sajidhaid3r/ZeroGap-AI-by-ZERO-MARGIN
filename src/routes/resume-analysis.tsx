import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Copy, FileDown, Send } from "lucide-react";
import { toast } from "sonner";
import { extractResumeText } from "@/lib/agent/resume-text-browser";
import { printResumeAsPdf } from "@/lib/tailor/print-pdf-browser";
import type { Answers, CheckResult, CompanyInfo, Question, TailorResult } from "@/lib/tailor/types";

export const Route = createFileRoute("/resume-analysis")({
  head: () => ({ meta: [{ title: "Resume Tailor — ZeroGap AI" }] }),
  component: TailorPage,
});

type Mode = "check" | "tailor";
type Msg =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "company"; company: CompanyInfo }
  | { id: number; kind: "questions"; questions: Question[] }
  | { id: number; kind: "resume"; result: TailorResult; version: number }
  | { id: number; kind: "check"; company: CompanyInfo | null; result: CheckResult };

const TYPE_LABEL: Record<string, string> = { product: "a product company", service: "a service or consulting company", startup: "a startup", other: "another kind of company", unknown: "a company I couldn't identify" };

// Distributes Omit over each member of a discriminated union so each variant
// can be passed to push() without TypeScript collapsing the union into a single type.
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;


async function api<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/tailor-resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

function TailorPage() {
  const [mode, setMode] = useState<Mode>("tailor");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [jd, setJd] = useState("");

  const [thread, setThread] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [answered, setAnswered] = useState(false);
  const [latest, setLatest] = useState("");
  const [followUp, setFollowUp] = useState("");
  const nextId = useRef(1);
  const push = (m: DistributiveOmit<Msg, "id">) => setThread((t) => [...t, { ...m, id: nextId.current++ } as Msg]);


  const payload = { resumeText, role: role.trim(), company: company.trim(), url: url.trim(), jd: jd.trim() };
  const ready = resumeText.trim().length >= 80 && role.trim().length >= 2;

  const onFile = async (f: File | null) => {
    setFile(f);
    if (!f) return;
    try {
      setResumeText(await extractResumeText(f));
      toast.success("Resume read in your browser");
    } catch (e: any) {
      setFile(null);
      toast.error(e.message);
    }
  };

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { toast.error(e.message ?? "Something went wrong"); } finally { setBusy(false); }
  };

  const start = () => guard(async () => {
    setThread([]); setAnswered(false); setLatest(""); setAnswers({});
    if (mode === "check") {
      const r = await api<{ company: CompanyInfo | null; result: CheckResult }>({ phase: "check", ...payload });
      push({ kind: "check", company: r.company, result: r.result });
      return;
    }
    const r = await api<{ company: CompanyInfo; questions: Question[] }>({ phase: "intake", ...payload });
    push({ kind: "company", company: r.company });
    push({ kind: "questions", questions: r.questions });
    const d: Partial<Answers> = { scope: [] };
    for (const q of r.questions) if (q.default && q.id !== "scope" && q.id !== "keep") (d as any)[q.id] = q.default;
    setAnswers(d);
  });

  const build = () => guard(async () => {
    if (!answers.scope?.length) { toast.error("Choose at least one thing I may change."); return; }
    if (!answers.company_type) { toast.error("Tell me what kind of company this is."); return; }
    setAnswered(true);
    const r = await api<TailorResult>({ phase: "generate", ...payload, answers });
    setLatest(r.resume_text);
    push({ kind: "resume", result: r, version: 1 });
  });

  const revise = () => guard(async () => {
    const text = followUp.trim();
    if (text.length < 3) return;
    push({ kind: "user", text });
    setFollowUp("");
    const r = await api<TailorResult>({ phase: "revise", ...payload, currentResume: latest, request: text, answers: answers.scope ? answers : undefined });
    setLatest(r.resume_text);
    setThread((t) => { push({ kind: "resume", result: r, version: t.filter((m) => m.kind === "resume").length + 1 }); return t; });
  });

  const finish = async () => {
    try {
      printResumeAsPdf(latest, role ? `Resume - ${role}` : "Resume");
    } catch (e: any) { toast.error(e.message); }
  };

  const lastResumeId = [...thread].reverse().find((m) => m.kind === "resume")?.id;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 lg:grid-cols-[380px_1fr]">
        <section className="lg:sticky lg:top-24 self-start space-y-5">
          <header>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Resume Tailor</h1>
            <p className="mt-2 text-sm text-muted-foreground">Check how your resume fits a job, or change it for that job. Your resume stays exactly as it is unless you ask for a change.</p>
          </header>

          <Card className="p-4 space-y-4">
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="sr-only">What do you want to do?</legend>
              {([["check", "Check my resume", "ATS score and trend fit"], ["tailor", "Change my resume", "Edit it for this job"]] as const).map(([v, t, s]) => (
                <label key={v} className={`cursor-pointer rounded-md border p-3 text-sm has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring ${mode === v ? "border-primary bg-muted" : "border-input"}`}>
                  <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
                  <span className="block font-semibold">{t}</span>
                  <span className="block text-xs text-muted-foreground">{s}</span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-2">
              <label htmlFor="rt-file" className="text-sm font-medium">Resume</label>
              <label htmlFor="rt-file" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm hover:border-primary focus-within:ring-1 focus-within:ring-ring">
                <Upload className="h-4 w-4" aria-hidden />
                <span className="truncate">{file ? file.name : "Upload PDF, DOCX or TXT"}</span>
                <input id="rt-file" type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              </label>
              <Textarea aria-label="Or paste resume text" placeholder="Or paste the text of your resume" className="min-h-[88px]" value={resumeText} onChange={(e) => { setResumeText(e.target.value); setFile(null); }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="rt-role" className="text-sm font-medium">Job role</label>
                <Input id="rt-role" placeholder="e.g. SDE intern" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="rt-co" className="text-sm font-medium">Company</label>
                <Input id="rt-co" placeholder="e.g. Razorpay" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="rt-url" className="text-sm font-medium">Company website (optional)</label>
              <Input id="rt-url" placeholder="razorpay.com" value={url} onChange={(e) => setUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">I read this one public page to understand what the company does.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="rt-jd" className="text-sm font-medium">Job description and your instructions</label>
              <Textarea id="rt-jd" className="min-h-[130px]" placeholder={"Paste the job description.\nYou can also tell me what to change, like “fix grammar” or “make it one page”."} value={jd} onChange={(e) => setJd(e.target.value)} />
              <p className="text-xs text-muted-foreground">Anything the job wants that isn't in your resume is left out and listed for you.</p>
            </div>

            <Button className="w-full" disabled={!ready || busy} onClick={start}>
              {busy && !thread.length ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden /> : null}
              {mode === "check" ? "Check my resume" : "Start tailoring"}
            </Button>
          </Card>
        </section>

        <section aria-live="polite" aria-label="Conversation" className="min-w-0 space-y-5">
          {!thread.length && !busy && (
            <Card className="p-8 text-sm text-muted-foreground">
              Add your resume and the job you want. For a change, I'll ask a few quick questions first, then show your resume as text here after every change. When you're happy with it, I'll turn it into a PDF.
            </Card>
          )}

          {thread.map((m) => {
            switch (m.kind) {
              case "user":
                return <div key={m.id} className="ml-auto max-w-[85%] rounded-lg bg-muted px-4 py-2 text-sm">{m.text}</div>;
              case "company":
                return <CompanyNote key={m.id} c={m.company} />;
              case "questions":
                return <QuestionCard key={m.id} questions={m.questions} answers={answers} setAnswers={setAnswers} disabled={answered || busy} onSubmit={build} />;
              case "check":
                return <CheckCard key={m.id} r={m.result} c={m.company} onTailor={() => { setMode("tailor"); toast("Switched to Change my resume. Press Start tailoring."); }} />;
              case "resume":
                return (
                  <ResumeCard key={m.id} r={m.result} version={m.version} isLatest={m.id === lastResumeId}
                    followUp={followUp} setFollowUp={setFollowUp} onSend={revise} onDone={finish} busy={busy} />
                );
            }
          })}

          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden /> Working on it</p>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function CompanyNote({ c }: { c: CompanyInfo }) {
  return (
    <Card className="p-4 text-sm">
      <p>
        {c.type === "unknown" || c.confidence === "low"
          ? `I couldn't tell for sure what kind of company ${c.name || "this"} is.`
          : `${c.name || "This"} looks like ${TYPE_LABEL[c.type]} (${c.confidence} confidence).`}{" "}
        <span className="text-muted-foreground">{c.evidence}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {c.pageFetched ? "Based on the company's own page." : c.pageNote ? `I couldn't read the website: ${c.pageNote}` : "Based on the name only, so please confirm below."}
      </p>
    </Card>
  );
}

function QuestionCard({ questions, answers, setAnswers, disabled, onSubmit }: {
  questions: Question[]; answers: Partial<Answers>; setAnswers: (a: Partial<Answers>) => void; disabled: boolean; onSubmit: () => void;
}) {
  const set = (id: string, v: unknown) => setAnswers({ ...answers, [id]: v });
  return (
    <Card className="p-5 space-y-5">
      <h2 className="font-display text-lg font-bold">A few quick questions before I change anything</h2>
      {questions.map((q) => (
        <fieldset key={q.id} disabled={disabled} className="space-y-2">
          <legend className="text-sm font-medium">{q.text}</legend>
          {q.kind === "text" ? (
            <Input aria-label={q.text} placeholder="e.g. keep my summary exactly as it is" value={answers.keep ?? ""} onChange={(e) => set("keep", e.target.value)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {q.options!.map((o) => {
                const multi = q.kind === "multi";
                const checked = multi ? (answers.scope ?? []).includes(o) : (answers as any)[q.id] === o;
                return (
                  <label key={o} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring ${checked ? "border-primary bg-muted" : "border-input"} ${disabled ? "opacity-60" : ""}`}>
                    <input
                      type={multi ? "checkbox" : "radio"} name={q.id} className="sr-only" checked={checked}
                      onChange={() => multi ? set("scope", checked ? (answers.scope ?? []).filter((x) => x !== o) : [...(answers.scope ?? []), o]) : set(q.id, o)}
                    />
                    {o}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}
      <Button disabled={disabled} onClick={onSubmit}>Build my resume</Button>
    </Card>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

function ResumeCard({ r, version, isLatest, followUp, setFollowUp, onSend, onDone, busy }: {
  r: TailorResult; version: number; isLatest: boolean; followUp: string; setFollowUp: (s: string) => void; onSend: () => void; onDone: () => void; busy: boolean;
}) {
  const copy = async () => { try { await navigator.clipboard.writeText(r.resume_text); toast.success("Copied"); } catch { toast.error("Couldn't copy. Select the text and copy it instead."); } };
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{version === 1 ? "Your resume" : `Your resume, version ${version}`}</h2>
        <Button variant="outline" size="sm" onClick={copy}><Copy className="mr-2 h-4 w-4" aria-hidden /> Copy</Button>
      </div>
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm font-mono leading-relaxed">{r.resume_text}</pre>
      <p className="text-xs text-muted-foreground">
        {r.stats.changedLines === 0 ? "No lines changed from the previous version." : `${r.stats.changedLines} of ${r.stats.totalLines} lines changed (${r.stats.pctChanged}%). Everything else is exactly as before.`}
      </p>
      {r.warnings.length > 0 && (
        <div role="alert" className="rounded-md border border-destructive/60 p-3 text-sm text-destructive">{r.warnings.map((w) => <p key={w}>{w}</p>)}</div>
      )}
      <List title="What I changed" items={r.changes_made} />
      <List title="Not in your resume, so I didn't edit it" items={r.not_edited} />

      {isLatest && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Do you want any more changes? If you're done, I'll turn this into a PDF.</p>
          <div className="flex gap-2">
            <Input aria-label="Ask for another change" placeholder="e.g. make the summary shorter" value={followUp} disabled={busy}
              onChange={(e) => setFollowUp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSend(); }} />
            <Button onClick={onSend} disabled={busy || followUp.trim().length < 3}><Send className="mr-2 h-4 w-4" aria-hidden /> Send</Button>
          </div>
          <Button variant="outline" onClick={onDone} disabled={busy}><FileDown className="mr-2 h-4 w-4" aria-hidden /> I'm done: make the PDF</Button>
          <p className="text-xs text-muted-foreground">A print window opens. Choose "Save as PDF" as the destination. The PDF has real text that ATS systems can read.</p>
        </div>
      )}
    </Card>
  );
}

function CheckCard({ r, c, onTailor }: { r: CheckResult; c: CompanyInfo | null; onTailor: () => void }) {
  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-display text-lg font-bold">How your resume fits</h2>
      {c && c.type !== "unknown" && <p className="text-sm text-muted-foreground">Read as {TYPE_LABEL[c.type]} ({c.confidence} confidence).</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted p-3"><p className="text-2xl font-bold font-mono">{Math.round(r.ats_score)}</p><p className="text-xs text-muted-foreground">ATS score (estimate)</p></div>
        <div className="rounded-md bg-muted p-3"><p className="text-2xl font-bold font-mono">{Math.round(r.trend_score)}</p><p className="text-xs text-muted-foreground">Trend alignment (estimate)</p></div>
      </div>
      <p className="text-sm">{r.summary}</p>
      {r.coverage && (
        <div>
          <h3 className="text-sm font-semibold">Skills the job names: {r.coverage.pct}% are on your resume</h3>
          <p className="mt-1 text-xs text-muted-foreground">This count is exact, not an estimate.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {r.coverage.matched.map((s) => <li key={s} className="rounded-md border border-success/50 px-2 py-0.5 text-xs font-mono text-success">{s}</li>)}
            {r.coverage.missing.map((s) => <li key={s} className="rounded-md border border-dashed border-muted-foreground/60 px-2 py-0.5 text-xs font-mono text-muted-foreground">{s} (missing)</li>)}
          </ul>
        </div>
      )}
      <List title="Strengths" items={r.strengths} />
      <List title="Weaknesses" items={r.weaknesses} />
      <List title="Keyword gaps" items={r.keyword_gaps} />
      <List title="Suggestions" items={r.suggestions} />
      <p className="text-xs text-muted-foreground">Scores come from an AI model's judgement. Real ATS systems differ.</p>
      <Button variant="outline" onClick={onTailor}>Change my resume for this job</Button>
    </Card>
  );
}

