import { useEffect, useState } from "react";

export function useNow(refreshMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const updateNow = () => setNow(new Date());

    updateNow();
    const id = window.setInterval(updateNow, refreshMs);
    const onVisible = () => {
      if (!document.hidden) updateNow();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshMs]);

  return now;
}
