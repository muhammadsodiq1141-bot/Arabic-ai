// 13-partiya (A8): mashqlar tartibi — o'quvchi qayerdan boshlash va nima bilan tugatishni o'zi tanlamaydi.
// Vahda ichida: Lug'at (roundlar ketma-ket) → Mashqlar 1-qism (kitobdagi «Qoida»gacha: lug'at mashqlari, o'qish, suhbat) →
// Nazariya → Grammatik test → Mashqlar 2-qism (qoida mashqlari, yozish, nazorat). Kitob tartibi o'zgarmaydi — nazariya kitobning
// o'zidagi «Qoida» qadamidan oldin turadi. Madina'da 1-qism — birinchi «Asosiy matn».
// Qoidalar: «bajarildi» = oxirigacha ishlangan (ball qulflamaydi); boshlangan narsa hech qachon qulflanmaydi (eski o'quvchilar
// yo'qotmasin); «Bilaman — sinab ko'raman» (so'z testi 90%+) lug'atni yoki butun vahdani o'tkazadi.
// Vahdalar orasidagi qulf faqat guruhsiz o'quvchiga: guruhda sur'atni ustoz belgilaydi.
import { kbBest, kbKeyOf, type KbLesson } from "./kb";
import { bkKey, type Book } from "./progress";
import { knownOf, store } from "./store";

export const ROUND_N = 10;
const pct = (words: string[][], known: Record<string, number>) => (words.length ? Math.round((words.filter((w) => known[w[0]]).length / words.length) * 100) : 0);
export const theoryKeyOf = (book: string, unit: number) => `f.theory.${book}.${unit}`;
/** butun vahda «Bilaman» sinovidan o'tgan */
export const testOutKey = (book: string, unit: number) => `f.to.${book}.${unit}`;
const rulesN = (book: Book, unit: number) => ((book.rules?.[unit] || []) as unknown[]).length;
/** grammatik test ishlanganmi (har qanday natija bilan) */
export const testTried = (book: Book, unit: number) => {
  const n = rulesN(book, unit);
  for (let i = 0; i < n; i++) if (store.get<number | null>(bkKey(book.id, `rule.${unit}.${i}`), null) !== null) return true;
  return false;
};

/** kitob mashqlari qayerda ikkiga bo'linadi: [0, split) — nazariyadan oldin, [split, …) — testdan keyin */
export function splitOf(bookId: string, kb: KbLesson | null, hasRules: boolean) {
  if (!kb) return 0;
  if (!hasRules) return 0; // qoida yo'q — nazariya ham yo'q, bo'lish shart emas
  if (bookId.startsWith("md")) return /matn/i.test(kb.steps[0]?.t || "") ? 1 : 0; // Madina: 1-qism — darsning asosiy matni
  const q = kb.steps.findIndex((s) => /^\s*Qoida/i.test(s.t));
  return q >= 0 ? q : kb.steps.length;
}

export type Gate = {
  vocDone: boolean; roundOpen: (n: number) => boolean;
  split: number; preDone: boolean;
  hasRules: boolean; theorySeen: boolean; theoryOpen: boolean; theoryWhy: string;
  testDone: boolean; stepOpen: (si: number) => boolean; stepWhy: (si: number) => string;
  coreDone: boolean;
};

/** 12.11.2026: admin (ilova egasi) uchun hamma bo'lim ochiq — sinab ko'rish uchun; o'quvchilarda qulflar o'zgarmaydi. Main.tsx sessiyadan o'rnatadi */
let ALL = false;
export const setOpenAll = (v: boolean) => { ALL = v; };
export const openAll = () => ALL;

export function unitGate(book: Book, unit: number, kb: KbLesson | null): Gate {
  const u = book.units.find((x) => x.n === unit);
  const words = u?.words || [];
  const known = knownOf(book.id, unit);
  const chunk = (n: number) => words.slice((n - 1) * ROUND_N, n * ROUND_N);
  const tested = !!store.get(testOutKey(book.id, unit), 0);
  const vocDone = !words.length || pct(words, known) >= 100 || tested;
  const roundOpen = (n: number) => ALL || n <= 1 || vocDone || pct(chunk(n - 1), known) >= 100 || pct(chunk(n), known) > 0;
  const hasRules = rulesN(book, unit) > 0;
  const key = kbKeyOf(book.id, unit);
  const B = key ? kbBest(key) : {};
  const tried = (si: number) => B[si] !== undefined;
  const split = splitOf(book.id, kb, hasRules);
  let preDone = true;
  for (let i = 0; i < split; i++) if (!tried(i)) { preDone = false; break; }
  const theorySeen = !!store.get(theoryKeyOf(book.id, unit), 0);
  const theoryOpen = ALL || theorySeen || tested || (vocDone && preDone);
  const theoryWhy = !vocDone ? "Avval lug'at roundlarini tugating" : "Avval mashqlarning 1-qismini bajaring";
  const testDone = !hasRules || testTried(book, unit) || tested;
  const stepOpen = (si: number) => ALL || tried(si) || tested || (vocDone && (si === 0 || tried(si - 1)) && (si < split || testDone));
  const stepWhy = (si: number) => (!vocDone ? "Avval lug'atni tugating" : si >= split && !testDone ? "Avval grammatik testni ishlang" : `Avval ${si}-topshiriqni bajaring`);
  const allSteps = !kb || kb.steps.every((_, i) => tried(i));
  const coreDone = tested || (vocDone && testDone && allSteps);
  return { vocDone, roundOpen, split, preDone, hasRules, theorySeen, theoryOpen, theoryWhy, testDone, stepOpen, stepWhy, coreDone };
}

/** vahda boshlanganmi (biror narsasi bor) — boshlangan vahda hech qachon qulflanmaydi */
export function unitStarted(book: Book, unit: number) {
  const u = book.units.find((x) => x.n === unit);
  if (u && pct(u.words, knownOf(book.id, unit)) > 0) return true;
  if (store.get(theoryKeyOf(book.id, unit), 0) || testTried(book, unit) || store.get(testOutKey(book.id, unit), 0)) return true;
  const key = kbKeyOf(book.id, unit);
  return !!key && Object.keys(kbBest(key)).length > 0;
}

/** guruhsiz o'quvchi uchun vahdalar chegarasi: boshlangan eng oxirgi vahda (frontier) va undan oldingilar ochiq;
 *  keyingisi — frontier'ning majburiy qismi tugagach (coreDone) yoki «Bilaman» bilan; uy vazifasi berilgan vahda — doim ochiq */
export function frontierOf(book: Book) {
  let f = book.units[0]?.n || 1;
  for (const u of book.units) if (unitStarted(book, u.n)) f = Math.max(f, u.n);
  return f;
}
