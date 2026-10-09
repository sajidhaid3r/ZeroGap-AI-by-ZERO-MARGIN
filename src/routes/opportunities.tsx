import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { localDb } from "@/lib/local-db";
import { TickerStrip } from "@/components/TickerStrip";
import { BoardTable, BoardRowItem } from "@/components/BoardTable";
import { JobListing } from "./api.jobs";
import { Search, Sparkles, GraduationCap, RefreshCw, X, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities Board — Live Internships & Tech Roles | ZeroGap AI" },
      {
        name: "description",
        content:
          "Departures-board style job explorer for Indian undergraduates. Real-time synced listings, deep-linked application pages, and ATS match diagnostics.",
      },
    ],
  }),
  component: OpportunitiesPage,
});

const CITIES = [
  "All Cities",
  "Bengaluru",
  "Hyderabad",
  "Mumbai",
  "Pune",
  "Delhi NCR",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Remote",
];

const DOMAINS = [
  "All Domains",
  "AI / ML",
  "Web Development",
  "Data Science",
  "Cloud / DevOps",
  "Cybersecurity",
  "Mobile Dev",
  "UI/UX Design",
  "FinTech",
];

type EmpType = "Full-Time" | "Remote" | "Hybrid" | "Internship";
const EMP_TYPES: EmpType[] = ["Full-Time", "Remote", "Hybrid", "Internship"];

function OpportunitiesPage() {
  const { user } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [city, setCity] = useState("All Cities");
  const [domain, setDomain] = useState("All Domains");
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<EmpType[]>([]);
  const [sortBy, setSortBy] = useState<"latest" | "pay" | "fit">("latest");
  const [resumeKeywords, setResumeKeywords] = useState<string[]>([]);

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("LIVE · Syncing...");

  // Load user resume keywords for ATS match
  useEffect(() => {
    if (!user) return;
    const analyses = localDb.getAnalyses(user.id);
    const latest = analyses[0];
    if (!latest) return;
    const strengths = (latest.strengths as string[] | null) ?? [];
    setResumeKeywords(strengths.map((s) => s.toLowerCase()));
  }, [user]);

  // Press / to focus filter search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch real jobs from /api/jobs
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city !== "All Cities" ? city : undefined,
          domain: domain !== "All Domains" ? domain : undefined,
          type: activeTypes.length > 0 ? activeTypes : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobs(data.jobs || []);
      if (data.lastUpdated) setLastUpdated(data.lastUpdated);
    } catch (e: any) {
      toast.error("Error syncing listings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [city, domain, activeTypes]);

  const toggleType = (t: EmpType) => {
    setActiveTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const resetFilters = () => {
    setCity("All Cities");
    setDomain("All Domains");
    setQuery("");
    setActiveTypes([]);
  };

  // Calculate ATS match
  const calcMatch = (skills: string[]): number | null => {
    if (!resumeKeywords.length) return null;
    const hits = skills.filter((s) =>
      resumeKeywords.some((k) => k.includes(s.toLowerCase()) || s.toLowerCase().includes(k))
    ).length;
    return Math.round((hits / skills.length) * 100);
  };

  // Client filtering & sorting
  const processedJobs = useMemo(() => {
    let list = jobs.filter((j) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesRole = j.role.toLowerCase().includes(q);
        const matchesCompany = j.company.toLowerCase().includes(q);
        const matchesSkill = j.skills.some((s) => s.toLowerCase().includes(q));
        if (!matchesRole && !matchesCompany && !matchesSkill) return false;
      }
      return true;
    });

    if (sortBy === "pay") {
      const num = (p: string) => parseInt(p.replace(/[^\d]/g, "")) || 0;
      list = [...list].sort((a, b) => num(b.pay) - num(a.pay));
    }
    return list;
  }, [jobs, query, sortBy]);

  // Convert to BoardRowItem format for BoardTable
  const boardRows: BoardRowItem[] = processedJobs.map((j) => ({
    id: j.id,
    role: j.role,
    company: j.company,
    city: j.city,
    type: j.type,
    status: j.type === "Internship" ? "internship" : j.type === "Remote" ? "remote" : "open",
    pay: j.pay,
    posted: j.posted,
    url: j.url,
    skills: j.skills,
    matchScore: calcMatch(j.skills),
    deadline: j.deadline,
  }));

  const tickerItems = processedJobs.slice(0, 8).map((j) => ({
    code: j.city.slice(0, 3).toUpperCase(),
    label: `${j.company} · ${j.role}`,
    info: j.pay,
  }));

  return (
    <PageShell>
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        {/* Header Title */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              01 &mdash; DEPARTURES BOARD
            </div>
            <h1 className="font-display font-black text-4xl md:text-6xl text-foreground tracking-tight">
              Pick a role.<em className="font-serif italic font-light text-primary ml-3 font-normal">We&rsquo;ll pack the rest.</em>
            </h1>
            <p className="font-serif text-muted-foreground mt-2 max-w-xl text-base">
              Real-time synced internships and entry-level tech roles across India. Every link connects directly to official application portals.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
              className="gap-1.5 font-mono text-xs border-border/80 rounded-sm uppercase tracking-wider"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Board</span>
            </Button>
          </div>
        </div>

        {/* Command Bar & Active Filter Bar */}
        <div className="bg-card/70 border border-border/80 rounded-xl p-4 mb-6 shadow-md">
          {/* Quick Command Filter Bar */}
          <div className="relative mb-4">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Press '/' to filter by role, company, or skill (e.g. React, Swiggy)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-background/80 border border-border/80 rounded-lg pl-10 pr-9 py-2.5 font-sans text-sm outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/10 transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter Selects & Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
                City / Region
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 font-sans text-sm text-foreground focus:border-primary/60 focus:outline-none"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
                Domain / Field
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 font-sans text-sm text-foreground focus:border-primary/60 focus:outline-none"
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 font-sans text-sm text-foreground focus:border-primary/60 focus:outline-none"
              >
                <option value="latest">Latest Synced</option>
                <option value="pay">Highest Pay / Stipend</option>
              </select>
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="font-mono text-[11px] uppercase text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="size-3" /> Type:
              </span>
              <button
                onClick={() => setActiveTypes([])}
                className={`px-3 py-1 rounded-full font-mono text-xs border transition ${
                  activeTypes.length === 0
                    ? "bg-primary/10 text-primary border-primary/50 font-bold"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                ALL TYPES
              </button>
              {EMP_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`px-3 py-1 rounded-full font-mono text-xs border transition ${
                    activeTypes.includes(t)
                      ? "bg-primary/10 text-primary border-primary/50 font-bold"
                      : "border-border/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {(city !== "All Cities" || domain !== "All Domains" || query || activeTypes.length > 0) && (
              <button
                onClick={resetFilters}
                className="font-mono text-xs text-primary hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Board Count Indicator */}
        <div className="flex items-center justify-between mb-4 font-mono text-xs text-muted-foreground">
          <div>
            SHOWING <span className="text-foreground font-bold">{boardRows.length}</span> DEPARTURE
            {boardRows.length === 1 ? "" : "S"}
          </div>
          <div className="hidden sm:block">DATA SOURCED LIVE FROM ADZUNA & RECRUITER FEEDS</div>
        </div>

        {/* Board Table */}
        <BoardTable items={boardRows} emptyMessage="No listings match your search query or filters. Try resetting filters." />

        {/* CTA banner for logged out users */}
        {!user && (
          <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="size-5 text-primary shrink-0" />
              <div>
                <div className="font-sans font-bold text-foreground">Scan your resume to unlock ATS Match Scores</div>
                <div className="text-xs text-muted-foreground">
                  See instant match percentages on every row of the departures board.
                </div>
              </div>
            </div>
            <Button asChild size="sm" className="gradient-silver text-primary-foreground font-sans font-semibold">
              <Link to="/auth">Sign In Free →</Link>
            </Button>
          </div>
        )}
      </section>
    </PageShell>
  );
}
