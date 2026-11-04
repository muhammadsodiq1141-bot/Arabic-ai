// Kim kirgan va unga ilova ochiqmi: ro'yxatdan o'tmagan / tasdiq kutmoqda / rad etilgan / tayyor.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, hasCredentials } from "../lib/api";

export type Access = "pending" | "approved" | "rejected";
export type Me = {
  id: string;
  name: string;
  full_name: string | null;
  login: string | null;
  level: string | null;
  group: { code: string; title: string; teacher: boolean } | null;
  admin: boolean;
  tg?: number | null;
  access: Access;
  teacher?: boolean; // ustozlik ruxsati (role=teacher, guruh egasi yoki admin)
  myGroups?: { code: string; title: string }[]; // ustoz ochgan guruhlar
  teacherReq?: boolean; // ustozlik so'rovi yuborilgan, admin ko'rmoqda
};
export type Phase = "loading" | "noauth" | "register" | "pending" | "rejected" | "ready" | "error";

type Session = { phase: Phase; me: Me | null; error: string; refresh: () => Promise<void> };
const Ctx = createContext<Session | null>(null);

const phaseOf = (m: Me): Phase => (!m.full_name ? "register" : m.access === "approved" ? "ready" : m.access === "rejected" ? "rejected" : "pending");

export function SessionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!hasCredentials()) { setPhase("noauth"); return; }
    try {
      const m = await api<Me>("me");
      setMe(m);
      setPhase(phaseOf(m));
      setError("");
    } catch (e) {
      const access = e instanceof ApiError ? (e.data.access as Access | undefined) : undefined;
      if (access === "pending" || access === "rejected") { setPhase(access); return; }
      if (e instanceof ApiError && e.status === 401) { setPhase("noauth"); setError(e.message); return; }
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return <Ctx.Provider value={{ phase, me, error, refresh }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("SessionProvider yo'q");
  return s;
}
