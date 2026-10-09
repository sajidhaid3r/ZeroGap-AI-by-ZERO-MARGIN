import { Link } from "@tanstack/react-router";
import { Linkedin, Mail } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatLiveDate } from "@/lib/liveDate";

export function Footer({ showFounder = false }: { showFounder?: boolean }) {
  const now = useNow();
  const liveDate = formatLiveDate(now);

  return (
    <footer className="border-t border-border/60 mt-20 bg-background">
      <div className="max-w-[1320px] mx-auto px-4 md:px-8 py-14">
        {showFounder && (
          <div className="max-w-3xl mx-auto text-center mb-12 pb-12 border-b border-border/60">
            <p className="text-sm font-serif italic text-foreground/90 leading-relaxed">
              <span className="font-sans font-bold not-italic text-foreground">About the founder.</span>{" "}
              ZeroGap was built by a second-year engineering student in Bengaluru. After watching
              classmates get rejected for roles they were qualified for, I decided to fix the
              broken feedback loop between students and recruiters. This is that fix.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start justify-between gap-6 pb-10 border-b border-border/60">
          <div>
            <Link to="/" className="font-display font-extrabold text-2xl tracking-tight text-foreground whitespace-nowrap">
              <span className="text-primary font-serif">✱ </span>ZEROGAP<span className="font-light text-muted-foreground"> AI</span>
            </Link>
            <p className="font-serif italic text-muted-foreground text-sm mt-1">
              Be the signal, not the noise. &mdash; Built in Bengaluru.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground/80 flex flex-col md:items-end gap-1">
            <span>COLLEGE PLACEMENT ENGINE</span>
            <span>UPDATED LIVE &middot; {liveDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 text-xs">
          <div>
            <div className="font-mono uppercase tracking-widest text-primary font-semibold mb-3 text-[11px]">Platform</div>
            <ul className="space-y-2 font-mono text-muted-foreground">
              <li><Link to="/resume-analysis" className="hover:text-foreground transition-colors">Resume Analysis</Link></li>
              <li><Link to="/opportunities" className="hover:text-foreground transition-colors">Opportunities Board</Link></li>
              <li><Link to="/market-mapping" className="hover:text-foreground transition-colors">Market Mapping</Link></li>
              <li><Link to="/confidence-coach" className="hover:text-foreground transition-colors">Confidence Coach</Link></li>
              <li><Link to="/micro-roadmap" className="hover:text-foreground transition-colors">48H Micro Roadmap</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-mono uppercase tracking-widest text-primary font-semibold mb-3 text-[11px]">Coverage</div>
            <ul className="space-y-2 font-mono text-muted-foreground">
              <li><Link to="/localized-intelligence" className="hover:text-foreground transition-colors">Localized Intelligence</Link></li>
              <li><Link to="/opportunities" className="hover:text-foreground transition-colors">Bengaluru (BLR)</Link></li>
              <li><Link to="/opportunities" className="hover:text-foreground transition-colors">Hyderabad (HYD)</Link></li>
              <li><Link to="/opportunities" className="hover:text-foreground transition-colors">Mumbai (BOM)</Link></li>
              <li><Link to="/opportunities" className="hover:text-foreground transition-colors">Delhi NCR (DEL)</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-mono uppercase tracking-widest text-primary font-semibold mb-3 text-[11px]">Governance</div>
            <ul className="space-y-2 font-mono text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/privacy-ocr" className="hover:text-foreground transition-colors">On-Device OCR Promise</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><a href="mailto:hello@zerogap.ai" className="hover:text-foreground transition-colors">Data Processing</a></li>
            </ul>
          </div>

          <div>
            <div className="font-mono uppercase tracking-widest text-primary font-semibold mb-3 text-[11px]">Campus & Contact</div>
            <p className="text-muted-foreground font-serif italic text-xs leading-relaxed mb-3">
              T&amp;P Officer onboarding free for Indian colleges.
            </p>
            <a href="mailto:campus@zerogap.ai" className="font-mono text-primary hover:underline block mb-3">
              campus@zerogap.ai
            </a>
            <div className="flex items-center gap-3 text-muted-foreground">
              <a href="mailto:hello@zerogap.ai" className="hover:text-foreground"><Mail className="size-4" /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-foreground"><Linkedin className="size-4" /></a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between font-mono text-[11px] text-muted-foreground/70 gap-3">
          <span>© {now.getFullYear()} ZeroGap AI Studio, Lda. Built with precision for Indian undergraduates.</span>
          <span>Set in Newsreader &amp; Bricolage &amp; JetBrains Mono &middot; v2.0</span>
        </div>
      </div>
    </footer>
  );
}
