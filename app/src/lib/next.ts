// Uy vazifasida "keyingi qadam": lug'at roundlari → mashqlar 1-qism → nazariya → grammatik test → mashqlar 2-qism (13-partiya, A8).
// Vahda ekranidagi "Davom etish" tugmasi va bosh sahifadagi uy vazifasi kartasi shu bir funksiyadan foydalanadi.
import { isReadStep, kbBest, kbKeyOf, type KbLesson } from "./kb";
import { unitGate } from "./order";
import { stepLabel } from "./kb";
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
  // 13-partiya (A8): tartib lib/order.ts dagi qulflar bilan bir xil — lug'at → mashqlar 1-qism → nazariya → test → mashqlar 2-qism;
  // past natija endi keyingi qadamni to'smaydi, faqat oxirida «qayta ishlash» taklif qilinadi
  const g = unitGate(book, unit, kb);
  const key = kbKeyOf(book.id, unit);
  const B = key ? kbBest(key) : {};
  const kbNext = (from: number, to: number): Next | null => {
    if (!kb || !key) return null;
    for (let si = from; si < to; si++) {
      if (B[si] !== undefined) continue;
      const st = kb.steps[si], parts = st.t.split(" · ");
      // Madina o'qish matni: "O'qish · Asosiy matn"
      if (book.id.startsWith("md") && isReadStep(st)) return { kind: "kb", view: "kb", params: { ...base, key, si }, label: "O'qish", sub: parts.slice(1).join(" · ") || st.t };
      return { kind: "kb", view: "kb", params: { ...base, key, si }, label: stepLabel(st).name, sub: st.d || parts[0] }; // 12.11: kitobdagi nom
    }
    return null;
  };
  if (u && !g.vocDone) {
    const known = knownOf(book.id, unit);
    for (let i = 0, n = 1; i < u.words.length; i += ROUND, n++) {
      const r = u.words.slice(i, i + ROUND);
      if (pctOf(r, known) < 100) return { kind: "round", view: "round", params: { ...base, n }, label: `${n}-round`, sub: `Lug'at · ${r.length} so'z` };
    }
  }
  const pre = kbNext(0, g.split);
  if (pre) return pre;
  const rules = rulesOf(book, unit);
  if (rules.length) {
    if (!g.theorySeen) return { kind: "theory", view: "theory", params: base, label: "Nazariya", sub: `${rules.length} ta qoida` };
    if (!g.testDone) return { kind: "test", view: "test", params: base, label: "Grammatik test", sub: `${rules.reduce((a, r) => a + (r.quiz?.length || 0), 0)} savol` };
  }
  const post = kbNext(g.split, kb?.steps.length ?? 0);
  if (post) return post;
  // hammasi ishlangan — natija past bo'lsa, qayta ishlash taklifi (qulf emas)
  if (rules.length) {
    const gp = gramPct(book, unit);
    if (gp < 80) return { kind: "test", view: "test", params: base, label: "Grammatik test (takror)", sub: `Hozir ${gp}% — 80% ga yetkazing` };
  }
  const wt = store.get<Record<string, number>>(bkKey(book.id, "tests"), {})[unit] || 0;
  if (u?.words.length && wt < 80) return { kind: "round", view: "round", params: { ...base, n: 1 }, label: "1-round (takror)", sub: `So'z testi ${wt}% — 80% ga yetkazing` };
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
