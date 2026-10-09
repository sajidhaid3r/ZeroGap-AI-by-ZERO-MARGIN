import React from "react";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { useNow } from "@/hooks/use-now";

export interface RoleMarketData {
  role: string;
  category?: string;
  demandToday: number;
  demand2027: number;
  demand2028: number;
  demand2029: number;
  probability: number;
  trendDirection: "rising_fast" | "rising" | "stable" | "declining";
  avgSalaryInrLakhs: number;
  topSkills: string[];
  topCities: string[];
  liveOpenings?: number;
  outlook: string;
  recommendedAction: string;
}

interface SparklineRowProps {
  data: RoleMarketData;
  isSelected?: boolean;
  onSelect?: () => void;
  index: number;
}

export function SparklineRow({
  data,
  isSelected = false,
  onSelect,
  index,
}: SparklineRowProps) {
  const now = useNow(60_000);
  const currentYear = now.getFullYear();
  const projectionYear = currentYear + 3;
  const points = [
    data.demandToday,
    Math.round(data.demandToday * 1.05),
    data.demand2027,
    Math.round((data.demand2027 + data.demand2028) / 2),
    data.demand2028,
    data.demand2029,
  ];

  const min = Math.min(...points) - 5;
  const max = Math.max(...points) + 5;
  const width = 120;
  const height = 36;

  // Convert values to SVG path
  const svgPoints = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((val - min) / (max - min)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${svgPoints.join(" L ")}`;

  const isRising = data.trendDirection === "rising_fast" || data.trendDirection === "rising";
  const strokeColor = isRising ? "var(--accent-primary, #C9CDD3)" : data.trendDirection === "stable" ? "var(--status-warning, #E0B85C)" : "var(--status-danger, #D97575)";
  const numStr = String(index + 1).padStart(2, "0");

  return (
    <div
      onClick={onSelect}
      className={`grid grid-cols-1 md:grid-cols-[3rem_1fr_9rem_5rem_7rem_6rem] items-center gap-3 p-4 border-b border-border/60 transition-all cursor-pointer ${
        isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-card/80"
      }`}
    >
      {/* Row Index */}
      <div className="hidden md:block font-mono text-xs text-muted-foreground/60 font-bold">
        {numStr}
      </div>

      {/* Role & Skills */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-sans font-bold text-base text-foreground group-hover:text-primary">
            {data.role}
          </h4>
          <span className="font-mono text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
            PROBABILITY: {data.probability}%
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {data.topSkills.map((s) => (
            <span
              key={s}
              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground/90 border border-border/30"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Sparkline Inline SVG Graph */}
      <div className="hidden md:flex flex-col items-center justify-center">
        <svg width={width} height={height} className="overflow-visible">
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((val, idx) => {
            const x = (idx / (points.length - 1)) * width;
            const y = height - ((val - min) / (max - min)) * height;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={idx === points.length - 1 ? 3.5 : 2}
                fill={idx === points.length - 1 ? strokeColor : "var(--color-background, #0a0a0b)"}
                stroke={strokeColor}
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
        <span className="font-mono text-[10px] text-muted-foreground mt-1">{currentYear} → {projectionYear} TREND</span>
      </div>

      {/* Demand Score */}
      <div className="text-left md:text-center">
        <div className="font-mono text-base font-bold text-foreground">
          {data.demandToday}
          <span className="text-[10px] text-muted-foreground font-normal">/100</span>
        </div>
        <div className="font-mono text-[10px] text-emerald-400 flex items-center justify-start md:justify-center gap-0.5">
          {data.trendDirection === "rising_fast" ? (
            <TrendingUp className="size-3" />
          ) : data.trendDirection === "declining" ? (
            <TrendingDown className="size-3" />
          ) : (
            <ArrowUpRight className="size-3" />
          )}
          <span>{data.trendDirection.replace("_", " ")}</span>
        </div>
      </div>

      {/* Avg Salary */}
      <div className="font-mono text-xs md:text-sm text-foreground font-medium md:text-right">
        ₹{data.avgSalaryInrLakhs.toFixed(1)} <span className="text-[10px] text-muted-foreground">LPA</span>
      </div>

      {/* Action / Selection indicator */}
      <div className="md:text-right">
        <span
          className={`inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded border ${
            isSelected
              ? "bg-primary text-primary-foreground border-primary font-bold"
              : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
          }`}
        >
          {isSelected ? "Inspecting" : "Analyze →"}
        </span>
      </div>
    </div>
  );
}
