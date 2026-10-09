import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { TickerStrip } from "@/components/TickerStrip";
import { BoardTable, BoardRowItem } from "@/components/BoardTable";
import { JobListing } from "./api.jobs";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MapPin, Loader2, Building2, Wifi, Search, X, Briefcase, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/localized-intelligence")({
  head: () => ({
    meta: [
      { title: "Localized Intelligence — City Tech Heatmap & Internships | ZeroGap AI" },
      {
        name: "description",
        content:
          "City-level hiring intelligence for Indian college students. Localized skill heatmaps, remote percentages, and live internship listings with explicit application deadlines.",
      },
    ],
  }),
  component: LocalizedPage,
});

const CITIES = ["Bengaluru", "Hyderabad", "Mumbai", "Pune", "Delhi NCR", "Chennai", "Kolkata", "Ahmedabad"];

const ALL_CITIES = [
  "Agartala","Agra","Ahmedabad","Aizawl","Ajmer","Aligarh","Allahabad","Alwar","Ambala",
  "Amravati","Amritsar","Anand","Anantapur","Asansol","Aurangabad","Bareilly","Bengaluru",
  "Bhilai","Bhiwandi","Bhopal","Bhubaneswar","Bikaner","Bilaspur","Chandigarh","Chennai",
  "Coimbatore","Cuttack","Dehradun","Delhi NCR","Dhanbad","Dharamshala","Dibrugarh",
  "Durgapur","Erode","Faridabad","Ghaziabad","Gandhinagar","Goa","Gorakhpur","Gurugram",
  "Guwahati","Gwalior","Haridwar","Hisar","Hubli","Hyderabad","Imphal","Indore","Itanagar",
  "Jabalpur","Jaipur","Jalandhar","Jamnagar","Jamshedpur","Jhansi","Jodhpur","Jorhat",
  "Kalaburagi","Kanpur","Kakinada","Karnal","Kochi","Kohima","Kolkata","Kota","Kozhikode",
  "Lucknow","Ludhiana","Madurai","Mangaluru","Meerut","Moradabad","Mumbai","Mussoorie",
  "Mysuru","Nagpur","Nainital","Nashik","Noida","Panaji","Patna","Pune","Raipur","Ranchi",
  "Rajkot","Rishikesh","Rohtak","Roorkee","Saharanpur","Salem","Shimla","Siliguri",
  "Silchar","Srinagar","Surat","Thane","Thiruvananthapuram","Thrissur","Tirupati",
  "Tiruchirappalli","Udaipur","Ujjain","Vadodara","Varanasi","Vijayawada","Visakhapatnam",
  "Warangal",
];

const ALL_SKILLS = ["Java", "Python", "React", "ML", "AWS", "Android", "Node.js", "TypeScript", "Kotlin", "DSA"];

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

type Heatmap = {
  hot_skills: { skill: string; demand_score: number; avg_openings: number }[];
  remote_friendly_pct: number;
  top_companies: string[];
  insight: string;
};

function LocalizedPage() {
  const [city, setCity] = useState<string>("Bengaluru");
  const [data, setData] = useState<Heatmap | null>(null);
  const [loading, setLoading] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [activeSkills, setActiveSkills] = useState<string[]>([]);

  // Real job listings state
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("LIVE · Synced");

  const handleCityInput = (val: string) => {
    setInputValue(val);
    if (!val.trim()) { setShowSuggestions(false); setFilteredCities([]); return; }
    const results = ALL_CITIES.filter((c) => c.toLowerCase().includes(val.toLowerCase())).slice(0, 8);
    setFilteredCities(results);
    setShowSuggestions(results.length > 0);
    setHighlighted(-1);
  };

  const pickCity = (c: string) => {
    setInputValue(c);
    setShowSuggestions(false);
    loadCity(c);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filteredCities.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && filteredCities[highlighted]) pickCity(filteredCities[highlighted]);
      else if (inputValue.trim()) pickCity(inputValue.trim());
    } else if (e.key === "Escape") { setShowSuggestions(false); }
  };

  const toggleSkill = (skill: string) => {
    setActiveSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const loadCity = async (c: string) => {
    setCity(c);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/city-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: c }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real jobs for selected city
  const fetchLocalJobs = async (selectedCity: string) => {
    setJobsLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: selectedCity }),
      });
      const resData = await res.json();
      if (resData.jobs) {
        setJobListings(resData.jobs);
      }
      if (resData.lastUpdated) setLastUpdated(resData.lastUpdated);
    } catch (err) {
      console.error("Error fetching local jobs:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    loadCity("Bengaluru");
  }, []);

  useEffect(() => {
    if (city) {
      fetchLocalJobs(city);
    }
  }, [city]);

  // Filter local jobs by active skill pills
  const filteredListings = jobListings.filter((j) => {
    if (activeSkills.length === 0) return true;
    return activeSkills.some((s) =>
      j.skills.some((js) => js.toLowerCase().includes(s.toLowerCase())) ||
      j.role.toLowerCase().includes(s.toLowerCase())
    );
  });

  // Format as BoardRowItem for BoardTable
  const boardRows: BoardRowItem[] = filteredListings.map((j) => ({
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
    deadline: j.deadline || "No deadline listed",
  }));

  const tickerItems = filteredListings.slice(0, 6).map((j) => ({
    code: j.city.slice(0, 3).toUpperCase(),
    label: `${j.company} · ${j.role}`,
    info: j.pay,
  }));

  return (
    <PageShell>
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2 flex items-center gap-2">
            <MapPin className="size-3.5" /> 03 &mdash; LOCALIZED CITY INTELLIGENCE
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl text-foreground tracking-tight">
            Localized intelligence.<em className="font-serif italic font-light text-primary ml-3 font-normal">City departures.</em>
          </h1>
          <p className="font-serif text-muted-foreground mt-2 max-w-2xl text-base">
            Select any city in India to map localized skill demand, remote-friendly ratios, and real-time active openings with application deadlines.
          </p>
        </div>

        {/* City Search Bar */}
        <div className="bg-card/70 border border-border/80 rounded-xl p-5 mb-8 shadow-md">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
            SELECT CITY OR CAMPUS LOCATION
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search any Indian city (e.g. Pune, Hyderabad, Jaipur)..."
                value={inputValue}
                onChange={(e) => handleCityInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (filteredCities.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full bg-background/80 border border-border/80 rounded-lg pl-10 pr-9 py-2.5 font-sans text-sm outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/10 transition"
              />
              {inputValue && (
                <button onClick={() => { setInputValue(""); setShowSuggestions(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
              {showSuggestions && filteredCities.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border/80 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                  {filteredCities.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickCity(c)}
                      onMouseEnter={() => setHighlighted(i)}
                      className={`w-full text-left flex items-center gap-2 px-3.5 py-2 text-sm font-sans transition ${
                        highlighted === i ? "bg-primary/10 text-foreground font-semibold" : "text-muted-foreground hover:bg-primary/5"
                      }`}
                    >
                      <MapPin className="size-3.5 text-primary" />
                      <span><HighlightMatch text={c} query={inputValue} /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { if (inputValue.trim()) pickCity(inputValue.trim()); }}
              className="gradient-silver text-primary-foreground font-sans font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition whitespace-nowrap"
            >
              Update City Board
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase text-muted-foreground/80 mr-1">Quick Cities:</span>
            {CITIES.map((c) => (
              <button
                key={c}
                onClick={() => pickCity(c)}
                className={`px-3 py-1 rounded-full font-mono text-xs border transition ${
                  city === c
                    ? "bg-primary/10 text-primary border-primary/50 font-bold"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                📍 {c}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Section */}
        {loading && (
          <div className="border border-border/80 rounded-xl p-12 text-center bg-card/40 mb-8">
            <Loader2 className="size-8 animate-spin text-primary mx-auto" />
            <div className="font-mono text-xs text-muted-foreground mt-3 uppercase tracking-wider">
              Mapping localized market signal for {city}...
            </div>
          </div>
        )}

        {data && !loading && (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <Card className="md:col-span-2 p-6 bg-card/60 border-border/80 shadow-md">
              <h3 className="font-display text-xl font-bold mb-4 text-foreground flex items-center justify-between">
                <span>Skill Heatmap — {city}</span>
                <span className="font-mono text-xs text-primary font-normal">HEATMAP INDEX</span>
              </h3>
              <div className="space-y-4">
                {data.hot_skills.map((s) => (
                  <div key={s.skill}>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="font-bold text-foreground">{s.skill}</span>
                      <span className="text-muted-foreground">
                        ~{s.avg_openings} openings/mo · SCORE: {s.demand_score}
                      </span>
                    </div>
                    <Progress value={s.demand_score} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-xl bg-background/50 border border-border/60 font-sans text-xs">
                <div className="font-mono text-[11px] text-primary uppercase tracking-wider font-semibold mb-1">
                  Local Market Insight
                </div>
                <p className="text-muted-foreground leading-relaxed">{data.insight}</p>
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-6 bg-card/60 border-border/80 text-center shadow-md">
                <Wifi className="size-7 text-primary mx-auto mb-2" />
                <div className="font-mono text-4xl font-bold text-primary">{data.remote_friendly_pct}%</div>
                <div className="font-mono text-xs text-muted-foreground mt-1 uppercase">
                  Remote / Hybrid Friendly
                </div>
              </Card>

              <Card className="p-5 bg-card/60 border-border/80 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="size-4 text-primary" />
                  <span className="font-sans font-bold text-sm text-foreground">Top Hiring Companies in {city}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {data.top_companies.map((c) => (
                    <span key={c} className="px-2 py-1 rounded bg-muted/40 text-foreground border border-border/40">
                      {c}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Local Board Listings Section */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Active Listings in {city}</h2>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              {filteredListings.length} OPPORTUNITIES FOUND · DIRECT APPLICATION LINKS
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="font-mono text-[11px] uppercase text-muted-foreground mr-1">Filter Skill:</span>
            {ALL_SKILLS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSkill(s)}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] border transition ${
                  activeSkills.includes(s)
                    ? "bg-primary/10 text-primary border-primary/50 font-bold"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Departure Board Table for Local Jobs */}
        <BoardTable
          items={boardRows}
          emptyMessage={`No active listings found matching filters in ${city}. Try clearing skill filters.`}
        />
      </section>
    </PageShell>
  );
}
