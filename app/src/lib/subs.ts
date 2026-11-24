// 24.11.2026 (api 25, U2 + K2): ustoz bahosi — javob turlari, xato turlari, «1 + 1» tayyor iboralari, AI taklifi va joy nomi.
// Ustoz ekrani (TeacherSubs), o'quvchining «Baholar → Ustoz izohlari» (Marks) va yuboruvchilar (Kitob, TextWork) shu yerdan oladi.
import { useEffect, useState } from "react";
import { loadKb, stepLabel, type KbStep } from "./kb";

/** AI dastlabki bahosi (ilova yuboradi, server ≤1 KB qilib saqlaydi): sum — matn xulosasi (10 ballik), q — o'qish savollari */
export type SubAi = {
  k: "sum" | "q" | "say";
  total?: number; content?: number; language?: number; fluency?: number; // sum: 10 = mazmun 4 + til 3 + ravonlik 3
  ok?: number; part?: number; no?: number; n?: number; off?: number; // q: to'g'ri / qisman / noto'g'ri, jami savol, AI tekshirmagani
  verdict?: "ok" | "partial" | "no"; heard?: string; fb?: string;
};
type Grading = {
  grade: number | null; comment: string | null; title?: string | null; tags?: string[] | null; praise?: string | null; fix?: string | null;
  t_audio?: boolean; t_sec?: number | null; ai?: SubAi | null; attempt?: number; redo?: string | null;
};
/** ustoz ro'yxatidagi javob (subList) */
export type TSub = Grading & {
  id: number; lesson: string; step: string; item: number; text: string; created_at: string; audio: boolean; name: string; login: string;
  pics?: string[]; result?: { ball: number; jami: number } | null; xt?: { title: string; coins5: number; due: string; late: boolean };
};
/** o'quvchining o'z javobi (subMine) */
export type MySub = Grading & { id: number; lesson: string; step: string; item: number; text: string; created_at: string; graded_at?: string | null; audio: boolean; seen_at?: string | null };

/** «Tushunmadim» xabari: mashq bandi 300–499 (uy/qo'shimcha vazifa, diktant, yakka gapirish, o'qish — baholanadigan javob) */
export const isDunno = (x: { item: number; step: string }) => x.item >= 300 && x.item < 500 && !["hw", "x", "dict", "speak", "read"].includes(x.step);
/** matnsiz javobning avtomatik yozuvi (🎙 Ovozli javob, 📷 Daftar surati, 🧩 HTML natijasi) — ko'rsatilmaydi */
export const autoText = (t: string) => /^(🎙|📷|🧩)/.test(t);
/** og'zaki javob: yakka gapirish, o'qish bo'limi (o'qish, xulosa), faqat ovozli javob yoki ovozli savol-javob (FreeSeq: «— javob» qatorlari).
 *  Matn / daftar surati bilan kelgan ovozli izoh (uy va qo'shimcha vazifa) — yozma */
export const isOral = (x: { audio: boolean; step: string; text: string }) =>
  x.step === "speak" || x.step === "read" || (x.audio && (/^🎙/.test(x.text) || /\n— /.test(x.text)));
/** xulosa yozuvi «Xulosa · AI bahosi 8/10 (…). <AI izohi>» (v2 ustoz ilovasi uchun) — o'quvchining o'z matni emas: own — o'quvchi matni, fb — AI izohi */
const XULOSA_RE = /^Xulosa(?: · AI bahosi [^)]*\)\.?\s*| \(ovozli\)$)/;
export function splitAiText(t: string): { own: string; fb: string } {
  if (!XULOSA_RE.test(t)) return { own: t, fb: "" };
  return { own: "", fb: t.replace(XULOSA_RE, "").trim() };
}

// ===== Q1: xato turlari (bitta javobga 2 tagacha) =====
export const TAGS_W = ["Mazmun", "Grammatika", "So'z", "Harakat", "Imlo"];
export const TAGS_O = ["Mazmun", "Grammatika", "So'z", "Talaffuz", "Ravonlik"];
export const MAX_TAGS = 2;

// ===== «1 + 1»: bitta kuchli tomon + bitta tuzatish — tayyor iboralar (bosilsa maydonga tushadi, keyin to'ldirsa bo'ladi) =====
export const PRAISE_W = ["Mazmun to'liq va aniq", "Grammatika to'g'ri", "Yangi so'zlarni o'rinli ishlatgansiz", "Harakatlar to'g'ri qo'yilgan", "Gaplar bog'langan, fikr tushunarli"];
export const PRAISE_O = ["Mazmun to'liq va aniq", "Talaffuz aniq", "Ravon va ishonch bilan gapirdingiz", "Yangi so'zlarni o'rinli ishlatgansiz", "Grammatika to'g'ri"];
export const FIX_W = ["Jinsni moslang (muzakkar / muannas)", "So'z oxiridagi harakatni tekshiring", "Fe'lni shaxsga moslang", "«al-» (aniqlik) ni tekshiring", "Savolga to'liq javob bering", "Imloni tekshiring: ta marbuta, hamza"];
export const FIX_O = ["Bo'g'iz tovushlarini farqlang (ha, ayn)", "So'z oxiridagi harakatni ayting", "Fe'lni shaxsga moslang", "Cho'ziq unlilarni cho'zib ayting", "Sekinroq, pauza bilan gapiring", "Savolga to'liq javob bering"];
export const NOTE_MAX = 200;
/** tayyor iborani qo'shish: maydon bo'sh yoki boshqa tayyor ibora bo'lsa — almashtiradi, o'zi yozgan matn bo'lsa — oxiriga qo'shadi */
export function addPhrase(cur: string, ph: string, all: readonly string[]): string {
  const c = cur.trim();
  if (!c || all.includes(c)) return ph.slice(0, NOTE_MAX);
  if (c.includes(ph)) return c;
  return `${c}; ${ph}`.slice(0, NOTE_MAX);
}

// ===== Q2: AI dastlabki bahosi → ustozga «AI taklifi: N/5» (faqat ko'rsatiladi, o'zi qo'yilmaydi) =====
const VERD_RE = /· AI: (To'g'ri|Qisman to'g'ri|Noto'g'ri)/g;
/** javobdagi AI natijasi: yangi ilova — ai ustuni; eski yozuvlar (v2) — matndan («AI bahosi 8/10 (…)», «· AI: Qisman to'g'ri») */
export function aiOf(x: { ai?: SubAi | null; text: string }): SubAi | null {
  if (x.ai && typeof x.ai === "object" && x.ai.k) return x.ai;
  const m = /AI bahosi (\d+(?:[.,]\d+)?)\/10(?: \(mazmun (\d+)\/4, til (\d+)\/3, ravonlik (\d+)\/3\))?/.exec(x.text || "");
  if (m) return { k: "sum", total: Number(m[1].replace(",", ".")), ...(m[2] ? { content: +m[2], language: +m[3], fluency: +m[4] } : {}) };
  const v = [...(x.text || "").matchAll(VERD_RE)].map((r) => r[1]);
  if (v.length) return { k: "q", ok: v.filter((s) => s === "To'g'ri").length, part: v.filter((s) => s === "Qisman to'g'ri").length, no: v.filter((s) => s === "Noto'g'ri").length };
  return null;
}
/** plan §9: xulosa 9–10 → 5, 7–8 → 4, 5–6 → 3, 3–4 → 2, 0–2 → 1; savollar (to'g'ri + 0,5 × qisman) / tekshirilgan: ≥0,9 → 5, ≥0,7 → 4, ≥0,5 → 3, ≥0,3 → 2 */
export function aiSuggest(ai: SubAi | null): number | null {
  if (!ai) return null;
  if (ai.k === "sum" && Number.isFinite(ai.total)) { const t = ai.total!; return t >= 9 ? 5 : t >= 7 ? 4 : t >= 5 ? 3 : t >= 3 ? 2 : 1; }
  if (ai.k === "q") {
    const ok = ai.ok || 0, part = ai.part || 0, c = ok + part + (ai.no || 0);
    if (!c) return null;
    const r = (ok + 0.5 * part) / c;
    return r >= 0.9 ? 5 : r >= 0.7 ? 4 : r >= 0.5 ? 3 : r >= 0.3 ? 2 : 1;
  }
  return null;
}
/** ustozga: «AI: 8 / 10 · mazmun 4/4 · til 2/3 · ravonlik 2/3» yoki «AI: 2 to'g'ri · 1 qisman · 0 noto'g'ri» */
export function aiLine(ai: SubAi): string {
  if (ai.k === "sum") return `AI: ${ai.total ?? "?"} / 10${ai.content !== undefined ? ` · mazmun ${ai.content}/4 · til ${ai.language ?? 0}/3 · ravonlik ${ai.fluency ?? 0}/3` : ""}`;
  if (ai.k === "q") {
    const c = (ai.ok || 0) + (ai.part || 0) + (ai.no || 0);
    return `AI: ${ai.ok || 0} to'g'ri · ${ai.part || 0} qisman · ${ai.no || 0} noto'g'ri${ai.n && ai.n > c ? ` · ${ai.n - c} tasi tekshirilmadi` : ""}`;
  }
  return `AI: ${ai.verdict === "ok" ? "to'g'ri" : ai.verdict === "partial" ? "qisman to'g'ri" : "noto'g'ri"}`;
}
/** o'quvchiga: «8 / 10» yoki «3 savoldan 2 tasi to'g'ri» */
export function aiShort(ai: SubAi): string {
  if (ai.k === "sum") return `${ai.total ?? "?"} / 10`;
  if (ai.k === "q") {
    const c = (ai.ok || 0) + (ai.part || 0) + (ai.no || 0);
    return `${c} savoldan ${ai.ok || 0} tasi to'g'ri${ai.part ? `, ${ai.part} tasi qisman` : ""}`;
  }
  return ai.verdict === "ok" ? "to'g'ri" : "qisman";
}

// ===== Joy nomi: «A2 · 3-vahda · Xulosa» (barcha kitoblar) =====
const BOOK_UZ: Record<string, string> = { a0: "A0", a1: "A1", a2: "A2", b1: "B1", b2: "B2", c1: "C1", md1: "Madina 1", md2: "Madina 2" };
export const bookUz = (b: string) => BOOK_UZ[b] || b.toUpperCase();
export const unitHead = (book: string, n: number | string) => (book === "a0" ? `A0 · ${n}-dars` : `${bookUz(book)} · ${n}-vahda`);
/** kitob mashqi kaliti: a1:4, md2:12 … */
export const KB_KEY = /^(a0|a1|a2|b1|b2|c1|md1|md2):\d+$/;
/** kitob mashqi bo'limi: «A1 · 4-vahda · Lugʻat mashqlari», Madina: «Madina 1 · 3-vahda · Asosiy matn va savollar · 21–22-bet» */
export const kbPlace = (key: string, st: KbStep) => { const [b, n] = key.split(":"); return `${unitHead(b, n)} · ${stepLabel(st).name}`; };
/** o'qish bo'limi (TextWork): item 0 — matnni o'qish, 1 — o'z gaplari, 2 — xulosa */
export const readPlace = (bookId: string, unitN: number, item: number) => `${unitHead(bookId, unitN)} · ${item === 1 ? "O'z gaplari" : item === 2 ? "Xulosa" : "Matnni o'qish"}`;

/** javob qayerdan: kitob bo'limi (kbT — yuklangan darslar), o'qish / yakka gapirish (kalitdan), saqlangan nom, qolgani */
export function placeOf(x: { lesson: string; step: string; item: number; title?: string | null; xt?: { title: string } }, kbT: Record<string, string>): string {
  if (x.xt) return `Qo'shimcha vazifa · ${x.xt.title}`;
  const [pre, ...rest] = x.lesson.split(":");
  if (x.step === "hw" && /^[a-z]+\d*:\d+$/.test(x.lesson)) return `${unitHead(pre, rest[0])} · Uy vazifasi`;
  const k = kbT[`${x.lesson}|${x.step}`];
  if (k) return k;
  if (pre === "read" && rest.length === 2) return readPlace(rest[0], Number(rest[1]), x.item);
  if (pre === "speak" && rest.length === 2) return `${unitHead(rest[0], rest[1])} · Yakka gapirish`;
  if (x.title) return x.title;
  if (x.step === "dict") return "Diktant";
  if (x.step === "x") return "Qo'shimcha vazifa";
  return x.lesson;
}
/** ro'yxatdagi kitob darslarining bo'lim nomlari (bir marta yuklanadi, kesh — data.ts) */
export function useKbTitles(items: { lesson: string }[] | null): Record<string, string> {
  const [t, setT] = useState<Record<string, string>>({});
  const keys = items ? [...new Set(items.map((x) => x.lesson).filter((l) => KB_KEY.test(l)))].sort().join(",") : "";
  useEffect(() => {
    if (!keys) return;
    let alive = true;
    Promise.all(keys.split(",").map((k) => loadKb(k).then((L) => [k, L] as const).catch(() => null))).then((res) => {
      if (!alive) return;
      const o: Record<string, string> = {};
      for (const r of res) { if (r) for (const s of r[1].steps) o[`${r[0]}|${s.k}`] = kbPlace(r[0], s); }
      setT(o);
    });
    return () => { alive = false; };
  }, [keys]);
  return t;
}

/** «12 daqiqa oldin», «3 soat oldin», «2 kun oldin» */
export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4);
  return m < 60 ? `${Math.max(1, m)} daqiqa oldin` : m < 1440 ? `${Math.round(m / 60)} soat oldin` : `${Math.round(m / 1440)} kun oldin`;
};
export const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
/** «24-noyabr» (brauzerlar o'zbekcha oy nomini bilmaydi) */
export const dateUz = (iso: string) => { const d = new Date(iso); return `${d.getDate()}-${OY[d.getMonth()]}`; };
/** faqat arabcha matn (o'ngdan chapga blok); aralash (savol-javob, o'zbekcha izohli) — chapdan o'ngga, arabcha bo'laklar ajratiladi */
export const pureAr = (t: string) => /[؀-ۿ]/.test(t) && !/[A-Za-z]{3,}/.test(t);

/** bot xabaridagi «📋 Baholarni ochish» (go=marks_<n>) — «Baholar» ochilganda darhol «Ustoz izohlari» bo'limi */
export const marksJump = { notes: false };
