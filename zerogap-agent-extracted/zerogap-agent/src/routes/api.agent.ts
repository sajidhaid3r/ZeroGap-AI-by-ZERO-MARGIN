import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { callAI } from "@/lib/ai.server";
import { buildTools } from "@/lib/agent/tools";
import { runAgent } from "@/lib/agent/loop";
import { makeLlm } from "@/lib/agent/llm.server";
import type { AgentCtx, AgentEvent } from "@/lib/agent/types";

const bodySchema = z.object({
  resumeText: z.string().min(80, "Resume text is too short").max(15_000),
  targetRole: z.string().min(2).max(80),
  city: z.string().min(2).max(60),
  githubUsername: z.string().max(39).optional().or(z.literal("")),
  // Present when the user is answering an approval prompt.
  resume: z
    .object({
      decision: z.enum(["approve", "reject"]),
      pending: z.object({ thought: z.string().default(""), tool: z.string(), args: z.record(z.any()).default({}) }),
      history: z.array(z.any()).max(20),
      scratch: z.record(z.any()).optional(),
    })
    .optional(),
});

/**
 * POST /api/agent  → text/event-stream
 * Each SSE message is one AgentEvent (start, thinking, repair, step, needs_approval, final, fatal).
 */
export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch (e: any) {
          const msg = e?.issues?.[0]?.message ?? "Invalid request";
          return Response.json({ error: msg }, { status: 400 });
        }

        const env = process.env as Record<string, string | undefined>;
        const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || undefined;
        const { llm, model } = makeLlm(env);
        const tools = buildTools({ ai: callAI as any });
        const ctx: AgentCtx = {
          resumeText: body.resumeText,
          targetRole: body.targetRole,
          city: body.city,
          githubUsername: body.githubUsername || undefined,
          userJwt: jwt,
          env,
          scratch: {},
        };
        const goal = `Make this student hireable for "${body.targetRole}" roles in ${body.city}: find their real skill gaps, find matching openings, and propose concrete next steps.`;

        const encoder = new TextEncoder();
        let cancelled = false;
        const stream = new ReadableStream({
          async start(controller) {
            const send = (e: AgentEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
            try {
              for await (const ev of runAgent({ goal, ctx, tools, llm, modelName: model, resume: body.resume as any })) {
                if (cancelled) break;
                send(ev);
              }
            } catch (e: any) {
              send({ type: "fatal", error: e?.message ?? "The agent crashed unexpectedly." });
            } finally {
              controller.close();
            }
          },
          cancel() {
            cancelled = true;
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
        });
      },
    },
  },
});
