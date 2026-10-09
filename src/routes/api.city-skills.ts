import { createFileRoute } from "@tanstack/react-router";
import { callAI } from "@/lib/ai.server";

export const Route = createFileRoute("/api/city-skills")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { city } = await request.json();
          if (!city) return Response.json({ error: "City required" }, { status: 400 });
          const currentYear = new Date().getFullYear();

          const result = await callAI({
            system: `You are an India-focused tech labor-market analyst. Provide realistic, current data on skill demand, opportunity volume, and remote/hybrid availability per city. Tailor for undergraduate students seeking internships.`,
            user: `Generate a skill heatmap for tech opportunities in ${city}, India for ${currentYear}.`,
            tool: {
              name: "submit_heatmap",
              description: "Submit city skill heatmap",
              parameters: {
                type: "object",
                properties: {
                  hot_skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        demand_score: { type: "number", description: "Demand score 0-100" },
                        avg_openings: { type: "number", description: "Approx monthly openings" },
                      },
                      required: ["skill", "demand_score", "avg_openings"],
                    },
                  },
                  remote_friendly_pct: { type: "number", description: "% of internships in this city that are remote/hybrid (great for students with classes)" },
                  top_companies: { type: "array", items: { type: "string" } },
                  insight: { type: "string", description: "2-3 sentence locality insight including class-friendly tips" },
                },
                required: ["hot_skills", "remote_friendly_pct", "top_companies", "insight"],
              },
            },
          });
          return Response.json(result);
        } catch (e: any) {
          console.error("city-skills error:", e);
          return Response.json({ error: e.message ?? "Failed" }, { status: 500 });
        }
      },
    },
  },
});
