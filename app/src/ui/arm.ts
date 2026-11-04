// Xavfli tugma uchun "ikki marta bosib tasdiqlash": birinchi bosish qurollantiradi, 4 soniyada o'zi qaytadi.
import { useEffect, useState } from "react";

export function useArm(ms = 4000) {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const h = setTimeout(() => setArmed(null), ms);
    return () => clearTimeout(h);
  }, [armed, ms]);
  /** true — ikkinchi bosish (bajarish mumkin); false — endi qurollantirildi */
  const fire = (k: string) => { if (armed === k) { setArmed(null); return true; } setArmed(k); return false; };
  return { armed, fire };
}
