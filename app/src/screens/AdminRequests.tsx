// Bosh admin: ilovaga kirish so'rovlari. Har kishi alohida tasdiqlanadi; guruh bo'yicha belgilab, bir nechtasini birdan tasdiqlash mumkin.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckSquare, Square, UsersRound, X } from "lucide-react";
import { api } from "../lib/api";
import { tg } from "../lib/tg";
import { Avatar, ScreenHeader } from "../ui/kit";

type Req = { sid: string; name: string; tgName: string; user: string; level: string; group: { code: string; title: string; teacher: string } | null; at: string | null };
type Status = "pending" | "rejected";

const ago = (t: string | null) => {
  if (!t) return "";
  const m = Math.round((Date.now() - new Date(t).getTime()) / 6e4);
  return m < 60 ? `${m} daq.` : m < 1440 ? `${Math.round(m / 60)} soat` : m < 2880 ? "kecha" : `${Math.round(m / 1440)} kun`;
};

export function AdminRequests() {
  const [status, setStatus] = useState<Status>("pending");
  const [items, setItems] = useState<Req[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number | null>>({ pending: null, rejected: null });
  const [group, setGroup] = useState<string>("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async (s: Status) => {
    setItems(null); setErr(""); setSel(new Set());
    try {
      const r = await api<{ items: Req[] }>("adminRequests", { status: s });
      setItems(r.items);
      setCounts((c) => ({ ...c, [s]: r.items.length }));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setItems([]); }
  }, []);
  useEffect(() => { void load(status); }, [status, load]);

  const groups = useMemo(() => {
    const m = new Map<string, { title: string; n: number }>();
    for (const r of items || []) { const k = r.group?.code || "-"; const g = m.get(k) || { title: r.group?.title || "Guruhsiz", n: 0 }; g.n++; m.set(k, g); }
    return [...m.entries()];
  }, [items]);
  const shown = (items || []).filter((r) => group === "all" || (r.group?.code || "-") === group);
  const allSel = shown.length > 0 && shown.every((r) => sel.has(r.sid));

  const decide = async (sids: string[], next: "approved" | "rejected" | "pending") => {
    if (!sids.length) return;
    setBusy(true);
    try {
      await api("adminApprove", { sids, status: next });
      tg.haptic(next === "rejected" ? "error" : "success");
      setItems((it) => (it || []).filter((r) => !sids.includes(r.sid)));
      setCounts((c) => ({ ...c, [status]: Math.max(0, (c[status] || 0) - sids.length) }));
      setSel(new Set());
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  const toggle = (sid: string) => setSel((s) => { const n = new Set(s); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });

  return (
    <main className="screen">
      <ScreenHeader title="Kirish so'rovlari" ar="الطَّلَبَاتُ الْجَدِيدَةُ" />
      <div className="seg" role="tablist">
        {(["pending", "rejected"] as Status[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
            {s === "pending" ? "Kutayotganlar" : "Rad etilganlar"}{counts[s] ? <em>{counts[s]}</em> : null}
          </button>
        ))}
      </div>

      {groups.length > 1 && (
        <div className="chips" role="group" aria-label="Guruh bo'yicha">
          <button type="button" className={group === "all" ? "on" : ""} onClick={() => setGroup("all")}>Hammasi <b>{items?.length}</b></button>
          {groups.map(([k, g]) => <button key={k} type="button" className={group === k ? "on" : ""} onClick={() => setGroup(k)}>{g.title} <b>{g.n}</b></button>)}
        </div>
      )}

      {err && <p className="err" role="alert">{err}</p>}
      {items === null && <p className="muted pad">Yuklanmoqda…</p>}
      {items && !shown.length && <p className="muted pad">{status === "pending" ? "Yangi so'rov yo'q." : "Rad etilgan so'rov yo'q."}</p>}

      {shown.length > 1 && (
        <button type="button" className="selall" onClick={() => setSel(allSel ? new Set() : new Set(shown.map((r) => r.sid)))}>
          {allSel ? <CheckSquare size={20} aria-hidden /> : <Square size={20} aria-hidden />}
          {group === "all" ? "Hammasini belgilash" : "Shu guruhdagilarni belgilash"}
        </button>
      )}

      {shown.map((r) => (
        <article key={r.sid} className={`req${sel.has(r.sid) ? " picked" : ""}`}>
          <div className="req-top">
            <button type="button" className="pick" aria-pressed={sel.has(r.sid)} aria-label="Belgilash" onClick={() => toggle(r.sid)}>
              {sel.has(r.sid) ? <CheckSquare size={22} aria-hidden /> : <Square size={22} aria-hidden />}
            </button>
            <Avatar name={r.name || r.tgName} size={46} />
            <div className="req-who"><b>{r.name || r.tgName || "Ismsiz"}</b><small>{r.user ? `@${r.user}` : "username yo'q"}{r.level ? ` · ${r.level}` : ""}</small></div>
            <span className="req-tm">{ago(r.at)}</span>
          </div>
          <div className="req-grp"><UsersRound size={16} aria-hidden />{r.group ? `Guruh: ${r.group.title}${r.group.teacher ? ` · ustoz ${r.group.teacher}` : ""}` : "Guruhsiz — o'zi ro'yxatdan o'tgan"}</div>
          <div className="req-act">
            <button type="button" className="btn good" disabled={busy} onClick={() => void decide([r.sid], "approved")}><Check size={18} aria-hidden />Tasdiqlash</button>
            {status === "pending"
              ? <button type="button" className="btn ghost bad" disabled={busy} onClick={() => void decide([r.sid], "rejected")}><X size={18} aria-hidden />Rad etish</button>
              : <button type="button" className="btn ghost" disabled={busy} onClick={() => void decide([r.sid], "pending")}>Kutishga qaytarish</button>}
          </div>
        </article>
      ))}

      {sel.size > 0 && (
        <div className="bulkbar">
          <span>{sel.size} ta belgilandi</span>
          <button type="button" className="btn good" disabled={busy} onClick={() => void decide([...sel], "approved")}><Check size={18} aria-hidden />Tasdiqlash</button>
        </div>
      )}
    </main>
  );
}
