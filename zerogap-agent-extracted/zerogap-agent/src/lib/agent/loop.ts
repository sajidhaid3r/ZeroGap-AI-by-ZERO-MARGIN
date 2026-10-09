import { z } from "zod";
import type {
  AgentCtx, AgentEvent, FinalReport, HistoryItem, LLM, Observation, Tool, ToolCallAction, ToolMap,
} from "./types";

// ───────────────────────── schemas the model must satisfy ─────────────────────────

const toolCallSchema = z.object({
  thought: z.string().max(600).default(""),
  tool: z.string().min(1),
  args: z.record(z.any()).default({}),
});

const finalSchema = z.object({
  final: z.object({
    summary: z.string().min(10),
    top_gaps: z.array(z.string()).default([]),
    recommended_jobs: z
      .array(z.object({ role: z.string(), company: z.string(), url: z.string().optional(), why: z.string() }))
      .default([]),
    next_steps: z.array(z.string()).default([]),
    caveats: z.array(z.string()).default([]),
  }),
});

const decisionSchema = z.union([finalSchema, toolCallSchema]);

// ───────────────────────── prompt ─────────────────────────

export function buildSystemPrompt(tools: ToolMap, ctx: AgentCtx): string {
  const toolLines = Object.values(tools)
    .map((t) => `- ${t.name}${t.requiresApproval ? " (needs user approval)" : ""}: ${t.description}\n  args: ${t.argsHint}`)
    .join("\n");
  return `You are the ZeroGap Career Gap Agent. You help an undergraduate become hireable for a specific role by gathering evidence with tools, then recommending concrete next steps.

On every turn reply with ONE JSON object and nothing else (no markdown, no prose).
To use a tool:  {"thought": "<one sentence on why>", "tool": "<tool name>", "args": { ... }}
To finish:      {"final": {"summary": "...", "top_gaps": ["..."], "recommended_jobs": [{"role":"","company":"","url":"","why":""}], "next_steps": ["..."], "caveats": ["..."]}}

Tools:
${toolLines}

Rules:
1. Start with analyze_resume. Never invent job_ids, skills or numbers; only use ids and facts that appeared in tool results.
2. If a tool returns an error, do NOT repeat the same call. Adapt, use a different tool, or continue without it.
3. GitHub username: ${ctx.githubUsername ? ctx.githubUsername : "NOT PROVIDED, so do not call check_github_evidence"}.
4. Results tagged source=model_estimate or sample are not verified data. Say so in caveats.
5. Draft a cover note only for the single best-matching job. Call save_to_tracker only after that, for that one job.
6. Use at most 7 tool calls, then finish with the final object.`;
}

function clip(v: unknown, n: number): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + "…[truncated]" : s;
}

export function renderHistory(history: HistoryItem[]): string {
  if (!history.length) return "(no tool calls yet)";
  return history
    .map((h, i) => {
      const res = h.obs.ok ? `OK [source=${h.obs.source}] ${clip(h.obs.data, 1400)}` : `ERROR (${h.obs.kind}): ${h.obs.error}`;
      return `#${i + 1} ${h.action.tool}(${clip(h.action.args, 200)}) -> ${res}`;
    })
    .join("\n");
}

function buildUserPrompt(goal: string, ctx: AgentCtx, history: HistoryItem[], forceFinal = false): string {
  return `Goal: ${goal}
Target role: ${ctx.targetRole}
City: ${ctx.city}
Today: ${new Date().toISOString().slice(0, 10)}

Tool calls so far:
${renderHistory(history)}

${forceFinal ? "You must now reply with the final object." : "What is your next action?"}`;
}

// ───────────────────────── reliability helpers ─────────────────────────

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(Object.assign(new Error(`Timed out after ${ms}ms`), { timeout: true })), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run a tool with a timeout and retry only transient failures (timeouts, TransientError) with backoff. */
export async function runWithRetry(
  tool: Tool,
  args: unknown,
  ctx: AgentCtx,
  sleep: Sleep,
): Promise<{ obs: Observation; attempts: number }> {
  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("; ");
    return { obs: { ok: false, kind: "validation", error: `Invalid args for ${tool.name}: ${msg}. Expected ${tool.argsHint}` }, attempts: 0 };
  }
  const max = (tool.retries ?? 0) + 1;
  let last: any;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      const res = await withTimeout(tool.run(parsed.data, ctx), tool.timeoutMs ?? 20_000);
      return { obs: { ok: true, data: res.data, source: res.source }, attempts: attempt };
    } catch (e: any) {
      last = e;
      const retryable = e?.transient === true || e?.timeout === true;
      if (!retryable || attempt === max) break;
      await sleep(300 * 2 ** (attempt - 1));
    }
  }
  const kind = last?.timeout ? "timeout" : "tool";
  return { obs: { ok: false, kind, error: String(last?.message ?? last) }, attempts: max };
}

// ───────────────────────── decision step with one repair attempt ─────────────────────────

type Decision = { kind: "tool"; action: ToolCallAction } | { kind: "final"; report: FinalReport };

async function decide(
  llm: LLM,
  system: string,
  user: string,
): Promise<{ result: Decision | { kind: "invalid"; reason: string }; repairs: string[] }> {
  let prompt = user;
  let reason = "";
  const repairs: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await llm(system, prompt);
      const parsed = decisionSchema.safeParse(raw);
      if (parsed.success) {
        const d = parsed.data as any;
        return { result: "final" in d ? { kind: "final", report: d.final } : { kind: "tool", action: d }, repairs };
      }
      reason = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
    } catch (e: any) {
      reason = `model call failed: ${e?.message ?? e}`;
    }
    if (attempt === 0) {
      repairs.push(reason);
      prompt = `${user}\n\nYour previous reply was rejected (${reason}). Reply again with exactly one valid JSON object in the required shape.`;
    }
  }
  return { result: { kind: "invalid", reason }, repairs };
}

// ───────────────────────── provenance + fallback report ─────────────────────────

export function provenanceOf(history: HistoryItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of history) if (h.obs.ok) out[h.obs.source] = (out[h.obs.source] ?? 0) + 1;
  return out;
}

/** If the model cannot produce a final report, assemble an honest one from what the tools actually returned. */
export function fallbackReport(history: HistoryItem[], reason: string): FinalReport {
  const okData = (name: string) => history.find((h) => h.action.tool === name && h.obs.ok)?.obs as any;
  const analysis = okData("analyze_resume")?.data;
  const matches = history.filter((h) => h.action.tool === "match_resume_to_job" && h.obs.ok).map((h) => (h.obs as any).data);
  const best = [...matches].sort((a, b) => b.match_pct - a.match_pct)[0];
  return {
    summary: analysis?.summary ?? "The agent could not finish its analysis, so this report only lists what its tools returned.",
    top_gaps: best?.missing ?? analysis?.missing_keywords ?? [],
    recommended_jobs: best ? [{ role: best.role, company: best.company, why: `${best.match_pct}% of listed skills already match.` }] : [],
    next_steps: [],
    caveats: [`Partial result: ${reason}`],
  };
}

// ───────────────────────── the agent loop ─────────────────────────

export interface RunOptions {
  goal: string;
  ctx: AgentCtx;
  tools: ToolMap;
  llm: LLM;
  modelName: string;
  maxSteps?: number;
  sleep?: Sleep;
  /** Continue a run that paused for approval. History is echoed by the client; tool args are re-validated on run. */
  resume?: { history: HistoryItem[]; pending: ToolCallAction; decision: "approve" | "reject"; scratch?: Record<string, any> };
}

export async function* runAgent(opts: RunOptions): AsyncGenerator<AgentEvent> {
  const { goal, ctx, tools, llm, modelName } = opts;
  const maxSteps = opts.maxSteps ?? 8;
  const sleep = opts.sleep ?? realSleep;
  const system = buildSystemPrompt(tools, ctx);
  const history: HistoryItem[] = [...(opts.resume?.history ?? [])];

  yield { type: "start", goal, maxSteps, model: modelName };

  // Resumed run: restore the working memory the client echoed back, then act on the user's decision.
  if (opts.resume) {
    if (opts.resume.scratch && typeof opts.resume.scratch === "object") Object.assign(ctx.scratch, opts.resume.scratch);
    const { pending, decision } = opts.resume;
    const tool = tools[pending.tool];
    const t0 = Date.now();
    let item: HistoryItem;
    if (!tool) {
      item = { id: crypto.randomUUID(), action: pending, obs: { ok: false, kind: "unknown_tool", error: `No tool named ${pending.tool}` }, attempts: 0, ms: 0 };
    } else if (decision === "reject") {
      item = { id: crypto.randomUUID(), action: pending, obs: { ok: false, kind: "rejected", error: "The user declined this action. Do not retry it; propose an alternative or finish." }, attempts: 0, ms: 0 };
    } else {
      const r = await runWithRetry(tool, pending.args, ctx, sleep);
      item = { id: crypto.randomUUID(), action: pending, obs: r.obs, attempts: r.attempts, ms: Date.now() - t0 };
    }
    history.push(item);
    yield { type: "step", step: history.length, item };
  }

  let badDecisions = 0;

  while (history.length < maxSteps) {
    const step = history.length + 1;
    yield { type: "thinking", step };

    const { result: d, repairs } = await decide(llm, system, buildUserPrompt(goal, ctx, history));
    for (const reason of repairs) yield { type: "repair", step, reason };
    if (d.kind === "invalid") {
      badDecisions++;
      if (badDecisions >= 2) {
        yield { type: "final", report: fallbackReport(history, `the model repeatedly returned invalid output (${d.reason})`), provenance: provenanceOf(history), partial: true, steps: history.length };
        return;
      }
      continue;
    }
    badDecisions = 0;

    if (d.kind === "final") {
      yield { type: "final", report: withProvenanceCaveat(d.report, history), provenance: provenanceOf(history), partial: false, steps: history.length };
      return;
    }

    const { action } = d;
    const tool = tools[action.tool];
    const t0 = Date.now();

    // Unknown tool: tell the model, don't crash.
    if (!tool) {
      const item: HistoryItem = { id: crypto.randomUUID(), action, obs: { ok: false, kind: "unknown_tool", error: `There is no tool named "${action.tool}". Available: ${Object.keys(tools).join(", ")}` }, attempts: 0, ms: 0 };
      history.push(item);
      yield { type: "step", step, item };
      continue;
    }

    // Loop guard: identical successful call already made.
    const key = action.tool + JSON.stringify(action.args);
    if (history.some((h) => h.obs.ok && h.action.tool + JSON.stringify(h.action.args) === key)) {
      const item: HistoryItem = { id: crypto.randomUUID(), action, obs: { ok: false, kind: "duplicate", error: "You already made this exact call and have its result above. Use it or take a different action." }, attempts: 0, ms: 0 };
      history.push(item);
      yield { type: "step", step, item };
      continue;
    }

    // Human approval gate. Validate args first so the user is never asked to approve garbage.
    if (tool.requiresApproval) {
      const v = tool.schema.safeParse(action.args);
      if (!v.success) {
        const item: HistoryItem = { id: crypto.randomUUID(), action, obs: { ok: false, kind: "validation", error: `Invalid args for ${tool.name}. Expected ${tool.argsHint}` }, attempts: 0, ms: 0 };
        history.push(item);
        yield { type: "step", step, item };
        continue;
      }
      yield { type: "needs_approval", step, action, preview: tool.preview?.(v.data, ctx) ?? v.data, history, scratch: ctx.scratch };
      return; // paused: the client resumes with the user's decision
    }

    const r = await runWithRetry(tool, action.args, ctx, sleep);
    const item: HistoryItem = { id: crypto.randomUUID(), action, obs: r.obs, attempts: r.attempts, ms: Date.now() - t0 };
    history.push(item);
    yield { type: "step", step, item };
  }

  // Step budget exhausted: ask once for a final answer, otherwise assemble one from tool results.
  const { result: last } = await decide(llm, system, buildUserPrompt(goal, ctx, history, true));
  if (last.kind === "final") {
    yield { type: "final", report: withProvenanceCaveat(last.report, history), provenance: provenanceOf(history), partial: true, steps: history.length };
  } else {
    yield { type: "final", report: fallbackReport(history, "step limit reached"), provenance: provenanceOf(history), partial: true, steps: history.length };
  }
}

/** Guarantee the report is honest about unverified data even if the model forgot to say so. */
function withProvenanceCaveat(report: FinalReport, history: HistoryItem[]): FinalReport {
  const p = provenanceOf(history);
  const notes: string[] = [];
  if (p.model_estimate) notes.push("Market, city and score figures are model estimates, not official statistics.");
  if (p.sample) notes.push("Job listings were sample data because no live job feed was available.");
  const missing = notes.filter((n) => !report.caveats.some((c) => c.toLowerCase().includes(n.slice(0, 18).toLowerCase())));
  return { ...report, caveats: [...report.caveats, ...missing] };
}
