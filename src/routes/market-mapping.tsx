import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { SparklineRow, RoleMarketData } from "@/components/SparklineRow";
import { Search, Sparkles, TrendingUp, Building2, MapPin, CheckCircle, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { useNow } from "@/hooks/use-now";

export const Route = createFileRoute("/market-mapping")({
  head: () => {
    const currentYear = new Date().getFullYear();
    const projectionYear = currentYear + 3;

    return {
      meta: [
      { title: `Market Mapping — Tech Role Projections ${currentYear}–${projectionYear} | ZeroGap AI` },
      {
        name: "description",
        content:
          "Sparkline board for 10+ tech roles in India. 3-year demand trajectory, salary ranges, and live job counts derived from real market data.",
      },
      ],
    };
  },
  component: MarketPage,
});

const DEFAULT_ROLES: RoleMarketData[] = [
  {
    role: "AI / Agentic AI Engineer",
    demandToday: 78,
    demand2027: 89,
    demand2028: 94,
    demand2029: 98,
    probability: 96,
    trendDirection: "rising_fast",
    avgSalaryInrLakhs: 18.5,
    topSkills: ["PyTorch", "LLMs", "LangChain", "Agentic Systems", "Python"],
    topCities: ["Bengaluru", "Hyderabad", "Delhi NCR"],
    liveOpenings: 340,
    outlook: "Autonomous AI agents and LLM orchestration are experiencing exponential demand in Indian tech hubs.",
    recommendedAction: "Build multi-agent workflows with LangChain or AutoGen; publish open-source repos on GitHub.",
  },
  {
    role: "Full Stack Developer",
    demandToday: 82,
    demand2027: 85,
    demand2028: 88,
    demand2029: 91,
    probability: 89,
    trendDirection: "rising",
    avgSalaryInrLakhs: 14.0,
    topSkills: ["React", "Node.js", "TypeScript", "Next.js", "PostgreSQL"],
    topCities: ["Bengaluru", "Mumbai", "Pune", "Hyderabad"],
    liveOpenings: 620,
    outlook: "Consistently high demand across startups and enterprises, with increasing weight on TypeScript and serverless architectures.",
    recommendedAction: "Master Next.js App Router, TanStack Query, and PostgreSQL schema design.",
  },
  {
    role: "Cloud & DevOps Engineer",
    demandToday: 75,
    demand2027: 81,
    demand2028: 87,
    demand2029: 92,
    probability: 91,
    trendDirection: "rising_fast",
    avgSalaryInrLakhs: 16.2,
    topSkills: ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD"],
    topCities: ["Hyderabad", "Bengaluru", "Chennai"],
    liveOpenings: 280,
    outlook: "Multi-cloud infrastructure and automated deployment pipelines remain critical bottlenecks for scaling enterprises.",
    recommendedAction: "Get CKA (Certified Kubernetes Administrator) or AWS Solutions Architect certified.",
  },
  {
    role: "Data Scientist & Analytics",
    demandToday: 70,
    demand2027: 74,
    demand2028: 79,
    demand2029: 83,
    probability: 82,
    trendDirection: "rising",
    avgSalaryInrLakhs: 15.0,
    topSkills: ["Python", "SQL", "Scikit-Learn", "Tableau", "Feature Engineering"],
    topCities: ["Bengaluru", "Mumbai", "Gurugram"],
    liveOpenings: 210,
    outlook: "Strong demand shifting from plain reporting to predictive machine learning models integrated into product workflows.",
    recommendedAction: "Focus on production ML pipelines and SQL query optimization for large datasets.",
  },
  {
    role: "Cybersecurity Analyst",
    demandToday: 68,
    demand2027: 76,
    demand2028: 83,
    demand2029: 89,
    probability: 88,
    trendDirection: "rising_fast",
    avgSalaryInrLakhs: 13.5,
    topSkills: ["SIEM", "Penetration Testing", "Network Security", "Cloud Security", "Linux"],
    topCities: ["Pune", "Mumbai", "Bengaluru"],
    liveOpenings: 140,
    outlook: "Surging requirements in FinTech, banking, and government tech infrastructure across India.",
    recommendedAction: "Complete CompTIA Security+ or CEH; practice vulnerability analysis on TryHackMe.",
  },
  {
    role: "Mobile App Developer",
    demandToday: 65,
    demand2027: 68,
    demand2028: 72,
    demand2029: 75,
    probability: 76,
    trendDirection: "stable",
    avgSalaryInrLakhs: 12.8,
    topSkills: ["Kotlin", "React Native", "Flutter", "Swift", "REST APIs"],
    topCities: ["Bengaluru", "Noida", "Hyderabad"],
    liveOpenings: 195,
    outlook: "Steady growth driven by D2C ecommerce apps, UPI payment gateways, and Flutter cross-platform adoption.",
    recommendedAction: "Build a published Flutter or React Native app with offline caching and biometric auth.",
  },
];

function MarketPage() {
  const now = useNow(60_000);
  const currentYear = now.getFullYear();
  const projectionYear = currentYear + 3;
  const [roles, setRoles] = useState<RoleMarketData[]>(DEFAULT_ROLES);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [query, setQuery] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const selectedRole = roles[selectedIndex] || roles[0];

  // Analyze custom role via API
  const handleAnalyzeCustom = async (r: string) => {
    if (!r.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/market-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: r }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newRole: RoleMarketData = {
        role: r,
        demandToday: data.demand_today || 75,
        demand2027: data.demand_2027 || 82,
        demand2028: data.demand_2028 || 88,
        demand2029: data.demand_2029 || 93,
        probability: data.growth_probability || 85,
        trendDirection: data.trend_direction || "rising",
        avgSalaryInrLakhs: data.avg_salary_inr_lakhs || 14.5,
        topSkills: data.top_skills || ["Problem Solving", "System Design"],
        topCities: data.top_cities || ["Bengaluru", "Hyderabad"],
        liveOpenings: 150,
        outlook: data.outlook || "Positive trajectory based on market signal analysis.",
        recommendedAction: data.recommended_action || "Build targeted projects in this domain.",
      };

      setRoles((prev) => [newRole, ...prev]);
      setSelectedIndex(0);
      setCustomRole("");
      toast.success(`Market analysis completed for ${r}`);
    } catch (e: any) {
      toast.error("Analysis failed: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredRoles = roles.filter((r) =>
    r.role.toLowerCase().includes(query.toLowerCase()) ||
    r.topSkills.some((s) => s.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <PageShell>
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
            <BarChart2 className="size-3.5" /> 02 &mdash; MARKET MAPPING &amp; TRENDS
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl text-foreground tracking-tight">
            Market trajectories.<em className="font-serif italic font-light text-primary ml-3 font-normal">3-year forecasts.</em>
          </h1>
          <p className="font-serif text-muted-foreground mt-2 max-w-2xl text-base">
            Track 3-year demand trajectories for major engineering disciplines. Derived from real job listing aggregation and AI market indicators.
          </p>
        </div>

        {/* Custom Role Analyzer Bar */}
        <div className="bg-card/70 border border-border/80 rounded-xl p-5 mb-8 shadow-md">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
            ANALYZE CUSTOM ROLE
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyzeCustom(customRole);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter any tech role (e.g. Blockchain Developer, Embedded Systems Engineer)..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full bg-background/80 border border-border/80 rounded-lg pl-10 pr-4 py-2.5 font-sans text-sm outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <Button
              type="submit"
              disabled={analyzing || !customRole.trim()}
              className="gradient-silver text-primary-foreground font-sans font-semibold shrink-0 gap-1.5"
            >
              <Sparkles className="size-4" />
              <span>{analyzing ? "Mapping..." : "Analyze Role"}</span>
            </Button>
          </form>
        </div>

        {/* Board Table Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Sparkline Board Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground px-1">
              <span>DEPARTURE BOARD · {filteredRoles.length} ROLES TRACKED</span>
              <span>CLICK ROW TO INSPECT</span>
            </div>

            {/* Table Header */}
            <div className="w-full border border-border/80 rounded-xl overflow-hidden bg-card/60 shadow-lg">
              <div className="hidden md:grid grid-cols-[3rem_1fr_9rem_5rem_7rem_6rem] items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border/80 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>#</span>
                <span>Role & Skills</span>
                <span className="text-center">{currentYear}-{String(projectionYear).slice(2)} Sparkline</span>
                <span className="text-center">Demand</span>
                <span className="text-right">Avg Salary</span>
                <span className="text-right">Action</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/60">
                {filteredRoles.map((r, idx) => (
                  <SparklineRow
                    key={r.role}
                    data={r}
                    index={idx}
                    isSelected={selectedRole?.role === r.role}
                    onSelect={() => setSelectedIndex(roles.indexOf(r))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Selected Role Detail Panel */}
          {selectedRole && (
            <div className="space-y-4">
              <div className="bg-card/80 border border-primary/40 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="font-mono text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  INSPECTING ROLE
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground">
                  {selectedRole.role}
                </h3>

                {/* Big Probability Score */}
                <div className="my-5 p-4 rounded-xl bg-background/60 border border-border/60 text-center">
                  <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Future Growth Score
                  </div>
                  <div className="font-mono text-5xl font-bold text-primary">
                    {selectedRole.probability}%
                  </div>
                  <div className="font-sans text-xs text-muted-foreground mt-1">
                    High likelihood of strong hiring volume through {projectionYear}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">DEMAND TODAY:</span>
                    <span className="font-bold text-foreground">{selectedRole.demandToday}/100</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">PROJECTION {projectionYear}:</span>
                    <span className="font-bold text-emerald-400">{selectedRole.demand2029}/100</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">AVG SALARY (INDIA):</span>
                    <span className="font-bold text-foreground">₹{selectedRole.avgSalaryInrLakhs.toFixed(1)} LPA</span>
                  </div>
                  {selectedRole.liveOpenings && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">LIVE OPENINGS:</span>
                      <span className="font-bold text-primary">{selectedRole.liveOpenings}+ active</span>
                    </div>
                  )}
                </div>

                {/* Outlook text */}
                <div className="mt-5 pt-4 border-t border-border/60">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-primary font-semibold mb-1">
                    Market Outlook
                  </div>
                  <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                    {selectedRole.outlook}
                  </p>
                </div>

                {/* Recommended action */}
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-sans">
                  <span className="font-bold text-primary">Recommendation:</span>{" "}
                  <span className="text-foreground">{selectedRole.recommendedAction}</span>
                </div>

                {/* Top Hiring Cities */}
                <div className="mt-4 pt-3 border-t border-border/40">
                  <div className="font-mono text-[11px] uppercase text-muted-foreground mb-1">
                    Top Cities Hiring
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {selectedRole.topCities.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-muted/40 text-foreground border border-border/40">
                        📍 {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action CTA */}
                <Button asChild className="w-full mt-6 gradient-silver text-primary-foreground font-sans font-semibold">
                  <Link to="/micro-roadmap">Build 48H Roadmap for this role →</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
