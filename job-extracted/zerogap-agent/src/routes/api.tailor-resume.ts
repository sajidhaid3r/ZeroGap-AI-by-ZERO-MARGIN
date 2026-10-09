import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { makeLlm } from "@/lib/agent/llm.server";
import { inferCompany } from "@/lib/tailor/company";
import { runCheck, runIntake, runRevise, runTailor } from "@/lib/tailor/service";

const text = (max: number, min = 0) => z.string().max(max).min(min);

const common = {
  resumeText: text(15_000, 80), // the uploaded file's text: the source of truth
  role: text(80, 2),
  company: text(80).default(""),
  url: text(300).optional().or(z.literal("")),
  jd: text(8_000).default(""),
};

const answersSchema = z.object({
  scope: z.array(text(80)).max(6),
  depth: text(120),
  company_type: text(60),
  length: text(60),
  keep: text(500).optional(),
});

const bodySchema = z.discriminatedUnion("phase", [
  z.object({ phase: z.literal("intake"), ...common }),
  z.object({ phase: z.literal("check"), ...common }),
  z.object({ phase: z.literal("generate"), ...common, answers: answersSchema }),
  z.object({
    phase: z.literal("revise"),
    ...common,
    currentResume: text(15_000, 80),
    request: text(1_000, 3),
    answers: answersSchema.optional(),
  }),
]);

/**
 * POST /api/tailor-resume
 *   intake   → company understanding + the clarifying questions (as options)
 *   generate → first tailored version (needs the answers)
 *   revise   → apply one more change to the latest version
 *   check    → ATS score and trend alignment only; the resume is not modified
 * The client keeps the conversation; nothing is stored on the server.
 */
export const Route = createFileRoute("/api/tailor-resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch (e: any) {
          return Response.json({ error: e?.issues?.[0]?.message ?? "Invalid request" }, { status: 400 });
        }
        if ((body.phase === "generate") && body.jd.trim().length < 10) {
          return Response.json({ error: "Add the job description or tell me what to change." }, { status: 400 });
        }

        const { llm } = makeLlm(process.env as Record<string, string | undefined>);
        const base = { originalResume: body.resumeText, jd: body.jd, role: body.role, company: body.company, url: body.url || undefined };

        try {
          switch (body.phase) {
            case "intake":
              return Response.json(await runIntake({ company: body.company, url: body.url || undefined }, llm));
            case "generate":
              return Response.json(await runTailor({ ...base, currentResume: body.resumeText }, body.answers, llm));
            case "revise":
              return Response.json(await runRevise({ ...base, currentResume: body.currentResume }, body.request, body.answers, llm));
            case "check": {
              const company = body.company || body.url ? await inferCompany({ name: body.company, url: body.url || undefined }, llm) : null;
              return Response.json({ company, result: await runCheck(base, company, llm) });
            }
          }
        } catch (e: any) {
          console.error("tailor-resume error:", e);
          return Response.json({ error: e?.message ?? "Something went wrong. Please try again." }, { status: 502 });
        }
      },
    },
  },
});
