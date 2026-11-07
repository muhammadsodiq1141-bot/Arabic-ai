// 17-partiya: vahda matnlari — kitob mashqlaridagi o'qish bo'limlari (read: [so'zlovchi, arabcha, o'zbekcha]).
// Diktant (K7, U7), rol kartalari (U7) va yakka gapirish namunasi (M7) shu yerdan oladi. Matn kitobdagidek — o'zgartirilmaydi.
import { kbKeyOf, loadKb, type KbLesson } from "./kb";
import { hash } from "./progress";

export type Line = { sp: string; ar: string; uz: string; step: string; title: string };
export type Dialog = { title: string; step: string; lines: Line[]; roles: string[] };
export type UnitTexts = { lines: Line[]; dialogs: Dialog[] };

const HAR = /[ً-ْٰـ]/g;
const PUNCT = /[.,،؛؟!?:«»"()—–-]/g;
export const wordsOf = (ar: string) => ar.replace(HAR, "").replace(PUNCT, " ").split(/\s+/).filter(Boolean);

export function textsOf(kb: KbLesson): UnitTexts {
  const lines: Line[] = [];
  const dialogs: Dialog[] = [];
  for (const st of kb.steps) {
    for (const it of st.items) {
      if (it.type !== "read") continue;
      const L = ((it.lines || []) as (string | string[])[]).map((l) => (Array.isArray(l) ? l : ["", l, ""]));
      const title = String(it.title || "");
      const own = L.map((l) => ({ sp: String(l[0] || "").trim(), ar: String(l[1] || "").trim(), uz: String(l[2] || "").trim(), step: st.k, title })).filter((l) => l.ar);
      lines.push(...own);
      const roles = [...new Set(own.map((l) => l.sp).filter(Boolean))];
      if (roles.length >= 2 && own.every((l) => l.sp)) dialogs.push({ title: title || st.t.split(" · ")[0], step: st.k, lines: own, roles });
    }
  }
  return { lines, dialogs };
}

const memo = new Map<string, Promise<UnitTexts | null>>();
export function unitTexts(bookId: string, unitN: number): Promise<UnitTexts | null> {
  const k = kbKeyOf(bookId, unitN);
  if (!k) return Promise.resolve(null);
  let p = memo.get(k);
  if (!p) { p = loadKb(k).then(textsOf).catch(() => null); memo.set(k, p); }
  return p;
}

/** Diktantga yaraydigan gap: 3–9 so'z, bo'sh joy, ikki nuqta yoki uch nuqta yo'q */
export const dictOk = (l: Line) => { const n = wordsOf(l.ar).length; return n >= 3 && n <= 9 && !/[:…_]|\.\.\./.test(l.ar); };

/** Bir xil urug' (seed) — bir xil 5 gap: ustoz va o'quvchilar bitta kod bilan bir xil diktantni oladi */
export function dictPicks(lines: Line[], seed: number, n = 5): Line[] {
  const seen = new Set<string>();
  const pool = lines.filter((l) => dictOk(l) && !seen.has(l.ar) && seen.add(l.ar));
  if (!pool.length) return [];
  const out: Line[] = [];
  const used = new Set<number>();
  const h = hash(`dict:${seed}`);
  for (let k = 0; out.length < Math.min(n, pool.length) && k < pool.length * 4; k++) {
    const j = (h + k * 7919 + k * k * 31) % pool.length;
    if (!used.has(j)) { used.add(j); out.push(pool[j]); }
  }
  return out;
}

/** Ustoz diktanti kodi: A1-3-27 → kitob a1, 3-vahda, urug' 27 (Madina: MD1-4-12) */
export const dictCode = (bookId: string, unitN: number, seed: number) => `${bookId.toUpperCase()}-${unitN}-${seed}`;
export function parseDictCode(code: string): { book: string; unit: number; seed: number } | null {
  const m = /^\s*(a0|a1|a2|b1|b2|c1|md1|md2)\s*[-\s]\s*(\d{1,2})\s*[-\s]\s*(\d{1,3})\s*$/i.exec(code);
  return m ? { book: m[1].toLowerCase(), unit: Number(m[2]), seed: Number(m[3]) } : null;
}

// ===== tekshirish: harakatsiz, alif shakllari bir xil; ـة va ـه farqlanadi (A1 dagi tipik xato) =====
const normW = (w: string) => w.replace(HAR, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(PUNCT, "");
export type WordMark = { w: string; ok: boolean };
/** To'g'ri gapning har so'zi yozilganmi (eng uzun umumiy ketma-ketlik bilan): ok/xato va jami foiz */
export function checkDict(right: string, typed: string): { marks: WordMark[]; pct: number; exact: boolean } {
  const R = right.split(/\s+/).filter(Boolean);
  const Rn = R.map(normW).filter(Boolean);
  const Tn = typed.split(/\s+/).map(normW).filter(Boolean);
  const dp: number[][] = Array.from({ length: Rn.length + 1 }, () => new Array(Tn.length + 1).fill(0));
  for (let i = Rn.length - 1; i >= 0; i--) for (let j = Tn.length - 1; j >= 0; j--) dp[i][j] = Rn[i] === Tn[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const okIdx = new Set<number>();
  for (let i = 0, j = 0; i < Rn.length && j < Tn.length;) {
    if (Rn[i] === Tn[j]) { okIdx.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const RW = R.filter((w) => normW(w));
  const marks = RW.map((w, i) => ({ w, ok: okIdx.has(i) }));
  const pct = Rn.length ? Math.round((okIdx.size / Math.max(Rn.length, Tn.length)) * 100) : 0;
  return { marks, pct, exact: okIdx.size === Rn.length && Tn.length === Rn.length };
}
