import { Star } from "lucide-react";
import { Reveal } from "./Reveal";

const TESTIMONIALS = [
  {
    stars: 5,
    quote: "I uploaded my resume expecting generic feedback. ZeroGap flagged that I was missing 'REST APIs' and 'Git' — I added them, rescanned, went from 54 to 79. Got a shortlist call 4 days later.",
    name: "Rahul K.",
    college: "3rd year CSE, VIT Vellore",
    initials: "RK",
    bg: "rgba(245, 244, 241, 0.15)",
    fg: "#F5F4F1",
  },
  {
    stars: 5,
    quote: "The Confidence Coach feature hit different after 8 straight rejections. It didn't just motivate me — it told me exactly what to fix. My resume score is 88 now and I have 2 interviews this week.",
    name: "Sneha M.",
    college: "Final year IT, BITS Pilani (Hyderabad)",
    initials: "SM",
    bg: "rgba(201, 205, 211, 0.18)",
    fg: "#C9CDD3",
  },
  {
    stars: 4,
    quote: "The localized filter is underrated. I was seeing jobs in Noida and Bengaluru I couldn't take. Now it only shows me things in Pune near my college. Found a part-time remote role in week 1.",
    name: "Arjun P.",
    college: "2nd year ECE, Symbiosis Institute of Technology",
    initials: "AP",
    bg: "rgba(229, 57, 53, 0.15)",
    fg: "#e53935",
  },
];

export function Testimonials() {
  return (
    <section className="container mx-auto px-4 py-20 border-t border-border/50">
      <Reveal className="text-center max-w-2xl mx-auto mb-12">
        <div className="text-xs uppercase tracking-widest text-primary mb-2 font-mono">Testimonials</div>
        <h2 className="font-display text-3xl md:text-5xl">What students are saying</h2>
        <p className="text-muted-foreground mt-3 font-serif italic">Real results from real students in beta.</p>
      </Reveal>
      <div className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 100}>
            <div className="glass-card p-6 h-full flex flex-col">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className="size-4"
                    fill={idx < t.stars ? "var(--star-filled)" : "var(--star-empty)"}
                    stroke={idx < t.stars ? "var(--star-filled)" : "var(--star-empty)"}
                    strokeWidth={idx < t.stars ? 0 : 1.5}
                  />
                ))}
              </div>
              <p className="text-[15px] italic text-foreground/85 leading-relaxed flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/40">
                <div className="size-11 rounded-full flex items-center justify-center font-medium text-sm" style={{ background: t.bg, color: t.fg }}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.college}</div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
