import React, { useState, useEffect, useRef, useCallback } from "react";

interface TickerItem {
  code: string;
  label: string;
  info: string;
}

interface TickerStripProps {
  items?: TickerItem[];
  lastUpdated?: string;
  className?: string;
}

const DEFAULT_ITEMS: TickerItem[] = [
  { code: "BEN", label: "Swiggy", info: "ML & AI Research Intern [₹35,000/mo]" },
  { code: "BEN", label: "Razorpay", info: "SDE 1 - Backend Developer [₹14-18 LPA]" },
  { code: "HYD", label: "Microsoft", info: "Cloud Engineer Intern [₹80,000/mo]" },
  { code: "MUM", label: "JPMorgan", info: "Data Analyst Intern [₹45,000/mo]" },
  { code: "PUN", label: "Nvidia", info: "AI Hardware Engineer [₹18-22 LPA]" },
  { code: "DEL", label: "Zomato", info: "Product Analytics Intern [₹30,000/mo]" },
  { code: "MAA", label: "Zoho", info: "Frontend Developer [₹8-12 LPA]" },
  { code: "BLR", label: "Google", info: "Software Engineering Intern [₹1,00,000/mo]" },
  { code: "HYD", label: "Amazon", info: "SDE Intern [₹85,000/mo]" },
  { code: "PUN", label: "PhonePe", info: "Systems Engineer [₹15-20 LPA]" },
  { code: "AIML", label: "AI / ML", info: "+34% hiring spike this week" },
  { code: "FSW", label: "Full Stack", info: "240+ active openings" },
];

// Speed: pixels per millisecond. Adjust to change scroll speed.
const PIXELS_PER_MS = 0.035;

// How often to refresh the "SYNCED" clock label (ms)
const CLOCK_REFRESH_MS = 10_000;

function formatSyncTime(d: Date): string {
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TickerStrip({
  items = DEFAULT_ITEMS,
  lastUpdated,
  className = "",
}: TickerStripProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  // Anchor: wall-clock ms when the animation logically started at x=0
  const startEpochRef = useRef<number>(Date.now());
  const [syncedTime, setSyncedTime] = useState<string>(`LIVE · SYNCED ${formatSyncTime(new Date())}`);

  // Build doubled item list for seamless loop
  const doubleItems = [...items, ...items];

  // ─── rAF scroll loop — position is purely time-based ───────────────────────
  // On every frame we compute where the strip SHOULD be right now from
  // wall-clock elapsed time. This is unaffected by tab throttling because
  // we never accumulate frame deltas — we always derive from real elapsed time.
  const tick = useCallback(() => {
    const el = trackRef.current;
    if (!el) { rafRef.current = requestAnimationFrame(tick); return; }

    // Full-strip width = half the doubleItems width (we doubled for seamless loop)
    const fullWidth = el.scrollWidth / 2;
    if (fullWidth === 0) { rafRef.current = requestAnimationFrame(tick); return; }

    const elapsed = Date.now() - startEpochRef.current;
    // Position in [0, fullWidth) — wraps seamlessly
    const x = (elapsed * PIXELS_PER_MS) % fullWidth;
    el.style.transform = `translateX(-${x}px)`;

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ─── Page Visibility — on tab refocus, no adjustment needed ─────────────────
  // Because position is derived purely from Date.now() vs a fixed epoch,
  // returning from a backgrounded tab instantly shows the correct position.
  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // ─── Clock refresh — re-reads real wall time on visibility change too ────────
  useEffect(() => {
    const updateClock = () => {
      // Re-reads the true current time; if the tab was backgrounded for 2 minutes
      // and setInterval was throttled, this still shows the real current time.
      setSyncedTime(`LIVE · SYNCED ${formatSyncTime(new Date())}`);
    };

    updateClock();
    const id = setInterval(updateClock, CLOCK_REFRESH_MS);

    // On tab-become-visible: immediately refresh clock so it shows real time
    // even if setInterval was throttled while the tab was hidden.
    const onVisible = () => { if (!document.hidden) updateClock(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const displayTime = lastUpdated || syncedTime;

  return (
    <div
      className={`w-full overflow-hidden bg-background/95 border-b border-border/60 py-2 font-mono text-xs text-muted-foreground select-none relative z-20 ${className}`}
    >
      <div className="flex items-center">
        {/* Fixed left label */}
        <div className="shrink-0 px-4 flex items-center gap-2 border-r border-border/60 bg-background text-primary font-semibold z-10">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="uppercase tracking-widest text-[10px]">{displayTime}</span>
        </div>

        {/* Scrolling track — JS-driven, immune to tab throttle */}
        <div className="overflow-hidden flex-1 relative">
          <div
            ref={trackRef}
            className="whitespace-nowrap flex items-center gap-8 pl-4 will-change-transform"
            style={{ width: "max-content" }}
          >
            {doubleItems.map((item, idx) => (
              <span key={`${item.code}-${idx}`} className="inline-flex items-center gap-2 text-foreground/80">
                <strong className="text-primary font-bold tracking-wider">{item.code}</strong>
                <span>{item.label}</span>
                <span className="text-muted-foreground/60">[{item.info}]</span>
                <span className="text-border mx-2">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
