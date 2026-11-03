// Sonni 0 dan sanab chiqish (olingan yulduzcha). Harakatni kamaytirish sozlamasida darhol oxirgi son.
import { useEffect, useState } from "react";

export function CountUp({ to, ms = 700, prefix = "+" }: { to: number; ms?: number; prefix?: string }) {
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) { setV(to); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, reduce]);
  return <span className="countup" aria-label={`${prefix}${to}`}>{prefix}{v}</span>;
}
