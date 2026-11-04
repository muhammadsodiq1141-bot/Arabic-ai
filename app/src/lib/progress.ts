// Eski ilova progressi — FAQAT O'QILADI, formati o'zgartirilmaydi (o'quvchilar tarixi yo'qolmasligi uchun).
// Manba: shu telefondagi localStorage (agar u aynan shu akkauntniki bo'lsa) yoki serverdagi nusxa ("load").
// Kalitlar: a1.* (A1 kitobi va umumiy), bk.<kitob>.* (boshqa kitoblar), x.* (XP), f.* (sozlamalar). Qiymat — JSON satr.
import { api } from "./api";

export type Raw = Record<string, string>;
const PREFIX = /^(a1\.|bk\.|x\.|f\.)/;

export const parse = <T>(s: string | undefined, d: T): T => {
  if (s == null) return d;
  try { return JSON.parse(s) as T; } catch { return d; }
};

export function localRaw(): Raw {
  const o: Raw = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && PREFIX.test(k)) o[k] = localStorage.getItem(k) ?? "";
    }
  } catch { /* xotira yopiq */ }
  return o;
}

// Eski ilovadagi yordamchilar bilan aynan bir xil
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function weekId() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); }
export function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
export const bkKey = (bid: string, name: string) => (bid === "a1" ? `a1.${name}` : `bk.${bid}.${name}`);

/** ketma-ket faol kunlar; muzlatilgan kunlar (x.fz) ham hisoblanadi — eski streak yamog'i, ustozga ketadigan streakFz bilan bir xil */
export function streak(days: Record<string, number>, fz: string[] = []) {
  const on = (k: string) => !!days[k] || fz.includes(k);
  let c = 0;
  const d = new Date();
  if (!on(dayKey())) d.setDate(d.getDate() - 1);
  while (on(dayKey(d))) { c++; d.setDate(d.getDate() - 1); }
  return c;
}

export type Summary = { xp: number; stars: number; streak: number; known: number; todayXp: number; weekXp: number; book: string };

export function summarize(raw: Raw): Summary {
  let known = 0;
  for (const k in raw) if (/^(a1|bk\.[a-z0-9]+)\.known\./.test(k)) known += Object.keys(parse<Record<string, unknown>>(raw[k], {})).length;
  const daily = parse<Record<string, number>>(raw["x.d"], {});
  const wk = weekId();
  const weekXp = Object.entries(daily).filter(([d]) => d >= wk).reduce((a, [, v]) => a + (+v || 0), 0);
  return {
    xp: parse(raw["x.t"], 0), stars: parse(raw["x.s"], 0), streak: streak(parse(raw["a1.days"], {}), parse(raw["x.fz"], [])), known,
    todayXp: daily[dayKey()] || 0, weekXp, book: parse(raw["a1.book"], "a1"),
  };
}

// Telefondagi progress shu akkauntnikimi? Eski ilova bitta telefonda bir nechta akkauntni almashtiradi;
// joriy egasi f.me (server "me" javobining keshi) da yozilgan.
export async function loadProgress(meId: string): Promise<{ raw: Raw; source: "phone" | "server" | "empty" }> {
  const local = localRaw();
  const owner = parse<{ id?: string } | null>(local["f.me"], null)?.id;
  if (owner === meId) return { raw: local, source: "phone" };
  try {
    const r = await api<{ data: Raw | null }>("load");
    if (r.data && Object.keys(r.data).length) return { raw: r.data, source: "server" };
  } catch { /* server bo'lmasa — bo'sh */ }
  return { raw: {}, source: "empty" };
}

// Uy vazifasi foizi: eski ilovadagi hwProgress bilan bir xil (so'zlar ≥80%, test ≥80%, qoidalar ≥80% — bajarildi)
export type Book = { id: string; title: string; units: { n: number; uz?: string; ar?: string; words: string[][]; phrases: string[][] }[]; rules: Record<string, unknown[]> };
export function hwProgress(raw: Raw, book: Book, unitN: number) {
  const u = book.units.find((x) => x.n === unitN);
  if (!u) return { words: 0, test: 0, rules: 0, done: false, pct: 0 };
  const items = [...u.words, ...u.phrases];
  const k = parse<Record<string, unknown>>(raw[bkKey(book.id, `known.${unitN}`)], {});
  const words = items.length ? Math.round((items.filter((x) => k[x[0]]).length / items.length) * 100) : 0;
  const test = parse<Record<string, number>>(raw[bkKey(book.id, "tests")], {})[unitN] || 0;
  const rl = book.rules?.[unitN] || [];
  const rules = rl.length ? Math.round((rl.filter((_, i) => parse(raw[bkKey(book.id, `rule.${unitN}.${i}`)], 0) >= 80).length / rl.length) * 100) : 100;
  return { words, test, rules, done: words >= 80 && test >= 80 && rules >= 80, pct: Math.round((Math.min(words, 100) + Math.min(test, 100) + rules) / 3) };
}
