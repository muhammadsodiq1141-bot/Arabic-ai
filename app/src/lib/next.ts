// Uy vazifasida "keyingi qadam": lug'at roundlari → (so'z testi 80%) → nazariya → grammatik test → mashqlar.
// Vahda ekranidagi "Davom etish" tugmasi va bosh sahifadagi uy vazifasi kartasi shu bir funksiyadan foydalanadi.
import { kbBest, kbKeyOf, type KbLesson } from "./kb";
import { bkKey, type Book } from "./progress";
import { knownOf, store } from "./store";

export const ROUND = 10; // roundda nechta so'z
export const theoryKey = (book: string, unit: number) => `f.theory.${book}.${unit}`;
export const pctOf = (words: string[][], known: Record<string, number>) => (words.length ? Math.round((words.filter((w) => known[w[0]]).length / words.length) * 100) : 0);

type Rule = { quiz?: unknown[] };
export const rulesOf = (book: Book, unit: number) => (book.rules?.[unit] || []) as Rule[];
/** Grammatik test natijasi — qoidalar bo'yicha eng yaxshi foizlarning o'rtachasi (eski ilova: {BK}rule.<vahda>.<i>) */
export function gramPct(book: Book, unit: number) {
  const r = rulesOf(book, unit);
  return r.length ? Math.round(r.reduce((a, _, i) => a + store.get(bkKey(book.id, `rule.${unit}.${i}`), 0), 0) / r.length) : 0;
}

export type Next = {
  kind: "round" | "theory" | "test" | "kb" | "done";
  view: string; params: Record<string, unknown>;
  label: string; // "2-round", "Nazariya"...
  sub: string; // qisqa izoh
};

export function nextStep(book: Book, unit: number, kb: KbLesson | null): Next {
  const u = book.units.find((x) => x.n === unit);
  const base = { book: book.id, unit };
  if (u) {
    const known = knownOf(book.id, unit);
    for (let i = 0, n = 1; i < u.words.length; i += ROUND, n++) {
      const r = u.words.slice(i, i + ROUND);
      if (pctOf(r, known) < 100) return { kind: "round", view: "round", params: { ...base, n }, label: `${n}-round`, sub: `Lug'at · ${r.length} so'z` };
    }
    // so'zlar yodlangan, lekin so'z testi (round aniqligi) 80% dan past — bitta roundni qayta ishlash kerak
    const wt = store.get<Record<string, number>>(bkKey(book.id, "tests"), {})[unit] || 0;
    if (u.words.length && wt < 80) return { kind: "round", view: "round", params: { ...base, n: 1 }, label: "1-round (takror)", sub: `So'z testi ${wt}% — 80% kerak` };
  }
  const rules = rulesOf(book, unit);
  if (rules.length) {
    if (!store.get(theoryKey(book.id, unit), 0)) return { kind: "theory", view: "theory", params: base, label: "Nazariya", sub: `${rules.length} ta qoida` };
    const g = gramPct(book, unit);
    if (g < 80) return { kind: "test", view: "test", params: base, label: "Grammatik test", sub: g ? `Hozir ${g}% — 80% kerak` : `${rules.reduce((a, r) => a + (r.quiz?.length || 0), 0)} savol` };
  }
  const key = kbKeyOf(book.id, unit);
  if (kb && key) {
    const B = kbBest(key);
    const si = kb.steps.findIndex((_, i) => B[i] === undefined);
    if (si >= 0) return { kind: "kb", view: "kb", params: { ...base, key, si }, label: `${si + 1}-topshiriq`, sub: kb.steps[si].t.split(" · ")[0] };
  }
  return { kind: "done", view: "", params: base, label: "Bajarildi", sub: "" };
}

/** Muddatgacha qolgan vaqt: "3 kun qoldi", "Ertaga", "Bugun", "Muddati o'tdi" */
export function dueText(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  if (!y || !m || !d) return "";
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(y, m - 1, d).getTime() - t.getTime()) / 864e5);
  return days > 1 ? `${days} kun qoldi` : days === 1 ? "Ertaga" : days === 0 ? "Bugun" : "Muddati o'tdi";
}
