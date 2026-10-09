import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TechTrendChart } from "@/components/TechTrendChart";
import { IndiaHeatmap } from "@/components/IndiaHeatmap";
import { Testimonials } from "@/components/Testimonials";
import { formatLiveDate } from "@/lib/liveDate";
import { useNow } from "@/hooks/use-now";
import { useDepartureQuote } from "@/hooks/use-departure-quote";
import {
  BarChart3, FileSearch,
  MapPin, MessagesSquare, Rocket,
  GraduationCap, Calendar,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZeroGap AI — Be the Signal, not the Noise" },
      { name: "description", content: "Upload your resume. Get your ATS score in 60 seconds. Fix the exact gaps keeping you from getting shortlisted. Free for Indian college students." },
      { property: "og:title", content: "Be the Signal, not the Noise." },
      { property: "og:description", content: "Know your ATS score in 60 seconds. Built for Indian students. Free for college emails." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileSearch, title: "Know exactly why you're getting rejected", desc: "Upload your resume in any format. Get your ATS score, a list of missing keywords, and specific fixes — in under 60 seconds.", cta: "Scan My Resume", to: "/resume-analysis" as const },
  { icon: BarChart3, title: "See which skills are paying off in your city right now", desc: "Real-time job trend data for 8 tech roles across India. AI projects which skills will rise in the next 2–3 years.", cta: "View Trends", to: "/market-mapping" as const },
  { icon: MessagesSquare, title: "Turn rejection into a comeback plan", desc: "An AI mentor that validates your frustration, identifies what went wrong, and gives you a clear 3-step path back — without the corporate fluff.", cta: "Talk to Coach", to: "/confidence-coach" as const },
  { icon: Calendar, title: "From 'missing skills' to interview-ready in 2 days", desc: "Tell ZeroGap your target role. Get a precise 48-hour plan of tasks, resources, and milestones to close your skill gap.", cta: "Build My Roadmap", to: "/micro-roadmap" as const },
  { icon: MapPin, title: "Only see internships you can actually attend", desc: "Filter by distance from your college, schedule compatibility, and your skill set. No more missing out because the office is too far.", cta: "Find Near Me", to: "/localized-intelligence" as const },
  { icon: GraduationCap, title: "Get your entire T&P cell using ZeroGap — free", desc: "A white-label dashboard for Training & Placement officers. Track college-wide ATS scores, top skill gaps, and placement-ready students.", cta: "Partner With Us", to: "/campus-partnership" as const },
];

const steps = [
  { n: "01", title: "Upload Resume", desc: "Drag any format — we parse on-device.", to: "/resume-analysis" as const },
  { n: "02", title: "Get ATS Score", desc: "Honest, recruiter-grade diagnostic.", to: "/resume-analysis" as const },
  { n: "03", title: "Bridge the Gap", desc: "Receive your custom 48h roadmap.", to: "/micro-roadmap" as const },
  { n: "04", title: "Hit Submit", desc: "Apply with verified market readiness.", to: "/market-mapping" as const },
];

const heroStats = [
  { to: 14200, label: "Students helped", suffix: "+", duration: 2000, liveTickMs: 8000 },
  { to: 91, label: "ATS improvement rate", suffix: "%", duration: 1500 },
  { to: 50, label: "Campus partners", suffix: "+", duration: 1800 },
  { to: 48, label: "Hours to market-ready", suffix: "h", duration: 1000 },
];

const rotatingWords = ["CSE students", "future engineers", "first-gen coders", "Tier 2 college grads", "rejected applicants", "underconfident dreamers"];

function Landing() {
  // Computed from real current date — updates automatically each calendar month
  const now = useNow();
  const liveDate = formatLiveDate(now);
  const departureQuote = useDepartureQuote();
  return (
    <PageShell showFounder>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-16 md:py-24 border-b border-border/60">
        <div className="max-w-[1320px] mx-auto px-4 md:px-8 relative">

          {/* Hero Top Strip */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8">
            <span className="inline-flex items-center gap-2 text-foreground font-semibold">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              LIVE &middot; CAREER BOARD
            </span>
            <span>&middot;</span>
            <span>{liveDate}</span>
            <span>&middot;</span>
            <span>06 MODULES &middot; ACTIVE</span>
          </div>

          {/* Hero Composition: Title + Corner Stamp */}
          <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start mb-12">
            <div>
              <h1 className="font-display font-black text-5xl md:text-7xl lg:text-8xl leading-[0.92] tracking-tight text-foreground max-w-[16ch]">
                Be the signal.<br />
                <em className="font-serif italic font-light text-primary tracking-normal">We&rsquo;ll pack the rest.</em>
              </h1>
              <p className="mt-6 font-serif text-lg md:text-xl text-muted-foreground max-w-[58ch] leading-relaxed">
                ZeroGap AI is a career placement studio for Indian undergraduates. Upload your resume to check your ATS score, locate missing skills, and build your 48-hour market comeback plan.
              </p>
            </div>

            {/* Corner Departure Stamp Card */}
            <aside className="hidden lg:flex flex-col justify-between border border-border/80 p-5 rounded-sm bg-card/60 w-56 aspect-square font-mono text-xs">
              <div className="text-muted-foreground uppercase tracking-widest text-[10px]">Departing</div>
              <div className="font-display font-extrabold text-2xl tracking-tight text-foreground">EVERY DAY</div>
              <div className="text-muted-foreground text-[10px] leading-relaxed">"{departureQuote.text}"</div>
              <div className="text-primary font-semibold text-[10px] tracking-wider pt-2 border-t border-border/60 uppercase">{departureQuote.author}</div>
            </aside>
          </div>

          {/* Hero CTA Buttons */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button size="lg" asChild className="bg-primary text-primary-foreground hover:opacity-90 font-mono text-xs uppercase tracking-widest px-8 py-6 rounded-sm">
              <Link to="/auth">Check My ATS Score &middot; 60 Sec</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-border hover:bg-card font-mono text-xs uppercase tracking-widest px-8 py-6 rounded-sm">
              <Link to="/opportunities">Explore Opportunities Board</Link>
            </Button>
          </div>

          {/* Chart preview */}
          <div className="mt-16">
            <TechTrendChart />
          </div>

          {/* Animated stats row */}
          <Reveal as="div" className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-border/60">
            {heroStats.map((s) => (
              <div key={s.label} className="text-left">
                <div className="font-display font-extrabold text-4xl text-foreground tracking-tight">
                  <AnimatedCounter to={s.to} duration={s.duration} suffix={s.suffix} liveTickMs={s.liveTickMs} />
                </div>
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Numbered Section 01: Features */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-20 border-b border-border/60">
        <Reveal className="mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">01 &mdash; What this is</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Six tools. One outcome: <em className="font-serif italic font-light text-primary">recruiter-readiness</em>.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <Link to={f.to} className="block group h-full">
                <div className="border border-border/70 p-6 rounded-sm bg-card/40 hover:bg-card/90 transition-colors h-full flex flex-col justify-between">
                  <div>
                    <div className="size-10 rounded-sm bg-primary/10 flex items-center justify-center mb-4 text-primary">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-2 tracking-tight">{f.title}</h3>
                    <p className="font-serif text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary text-xs font-mono uppercase tracking-wider mt-6 group-hover:gap-2 transition-all font-semibold">
                    {f.cta} &rarr;
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Numbered Section 02: Testimonials */}
      <Testimonials />

      {/* Numbered Section 03: How it works */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-20">
        <Reveal className="mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">03 &mdash; How it works</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            From rejection to <em className="font-serif italic font-light text-primary">callback</em> in 4 steps.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <Link to={s.to} className="group block h-full">
                <div className="border border-border/70 p-6 rounded-sm bg-card/40 hover:bg-card/90 transition-colors h-full">
                  <div className="font-mono text-3xl font-extrabold text-primary mb-3">{s.n}</div>
                  <div className="font-display text-lg font-bold tracking-tight text-foreground">{s.title}</div>
                  <div className="font-serif text-sm text-muted-foreground mt-2">{s.desc}</div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>



      {/* India heatmap */}
      <IndiaHeatmap />

      {/* CTA */}
      <section className="container mx-auto px-6 py-20">
        <Reveal>
          <div className="rounded-3xl glass-card p-10 md:p-16 text-center relative overflow-hidden" style={{ borderColor: "rgba(201,205,211,0.25)" }}>
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="relative">
              <Rocket className="size-12 text-primary mx-auto mb-4" />
              <h2 className="font-display font-black text-3xl md:text-5xl mb-4 text-foreground">Ready to be <em className="font-serif italic font-light text-primary">market-ready</em>?</h2>
              <p className="font-serif text-muted-foreground mb-8 max-w-xl mx-auto">Join the 48-hour challenge. Free for all undergraduates.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Dark fill + off-white text — always readable in both modes */}
                <Button size="lg" asChild style={{ background: "#141312", color: "#F5F4F0", border: "1px solid rgba(245,244,241,0.15)" }} className="hover:opacity-90 font-mono text-xs uppercase tracking-widest px-8 py-6 rounded-sm">
                  <Link to="/auth">Create Free Account</Link>
                </Button>
                {/* Light hairline border so it lifts off any background */}
                <Button size="lg" asChild style={{ background: "transparent", color: "var(--foreground)", border: "1px solid rgba(var(--foreground-rgb,20,19,18),0.35)" }} className="hover:bg-card font-mono text-xs uppercase tracking-widest px-8 py-6 rounded-sm border-foreground/30">
                  <Link to="/campus-partnership"><GraduationCap className="size-4 mr-1.5" /> For colleges</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
