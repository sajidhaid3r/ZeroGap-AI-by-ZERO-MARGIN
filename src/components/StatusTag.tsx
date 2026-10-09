import React from "react";

export type StatusState =
  | "open"
  | "closing-soon"
  | "closed"
  | "remote"
  | "hybrid"
  | "internship"
  | "full-time";

interface StatusTagProps {
  status: StatusState | string;
  className?: string;
}

const STATUS_MAP: Record<
  string,
  { label: string; dotColor: string; bg: string; color: string; border: string; pulse?: boolean }
> = {
  open: {
    label: "Open",
    dotColor: "var(--color-status-go)",   /* oklch(0.72 0.150 145) — exact Wayfare green */
    bg: "color-mix(in oklch, var(--color-status-go) 12%, transparent)",
    color: "var(--color-status-go)",
    border: "color-mix(in oklch, var(--color-status-go) 30%, transparent)",
    pulse: true,
  },
  "closing-soon": {
    label: "Closing Soon",
    dotColor: "var(--color-accent-2)",   /* oklch(0.78 0.180 70) — exact Wayfare amber */
    bg: "color-mix(in oklch, var(--color-accent-2) 12%, transparent)",
    color: "var(--color-accent-2)",
    border: "color-mix(in oklch, var(--color-accent-2) 30%, transparent)",
  },
  "closing soon": {
    label: "Closing Soon",
    dotColor: "var(--color-accent-2)",
    bg: "color-mix(in oklch, var(--color-accent-2) 12%, transparent)",
    color: "var(--color-accent-2)",
    border: "color-mix(in oklch, var(--color-accent-2) 30%, transparent)",
  },
  closed: {
    label: "Closed",
    dotColor: "var(--color-status-wait)",  /* oklch(0.66 0.235 25) — exact Wayfare red */
    bg: "color-mix(in oklch, var(--color-status-wait) 12%, transparent)",
    color: "var(--color-status-wait)",
    border: "color-mix(in oklch, var(--color-status-wait) 30%, transparent)",
  },
  remote: {
    label: "Remote",
    dotColor: "var(--accent-primary)",
    bg: "rgba(201, 205, 211, 0.08)",
    color: "var(--accent-primary)",
    border: "rgba(201, 205, 211, 0.20)",
  },
  hybrid: {
    label: "Hybrid",
    dotColor: "var(--status-warning)",
    bg: "rgba(224, 184, 92, 0.08)",
    color: "var(--status-warning)",
    border: "rgba(224, 184, 92, 0.20)",
  },
  internship: {
    label: "Internship",
    dotColor: "var(--accent-primary)",
    bg: "rgba(201, 205, 211, 0.08)",
    color: "var(--accent-primary)",
    border: "rgba(201, 205, 211, 0.20)",
  },
  "full-time": {
    label: "Full-Time",
    dotColor: "var(--accent-primary)",
    bg: "rgba(201, 205, 211, 0.08)",
    color: "var(--accent-primary)",
    border: "rgba(201, 205, 211, 0.20)",
  },
  fulltime: {
    label: "Full-Time",
    dotColor: "var(--accent-primary)",
    bg: "rgba(201, 205, 211, 0.08)",
    color: "var(--accent-primary)",
    border: "rgba(201, 205, 211, 0.20)",
  },
};

const DEFAULT_STATUS = {
  label: "",
  dotColor: "var(--color-status-hold)",
  bg: "color-mix(in oklch, var(--color-status-hold) 10%, transparent)",
  color: "var(--color-ink-mute)",
  border: "color-mix(in oklch, var(--color-status-hold) 20%, transparent)",
};

export function StatusTag({ status, className = "" }: StatusTagProps) {
  const key = status.toLowerCase();
  const cfg = STATUS_MAP[key] ?? { ...DEFAULT_STATUS, label: status };

  return (
    <span
      className={`status-tag ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 9px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.68rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight: 600,
        borderRadius: "var(--radius-xs, 2px)",
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dotColor,
          display: "inline-block",
          flexShrink: 0,
          ...(cfg.pulse
            ? { animation: "pulse-dot 1.4s ease-in-out infinite" }
            : {}),
        }}
      />
      {cfg.label || status}
    </span>
  );
}
