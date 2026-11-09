// 1-paket: bosh admin uchun ilova xatolari (server «adminErrors», 14-versiya) — xato matni va ekran bo'yicha jamlangan,
// nechta o'quvchida va necha marta chiqqani, oxirgi vaqt, ilova versiyasi va telefon turi. Batafsil — bosilganda.
import { useCallback, useEffect, useState } from "react";
import { Bug, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import { Empty, ScreenHeader } from "../ui/kit";

type It = { kind: string; msg: string; screen: string; n: number; people: number; last: string; ver: string; ua: string; stack?: string };
const KIND: Record<string, string> = { js: "Kod", promise: "Kod (va'da)", react: "Ekran", api: "Server", chunk: "Yuklash" };
const ago = (t: string) => {
  const m = Math.round((Date.now() - new Date(t).getTime()) / 6e4);
  return m < 60 ? `${m} daq. oldin` : m < 1440 ? `${Math.round(m / 60)} soat oldin` : `${Math.round(m / 1440)} kun oldin`;
};

export function AdminErrorsScreen() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<{ total: number; items: It[] } | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async (n: number) => {
    setD(null); setErr("");
    try { setD(await api<{ total: number; items: It[] }>("adminErrors", { days: n })); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, []);
  useEffect(() => { void load(days); }, [days, load]);
  return (
    <main className="screen">
      <ScreenHeader title="Ilova xatolari" ar="الْأَخْطَاءُ التِّقْنِيَّةُ" />
      <div className="seg small" role="tablist" aria-label="Davr">
        {[1, 7, 30].map((n) => <button key={n} type="button" role="tab" aria-selected={days === n} className={days === n ? "on" : ""} onClick={() => setDays(n)}>{n === 1 ? "Bugun" : `${n} kun`}</button>)}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {!d && !err && <p className="muted pad">Yuklanmoqda…</p>}
      {d && <p className="ae-sum">{d.items.length ? `${d.total} marta · ${d.items.length} xil xato` : ""}</p>}
      {d && !d.items.length && <Empty icon={<Bug size={28} />} title="Xato yo'q" text="Bu davrda o'quvchilar telefonida xato qayd etilmadi." />}
      <ul className="ae-list">
        {d?.items.map((x, k) => (
          <li key={k} className={`card ae-it ${open === k ? "open" : ""}`}>
            <button type="button" className="ae-h" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)}>
              <span className="ae-k">{KIND[x.kind] || x.kind}</span>
              <b>{x.msg}</b>
              <small>{x.screen || "—"} · {x.people} o'quvchida · {x.n} marta · {ago(x.last)}</small>
              <ChevronDown size={18} aria-hidden className="ae-chev" />
            </button>
            {open === k && (
              <div className="ae-d">
                <p><b>Versiya:</b> {x.ver || "—"}</p>
                <p><b>Qurilma:</b> {x.ua || "—"}</p>
                {x.stack && <pre>{x.stack}</pre>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
