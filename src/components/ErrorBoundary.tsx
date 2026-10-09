import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ZeroGap Error]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h2 className="font-display text-2xl mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This section hit an error. Your data is safe.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => this.setState({ hasError: false, message: "" })} className="gradient-silver text-primary-foreground">
              Try again
            </Button>
            <Button variant="outline" asChild>
              <a href="/">Go home</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
