import React from "react";

interface NumberedSectionProps {
  number: string | number;
  label: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function NumberedSection({
  number,
  label,
  title,
  description,
  children,
  className = "",
}: NumberedSectionProps) {
  const numStr = String(number).padStart(2, "0");

  return (
    <section className={`py-12 border-t border-border/60 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="md:w-1/3 shrink-0">
          <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">
            {numStr} — {label}
          </div>
          {title && (
            <h3 className="font-display text-2xl md:text-3xl text-foreground font-normal leading-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              {description}
            </p>
          )}
        </div>
        <div className="md:w-2/3">{children}</div>
      </div>
    </section>
  );
}
