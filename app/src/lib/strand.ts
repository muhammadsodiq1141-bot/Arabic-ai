// 13-partiya (A1): o'quvchi vaqti to'rt yo'l bo'yicha (Paul Nation): i — tinglash va o'qish (ma'noli kiritma), o — gapirish va yozish
// (ma'noli chiqarma), f — til shakli (so'z, qoida, harakat), r — ravonlik (bilganini tez ishlatish). Taxminiy: ekran turi bo'yicha,
// kitob mashqida qadam tarkibi bo'yicha. Yozuv: x.sm = { "YYYY-MM-DD": { i, o, f, r } } soniyalarda, 21 kun saqlanadi (sinxronlanadi —
// 2-bosqichda ustozning 4 yo'l paneliga).
import { dayKey } from "./progress";
import { store } from "./store";

export type Strand = "i" | "o" | "f" | "r";
export type Mix = Record<Strand, number>;
export const STRANDS: { k: Strand; t: string; ar: string }[] = [
  { k: "i", t: "Tinglash, o'qish", ar: "الِاسْتِمَاعُ وَالْقِرَاءَةُ" },
  { k: "o", t: "Gapirish, yozish", ar: "الْكَلَامُ وَالْكِتَابَةُ" },
  { k: "f", t: "Til shakli", ar: "الْقَوَاعِدُ وَالْمُفْرَدَاتُ" },
  { k: "r", t: "Ravonlik", ar: "الطَّلَاقَةُ" },
];
const VIEW: Record<string, Strand> = {
  round: "f", lesson: "f", rprac: "f", rule: "f", rules: "f", theory: "f", test: "f", wtest: "f", cards: "f", errors: "f", known: "f",
  game: "f", qs: "f", mem: "f", darslik: "f", duel: "f", kb: "f", a0: "f", a0d: "f", a0map: "f", words: "f", word: "f", leveltest: "f",
  mult: "i", mvoc: "f", shadow: "o", night: "r", hwsend: "o", // shadowing — ovoz chiqarib gapirish (taqlid; Nation: talaffuz va ravonlik)
};
const MAX = 10 * 60; // bitta bo'lakda 10 daqiqadan ortig'i yozilmaydi (ekran ochiq qolib ketgan bo'lishi mumkin)
let cur: Strand | null = null;
let t0 = 0;

function flush() {
  if (!cur || !t0) { t0 = cur ? Date.now() : 0; return; }
  const sec = Math.min(MAX, Math.round((Date.now() - t0) / 1000));
  t0 = Date.now();
  if (sec < 3) return;
  const k = dayKey();
  const M = store.get<Record<string, Partial<Mix>>>("x.sm", {});
  const d = M[k] || {};
  d[cur] = (d[cur] || 0) + sec;
  M[k] = d;
  const keys = Object.keys(M).sort();
  while (keys.length > 21) delete M[keys.shift()!];
  store.set("x.sm", M);
  // 15-partiya (M11): jami vaqt (x.smt soniya) va qachondan beri sanalayotgani (x.smt0)
  store.set("x.smt", store.get("x.smt", 0) + sec);
  if (!store.get("x.smt0", 0)) store.set("x.smt0", Date.now());
}
/** yo'l (Main): har ekran almashganda; 60 soniya o'yini — ravonlik */
export function strandRoute(view: string, game?: unknown) {
  flush();
  cur = view === "game" && game === "speed" ? "r" : VIEW[view] ?? null;
  t0 = cur ? Date.now() : 0;
}
/** ekranning o'zi aniqroq aytadi (kitob mashqi: o'qish matni → "i", erkin javob → "o") */
export function strandSet(s: Strand) { flush(); cur = s; t0 = Date.now(); }

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { flush(); t0 = 0; } else if (cur) t0 = Date.now();
  });
}

const zero = (): Mix => ({ i: 0, o: 0, f: 0, r: 0 });
function sumDays(days: string[]): Mix {
  flush();
  const M = store.get<Record<string, Partial<Mix>>>("x.sm", {});
  const s = zero();
  for (const d of days) for (const k of ["i", "o", "f", "r"] as Strand[]) s[k] += M[d]?.[k] || 0;
  return s;
}
export const strandToday = () => sumDays([dayKey()]);
/** dushanbadan bugungacha */
export function strandWeek() {
  const t = new Date(), days: string[] = [];
  const back = (t.getDay() + 6) % 7;
  for (let i = back; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); days.push(dayKey(d)); }
  return sumDays(days);
}

/** jami o'qish vaqti (soniya) va qachondan beri — «Baholar»dagi «Mening o'sishim» uchun */
export function strandTotal() { flush(); return { sec: store.get("x.smt", 0), since: store.get("x.smt0", 0) }; }
