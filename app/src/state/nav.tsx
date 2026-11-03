// Ekranlar orasida yurish: pastki menyu bo'limlari (tab) va ichma-ich ekranlar (stack).
// Telefon "orqaga" tugmasi ham ishlashi uchun brauzer tarixi bilan bog'langan.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Tab = "home" | "lessons" | "practice" | "marks" | "profile";
export type Route = { view: string; params?: Record<string, unknown> };
type Nav = { tab: Tab; route: Route; depth: number; go: (view: string, params?: Record<string, unknown>) => void; back: () => void; setTab: (t: Tab) => void };

const Ctx = createContext<Nav | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>("home");
  const [stack, setStack] = useState<Route[]>([{ view: "home" }]);
  const depth = useRef(0);

  useEffect(() => {
    const onPop = () => {
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      depth.current = Math.max(0, depth.current - 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((view: string, params?: Record<string, unknown>) => {
    history.pushState({ d: ++depth.current }, "");
    setStack((s) => [...s, { view, params }]);
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => {
    if (depth.current > 0) history.back();
  }, []);

  const setTab = useCallback((t: Tab) => {
    if (depth.current > 0) history.go(-depth.current);
    depth.current = 0;
    setTabState(t);
    setStack([{ view: t }]);
    window.scrollTo(0, 0);
  }, []);

  return <Ctx.Provider value={{ tab, route: stack[stack.length - 1], depth: stack.length - 1, go, back, setTab }}>{children}</Ctx.Provider>;
}

export function useNav() {
  const n = useContext(Ctx);
  if (!n) throw new Error("NavProvider yo'q");
  return n;
}
