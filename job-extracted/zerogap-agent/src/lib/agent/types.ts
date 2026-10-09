import type { z } from "zod";

/** Where a piece of data came from. Shown as a badge in the UI and summarised in the final report. */
export type Source = "live" | "model_estimate" | "sample" | "user_data" | "deterministic";

export interface ToolResult {
  data: unknown;
  source: Source;
}

export interface AgentCtx {
  /** Plain text extracted from the resume in the browser (never leaves the user's session otherwise). */
  resumeText: string;
  targetRole: string;
  city: string;
  githubUsername?: string;
  /** Supabase access token of the signed-in user; required by tools that persist data. */
  userJwt?: string;
  env: Record<string, string | undefined>;
  /** Working memory shared between tools within one run (search results, resume skills, drafts). */
  scratch: Record<string, any>;
}

/** Throw from a tool for errors worth retrying (network blips, 5xx). Everything else fails fast. */
export class TransientError extends Error {
  readonly transient = true;
  constructor(message: string) {
    super(message);
    this.name = "TransientError";
  }
}

export interface Tool<A = any> {
  name: string;
  description: string;
  /** Human-readable arg shape shown to the model. */
  argsHint: string;
  schema: z.ZodType<A>;
  /** Consequential tools never run without an explicit user decision. */
  requiresApproval?: boolean;
  /** Per-attempt timeout. */
  timeoutMs?: number;
  /** Number of retries after the first attempt. Only retried for errors flagged transient. */
  retries?: number;
  /** For approval-gated tools: what the user sees before deciding. */
  preview?(args: A, ctx: AgentCtx): unknown;
  run(args: A, ctx: AgentCtx): Promise<ToolResult>;
}

export type ToolMap = Record<string, Tool>;

export interface ToolCallAction {
  thought: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface FinalReport {
  summary: string;
  top_gaps: string[];
  recommended_jobs: { role: string; company: string; url?: string; why: string }[];
  next_steps: string[];
  caveats: string[];
}

export type Observation =
  | { ok: true; data: unknown; source: Source }
  | { ok: false; error: string; kind: "validation" | "timeout" | "tool" | "rejected" | "unknown_tool" | "duplicate" };

export interface HistoryItem {
  id: string;
  action: ToolCallAction;
  obs: Observation;
  attempts: number;
  ms: number;
}

export type AgentEvent =
  | { type: "start"; goal: string; maxSteps: number; model: string }
  | { type: "thinking"; step: number }
  | { type: "repair"; step: number; reason: string }
  | { type: "step"; step: number; item: HistoryItem }
  | { type: "needs_approval"; step: number; action: ToolCallAction; preview: unknown; history: HistoryItem[]; scratch: Record<string, any> }
  | { type: "final"; report: FinalReport; provenance: Record<string, number>; partial: boolean; steps: number }
  | { type: "fatal"; error: string };

/** Minimal LLM contract so the loop is model-agnostic and unit-testable. Must resolve to parsed JSON. */
export type LLM = (system: string, user: string) => Promise<unknown>;
