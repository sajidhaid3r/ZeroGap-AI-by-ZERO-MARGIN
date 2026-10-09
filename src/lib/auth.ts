import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LocalUser = { id: string; email: string; display_name: string };

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          display_name: session.user.user_metadata?.display_name || session.user.email!.split("@")[0],
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          display_name: session.user.user_metadata?.display_name || session.user.email!.split("@")[0],
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, session: user ? { user } : null };
}

export async function clearUser() {
  await supabase.auth.signOut();
}

export async function logActivity(type: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  const { localDb } = await import("@/lib/local-db");
  localDb.logActivity(session.user.id, type);
}

export function calculateStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = today.toISOString().slice(0, 10);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (unique[0] !== todayStr && unique[0] !== yStr) return 0;
  let streak = 1;
  let cursor = new Date(unique[0]);
  for (let i = 1; i < unique.length; i++) {
    cursor.setDate(cursor.getDate() - 1);
    if (unique[i] === cursor.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
}
