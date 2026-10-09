import confetti from "canvas-confetti";
import { localDb } from "@/lib/local-db";

export type StreakRow = {
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
};

export type StreakUpdate = {
  row: StreakRow;
  action: "same" | "incremented" | "reset";
  milestone: 3 | 7 | 30 | null;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export async function pingStreak(userId: string): Promise<StreakUpdate | null> {
  const today = todayStr();
  const existing = localDb.getStreak(userId);
  const last = existing.last_active_date;

  if (last === today) {
    return { row: existing, action: "same", milestone: null };
  }

  let newCount = existing.streak_count;
  let action: "incremented" | "reset" = "incremented";

  if (last) {
    const diff = Math.round((+new Date(today) - +new Date(last)) / 86_400_000);
    if (diff === 1) newCount = existing.streak_count + 1;
    else if (diff > 1) { newCount = 1; action = "reset"; }
  } else {
    newCount = 1;
  }

  const longest = Math.max(existing.longest_streak ?? 0, newCount);
  const updated: StreakRow = { streak_count: newCount, longest_streak: longest, last_active_date: today };
  localDb.saveStreak(userId, updated);

  let milestone: 3 | 7 | 30 | null = null;
  if (newCount === 3) milestone = 3;
  else if (newCount === 7) milestone = 7;
  else if (newCount === 30) milestone = 30;

  return { row: updated, action, milestone };
}

export function fireConfetti(intensity: "low" | "high" = "low") {
  confetti({
    particleCount: intensity === "high" ? 200 : 80,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#F5F4F1", "#C9CDD3", "#6FCF97", "#E0B85C"],
  });
}
