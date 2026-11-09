// Qisqa xabar (masalan qulf sababi): ekran pastida kamida 4 soniya (uzun matnda ko'proq) ko'rinadi, ekran o'qiydigan dastur ham aytadi.
import { useEffect, useState } from "react";

let push: ((m: string) => void) | null = null;
export const toast = (m: string) => push?.(m);
/** Ekran almashganda eski xabar boshqa ekranni to'sib qolmasin */
export const clearToast = () => push?.("");

export function Toaster() {
  const [msg, setMsg] = useState<{ t: string; k: number } | null>(null);
  useEffect(() => {
    let h: number | undefined;
    push = (t) => {
      clearTimeout(h);
      if (!t) { setMsg(null); return; }
      setMsg({ t, k: Date.now() });
      h = window.setTimeout(() => setMsg(null), Math.min(8000, Math.max(4000, t.length * 70))); // 1-paket D16
    };
    return () => { push = null; clearTimeout(h); };
  }, []);
  return <div className="toast-wrap" role="status" aria-live="polite">{msg && <div key={msg.k} className="toast">{msg.t}</div>}</div>;
}
