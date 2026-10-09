import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { runAgent, runWithRetry } from "../src/lib/agent/loop";
import { buildTools, extractSkills, matchSkills, type AiFn } from "../src/lib/agent/tools";
import { TransientError, type AgentCtx, type AgentEvent, type LLM, type Tool } from "../src/lib/agent/types";

const noSleep = async () => {};

const RESUME = "Sajid Haider. Projects: built a Streamlit app using Python, Docker and the Gemini API; React and TypeScript frontend; SQL database; Git. ".repeat(3);

const fakeAi: AiFn = async ({ tool }) => {
  switch (tool.name) {
    case "submit_analysis":
      return { ats_score: 71, trend_score: 64, summary: "Solid projects, thin on cloud.", strengths: ["Projects"], weaknesses: ["No cloud"], detected_skills: ["Python", "Docker"], missing_keywords: ["AWS"] };
    case "submit_trend":
      return { trend_direction: "rising", avg_salary_inr_lakhs: 8, top_skills: ["python"], top_cities: ["Bengaluru"], outlook: "Good." };
    case "submit_roadmap":
      return { intro: "Plan", tasks: [{ hour_block: 0, title: "t", description: "d" }] };
    case "submit_note":
      return { subject: "Application", body: "Hello" };
    default:
      return {};
  }
};

const mkCtx = (over: Partial<AgentCtx> = {}): AgentCtx => ({
  resumeText: RESUME, targetRole: "ML Intern", city: "Bengaluru", githubUsername: "octocat",
  env: {}, scratch: {}, ...over,
});

const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** LLM that replays a script; items may be objects, or functions to throw/delay. */
const scripted = (steps: unknown[]): LLM => {
  let i = 0;
  return async () => {
    const s = steps[Math.min(i++, steps.length - 1)];
    return typeof s === "function" ? (s as any)() : s;
  };
};

const call = (tool: string, args: any = {}) => ({ thought: "because", tool, args });
const FINAL = { final: { summary: "You are close; build one cloud project.", top_gaps: ["aws"], recommended_jobs: [], next_steps: ["do x"], caveats: [] } };

async function collect(gen: AsyncGenerator<AgentEvent>) {
  const ev: AgentEvent[] = [];
  for await (const e of gen) ev.push(e);
  return ev;
}
const last = (ev: AgentEvent[]) => ev[ev.length - 1] as any;

test("deterministic helpers", () => {
  assert.deepEqual(extractSkills("I use C++ and Next.js with PostgreSQL").sort(), ["c++", "next.js", "postgresql"]);
  assert.deepEqual(extractSkills("javascripting"), []); // no partial-word matches
  const m = matchSkills(["python", "docker"], ["Python", "AWS", "Docker", "SQL"]);
  assert.equal(m.match_pct, 50);
  assert.deepEqual(m.missing, ["AWS", "SQL"]);
});

test("happy path: tools run in order, scratch memory flows between tools, provenance reported", async () => {
  const fetchImpl = (async () => jsonRes({})) as any; // no Adzuna keys -> sample jobs
  const tools = buildTools({ ai: fakeAi, fetchImpl });
  const ev = await collect(runAgent({
    goal: "g", ctx: mkCtx(), tools, modelName: "m", sleep: noSleep,
    llm: scripted([call("analyze_resume"), call("search_jobs", { city: "Bengaluru", keyword: "ml intern" }), call("match_resume_to_job", { job_id: "sample-2" }), FINAL]),
  }));
  const fin = last(ev);
  assert.equal(fin.type, "final");
  assert.equal(fin.partial, false);
  assert.equal(fin.steps, 3);
  const steps = ev.filter((e) => e.type === "step") as any[];
  assert.equal(steps[2].item.obs.data.match_pct, 25); // 1 of 4 listed skills (python) is on the resume
  assert.equal(fin.provenance.model_estimate, 1);
  assert.equal(fin.provenance.sample, 1);
  assert.equal(fin.provenance.deterministic, 1);
  // honesty caveats auto-added
  assert.ok(fin.report.caveats.some((c: string) => /estimate/i.test(c)));
  assert.ok(fin.report.caveats.some((c: string) => /sample/i.test(c)));
});

test("invalid model output is repaired once", async () => {
  const tools = buildTools({ ai: fakeAi });
  const ev = await collect(runAgent({
    goal: "g", ctx: mkCtx(), tools, modelName: "m", sleep: noSleep,
    llm: scripted([{ nonsense: true }, call("analyze_resume"), FINAL]),
  }));
  assert.equal(ev.filter((e) => e.type === "repair").length, 1);
  assert.equal(last(ev).type, "final");
  assert.equal(last(ev).partial, false);
});

test("model that keeps failing yields an honest partial report, not a crash", async () => {
  const tools = buildTools({ ai: fakeAi });
  const ev = await collect(runAgent({
    goal: "g", ctx: mkCtx(), tools, modelName: "m", sleep: noSleep,
    llm: scripted([() => { throw new Error("503 upstream"); }]),
  }));
  const fin = last(ev);
  assert.equal(fin.type, "final");
  assert.equal(fin.partial, true);
  assert.match(fin.report.caveats[0], /invalid output|Partial/i);
});

test("transient tool failures are retried with backoff, then succeed", async () => {
  let n = 0;
  const fetchImpl = (async () => { n++; return n === 1 ? jsonRes({}, 503) : jsonRes({ results: [{ id: 1, title: "Python Intern", description: "python docker", company: { display_name: "Acme" }, location: { display_name: "Bengaluru, Karnataka" }, redirect_url: "https://x" }] }); }) as any;
  const tools = buildTools({ ai: fakeAi, fetchImpl });
  const ctx = mkCtx({ env: { ADZUNA_APP_ID: "a", ADZUNA_APP_KEY: "b" } });
  const r = await runWithRetry(tools.search_jobs, { city: "Bengaluru", keyword: "python" }, ctx, noSleep);
  assert.equal(r.obs.ok, true);
  assert.equal(r.attempts, 2);
  assert.equal((r.obs as any).source, "live");
});

test("permanent tool errors are not retried and are fed back so the agent adapts", async () => {
  let calls = 0;
  const fetchImpl = (async () => { calls++; return jsonRes({}, 404); }) as any;
  const tools = buildTools({ ai: fakeAi, fetchImpl });
  const ev = await collect(runAgent({
    goal: "g", ctx: mkCtx(), tools, modelName: "m", sleep: noSleep,
    llm: scripted([call("check_github_evidence", { skills: ["python"] }), FINAL]),
  }));
  const step = ev.find((e) => e.type === "step") as any;
  assert.equal(step.item.obs.ok, false);
  assert.match(step.item.obs.error, /not found/i);
  assert.equal(calls, 1); // no retry on 404
  assert.equal(last(ev).type, "final");
});

test("invalid tool args are rejected with a corrective message", async () => {
  const tools = buildTools({ ai: fakeAi });
  const r = await runWithRetry(tools.get_market_trend, { role: 5 }, mkCtx(), noSleep);
  assert.equal(r.obs.ok, false);
  assert.equal((r.obs as any).kind, "validation");
  assert.match((r.obs as any).error, /Expected/);
});

test("hanging tool times out (and a transient timeout is retried)", async () => {
  let runs = 0;
  const slow: Tool = {
    name: "slow", description: "", argsHint: "{}", schema: z.object({}), timeoutMs: 20, retries: 1,
    async run() { runs++; await new Promise((r) => setTimeout(r, 200)); return { data: 1, source: "live" }; },
  };
  const r = await runWithRetry(slow, {}, mkCtx(), noSleep);
  assert.equal((r.obs as any).kind, "timeout");
  assert.equal(runs, 2);
});

test("unknown tool and duplicate calls are handled without crashing", async () => {
  const tools = buildTools({ ai: fakeAi });
  const ev = await collect(runAgent({
    goal: "g", ctx: mkCtx(), tools, modelName: "m", sleep: noSleep,
    llm: scripted([call("hack_the_planet"), call("analyze_resume"), call("analyze_resume"), FINAL]),
  }));
  const kinds = (ev.filter((e) => e.type === "step") as any[]).map((s) => s.item.obs.kind ?? "ok");
  assert.deepEqual(kinds, ["unknown_tool", "ok", "duplicate"]);
});

test("approval gate: consequential tool pauses and performs NO side effect until approved", async () => {
  let supabaseCalls = 0;
  const fetchImpl = (async (url: string) => { if (String(url).includes("supabase")) supabaseCalls++; return jsonRes([{}], 201); }) as any;
  const tools = buildTools({ ai: fakeAi, fetchImpl });
  const ctx = mkCtx({ userJwt: "jwt", env: { SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "k" } });
  const llm = scripted([call("search_jobs", { city: "Bengaluru", keyword: "ml" }), call("save_to_tracker", { job_id: "sample-2" }), FINAL]);

  const ev = await collect(runAgent({ goal: "g", ctx, tools, llm, modelName: "m", sleep: noSleep }));
  const pause = last(ev);
  assert.equal(pause.type, "needs_approval");
  assert.equal(pause.preview.company, "Swiggy");
  assert.equal(supabaseCalls, 0);

  // approve -> executes, with working memory restored from what the client echoed
  const ctx2 = mkCtx({ userJwt: "jwt", env: ctx.env });
  const ev2 = await collect(runAgent({
    goal: "g", ctx: ctx2, tools, modelName: "m", sleep: noSleep, llm: scripted([FINAL]),
    resume: { history: pause.history, pending: pause.action, decision: "approve", scratch: pause.scratch },
  }));
  assert.equal(supabaseCalls, 1);
  assert.equal((ev2.find((e) => e.type === "step") as any).item.obs.source, "user_data");
  assert.equal(last(ev2).type, "final");

  // reject -> no call, agent is told not to retry
  const ctx3 = mkCtx({ userJwt: "jwt", env: ctx.env });
  const ev3 = await collect(runAgent({
    goal: "g", ctx: ctx3, tools, modelName: "m", sleep: noSleep, llm: scripted([FINAL]),
    resume: { history: pause.history, pending: pause.action, decision: "reject", scratch: pause.scratch },
  }));
  assert.equal(supabaseCalls, 1);
  assert.equal((ev3.find((e) => e.type === "step") as any).item.obs.kind, "rejected");
});

test("save_to_tracker without sign-in fails safely", async () => {
  const tools = buildTools({ ai: fakeAi, fetchImpl: (async () => jsonRes({})) as any });
  const ctx = mkCtx();
  await runWithRetry(tools.search_jobs, { city: "Bengaluru", keyword: "ml" }, ctx, noSleep);
  const r = await runWithRetry(tools.save_to_tracker, { job_id: "sample-1" }, ctx, noSleep);
  assert.equal(r.obs.ok, false);
  assert.match((r.obs as any).error, /not signed in/i);
});

test("step budget: loop stops at maxSteps and still returns a report", async () => {
  const tools = buildTools({ ai: fakeAi });
  const llm = scripted([call("get_market_trend", { role: "a1" }), call("get_market_trend", { role: "b2" }), call("get_market_trend", { role: "c3" }), call("get_market_trend", { role: "d4" }), FINAL]);
  const ev = await collect(runAgent({ goal: "g", ctx: mkCtx(), tools, modelName: "m", sleep: noSleep, llm, maxSteps: 3 }));
  assert.equal(ev.filter((e) => e.type === "step").length, 3);
  assert.equal(last(ev).partial, true);
});
