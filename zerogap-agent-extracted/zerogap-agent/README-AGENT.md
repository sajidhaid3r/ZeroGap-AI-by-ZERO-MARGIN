# ZeroGap Career Gap Agent

An open-source AI **agent** for the Hacktoberfest Hack Day Bengaluru '26, Track 2, PS 03
(*Open-Source AI Agent for Real-World Operations*), built on top of ZeroGap AI.

A student gives a resume, a target role and a city. An open-weight model then **chooses its own sequence of tools**,
reads the results, adapts, and finishes with a plan. It asks for approval before anything is saved.

```
 goal ──► decide (LLM → JSON action) ──► validate (zod) ──► run tool ──► observe ──┐
              ▲                                                                   │
              └─────────────────────── history + provenance ◄─────────────────────┘
                  approval gate (save_to_tracker) · retries · step cap · fallback report
```

## What the agent can do

| Tool | Kind | Data source |
|---|---|---|
| `analyze_resume` | LLM + lexicon scan | model estimate |
| `get_market_trend`, `get_city_skills` | LLM | model estimate |
| `search_jobs` | Adzuna API | **live** (or clearly labelled sample if no keys) |
| `match_resume_to_job` | deterministic skill overlap | rule-based |
| `check_github_evidence` | GitHub REST API | **live** |
| `generate_roadmap`, `draft_cover_note` | LLM | model estimate |
| `save_to_tracker` | Supabase insert (RLS) | **needs user approval** |

Every observation carries a **source tag**. The UI shows it on each step and the final report summarises what to trust.

## Reliability, tested in `tests/agent.test.ts` (12 tests, scripted fake model + mocked network)

- Invalid or non-JSON model output → one automatic repair attempt, then an honest partial report (never a crash).
- Transient tool failures (5xx, network, timeout) → retried with backoff. Permanent ones (404, bad key) are **not** retried and are fed back to the model so it adapts.
- Tool args validated with zod; unknown tools and duplicate calls are rejected with a corrective message.
- Hard step cap; on exhaustion the agent still returns a report assembled from real tool results.
- Approval gate: `save_to_tracker` performs **no side effect** until the user approves (tested). Rejection is fed back as "do not retry".
- Caveats about estimates and sample data are added automatically even if the model forgets.

Run them: `bun add -d tsx && npx tsx --test tests/agent.test.ts`

## Integrate into ZeroGap (copy, no existing file is modified except one nav line)

1. Copy `src/lib/agent/`, `src/routes/api.agent.ts`, `src/routes/agent.tsx`, `tests/`, `LICENSE`, `README-AGENT.md`.
2. Add to `navItems` in `src/components/Navbar.tsx`: `{ to: "/agent" as const, label: "Agent" },`
3. Run `supabase/migrations/20261010000000_agent_applications.sql` in your Supabase project (RLS: users see only their rows).
4. Add the variables from `.env.agent.example` to `.env` / your Cloudflare Worker secrets.
5. `bun dev`. TanStack regenerates `routeTree.gen.ts` automatically. Open `/agent`.

## Open-weight model

`src/lib/agent/llm.server.ts` speaks the OpenAI-compatible chat API, so the same agent runs on Groq (default,
Qwen) or fully local through Ollama / vLLM by changing `AGENT_LLM_BASE_URL` and `AGENT_LLM_MODEL`.
Confirm the exact model's license on its model card and name it in your submission README.

## Known limitations (say these out loud in the demo)

- Market-trend and city-skill outputs are **model estimates**, not statistics.
- Approval resume is stateless: the client echoes run state back. A production version should store runs server-side or sign the state. Worst case today, a user can only affect their own tracker rows (RLS).
- No per-user rate limiting on `/api/agent` yet.
- Without Adzuna keys, job results are sample listings (labelled as such).

## Hack Day compliance checklist

- [ ] Public GitHub repo with this LICENSE and a README stating model + key dependencies
- [ ] 2–4 team members, each registered individually on the MLH portal
- [ ] **Built during the Hack Day**: see the note in the hand-off message; disclose or rebuild on the day
- [ ] No `.env`, `.dev.vars`, `venv/`, `dist/`, `.wrangler/` or `resume_analyzer.db` committed
