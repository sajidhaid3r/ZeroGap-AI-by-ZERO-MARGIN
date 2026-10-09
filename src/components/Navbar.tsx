import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAuth, clearUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Brain, LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { getIssueLabel } from "@/lib/issueDate";

const NAV = [
  { to: "/" as const, label: "Home", exact: true },
  { to: "/resume-analysis" as const, label: "Resume" },
  { to: "/opportunities" as const, label: "Opportunities" },
  { to: "/market-mapping" as const, label: "Markets" },
  { to: "/confidence-coach" as const, label: "Coach" },
  { to: "/localized-intelligence" as const, label: "Local" },
  { to: "/micro-roadmap" as const, label: "Roadmap" },
  { to: "/campus-partnership" as const, label: "Campus" },
  { to: "/agent" as const, label: "Agent" },
];

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  // Computed once per mount — updates each page load as calendar rolls over
  const { issueLabel, seasonYear } = useMemo(() => getIssueLabel(), []);

  useEffect(() => {
    const saved = localStorage.getItem("zg_theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("zg_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const logout = async () => {
    clearUser();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border/60">
      <div className="max-w-[1320px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <span className="font-display font-extrabold text-xl tracking-tight text-foreground whitespace-nowrap">
            <span className="text-primary font-serif">✱ </span>ZEROGAP<span className="font-light text-muted-foreground"> AI</span>
          </span>
        </Link>

        <span className="hidden xl:inline font-serif italic font-light text-sm text-muted-foreground/80">
          {issueLabel} &middot; {seasonYear}
        </span>

        <nav className="hidden lg:flex items-center gap-5 text-xs font-mono uppercase tracking-widest">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={n.exact ? { exact: true } : undefined}
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-semibold underline underline-offset-4 decoration-primary" }}
            >
              {n.label}
            </Link>
          ))}

          {user && (
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground font-semibold underline underline-offset-4 decoration-primary" }}>
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="size-8 rounded border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          {user ? (
            <>
              <span className="hidden md:inline text-xs font-mono text-muted-foreground max-w-[160px] truncate">{user.email}</span>
              <Button size="sm" variant="ghost" onClick={logout} title="Sign out" className="font-mono text-xs uppercase">
                <LogOut className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" asChild className="bg-primary text-primary-foreground hover:opacity-90 font-mono text-xs uppercase tracking-wider rounded-sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden size-9 rounded-md border border-border/60 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <nav className="container mx-auto px-4 py-3 flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={n.exact ? { exact: true } : undefined}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm hover:text-primary"
                activeProps={{ className: "text-primary font-semibold" }}
              >
                {n.label}
              </Link>
            ))}

            {user && (
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm hover:text-primary"
                activeProps={{ className: "text-primary font-semibold" }}
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
