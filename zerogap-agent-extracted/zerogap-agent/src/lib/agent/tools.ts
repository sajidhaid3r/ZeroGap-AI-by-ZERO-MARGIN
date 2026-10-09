import { z } from "zod";
import { TransientError, type AgentCtx, type Tool, type ToolMap } from "./types";

/** Structured-JSON call into the open-weight model (the project's `callAI`). Injected so tests can mock it. */
export type AiFn = (opts: {
  system: string;
  user: string;
  tool: { name: string; description: string; parameters: any };
}) => Promise<any>;

export interface ToolDeps {
  ai: AiFn;
  fetchImpl?: typeof fetch;
}

// ───────────────────────── deterministic helpers (no LLM) ─────────────────────────

const SKILL_LEXICON = [
  "python", "java", "javascript", "typescript", "react", "next.js", "node.js", "express", "sql", "postgresql",
  "mongodb", "redis", "supabase", "aws", "docker", "kubernetes", "git", "linux", "c++", "rust", "go", "golang",
  "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy", "machine learning", "deep learning", "nlp",
  "computer vision", "opencv", "llm", "rag", "langchain", "fastapi", "flask", "django", "spring boot", "graphql",
  "rest api", "ci/cd", "streamlit", "tailwind", "flutter", "kotlin", "figma", "power bi", "tableau", "data structures",
  "algorithms", "cloudflare", "gemini", "prompt engineering", "vector database", "mlops",
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function extractSkills(text: string): string[] {
  const t = ` ${text.toLowerCase()} `;
  return SKILL_LEXICON.filter((k) => new RegExp(`(^|[^a-z0-9+#])${esc(k)}($|[^a-z0-9+#])`, "i").test(t));
}

export function matchSkills(resumeSkills: string[], jobSkills: string[]) {
  const have = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const matched = jobSkills.filter((s) => have.has(s.toLowerCase()));
  const missing = jobSkills.filter((s) => !have.has(s.toLowerCase()));
  const pct = jobSkills.length ? Math.round((matched.length / jobSkills.length) * 100) : 0;
  return { matched, missing, match_pct: pct };
}

// ───────────────────────── sample jobs (only when no live job API is configured) ─────────────────────────

const SAMPLE_JOBS = [
  { id: "sample-1", role: "Software Engineering Intern", company: "Google", city: "Bengaluru", url: "https://careers.google.com/jobs/results/?jex=Entry-Level", skills: ["python", "data structures", "algorithms"] },
  { id: "sample-2", role: "ML & AI Research Intern", company: "Swiggy", city: "Bengaluru", url: "https://careers.swiggy.com", skills: ["python", "tensorflow", "pytorch", "machine learning"] },
  { id: "sample-3", role: "Backend Developer (Fresher)", company: "Razorpay", city: "Bengaluru", url: "https://razorpay.com/jobs/", skills: ["node.js", "sql", "rest api", "docker"] },
];

// ───────────────────────── tool registry ─────────────────────────

export function buildTools({ ai, fetchImpl = fetch }: ToolDeps): ToolMap {
  const analyzeResume: Tool<{}> = {
    name: "analyze_resume",
    description: "Score the user's resume (ATS + trend alignment) and detect the skills it demonstrates. Uses the resume already provided; call this first.",
    argsHint: "{}",
    schema: z.object({}).passthrough(),
    timeoutMs: 30_000,
    retries: 1,
    async run(_args, ctx) {
      const text = ctx.resumeText.slice(0, 12_000);
      if (text.trim().length < 80) throw new Error("Resume text is too short to analyse. Ask the user to upload a complete resume.");
      const r = await ai({
        system: `You are an ATS analyst for ${new Date().getFullYear()} tech internships and entry-level jobs. Be honest and specific.`,
        user: `Analyse this resume:\n\n${text}`,
        tool: {
          name: "submit_analysis",
          description: "Submit ATS analysis",
          parameters: {
            type: "object",
            properties: {
              ats_score: { type: "number", description: "0-100" },
              trend_score: { type: "number", description: "0-100 alignment with current hiring trends" },
              summary: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
              detected_skills: { type: "array", items: { type: "string" }, description: "Skills clearly evidenced in the resume" },
              missing_keywords: { type: "array", items: { type: "string" } },
            },
            required: ["ats_score", "trend_score", "summary", "strengths", "weaknesses", "detected_skills", "missing_keywords"],
          },
        },
      });
      // Union the model's skills with a deterministic lexicon scan so one bad generation can't erase real skills.
      const skills = Array.from(new Set([...(r.detected_skills ?? []).map((s: string) => String(s).toLowerCase()), ...extractSkills(text)]));
      ctx.scratch.resumeSkills = skills;
      ctx.scratch.analysis = r;
      return { source: "model_estimate", data: { ...r, detected_skills: skills } };
    },
  };

  const marketTrend: Tool<{ role: string }> = {
    name: "get_market_trend",
    description: "Outlook for a tech role in India: demand direction, typical salary, must-have skills, hiring cities. Values are model estimates, not statistics.",
    argsHint: '{"role": "AI/ML Engineer"}',
    schema: z.object({ role: z.string().min(2).max(80) }),
    timeoutMs: 25_000,
    retries: 1,
    async run({ role }) {
      const r = await ai({
        system: "You are a tech labour-market analyst for India. Give realistic, cautious estimates.",
        user: `Entry-level outlook for: "${role}"`,
        tool: {
          name: "submit_trend",
          description: "Submit outlook",
          parameters: {
            type: "object",
            properties: {
              trend_direction: { type: "string", enum: ["rising_fast", "rising", "stable", "declining"] },
              avg_salary_inr_lakhs: { type: "number" },
              top_skills: { type: "array", items: { type: "string" } },
              top_cities: { type: "array", items: { type: "string" } },
              outlook: { type: "string" },
            },
            required: ["trend_direction", "avg_salary_inr_lakhs", "top_skills", "top_cities", "outlook"],
          },
        },
      });
      return { source: "model_estimate", data: r };
    },
  };

  const citySkills: Tool<{ city: string }> = {
    name: "get_city_skills",
    description: "Which skills local employers in a given Indian city ask for, plus remote-friendliness. Model estimates.",
    argsHint: '{"city": "Bengaluru"}',
    schema: z.object({ city: z.string().min(2).max(60) }),
    timeoutMs: 25_000,
    retries: 1,
    async run({ city }) {
      const r = await ai({
        system: "You are an India-focused tech labour-market analyst for undergraduate internships.",
        user: `Top in-demand skills for tech internships in ${city}, India.`,
        tool: {
          name: "submit_heatmap",
          description: "Submit city skill demand",
          parameters: {
            type: "object",
            properties: {
              hot_skills: { type: "array", items: { type: "string" }, description: "At most 8, most demanded first" },
              remote_friendly_pct: { type: "number" },
              top_companies: { type: "array", items: { type: "string" } },
              insight: { type: "string" },
            },
            required: ["hot_skills", "remote_friendly_pct", "top_companies", "insight"],
          },
        },
      });
      return { source: "model_estimate", data: r };
    },
  };

  const searchJobs: Tool<{ city: string; keyword: string }> = {
    name: "search_jobs",
    description: "Find real openings via the Adzuna job API when configured; otherwise returns clearly-labelled sample listings. Stores results so later tools can reference a job_id.",
    argsHint: '{"city": "Bengaluru", "keyword": "machine learning intern"}',
    schema: z.object({ city: z.string().min(2).max(60), keyword: z.string().min(2).max(80) }),
    timeoutMs: 12_000,
    retries: 2,
    async run({ city, keyword }, ctx) {
      const id = ctx.env.ADZUNA_APP_ID;
      const key = ctx.env.ADZUNA_APP_KEY;
      let jobs: any[] = [];
      let source: "live" | "sample" = "sample";
      if (id && key) {
        const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${id}&app_key=${key}&results_per_page=10&what=${encodeURIComponent(keyword)}&where=${encodeURIComponent(city)}`;
        const res = await fetchImpl(url).catch((e) => {
          throw new TransientError(`Job API unreachable: ${e?.message ?? e}`);
        });
        if (res.status >= 500) throw new TransientError(`Job API error ${res.status}`);
        if (!res.ok) throw new Error(`Job API rejected the request (${res.status}). Check ADZUNA_APP_ID / ADZUNA_APP_KEY.`);
        const data: any = await res.json();
        jobs = (data.results ?? []).slice(0, 8).map((j: any, i: number) => {
          const desc = String(j.description ?? "").replace(/<[^>]*>/g, "");
          const title = String(j.title ?? "").replace(/<[^>]*>/g, "");
          return {
            id: `adz-${j.id ?? i}`,
            role: title,
            company: j.company?.display_name ?? "Unknown company",
            city: j.location?.display_name?.split(",")[0] ?? city,
            url: j.redirect_url,
            skills: extractSkills(`${title} ${desc}`),
            snippet: desc.slice(0, 200),
          };
        });
        if (jobs.length) source = "live";
      }
      if (!jobs.length) jobs = SAMPLE_JOBS;
      ctx.scratch.jobs = Object.fromEntries(jobs.map((j) => [j.id, j]));
      return { source, data: { count: jobs.length, jobs, note: source === "sample" ? "No live job feed available; these are sample listings." : undefined } };
    },
  };

  const matchJob: Tool<{ job_id: string }> = {
    name: "match_resume_to_job",
    description: "Deterministic (non-LLM) comparison of the resume's skills against one job found by search_jobs. Returns matched and missing skills.",
    argsHint: '{"job_id": "adz-123"}',
    schema: z.object({ job_id: z.string().min(1) }),
    async run({ job_id }, ctx) {
      const job = ctx.scratch.jobs?.[job_id];
      if (!job) throw new Error(`Unknown job_id "${job_id}". Call search_jobs first and use an id from its result.`);
      if (!ctx.scratch.resumeSkills) throw new Error("Resume skills unknown. Call analyze_resume first.");
      return { source: "deterministic", data: { job_id, role: job.role, company: job.company, ...matchSkills(ctx.scratch.resumeSkills, job.skills ?? []) } };
    },
  };

  const githubEvidence: Tool<{ username?: string; skills: string[] }> = {
    name: "check_github_evidence",
    description: "Look at the user's public GitHub repos and report which skills have visible proof (repo language, topics, name, description).",
    argsHint: '{"username": "octocat", "skills": ["python", "docker"]}',
    schema: z.object({ username: z.string().optional(), skills: z.array(z.string()).min(1).max(15) }),
    timeoutMs: 10_000,
    retries: 1,
    async run({ username, skills }, ctx) {
      const user = (username || ctx.githubUsername || "").trim();
      if (!user) throw new Error("No GitHub username provided by the user. Skip this tool.");
      if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(user)) throw new Error("Invalid GitHub username.");
      const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (ctx.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${ctx.env.GITHUB_TOKEN}`;
      const res = await fetchImpl(`https://api.github.com/users/${user}/repos?per_page=50&sort=updated`, { headers }).catch((e) => {
        throw new TransientError(`GitHub unreachable: ${e?.message ?? e}`);
      });
      if (res.status === 404) throw new Error(`GitHub user "${user}" not found.`);
      if (res.status === 403 || res.status === 429) throw new Error("GitHub rate limit reached. Continue without repo evidence.");
      if (res.status >= 500) throw new TransientError(`GitHub error ${res.status}`);
      if (!res.ok) throw new Error(`GitHub returned ${res.status}.`);
      const repos: any[] = (await res.json()) as any[];
      const own = repos.filter((r) => !r.fork);
      const evidence: Record<string, string[]> = {};
      const none: string[] = [];
      for (const skill of skills) {
        const k = skill.toLowerCase();
        const hits = own
          .filter((r) => [r.language, r.name, r.description, ...(r.topics ?? [])].filter(Boolean).join(" ").toLowerCase().includes(k))
          .map((r) => r.name)
          .slice(0, 4);
        if (hits.length) evidence[skill] = hits;
        else none.push(skill);
      }
      const langs: Record<string, number> = {};
      own.forEach((r) => r.language && (langs[r.language] = (langs[r.language] ?? 0) + 1));
      return { source: "live", data: { username: user, original_repos: own.length, top_languages: langs, evidence, no_visible_evidence: none } };
    },
  };

  const roadmap: Tool<{ goal: string; focus_skills: string[] }> = {
    name: "generate_roadmap",
    description: "Create a short, time-boxed learning plan (max 6 tasks) that closes specific skill gaps with visible artifacts (repo, post, certificate).",
    argsHint: '{"goal": "ML intern at a Bengaluru startup", "focus_skills": ["pytorch", "docker"]}',
    schema: z.object({ goal: z.string().min(3).max(200), focus_skills: z.array(z.string()).min(1).max(6) }),
    timeoutMs: 30_000,
    retries: 1,
    async run({ goal, focus_skills }, ctx) {
      const r = await ai({
        system: "You design intensive 48-hour micro-roadmaps for undergraduates. Each task is concrete, time-boxed, and produces a visible artifact.",
        user: `Goal: ${goal}\nFocus skills: ${focus_skills.join(", ")}\nReturn at most 6 tasks.`,
        tool: {
          name: "submit_roadmap",
          description: "Submit roadmap",
          parameters: {
            type: "object",
            properties: {
              intro: { type: "string" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: { hour_block: { type: "number" }, title: { type: "string" }, description: { type: "string" } },
                  required: ["hour_block", "title", "description"],
                },
              },
            },
            required: ["intro", "tasks"],
          },
        },
      });
      r.tasks = (r.tasks ?? []).slice(0, 6);
      ctx.scratch.roadmap = r;
      return { source: "model_estimate", data: r };
    },
  };

  const draftNote: Tool<{ job_id: string }> = {
    name: "draft_cover_note",
    description: "Draft a short, honest cover note for one job, using only skills the resume actually shows. Draft only; nothing is sent.",
    argsHint: '{"job_id": "adz-123"}',
    schema: z.object({ job_id: z.string().min(1) }),
    timeoutMs: 25_000,
    retries: 1,
    async run({ job_id }, ctx) {
      const job = ctx.scratch.jobs?.[job_id];
      if (!job) throw new Error(`Unknown job_id "${job_id}". Call search_jobs first.`);
      const have: string[] = ctx.scratch.resumeSkills ?? [];
      const r = await ai({
        system: "You write concise, honest cover notes for student applicants. Never claim a skill that is not in the provided list.",
        user: `Job: ${job.role} at ${job.company}\nSkills the candidate really has: ${have.join(", ") || "(unknown)"}\nWrite under 110 words.`,
        tool: {
          name: "submit_note",
          description: "Submit note",
          parameters: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"] },
        },
      });
      ctx.scratch.drafts = { ...(ctx.scratch.drafts ?? {}), [job_id]: r };
      return { source: "model_estimate", data: r };
    },
  };

  const saveTracker: Tool<{ job_id: string }> = {
    name: "save_to_tracker",
    description: "Save a job (with its drafted cover note, if any) to the user's application tracker. Consequential: requires user approval.",
    argsHint: '{"job_id": "adz-123"}',
    schema: z.object({ job_id: z.string().min(1) }),
    requiresApproval: true,
    timeoutMs: 10_000,
    retries: 1,
    preview({ job_id }, ctx) {
      const job = ctx.scratch.jobs?.[job_id];
      return job ? { role: job.role, company: job.company, url: job.url, cover_note: ctx.scratch.drafts?.[job_id]?.body ?? null } : { job_id, warning: "Job not found in this run" };
    },
    async run({ job_id }, ctx) {
      const job = ctx.scratch.jobs?.[job_id];
      if (!job) throw new Error(`Unknown job_id "${job_id}".`);
      if (!ctx.userJwt) throw new Error("The user is not signed in, so nothing can be saved. Tell them to sign in.");
      const base = ctx.env.SUPABASE_URL;
      const apikey = ctx.env.SUPABASE_PUBLISHABLE_KEY;
      if (!base || !apikey) throw new Error("Supabase is not configured on the server.");
      const res = await fetchImpl(`${base}/rest/v1/agent_applications`, {
        method: "POST",
        headers: { apikey, Authorization: `Bearer ${ctx.userJwt}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ job_ref: job.id, role: job.role, company: job.company, url: job.url ?? null, cover_note: ctx.scratch.drafts?.[job_id]?.body ?? null }),
      }).catch((e) => {
        throw new TransientError(`Supabase unreachable: ${e?.message ?? e}`);
      });
      if (res.status >= 500) throw new TransientError(`Supabase error ${res.status}`);
      if (!res.ok) throw new Error(`Could not save (${res.status}). The agent_applications table may be missing or the session expired.`);
      return { source: "user_data", data: { saved: true, role: job.role, company: job.company } };
    },
  };

  const all = [analyzeResume, marketTrend, citySkills, searchJobs, matchJob, githubEvidence, roadmap, draftNote, saveTracker] as Tool[];
  return Object.fromEntries(all.map((t) => [t.name, t]));
}
