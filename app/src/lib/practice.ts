// Mashq bo'limi uchun umumiy yordamchilar — eski ilova (index.html) mantiqi va localStorage kalitlari bilan aynan bir xil.
// Manba tavsifi: _mahalliy/MASHQ-SPEC.md (§0).
import { useEffect, useState } from "react";
import { loadData } from "./data";
import { bkKey, type Book } from "./progress";
import { scheduleSync, store } from "./store";
import { shuffle, strip } from "./words";

export type PBook = Book & { title?: string; sent?: Record<string, string[][]> };
export type Item = { ar: string; uz: string; hint?: string; kind: "w" | "p"; u: number };

export const itemsOf = (u: PBook["units"][number]): Item[] => [
  ...u.words.map(([ar, uz, hint]) => ({ ar, uz, hint, kind: "w" as const, u: u.n })),
  ...(u.phrases || []).map(([ar, uz, hint]) => ({ ar, uz, hint, kind: "p" as const, u: u.n })),
];
export const allItems = (b: PBook) => b.units.flatMap(itemsOf);
// 2-paket: «Matndagi so'zlar» (tw) va «Qo'shimcha so'zlar» (xw) — uy vazifasi shartiga kirmaydi, «yodlangan» belgisi alohida (xk.<vahda>)
export type XSet = "tw" | "xw";
export const extrasOf = (u: PBook["units"][number], set: XSet): Item[] =>
  (set === "tw" ? u.tw || [] : u.xw || []).map((w) => ({ ar: String(w[0]), uz: String(w[1]), kind: "w" as const, u: u.n }));
export const extrasAll = (b: PBook) => b.units.flatMap((u) => [...extrasOf(u, "tw"), ...extrasOf(u, "xw")]);
/** takrorlash jadvali uchun: kitob so'zlari + qo'shimcha ro'yxatlar */
export const allItemsX = (b: PBook) => [...allItems(b), ...extrasAll(b)];
export const xKnownOf = (bid: string, u: number) => store.get<Record<string, number>>(bkKey(bid, `xk.${u}`), {});

// ===== matnni solishtirish (eski normAr / normUz / lev) =====
export const normAr = (t: string) => strip(t).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^ء-ي\s]/g, "").replace(/\s+/g, " ").trim();
export const normUz = (t: string) => String(t).toLowerCase().replace(/[ʻʼ’‘`´']/g, "'").replace(/o'/g, "o").replace(/g'/g, "g")
  .replace(/\([^)]*\)/g, "").replace(/…|\.\.\./g, " ").replace(/[^a-zЀ-ӿ\s]/g, " ").replace(/\s+/g, " ").trim();
export function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)] as number[]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
/** Kartochka javobi: "ok" | "near" (1–2 harf xato) | "no" | null (bo'sh). dir "uz" — o'zbekcha yoziladi, "ar" — arabcha */
export function checkTyped(it: { ar: string; uz: string }, typed: string, dir: "uz" | "ar"): "ok" | "near" | "no" | null {
  const t = dir === "ar" ? normAr(typed) : normUz(typed);
  if (!t) return null;
  const answers = dir === "ar" ? [normAr(it.ar)]
    : [...new Set([normUz(it.uz), ...it.uz.replace(/\([^)]*\)/g, "").split(/[,;/×]/).map(normUz).filter((x) => x.length > 1)])];
  for (const a of answers) {
    if (t === a) return "ok";
    const tol = a.length >= 8 ? 2 : a.length >= 4 ? 1 : 0;
    if (lev(t, a) <= tol) return "near";
  }
  return "no";
}

// ===== takrorlash jadvali (SRS) va xatolar daftari =====
export const SRS_INT = [1, 1, 3, 7, 14, 30, 60];
export const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5);
/** b — pog'ona (0 — shu kuni yangi o'rganilgan), d — qaysi kuni takrorlanadi, h — kun ichidagi takror vaqti (ms; 12-partiya, A3) */
type Srs = Record<string, { b: number; d: number; h?: number }>;
/** yangi so'z shu kuni yana qaytadi — o'rganilgandan 3 soat keyin (Nation, 29–30-betlar: kun ichidagi oraliq) */
export const LATER_MS = 3 * 3600e3;
export const isDue = (e: { d: number; h?: number } | undefined, t = dayNum()) => !!e && e.d <= t && !(e.h && e.h > Date.now());
/** roundda yoki darsda yangi o'rganilgan so'zlar takrorlash jadvaliga qo'shiladi (jadvalda bo'lganlari o'zgarmaydi) */
export function learnLater(bid: string, ars: string[]) {
  const key = bkKey(bid, "srs");
  const Sx = store.get<Srs>(key, {});
  const h = Date.now() + LATER_MS, d = dayNum();
  let ch = false;
  for (const ar of ars) if (!Sx[ar]) { Sx[ar] = { b: 0, d, h }; ch = true; }
  if (ch) { store.set(key, Sx); scheduleSync(); }
}
/** chalkashadigan juftlik: sinonim/antonim (rel: "a|b") yoki bitta harfi farq qiladigan so'zlar (قَلْبٌ / كَلْبٌ) — bir kunda takrorlanmaydi */
const skel = (s: string) => s.replace(/[\u064B-\u0652\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/^ال/, "").trim();
export function confusable(a: string, b: string, rel?: Set<string>) {
  if (rel && (rel.has(`${a}|${b}`) || rel.has(`${b}|${a}`))) return true;
  const x = skel(a), y = skel(b);
  if (x === y || x.length < 3 || x.length !== y.length || /\s/.test(x)) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i] && ++diff > 1) return false;
  return diff === 1;
}
export type Err = Record<string, { n: number; ar: string; b: string; t: number }>;

export function errAdd(ar: string, bid: string) {
  const E = store.get<Err>("f.err", {});
  const k = strip(ar);
  E[k] = E[k] || { n: 0, ar, b: bid, t: 0 };
  E[k].n++; E[k].t = Date.now();
  store.set("f.err", E);
}
export function errOk(ar: string) {
  const E = store.get<Err>("f.err", {});
  const k = strip(ar);
  if (!E[k]) return;
  E[k].n--;
  if (E[k].n <= 0) { delete E[k]; store.set("f.errfix", store.get("f.errfix", 0) + 1); }
  store.set("f.err", E);
}
// ===== 2-paket: uzoq xotira jurnali va qiyin so'zlar (f.* — server bilan sinxronlanadi) =====
/** [kun, 1|0] — kamida 7 kunlik tanaffusdan keyingi takror natijasi (oxirgi 400 ta) */
type Ltm = [number, number][];
const LTM_GAP = 7;
function ltmLog(ok: boolean) {
  const L = store.get<Ltm>("f.ltm", []);
  L.push([dayNum(), ok ? 1 : 0]);
  store.set("f.ltm", L.slice(-400));
}
/** «Uzoq xotira»: oxirgi 30 kundagi 7+ kunlik takrorlarda to'g'ri eslangan ulush; yozuv 20 tadan kam bo'lsa — null */
export function ltmStat(days = 30) {
  const t = dayNum();
  const L = store.get<Ltm>("f.ltm", []).filter(([d]) => t - d < days);
  return { n: L.length, pct: L.length >= 20 ? Math.round((L.reduce((s, [, ok]) => s + ok, 0) / L.length) * 100) : null };
}
/** Qiyin so'z: o'rganilgandan keyin (b ≥ 2) 3 marta unutilgan; 30 kunlik pog'onaga (b ≥ 5) qayta yetganda belgi olinadi */
type Hard = Record<string, { n: number; b: string }>;
const HARD_N = 3;
export const hardOf = () => store.get<Hard>("f.hard", {});
export const isHard = (ar: string) => (hardOf()[ar]?.n || 0) >= HARD_N;
export const hardIn = (bid: string) => Object.entries(hardOf()).filter(([, v]) => v.b === bid && v.n >= HARD_N).map(([ar]) => ar);

/** true — esladi, "part" — maslahat bilan topdi (oraliq oshmaydi, orqaga ham qaytmaydi, xato hisoblanmaydi), false — bilmadi */
export type Grade = boolean | "part";
/** Eski srsSet: xato bo'lsa daftarga; b — 1..6 pog'ona; joriy kitobdagi so'z bo'lsa "yodlangan" belgisi qo'yiladi/olinadi */
export function srsSet(book: PBook, ar: string, g: Grade) {
  if (g === false) errAdd(ar, book.id);
  const key = bkKey(book.id, "srs");
  const S = store.get<Srs>(key, {});
  const cur = S[ar] || { b: 0, d: 0 };
  // oldingi takrordan necha kun o'tgani: d = oxirgi takror kuni + SRS_INT[b] (eski ilovada ham shunday)
  if (S[ar] && cur.b >= 1 && dayNum() - (cur.d - SRS_INT[cur.b]) >= LTM_GAP) ltmLog(g === true);
  if (S[ar] && cur.b >= 2) {
    const H = hardOf();
    if (g === false) { H[ar] = { n: (H[ar]?.n || 0) + 1, b: book.id }; store.set("f.hard", H); }
    else if (g === true && H[ar] && cur.b + 1 >= 5) { delete H[ar]; store.set("f.hard", H); }
  }
  const b = g === true ? Math.min(cur.b + 1, 6) : g === "part" ? Math.max(cur.b, 1) : 1;
  S[ar] = { b, d: dayNum() + SRS_INT[b] };
  store.set(key, S);
  const it = g === "part" ? null : allItems(book).find((x) => x.ar === ar);
  const xt = g === "part" || it ? null : extrasAll(book).find((x) => x.ar === ar);
  if (it || xt) {
    const kk = it ? bkKey(book.id, `known.${it.u}`) : bkKey(book.id, `xk.${xt!.u}`);
    const k = store.get<Record<string, number>>(kk, {});
    if (g === true) k[ar] = 1; else delete k[ar];
    store.set(kk, k);
  }
  scheduleSync();
}
export const srsOf = (bid: string) => store.get<Srs>(bkKey(bid, "srs"), {});

// ===== rasmlar (EMO: harakatsiz arabcha → emoji; FLX: emoji → 3D rasm) =====
let EMO: Record<string, string> | null = null, FLX: Record<string, number> | null = null;
export function usePics() {
  const [ok, setOk] = useState(!!(EMO && FLX));
  useEffect(() => {
    if (EMO && FLX) return;
    Promise.all([loadData<Record<string, string>>("EMO"), loadData<Record<string, number>>("FLX")])
      .then(([e, f]) => { EMO = e; FLX = f; setOk(true); }).catch(() => setOk(true));
  }, []);
  return ok;
}
export function picOf(ar: string): string | null {
  const e = EMO?.[strip(ar)];
  if (!e || !FLX) return null;
  const i = FLX[String(e).replace(/️/g, "")];
  return i != null ? `./img/fli/${i}.webp` : null;
}
export const emoOf = (ar: string) => EMO?.[strip(ar)] || null;

/** Joriy vahdadan; yetmasa kitobning boshqa vahdalaridan to'ldiriladi (eski poolFor) */
export function poolFor(book: PBook, unitN: number, fn: (x: Item) => boolean, min: number) {
  const u = book.units.find((x) => x.n === unitN);
  const p = (u ? itemsOf(u) : []).filter(fn);
  if (p.length >= min) return p;
  const more = shuffle(allItems(book).filter((x) => x.u !== unitN && fn(x))).slice(0, Math.max(0, min * 2 - p.length));
  return [...p, ...more];
}

/** Arabcha alifbo (Harflardan yig' o'yinidagi chalg'ituvchi harflar) */
export const AB = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

/** 4 variantli savol: to'g'ri + 3 chalg'ituvchi (ar va uz farqli) */
export function mcq(it: Item, pool: Item[], dir: "ar2uz" | "uz2ar") {
  const others = shuffle(pool.filter((x) => x.ar !== it.ar && x.uz !== it.uz));
  const seen = new Set([dir === "ar2uz" ? it.uz : it.ar]);
  const pick: Item[] = [];
  for (const o of others) { const v = dir === "ar2uz" ? o.uz : o.ar; if (pick.length < 3 && !seen.has(v)) { seen.add(v); pick.push(o); } }
  const opts = shuffle([it, ...pick]);
  return { opts: opts.map((x) => (dir === "ar2uz" ? x.uz : x.ar)), ans: opts.indexOf(it) };
}

// ===== kitob tanlash: hozirgi kitob va oxirgi ochilgan vahda ({BK}last — eski ilova bilan umumiy) =====
export const lastUnit = (bid: string) => store.get<number>(bkKey(bid, "last"), 0);
export const setLastUnit = (bid: string, n: number) => { store.set(bkKey(bid, "last"), n); };
export const bestKey = (bid: string, game: string, unit: number) => bkKey(bid, `best.${game}.${unit}`);
