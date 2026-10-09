import { createFileRoute } from "@tanstack/react-router";
import { callAI } from "@/lib/ai.server";

export const Route = createFileRoute("/api/analyze-resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { text, fileName } = await request.json();
          if (!text || typeof text !== "string") {
            return Response.json({ error: "No resume text provided" }, { status: 400 });
          }
          const truncated = text.slice(0, 12000);
          const currentYear = new Date().getFullYear();

          const result = await callAI({
            system: `You are an expert ATS (Applicant Tracking System) analyzer for ${currentYear} tech internships and entry-level jobs. Analyze resumes for: keyword optimization, action verbs, quantified impact, current trending skills (Agentic AI, RAG, LLMs, Rust, Edge Computing, FinTech, Cybersecurity), formatting, and recruiter-readiness. Be honest and specific.`,
            user: `Analyze this resume (file: ${fileName}):\n\n${truncated}`,
            tool: {
              name: "submit_analysis",
              description: "Submit ATS analysis results",
              parameters: {
                type: "object",
                properties: {
                  ats_score: { type: "number", description: "ATS-friendliness score 0-100" },
                  trend_score: { type: "number", description: `How aligned with ${currentYear} market trends 0-100` },
                  summary: { type: "string", description: "2-3 sentence overall assessment" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  suggestions: { type: "array", items: { type: "string" }, description: "Concrete, actionable improvements" },
                  missing_keywords: { type: "array", items: { type: "string" }, description: `Trending ${currentYear} keywords missing from resume` },
                },
                required: ["ats_score", "trend_score", "summary", "strengths", "weaknesses", "suggestions", "missing_keywords"],
              },
            },
          });

          return Response.json(result);
        } catch (e: any) {
          console.error("analyze-resume error:", e);
          return Response.json({ error: e.message ?? "Analysis failed" }, { status: 500 });
        }
      },
    },
  },
});
