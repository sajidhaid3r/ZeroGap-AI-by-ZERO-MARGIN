import React from "react";
import { StatusTag, StatusState } from "./StatusTag";
import { ExternalLink, Building2, MapPin } from "lucide-react";

export interface BoardRowItem {
  id: string;
  role: string;
  company: string;
  city: string;
  cityCode?: string;
  type: string;
  status?: StatusState | string;
  pay: string;
  posted: string;
  url: string;
  skills?: string[];
  matchScore?: number | null;
  deadline?: string;
}

interface BoardTableProps {
  items: BoardRowItem[];
  emptyMessage?: string;
  onApplyClick?: (item: BoardRowItem) => void;
}

const CITY_CODES: Record<string, string> = {
  Bengaluru: "BLR",
  Hyderabad: "HYD",
  Mumbai: "BOM",
  Pune: "PNQ",
  "Delhi NCR": "DEL",
  Chennai: "MAA",
  Kolkata: "CCU",
  Ahmedabad: "AMD",
  Jaipur: "JAI",
  Kochi: "COK",
  Noida: "NOD",
  Remote: "RMT",
};

export function BoardTable({
  items,
  emptyMessage = "No departures on the board matching your criteria.",
  onApplyClick,
}: BoardTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
          BOARD EMPTY · 00 DEPARTURES
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full border border-border/80 rounded-xl overflow-hidden bg-card/60 shadow-lg">
      {/* Board Header */}
      <div className="hidden md:grid grid-cols-[3.5rem_5.5rem_1fr_4.5rem_8rem_8rem_6.5rem] items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border/80 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="text-center">#</span>
        <span>Posted</span>
        <span>Role & Company</span>
        <span>Code</span>
        <span>Status</span>
        <span className="text-right">Pay / Stipend</span>
        <span className="text-right">Action</span>
      </div>

      {/* Board Rows */}
      <div className="divide-y divide-border/60">
        {items.map((item, idx) => {
          const numStr = String(idx + 1).padStart(2, "0");
          const code = item.cityCode || CITY_CODES[item.city] || item.city.slice(0, 3).toUpperCase();
          const isUrlValid = item.url && item.url !== "#";
          const statusVal = item.status || (item.type === "Internship" ? "internship" : "open");

          return (
            <div
              key={item.id || `${item.company}-${item.role}-${idx}`}
              className="grid grid-cols-1 md:grid-cols-[3.5rem_5.5rem_1fr_4.5rem_8rem_8rem_6.5rem] items-center gap-2 md:gap-3 p-4 transition-colors hover:bg-primary/5 group"
            >
              {/* Row Number */}
              <div className="hidden md:flex items-center justify-center font-mono text-xs text-muted-foreground/60 group-hover:text-primary font-bold">
                {numStr}
              </div>

              {/* Posted */}
              <div className="hidden md:block font-mono text-xs text-muted-foreground">
                {item.posted}
              </div>

              {/* Role & Company */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="md:hidden font-mono text-[11px] text-muted-foreground/60 font-bold mr-1">
                    {numStr}.
                  </span>
                  <h4 className="font-display font-black text-sm md:text-base text-foreground leading-snug uppercase tracking-tight group-hover:text-primary transition-colors">
                    {item.company} <span className="font-serif italic font-normal text-muted-foreground capitalize text-xs md:text-sm">&middot; {item.role}</span>
                  </h4>
                  {item.matchScore !== undefined && item.matchScore !== null && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.625rem',
                        padding: '2px 7px',
                        borderRadius: '2px',
                        border: `1px solid ${
                          item.matchScore >= 70
                            ? 'color-mix(in oklch, var(--color-status-go) 35%, transparent)'
                            : item.matchScore >= 50
                            ? 'color-mix(in oklch, var(--color-accent-2) 35%, transparent)'
                            : 'color-mix(in oklch, var(--color-status-wait) 35%, transparent)'
                        }`,
                        background: `${
                          item.matchScore >= 70
                            ? 'color-mix(in oklch, var(--color-status-go) 12%, transparent)'
                            : item.matchScore >= 50
                            ? 'color-mix(in oklch, var(--color-accent-2) 12%, transparent)'
                            : 'color-mix(in oklch, var(--color-status-wait) 12%, transparent)'
                        }`,
                        color: `${
                          item.matchScore >= 70
                            ? 'var(--color-status-go)'
                            : item.matchScore >= 50
                            ? 'var(--color-accent-2)'
                            : 'var(--color-status-wait)'
                        }`,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.matchScore}% FIT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-0.5 flex-wrap">
                  <span>{item.city}</span>
                  {item.deadline && (
                    <>
                      <span>&middot;</span>
                      <span style={{ color: 'var(--color-accent-2)' }}>
                        Closes: {item.deadline}
                      </span>
                    </>
                  )}
                </div>

                {item.skills && item.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.skills.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-muted/40 text-muted-foreground border border-border/40"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* City Code */}
              <div className="hidden md:block font-mono text-xs font-bold tracking-wider text-muted-foreground group-hover:text-primary">
                {code}
              </div>

              {/* Status Tag */}
              <div className="flex items-center md:block mt-1 md:mt-0">
                <StatusTag status={statusVal} />
              </div>

              {/* Pay / Stipend */}
              <div className="font-mono text-xs md:text-sm font-bold text-foreground md:text-right mt-1 md:mt-0">
                {item.pay}
              </div>

              {/* Action Button */}
              <div className="md:text-right mt-2 md:mt-0">
                {isUrlValid ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onApplyClick?.(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 transition-all duration-150"
                  >
                    <span>Apply</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-mono text-muted-foreground/60 border border-border/40 cursor-not-allowed uppercase">
                    Unavailable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Board Footer */}
      <div className="px-4 py-2.5 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground flex-wrap gap-2">
        <span>BOARD TOTAL: {items.length} LISTINGS</span>
        <span>
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-mono text-[10px]">/</kbd> to search board
        </span>
      </div>
    </div>
  );
}
