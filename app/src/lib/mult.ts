// Multfilmlar va shadowing uchun umumiy: ma'lumot (MULT_DATA), karaoke vaqti, kunlik iboralar.
// Kalitlar eski ilova bilan bir xil: f.mdone {id: %}, f.mspeed, f.klag, f.shd {date, done[], rep{}, sec}, f.shrate.
import { loadData } from "./data";
import { normAr } from "./practice";
import { dayKey, hash } from "./progress";
import { store } from "./store";
import { shuffle, strip } from "./words";

export type Cue = { s: number; e: number; ar: string; uz: string; w?: number[]; x?: number };
export type MVoc = { ar: string; uz: string; t?: string; pl?: string; v?: string[]; ex?: string[]; hl?: string };
export type MQuiz = { q: string; opts: string[]; ans: number; why?: string };
export type Mult = {
  id: string; level: string; title: string; titleAr?: string; sub?: string; dur?: number;
  src?: string; yt?: string | null; thumb?: string; cues: Cue[]; vocab?: MVoc[]; quiz?: MQuiz[];
};

export const MLV: [string, string][] = [["a1", "A1"], ["a2", "A2"], ["b1", "B1"], ["b2", "B2"], ["c1", "C1"]];
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const SHSP = [0.5, 0.75, 1, 1.25];
export const TYL: Record<string, string> = { ot: "ot", fel: "fe'l", sifat: "sifat" };
export const VLAB = ["moziy", "muzoriy", "amr", "masdar"];

export const loadMults = () => loadData<Mult[]>("MULT_DATA").catch(() => [] as Mult[]);
// Videolar repo ildizida (eski ilova bilan umumiy fayl): v2/ papkasidan bir pog'ona yuqorida
export const videoUrl = (m: Mult) => `../${m.src}`;
export const fmtT = (s: number) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export const mDone = () => store.get<Record<string, number>>("f.mdone", {});
export function setMDone(id: string, pct: number) { const D = mDone(); D[id] = Math.max(D[id] || 0, pct); store.set("f.mdone", D); }
export const mSpeed = () => store.get<number>("f.mspeed", 1);
export const shRate = () => store.get<number>("f.shrate", 1);

/** Karaoke kechikishi: yozuv ovozdan oldinda bo'lsa foydalanuvchi suradi (Android sekinroq) */
export const kLag = () => { const v = store.get<number | null>("f.klag", null); return typeof v === "number" ? v : /Android/i.test(navigator.userAgent) ? 0.3 : 0.15; };
export const setKLag = (d: number) => { const v = Math.max(-0.5, Math.min(1.5, Math.round((kLag() + d) * 100) / 100)); store.set("f.klag", v); return v; };

/** Har so'z boshlanadigan vaqt: tayyor belgi (w) bo'lmasa — harf soniga qarab taqsimlanadi */
export function kWT(c: Cue) {
  if (c.w && c.w.length) return c.w;
  const L = c.ar.split(/\s+/).map((w) => w.replace(/[ً-ْٰ]/g, "").length + 1);
  const T = L.reduce((a, b) => a + b, 0);
  let a = 0;
  return L.map((l) => { const x = c.s + ((c.e - c.s) * 0.9 * a) / T; a += l; return x; });
}
/** Gap ichidagi so'zlarni vaqtga qarab bo'yash (DOM'da to'g'ridan-to'g'ri — har kadrda React qayta chizmasin) */
export function kPaint(root: Element | null, c: Cue, t: number) {
  if (!root) return;
  t -= kLag();
  const T = kWT(c);
  let cur = -1;
  for (let i = 0; i < T.length; i++) if (t >= T[i] - 0.03) cur = i;
  const end = t >= c.e - 0.05;
  root.querySelectorAll(".kw").forEach((el, i) => {
    el.classList.toggle("sd", i < cur || (end && i <= cur));
    el.classList.toggle("cur", i === cur && !end);
  });
}
export function lastAt(m: Mult, t: number) { let k = -1; for (let i = 0; i < m.cues.length; i++) { if (m.cues[i].s <= t + 0.02) k = i; else break; } return k; }
export function cueAt(m: Mult, t: number) { for (let i = 0; i < m.cues.length; i++) { const c = m.cues[i]; if (t >= c.s && t < c.e) return i; if (t < c.s) return -1; } return -1; }

const arCore = (s: string) => normAr(s).replace(/^(ال|و|ف|ب|ل)+/, "");
/** Bosilgan so'zga mos lug'at yozuvi (o'zak boshi yoki belgilangan shakl bo'yicha) */
export function vocFor(m: Mult, w: string) {
  const c = arCore(w);
  return (m.vocab || []).findIndex((x) => {
    const a = arCore(x.ar.split(/\s+/)[0]), h = x.hl ? arCore(x.hl) : "";
    return (c.length >= 2 && (a.startsWith(c.slice(0, Math.max(2, c.length - 1))) || c.startsWith(a.slice(0, Math.max(2, a.length - 1))))) || (!!h && h === c);
  });
}

// ===== Shadowing =====
export type ShItem = { m: string; i: number };
export type ShDay = { date: string; done: string[]; rep: Record<string, number>; sec: number };
export const shKey = (x: ShItem) => `${x.m}:${x.i}`;
/** Takrorlashga yaraydigan gap: izoh emas, kamida 0.8 s, 4+ harf */
export const shOk = (c: Cue) => !!c && !/^\[/.test(c.ar) && c.e - c.s >= 0.8 && strip(c.ar).replace(/[^ء-ي]/g, "").length >= 4;
export const shEnd = (c: Cue) => Math.min(Math.max(c.e, c.x || c.e), c.e + 2) + 0.15;

/** Foydalanuvchi darajasi (multfilmi bor bo'lsa), aks holda tanlangan kitob yoki birinchi multfilm darajasi */
export function multLevel(ms: Mult[], level?: string | null, book?: string | null) {
  const L0 = String(level || "").toLowerCase();
  if (ms.some((m) => m.level === L0)) return L0;
  if (book && ms.some((m) => m.level === book)) return book;
  return ms[0]?.level || "a1";
}
/** Bugungi 10 ibora: har kuni bir xil tanlov (eski ilova formulasi) */
export function shPicks(ms: Mult[], lv: string): ShItem[] {
  const pool: ShItem[] = [];
  const seen = new Set<string>();
  ms.filter((m) => m.level === lv).forEach((m) => m.cues.forEach((c, i) => {
    const w = strip(c.ar).split(/\s+/).length;
    if (shOk(c) && w >= 2 && w <= 8 && !/ — /.test(c.ar) && !seen.has(c.ar)) { seen.add(c.ar); pool.push({ m: m.id, i }); }
  }));
  if (!pool.length) return [];
  const seed = hash(dayKey() + lv);
  const out: ShItem[] = [];
  const used = new Set<number>();
  for (let k = 0; out.length < 10 && k < pool.length * 3; k++) {
    const j = (seed * (k + 7) + k * k * 31) % pool.length;
    if (!used.has(j)) { used.add(j); out.push(pool[j]); }
  }
  return out;
}
export function shMore(ms: Mult[], lv: string): ShItem[] {
  const all: ShItem[] = [];
  ms.filter((m) => m.level === lv).forEach((m) => m.cues.forEach((c, i) => { if (shOk(c)) all.push({ m: m.id, i }); }));
  return shuffle(all).slice(0, 10);
}
export function shToday(): ShDay {
  const D = store.get<Partial<ShDay>>("f.shd", {});
  if (D.date !== dayKey()) return { date: dayKey(), done: [], rep: {}, sec: 0 };
  return { date: D.date, done: D.done || [], rep: D.rep || {}, sec: D.sec || 0 };
}
