// Birinchi hafta yo'li (yangi o'quvchilar): 7 kun × 3 vazifa, bugungi vazifalar ketma-ket ochiladi. Eski ilova bilan bir xil:
// f.ob.wk = {start, done: {"kun:i": 1}, hide?}, f.ob.intro; ustozga _sum.ob (summary.ts). Vazifa «Boshlash» bosilganda bajarilgan sanaladi.
import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { loadData } from "../lib/data";
import type { Book } from "../lib/progress";
import { dayKey } from "../lib/progress";
import { pctOf, rulesOf } from "../lib/next";
import { knownOf, store } from "../lib/store";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { useArm } from "../ui/arm";
import { toast } from "../ui/Toast";

type Wk = { start: number; done: Record<string, number>; hide?: boolean };
const ACT: Record<string, [string, string]> = {
  words: ["Yangi so'zlar", "tinglang va o'qing"], cards: ["Kartochkalar", "so'zlarni eslab qoling"], games: ["O'yin", "so'zlarni o'yin bilan mustahkamlang"],
  test: ["Test", "o'zingizni sinab ko'ring"], rules: ["Qoida", "darsning grammatikasi"], shadow: ["Takrorlash", "gaplarni ovoz chiqarib ayting"],
  mults: ["Multfilm", "bitta qisqa multfilm ko'ring"], group: ["Guruhga qo'shiling", "ustozingiz bergan kod bilan"], league: ["Reyting", "haftalik reytingdagi o'rningiz"],
  errors: ["Xatolar daftari", "xato qilgan so'zlarni takrorlang"], duel: ["Bellashuv", "do'stingizni chaqiring"],
};
const PLAN = [["words", "cards", "shadow"], ["rules", "games", "shadow"], ["mults", "test", "shadow"], ["group", "words", "games"], ["league", "errors", "shadow"], ["duel", "words", "test"], ["words", "games", "shadow"]];
const DAY = ["Tanishuv", "Qoidalar", "Multfilm", "Guruh", "Reyting", "Bellashuv", "Yakun"];
const BOOK_TASK = ["words", "cards", "games", "test", "rules"];

/** Bosh sahifa yuklanganda (bootSync'dan keyin): hafta yo'li hali yaratilmagan bo'lsa — yangi o'quvchiga ochiladi, eskisiga yashirin */
export function ensureWeek() {
  if (store.get("f.ob.intro", 0)) return;
  const days = store.get<Record<string, number>>("a1.days", {});
  const isNew = !Object.keys(days).some((k) => days[k] > 0 && k !== dayKey());
  store.set("f.ob.intro", 1);
  if (!store.get<Wk | null>("f.ob.wk", null)) store.set("f.ob.wk", { start: Date.now(), done: {}, ...(isNew ? {} : { hide: true }) });
}
const obDay = (W: Wk) => Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(W.start).setHours(0, 0, 0, 0)) / 864e5) + 1;

type LBook = Book & { units: (Book["units"][number] & { lbl?: string })[] };
export function WeekCard({ bookId }: { bookId: string }) {
  const { me } = useSession();
  const [book, setBook] = useState<LBook | null>(null);
  useEffect(() => { let on = true; void loadData<LBook>(`books/${bookId}`).then((b) => on && setBook(b)).catch(() => {}); return () => { on = false; }; }, [bookId]);
  const { go, setTab } = useNav();
  const { armed, fire } = useArm();
  const W = store.get<Wk | null>("f.ob.wk", null);
  if (!W || W.hide || !book) return null;
  const d = obDay(W);
  if (d > 7 || d < 1) return null;
  const hasR = book.units.some((u) => rulesOf(book, u.n).length);
  const T = PLAN[d - 1].map((k) => (k === "rules" && !hasR ? "test" : k === "group" && me?.group ? "cards" : k));
  const done = T.map((_, i) => !!W.done[`${d}:${i}`]);
  const nDone = done.filter(Boolean).length;
  // joriy vahda: so'zlari hali to'liq yodlanmagan birinchi vahda
  const u: LBook["units"][number] = book.units.find((x) => pctOf(x.words, knownOf(book.id, x.n)) < 100) || book.units[book.units.length - 1];
  const run = (i: number, k: string) => {
    const w = store.get<Wk>("f.ob.wk", W); w.done[`${d}:${i}`] = 1; store.set("f.ob.wk", w);
    const p = { book: book.id, unit: u.n };
    if (k === "words") go("unit", p); else if (k === "cards") go("cards", p); else if (k === "test") go("wtest", p);
    else if (k === "rules") go("theory", p); else if (k === "games") setTab("practice"); else if (k === "shadow") setTab("practice");
    else if (k === "group") setTab("profile"); else go(k);
  };
  let open = true;
  return (
    <section className="wk-card" aria-label="Birinchi hafta yo'li">
      <div className="wk-h"><b>Birinchi hafta · {d}-kun</b><span>{nDone} / {T.length}</span></div>
      <span className="wk-bar"><i style={{ width: `${(nDone / T.length) * 100}%` }} /></span>
      {nDone === T.length ? (
        <p className="wk-done"><Check size={18} strokeWidth={3} aria-hidden />Bugungi yo'l bajarildi. {d < 7 ? `Ertaga: ${DAY[d]}.` : "Tabriklaymiz — birinchi haftani tugatdingiz!"}</p>
      ) : (
        <ol className="wk-list">
          {T.map((k, i) => {
            const dn = done[i], lock = !dn && !open;
            if (!dn) open = false;
            const sub = BOOK_TASK.includes(k) ? `${book.title} · ${u.lbl || `${u.n}-vahda`}` : ACT[k][1];
            return (
              <li key={i} className={dn ? "dn" : lock ? "lock" : ""}>
                <span className="wk-dot">{dn ? <Check size={14} strokeWidth={3} aria-hidden /> : lock ? <Lock size={13} aria-hidden /> : null}</span>
                <span className="wk-t"><b>{ACT[k][0]}</b><small>{sub}</small></span>
                {!dn && (lock ? <small className="wk-later">keyin ochiladi</small> : <button type="button" className="btn primary sm" onClick={() => run(i, k)}>Boshlash</button>)}
              </li>
            );
          })}
        </ol>
      )}
      {d < 7 && <div className="wk-days">{DAY.map((nm, k) => <span key={k} className={k + 1 < d ? "past" : k + 1 === d ? "now" : ""}><b>{k + 1}</b>{nm}</span>)}</div>}
      <button type="button" className={`wk-hide ${armed === "h" ? "armed" : ""}`} onClick={() => { if (!fire("h")) return; store.set("f.ob.wk", { ...W, hide: true }); toast("Hafta yo'li yashirildi"); setTab("home"); }}>
        {armed === "h" ? "Yashirilsinmi? Yana bosing" : "Yashirish"}
      </button>
    </section>
  );
}
