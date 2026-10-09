import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export function Leaderboard({ userId, college, city }: { userId: string; college?: string | null; city?: string | null }) {
  return (
    <Card className="p-5 gradient-card border-border/60">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="size-4 text-warning" />
        <div className="font-semibold text-sm">Leaderboard</div>
      </div>
      <div className="text-xs text-muted-foreground text-center py-6">
        Run a resume analysis to enter the leaderboard.
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2 italic">
        Anonymous · names hidden · only score & college shown
      </p>
    </Card>
  );
}
