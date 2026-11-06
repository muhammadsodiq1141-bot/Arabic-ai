// Birinchi hafta yo'li (yangi o'quvchilar): 7 kun × 3 vazifa, bugungi vazifalar ketma-ket ochiladi. Eski ilova bilan bir xil:
// f.ob.wk = {start, done: {"kun:i": 1}, hide?}, f.ob.intro; ustozga _sum.ob (summary.ts). Vazifa «Boshlash» bosilganda bajarilgan sanaladi.
// 15-partiya (M2): 8–28-kunlar — «4 haftalik yo'l»: har haftada mavzu va 3 ta vazifa (done: {"w2:0": 1}); sanaladiganlari o'zi hisoblanadi
// (dars kunlari — {BK}lessons, tinglash/gapirish kunlari — x.sm, qayta baholash — f.conf). TMLT, 5-bob: o'zini boshqarishni o'rgatish.
import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { confAll } from "../lib/goal";
import { dayNum } from "../lib/practice";
import { bkKey } from "../lib/progress";
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

/** Bosh sahifa yuklanganda (bootSync'dan keyin). Eski o'quvchi: tanishuvsiz, hafta yo'li yashirin. Yangi o'quvchi: true —
 *  tanishuv ko'rsatiladi, f.ob.intro va hafta yo'li tanishuv yopilganda yoziladi (introDone, eskidagi obIntroClose kabi) */
export function ensureWeek(): boolean {
  if (store.get("f.ob.intro", 0)) return false;
  const days = store.get<Record<string, number>>("a1.days", {});
  const isNew = !Object.keys(days).some((k) => days[k] > 0 && k !== dayKey());
  if (isNew) return true;
  store.set("f.ob.intro", 1);
  if (!store.get<Wk | null>("f.ob.wk", null)) store.set("f.ob.wk", { start: Date.now(), done: {}, hide: true });
  return false;
}
export function introDone() {
  store.set("f.ob.intro", 1);
  if (!store.get<Wk | null>("f.ob.wk", null)) store.set("f.ob.wk", { start: Date.now(), done: {} });
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
  if (d > 7 && d <= 28) return <PathCard W={W} d={d} book={book} />;
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

// ===== 4 haftalik yo'l: 2–4-haftalar (15-partiya, M2) =====
type Ms = { t: string; need?: number; n?: number; run: () => void; done?: boolean };
function PathCard({ W, d, book }: { W: Wk; d: number; book: LBook }) {
  const { go, setTab } = useNav();
  const { armed, fire } = useArm();
  const wk = Math.ceil(d / 7); // 2..4
  const w0 = new Date(W.start); w0.setHours(0, 0, 0, 0); w0.setDate(w0.getDate() + (wk - 1) * 7);
  const days: Date[] = [];
  for (let k = 0; k < 7; k++) { const x = new Date(w0); x.setDate(w0.getDate() + k); if (x.getTime() <= Date.now()) days.push(x); }
  const L = store.get<Record<string, number>>(bkKey(book.id, "lessons"), {});
  const M = store.get<Record<string, { i?: number; o?: number }>>("x.sm", {});
  const lessonDays = days.filter((x) => L[dayNum(x)]).length;
  const inDays = days.filter((x) => (M[dayKey(x)]?.i || 0) >= 120).length;
  const outDays = days.filter((x) => (M[dayKey(x)]?.o || 0) >= 120).length;
  const reconf = confAll().some((c) => c.at >= w0.getTime());
  const u = book.units.find((x) => pctOf(x.words, knownOf(book.id, x.n)) < 100) || book.units[book.units.length - 1];
  const mark = (i: number) => { const w = store.get<Wk>("f.ob.wk", W); w.done[`w${wk}:${i}`] = 1; store.set("f.ob.wk", w); };
  const isDone = (i: number) => !!W.done[`w${wk}:${i}`];
  const PATH: { t: string; d: string; m: Ms[] }[] = [
    { t: "Takrorlash odati", d: "So'zlar kunlar oralab takrorlansa, uzoq eslab qolinadi.", m: [
      { t: "«Bugun» darsini 5 kun bajaring", need: 5, n: lessonDays, run: () => setTab("home") },
      { t: "Xatolar daftarini oching", done: isDone(1), run: () => { mark(1); go("errors"); } },
      { t: "Maqsadingizni ko'rib chiqing", done: isDone(2), run: () => { mark(2); go("goal"); } },
    ] },
    { t: "Tinglash va gapirish", d: "Til faqat qoida bilan emas, eshitib va gapirib o'rganiladi.", m: [
      { t: "3 kun tinglang: multfilm yoki kitob matni", need: 3, n: inDays, run: () => go("mults") },
      { t: "3 kun ovoz chiqarib gapiring", need: 3, n: outDays, run: () => setTab("practice") },
      { t: "Bitta vahdani oxirigacha ishlang", done: isDone(2), run: () => { mark(2); go("unit", { book: book.id, unit: u.n }); } },
    ] },
    { t: "Natijani ko'ring", d: "Bir oyda qancha o'sganingizni o'lchang va yangi maqsad qo'ying.", m: [
      { t: "So'z testini ishlang", done: isDone(0), run: () => { mark(0); go("wtest", { book: book.id, unit: u.n }); } },
      { t: "O'zingizni qayta baholang", done: reconf, run: () => go("goal", { conf: 1 }) },
      { t: "Yangi maqsad qo'ying", done: isDone(2), run: () => { mark(2); go("goal", { redo: 1 }); } },
    ] },
  ];
  const P = PATH[wk - 2];
  const ok = (x: Ms) => (x.need ? (x.n || 0) >= x.need : !!x.done);
  const nDone = P.m.filter(ok).length;
  return (
    <section className="wk-card path" aria-label="4 haftalik yo'l">
      <div className="wk-h"><b>4 haftalik yo'l · {wk}-hafta</b><span>{nDone} / {P.m.length}</span></div>
      <span className="wk-bar"><i style={{ width: `${(nDone / P.m.length) * 100}%` }} /></span>
      <p className="wk-theme"><b>{P.t}.</b> {P.d}</p>
      <ol className="wk-list">
        {P.m.map((x, i) => {
          const dn = ok(x);
          return (
            <li key={i} className={dn ? "dn" : ""}>
              <span className="wk-dot">{dn ? <Check size={14} strokeWidth={3} aria-hidden /> : null}</span>
              <span className="wk-t"><b>{x.t}</b>{x.need ? <small>{Math.min(x.n || 0, x.need)} / {x.need} kun</small> : null}</span>
              {!dn && <button type="button" className="btn primary sm" onClick={x.run}>Boshlash</button>}
            </li>
          );
        })}
      </ol>
      <div className="wk-days">{[1, 2, 3, 4].map((k) => <span key={k} className={k < wk ? "past" : k === wk ? "now" : ""}><b>{k}</b>{k === 1 ? "Odat" : k === 2 ? "Takror" : k === 3 ? "Tinglash" : "Natija"}</span>)}</div>
      <button type="button" className={`wk-hide ${armed === "h" ? "armed" : ""}`} onClick={() => { if (!fire("h")) return; store.set("f.ob.wk", { ...W, hide: true }); toast("Yo'l yashirildi"); setTab("home"); }}>
        {armed === "h" ? "Yashirilsinmi? Yana bosing" : "Yashirish"}
      </button>
    </section>
  );
}
