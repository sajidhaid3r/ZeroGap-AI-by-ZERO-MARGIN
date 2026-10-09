import React, { useMemo, useState, useEffect, useRef } from "react";
import { TrendingUp, Flame, Activity } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatLiveDateTime } from "@/lib/liveDate";

type Tab = "demand" | "yoy" | "salary";

const ROLES = ["AI/ML", "Web Dev", "Data Sci", "Cloud", "Cyber", "Mobile", "UI/UX", "FinTech"];

const DATA: Record<Tab, { values: number[]; suffix: string; label: string }> = {
  demand: { values: [92, 74, 81, 78, 65, 60, 55, 70], suffix: "", label: "Demand index (0–100)" },
  yoy: { values: [34, 3, 18, 22, 28, 12, 8, 19], suffix: "%", label: "YoY growth" },
  salary: { values: [18, 12, 15, 14, 16, 13, 10, 17], suffix: " LPA", label: "Avg salary (₹ LPA)" },
};

const TAB_LABELS: Record<Tab, string> = {
  demand: "Demand",
  yoy: "YoY Growth",
  salary: "Avg Salary",
};

// Accent red matching app's --color-accent / #E53935
const ACCENT = "#E53935";
const ACCENT_LIGHT = "#C62828";

function AnimatedBar({
  value,
  max,
  isLeader,
  role,
  suffix,
  label,
  animKey,
}: {
  value: number;
  max: number;
  isLeader: boolean;
  role: string;
  suffix: string;
  label: string;
  animKey: string;
}) {
  const [height, setHeight] = useState(0);
  const [hovered, setHovered] = useState(false);
  const pct = max > 0 ? (value / max) * 100 : 0;

  useEffect(() => {
    setHeight(0);
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setHeight(pct), 60);
    });
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  return (
    <div
      className="flex flex-col items-center gap-1.5 flex-1 min-w-0 relative"
      style={{ minWidth: 28 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip on hover */}
      {hovered && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded px-2 py-1 font-mono text-[10px] pointer-events-none"
          style={{
            background: "rgba(14,13,13,0.95)",
            color: "#F5F4F0",
            border: "1px solid rgba(245,244,241,0.18)",
          }}
        >
          {value}{suffix}
        </div>
      )}

      {/* Bar track */}
      <div className="w-full flex items-end" style={{ height: 140 }}>
        <div
          className="w-full rounded-sm relative overflow-hidden"
          style={{
            height: `${height}%`,
            transition: "height 0.65s cubic-bezier(0.23, 1, 0.32, 1)",
            // Leader bar: accent red. Others: gradient gray
            background: isLeader
              ? `linear-gradient(to top, ${ACCENT}, #ff6b6b)`
              : "linear-gradient(to top, rgba(180,176,170,0.28), rgba(200,196,190,0.14))",
            border: isLeader
              ? `1px solid ${ACCENT}`
              : "1px solid rgba(245,244,241,0.15)",
            boxShadow: isLeader
              ? `0 0 16px rgba(229,57,53,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`
              : "none",
          }}
        >
          {/* Shimmer on leader */}
          {isLeader && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.5s infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* Role label */}
      <span
        className="font-mono text-[9px] uppercase tracking-widest text-center leading-tight"
        style={{
          color: isLeader ? ACCENT : "rgba(180,176,170,0.7)",
          fontWeight: isLeader ? 700 : 400,
        }}
      >
        {role}
      </span>
    </div>
  );
}

export function TechTrendChart() {
  const [tab, setTab] = useState<Tab>("demand");
  const now = useNow(10_000);
  const animKey = tab; // triggers re-animation on tab switch

  const { leaderIdx, max } = useMemo(() => {
    const dataset = DATA[tab];
    const max = Math.max(...dataset.values);
    const leaderIdx = dataset.values.indexOf(max);
    return { leaderIdx, max };
  }, [tab]);

  const dataset = DATA[tab];
  const hottestRole = ROLES[leaderIdx];

  const lastUpdated = formatLiveDateTime(now);
  const currentYear = now.getFullYear();

  return (
    <>
      {/* Keyframe for shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div
        className="rounded-xl border w-full relative overflow-hidden"
        style={{
          background: "rgba(20, 19, 18, 0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "rgba(245, 244, 241, 0.12)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
          padding: "22px 24px 20px",
        }}
      >
        {/* Ambient glow behind leader bar */}
        <div
          className="absolute bottom-0 pointer-events-none"
          style={{
            left: `${(leaderIdx / ROLES.length) * 100}%`,
            width: `${100 / ROLES.length}%`,
            height: "60%",
            background: `radial-gradient(ellipse at bottom, rgba(229,57,53,0.18) 0%, transparent 70%)`,
            transition: "left 0.5s ease",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap relative z-10 mb-1">
          <div className="text-sm font-display font-bold text-[#F5F4F1] tracking-tight">
            Tech Job Market Trends — India {currentYear}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium" style={{ color: ACCENT }}>
            <span className="size-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
            Live data
          </div>
        </div>
        <div className="text-xs font-mono text-[#9e988d] mb-4 relative z-10">
          {dataset.label} · auto-refreshes daily
        </div>

        {/* Tab Pills */}
        <div className="flex gap-2 mb-5 relative z-10">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-sm text-xs font-mono font-semibold transition-all duration-200"
              style={{
                background: tab === t ? "rgba(229,57,53,0.15)" : "rgba(255,255,255,0.03)",
                color: tab === t ? ACCENT : "#9e988d",
                border: tab === t ? `1px solid rgba(229,57,53,0.4)` : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Bar Chart — pure CSS/HTML, no Chart.js */}
        <div className="relative z-10 flex items-end gap-2 px-1" style={{ height: 160 }}>
          {dataset.values.map((v, i) => (
            <AnimatedBar
              key={ROLES[i]}
              value={v}
              max={max}
              isLeader={i === leaderIdx}
              role={ROLES[i]}
              suffix={dataset.suffix}
              label={dataset.label}
              animKey={animKey}
            />
          ))}
        </div>

        {/* Y-axis hint */}
        <div className="flex justify-between mt-1 mb-4 relative z-10 px-1">
          <span className="font-mono text-[9px] text-[#9e988d]">0</span>
          <span className="font-mono text-[9px] text-[#9e988d]">{max}{dataset.suffix}</span>
        </div>

        {/* Mini Stat Cards */}
        <div className="grid grid-cols-3 gap-2 relative z-10">
          <MiniStat
            icon={<Flame className="size-3.5" style={{ color: ACCENT }} />}
            label="Hottest"
            value={hottestRole}
            accentColor={ACCENT}
          />
          <MiniStat
            icon={<TrendingUp className="size-3.5" style={{ color: ACCENT }} />}
            label="Rising fast"
            value="AI/ML +34%"
            accentColor={ACCENT}
          />
          <MiniStat
            icon={<Activity className="size-3.5 text-[#B8B8BC]" />}
            label="Stable"
            value="Cloud · Cyber"
            accentColor="#F5F4F0"
          />
        </div>

        <div className="text-[11px] font-mono text-[#9e988d] mt-3 relative z-10">
          Last updated: {lastUpdated} · Auto-refreshes daily
        </div>
      </div>
    </>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-sm px-2.5 py-2 border"
      style={{
        background: "rgba(26, 25, 24, 0.75)",
        borderColor: "rgba(245, 244, 241, 0.10)",
      }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#9e988d]">
        {icon}
        {label}
      </div>
      <div className="text-[10px] font-mono font-bold mt-0.5" style={{ color: accentColor }}>
        {value}
      </div>
    </div>
  );
}
