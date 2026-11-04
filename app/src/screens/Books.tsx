// Kitoblar: darajalar bo'yicha (A1–C1, Madina 1–2), har birida yodlangan so'zlar foizi. Bosilsa — shu kitob tanlanadi
// (a1.book — eski ilova bilan umumiy kalit; natijalar kitob bo'yicha alohida saqlanadi, hech narsa o'chmaydi).
import { Check } from "lucide-react";
import { store } from "../lib/store";
import { localKeys } from "../lib/summary";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { useBookIndex } from "./Profile";
import { bookOfLevel } from "./Unit";

const LV: [string, string][] = [["A1", "Boshlang'ich"], ["A2", "Asosiy"], ["B1", "O'rta"], ["B2", "O'rtadan yuqori"], ["C1", "Yuqori"]];
const BOOK_LEVEL: Record<string, string> = { a1: "A1", md1: "A1", a2: "A2", md2: "A2", b1: "B1", b2: "B2", c1: "C1" };
const BOOK_TAG: Record<string, string> = { a1: "A1", a2: "A2", b1: "B1", b2: "B2", c1: "C1", md1: "M1", md2: "M2" };
const BOOK_COL: Record<string, string> = { a1: "#4F5B35", a2: "#6B5536", b1: "#5E5A3A", b2: "#3E5446", c1: "#5A4030", md1: "#2F5560", md2: "#5B3F55" };

/** Kitob bo'yicha yodlangan so'zlar soni (a1.known.N yoki bk.<id>.known.N) */
const knownIn = (id: string) => {
  const re = id === "a1" ? /^a1\.known\.\d+$/ : new RegExp(`^bk\\.${id}\\.known\\.\\d+$`);
  return localKeys(re).reduce((a, k) => a + Object.keys(store.get<Record<string, unknown>>(k, {})).length, 0);
};

export function BooksScreen() {
  const { me } = useSession();
  const { back, setTab } = useNav();
  const books = useBookIndex();
  const cur = store.get("a1.book", bookOfLevel(me?.level));
  const kn = Object.fromEntries((books || []).map((b) => [b.id, knownIn(b.id)]));
  const total = Object.values(kn).reduce((a, b) => a + b, 0);
  const pick = (id: string, title: string) => {
    tg.haptic();
    if (id === cur) { back(); return; }
    store.set("a1.book", id);
    toast(`«${title}» tanlandi`);
    setTab("lessons");
  };
  return (
    <main className="screen">
      <ScreenHeader title="Kitoblar" ar="الْكُتُبُ" />
      <section className="t-stats bk-stats" aria-label="Umumiy">
        <div><b>{books ? total : "…"}</b><span>so'z yodlandi</span></div>
        <div><b>{books ? books.length : "…"}</b><span>kitob</span></div>
      </section>
      {!books && <p className="muted pad">Yuklanmoqda…</p>}
      {books && LV.map(([L, nm]) => {
        const bs = books.filter((b) => BOOK_LEVEL[b.id] === L);
        if (!bs.length) return null;
        return (
          <section key={L} className="bk-lv" aria-label={`${L} · ${nm}`}>
            <h2 className="t-h"><span className="bk-lvb">{L}</span>{nm}</h2>
            {bs.map((b) => {
              const p = b.words ? Math.min(100, Math.round((kn[b.id] / b.words) * 100)) : 0;
              const on = b.id === cur;
              return (
                <button key={b.id} type="button" className={`bk-row ${on ? "on" : ""}`} aria-current={on ? "true" : undefined} onClick={() => pick(b.id, b.title)}>
                  <span className="bk-cover" style={{ background: BOOK_COL[b.id] || "#4F5B35" }} aria-hidden>{BOOK_TAG[b.id] || b.id.toUpperCase()}</span>
                  <span className="bk-i">
                    <span className="bk-t"><b>{b.title}</b><em className={p >= 100 ? "ok" : ""}>{p >= 100 && <Check size={13} strokeWidth={3} aria-hidden />}{p}%</em></span>
                    <small>{b.units} dars · {b.words} so'z{on ? " · hozir o'qilmoqda" : ""}</small>
                    <span className="bk-bar" aria-hidden><i style={{ width: `${p}%` }} /></span>
                  </span>
                </button>
              );
            })}
          </section>
        );
      })}
      <p className="pf-hint">Kitobni almashtirsangiz, oldingi kitobdagi natijalaringiz saqlanib qoladi.</p>
    </main>
  );
}
