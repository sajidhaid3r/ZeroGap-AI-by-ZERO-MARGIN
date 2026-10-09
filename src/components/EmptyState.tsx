import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface Props {
  emoji?: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  children?: ReactNode;
}

export function EmptyState({ emoji = "✨", title, description, ctaText, ctaHref, ctaOnClick, children }: Props) {
  return (
    <div className="glass-card text-center py-12 px-6 max-w-lg mx-auto">
      <div className="text-5xl mb-3">{emoji}</div>
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">{description}</p>
      {ctaText && ctaHref && (
        <Button asChild className="gradient-silver text-primary-foreground">
          <Link to={ctaHref as never}>{ctaText}</Link>
        </Button>
      )}
      {ctaText && ctaOnClick && (
        <Button onClick={ctaOnClick} className="gradient-silver text-primary-foreground">{ctaText}</Button>
      )}
      {children}
    </div>
  );
}
