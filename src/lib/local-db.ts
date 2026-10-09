// Simple localStorage-based data store replacing Supabase queries

export type ResumeAnalysis = {
  id: string;
  user_id: string;
  file_name: string;
  ats_score: number;
  trend_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missing_keywords: string[];
  created_at: string;
};

export type ActivityLog = {
  activity_date: string;
  activity_type: string;
  created_at: string;
};

export type StreakRow = {
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
};

function key(table: string, userId: string) {
  return `zerogap_${table}_${userId}`;
}

export const localDb = {
  // Resume analyses
  getAnalyses(userId: string): ResumeAnalysis[] {
    try { return JSON.parse(localStorage.getItem(key("analyses", userId)) ?? "[]"); } catch { return []; }
  },
  saveAnalysis(userId: string, data: Omit<ResumeAnalysis, "id" | "created_at">) {
    const rows = localDb.getAnalyses(userId);
    const row: ResumeAnalysis = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    rows.unshift(row);
    localStorage.setItem(key("analyses", userId), JSON.stringify(rows.slice(0, 50)));
    return row;
  },

  // Activity log
  getActivity(userId: string): ActivityLog[] {
    try { return JSON.parse(localStorage.getItem(key("activity", userId)) ?? "[]"); } catch { return []; }
  },
  logActivity(userId: string, type: string) {
    const rows = localDb.getActivity(userId);
    const today = new Date().toISOString().slice(0, 10);
    rows.unshift({ activity_date: today, activity_type: type, created_at: new Date().toISOString() });
    localStorage.setItem(key("activity", userId), JSON.stringify(rows.slice(0, 200)));
  },

  // Streak
  getStreak(userId: string): StreakRow {
    try {
      const raw = localStorage.getItem(key("streak", userId));
      return raw ? JSON.parse(raw) : { streak_count: 0, longest_streak: 0, last_active_date: null };
    } catch { return { streak_count: 0, longest_streak: 0, last_active_date: null }; }
  },
  saveStreak(userId: string, row: StreakRow) {
    localStorage.setItem(key("streak", userId), JSON.stringify(row));
  },

  // Roadmap tasks
  getTasks(userId: string): { id: string; completed: boolean; title: string }[] {
    try { return JSON.parse(localStorage.getItem(key("tasks", userId)) ?? "[]"); } catch { return []; }
  },
  saveTasks(userId: string, tasks: { id: string; completed: boolean; title: string }[]) {
    localStorage.setItem(key("tasks", userId), JSON.stringify(tasks));
  },
};
