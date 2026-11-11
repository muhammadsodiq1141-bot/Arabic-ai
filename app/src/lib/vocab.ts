// 11.11.2026 (M3): «So'z boyligim» — ilova lug'atidan (LEX: Manhaj A1–C1, Madina 1–2, yordamchi so'zlar) 5 bosqichli test.
// Har bosqichdan 8 ta so'z → 4 ma'no + «Bilmayman». Baho: (to'g'ri − xato/3) / so'ralgan; taxmin = Σ ulush × bosqichdagi so'zlar soni.
// Bosqichda ulush 30% dan past bo'lsa — qiyinroq bosqichlar so'ralmaydi (0). Natijalar: f.vst (sinxronlanadi, oxirgi 12 ta), har 30 kunda qayta.
import { loadData } from "./data";
import { dayKey } from "./progress";
import { scheduleSync, store } from "./store";

type Raw = [string, string, string, number, number][];
export type VItem = { ar: string; uz: string; b: string };
export type VQ = { band: number; it: VItem; opts: string[] };
export type VRes = { d: string; n: number; s: (number | null)[]; w?: [string, string][] };

/** bosqichlar: qaysi kitoblar so'zlari (birinchi uchragan — eng oson bosqichda qoladi) */
export const BANDS: { lbl: string; books: string[] }[] = [
  { lbl: "A1", books: ["core", "a1"] },
  { lbl: "A2", books: ["md1", "a2"] },
  { lbl: "B1", books: ["md2", "b1"] },
  { lbl: "B2", books: ["b2"] },
  { lbl: "C1", books: ["c1"] },
];
export const PER = 8;
export const TOTAL_Q = BANDS.length * PER;
export const STOP_AT = 0.3;
export const EVERY_DAYS = 30;

const HAR = /[ً-ْٰـ]/g;
const skel = (s: string) => s.replace(HAR, "").replace(/[أإآٱ]/g, "ا").trim();
const firstWord = (s: string) => s.toLowerCase().split(/[\s,;(]+/)[0];

let BANDS_P: Promise<VItem[][]> | null = null;
/** lug'atdan bosqichlar: faqat yakka so'zlar (ibora emas), ma'nosi qisqa, takrorsiz */
export function loadBands(): Promise<VItem[][]> {
  if (!BANDS_P) BANDS_P = loadData<Raw>("LEX").then((raw) => {
    const seen = new Set<string>();
    return BANDS.map((bd) => {
      const out: VItem[] = [];
      for (const [ar, uz, b, , k] of raw) {
        if (!bd.books.includes(b) || k === 1) continue;
        const a = ar.trim(), u = uz.trim();
        if (/[\s/،,]/.test(a) || !/[ء-ي]/.test(a) || !u || u.length > 40) continue;
        const s = skel(a);
        if (s.length < 2 || seen.has(s)) continue;
        seen.add(s); out.push({ ar: a, uz: u, b });
      }
      return out;
    });
  }).catch((e) => { BANDS_P = null; throw e; });
  return BANDS_P;
}

const shuffle = <T,>(a: T[]) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

/** bitta bosqich savollari: 8 ta so'z, har biriga shu bosqichdan 3 ta boshqa ma'no */
export function bandQs(bands: VItem[][], bi: number): VQ[] {
  const pool = bands[bi];
  return shuffle(pool).slice(0, PER).map((it) => {
    const used = new Set([firstWord(it.uz)]);
    const opts = [it.uz];
    for (const o of shuffle(pool)) {
      if (opts.length >= 4) break;
      const fw = firstWord(o.uz);
      if (o.ar === it.ar || o.uz === it.uz || used.has(fw)) continue;
      used.add(fw); opts.push(o.uz);
    }
    return { band: bi, it, opts: shuffle(opts) };
  });
}

/** bosqich ulushi: to'g'ri − xato/3 (taxmin uchun jarima), 0..1 */
export const bandShare = (ok: number, wrong: number, asked: number) => (asked ? Math.max(0, ok - wrong / 3) / asked : 0);

/** taxminiy so'z soni (10 ga yaxlitlangan) */
export function estimate(bands: VItem[][], shares: (number | null)[]) {
  const n = shares.reduce<number>((a, s, i) => a + (s ? s * bands[i].length : 0), 0);
  return n >= 50 ? Math.round(n / 10) * 10 : Math.round(n);
}

export const vHist = () => store.get<VRes[]>("f.vst", []);
export function vSave(r: VRes) { store.set("f.vst", [...vHist(), r].slice(-12)); scheduleSync(); }
const dnum = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / 864e5; };
/** oxirgi o'lchovdan beri kunlar (o'lchov bo'lmasa — null) */
export function vSince() { const h = vHist(); return h.length ? Math.round(dnum(dayKey()) - dnum(h[h.length - 1].d)) : null; }
export const vDue = () => { const s = vSince(); return s === null || s >= EVERY_DAYS; };
export function vNext() {
  const h = vHist(); if (!h.length) return null;
  const [y, m, d] = h[h.length - 1].d.split("-").map(Number);
  const t = new Date(y, m - 1, d + EVERY_DAYS);
  return dayKey(t);
}
