import { useEffect, useRef, useState } from "react";

type Props = {
  to: number;
  duration?: number;
  suffix?: string;
  format?: (n: number) => string;
  liveTickMs?: number;
};

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export function AnimatedCounter({ to, duration = 2000, suffix = "", format, liveTickMs }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);
  const liveRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setValue(to); return; }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            setValue(Math.round(easeOutQuart(t) * to));
            if (t < 1) requestAnimationFrame(tick);
            else if (liveTickMs) {
              const id = window.setInterval(() => {
                liveRef.current += 1;
                setValue(to + liveRef.current);
              }, liveTickMs);
              (el as any).__liveId = id;
            }
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => {
      io.disconnect();
      if ((el as any).__liveId) clearInterval((el as any).__liveId);
    };
  }, [to, duration, liveTickMs]);

  const display = format ? format(value) : value.toLocaleString();
  return <span ref={ref}>{display}{suffix}</span>;
}
