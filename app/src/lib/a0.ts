// A0 · Alifbo kursi: harflar, harf o'zlashtirish hisobi, ko'nikmalar, xato savollar takrorlashi, o'qish tezligi, A0 uy vazifasi.
// Kalitlar eski ilova bilan aynan bir xil (A0-SPEC §3): f.a0.L, f.a0.sk, f.a0.sp, f.a0.rev, f.kb.a0:N, f.hwsent; IndexedDB mezon-a0/v.
import { loadData } from "./data";
import { kbBest, loadKb, type KbItem, type KbLesson } from "./kb";
import { dayKey } from "./progress";
import { store } from "./store";

export type Let = [string, string, string, number]; // harf, o'zbekcha nomi, arabcha nomi, dars
export const A0_LESSONS = 13;
export const A0_NOJOIN = "ادذرزو";
export const FORM_UZ = ["yakka", "boshida", "o'rtada", "oxirida"];
export const FORM_UZ2 = ["yakka", "so'z boshida", "so'z o'rtasida", "so'z oxirida"];

let LET: Let[] | null = null, TOPICS: string[] | null = null, SPEED: string[] | null = null;
export async function a0Data() {
  if (!LET || !TOPICS || !SPEED) {
    [LET, TOPICS, SPEED] = await Promise.all([loadData<Let[]>("A0_LET"), loadData<string[]>("A0_TOPICS"), loadData<string[]>("A0_SPEED")]);
  }
  return { LET, TOPICS, SPEED };
}

/** «أ» hisobda «ا» (eski ilovadagi kabi) */
export const base = (l: string) => (l === "أ" || l === "إ" || l === "آ" ? "ا" : l);
/** 4 shakl: yakka, boshida, o'rtada, oxirida (ulanmaydigan harflarda boshida = yakka, o'rtada = oxirida) */
export function forms(l: string) {
  const b = base(l), j = !A0_NOJOIN.includes(b);
  const g = l === "أ" ? "أ" : b;
  return [g, j ? g + "ـ" : g, j ? "ـ" + g + "ـ" : "ـ" + g, "ـ" + g];
}
/** Harakatli 3 bo'g'in: alif uchun أَ أُ إِ (eski ilovada «أِ» xato edi) */
export const syl = (l: string) => (base(l) === "ا" ? ["أَ", "أُ", "إِ"] : [l + "َ", l + "ُ", l + "ِ"]);
export const sound = (l: string) => (base(l) === "ا" ? "أَ" : l + "َ");
export const info = (LETS: Let[], l: string) => LETS.find((r) => r[0] === base(l)) || ([l, l, l, 0] as Let);

// ===== harf o'zlashtirish =====
type LS = { c: number; w: number; t: number };
export const a0L = () => store.get<Record<string, LS>>("f.a0.L", {});
export function a0Hit(l: string | undefined, ok: boolean, kind?: string) {
  if (!l) return;
  const k = base(l), L = a0L(), x = L[k] || { c: 0, w: 0, t: 0 };
  if (ok) x.c++; else x.w++;
  if (kind === "trace" && ok) x.t = 1;
  L[k] = x; store.set("f.a0.L", L);
}
/** 0 — boshlanmagan, 1 — o'rganilmoqda, 2 — o'zlashtirildi (≥4 to'g'ri va kamida bir marta to'g'ri chizilgan) */
export function a0State(l: string) { const x = a0L()[base(l)]; if (!x) return 0; return x.c >= 4 && x.t ? 2 : x.c || x.t ? 1 : 0; }
export const a0Counts = (LETS: Let[]) => ({ g: LETS.filter((r) => a0State(r[0]) === 2).length, y: LETS.filter((r) => a0State(r[0]) === 1).length });
export type Skill = "oqish" | "yozish" | "tinglash" | "lugat";
export function a0Sk(k: Skill, ok: boolean) {
  const S = store.get<Record<string, { c: number; n: number }>>("f.a0.sk", {});
  const v = S[k] || { c: 0, n: 0 }; v.n++; if (ok) v.c++;
  S[k] = v; store.set("f.a0.sk", S);
}
/** Javobdan keyin harf va ko'nikma hisobi (A0-SPEC §2.6): hear → tinglash, pick → lug'at, choose/listen1 → o'qish, trace → yozish */
export function a0Answer(it: KbItem & { ltr?: string; l?: string }, ok: boolean) {
  const t = it.type;
  if (t === "trace") { a0Hit(it.l, ok, "trace"); a0Sk("yozish", ok); return; }
  if (t === "hear") { a0Hit(it.ltr, ok); a0Sk("tinglash", ok); return; }
  if (t === "pick") { a0Sk("lugat", ok); return; }
  if (t === "choose" || t === "qa" || t === "listen1") { a0Hit(it.ltr, ok); a0Sk("oqish", ok); }
}

// ===== darslar =====
export const a0Key = (n: number) => `a0:${n}`;
export const a0Done = (n: number) => Object.keys(kbBest(a0Key(n))).length;
export const loadA0 = (n: number) => loadKb(a0Key(n));
export async function loadAllA0() {
  const out: (KbLesson | null)[] = await Promise.all(Array.from({ length: A0_LESSONS }, (_, i) => loadA0(i + 1).catch(() => null)));
  return out;
}
/** "8-bet · Salomlashuv" → ["8-bet", "Salomlashuv"]; nazorat → ["Yakun", "Nazorat · N-dars"] */
export function stepParts(s: { k: string; t: string }) {
  const m = /^(\d+(?:[–-]\d+)?-bet)\s*·\s*(.*)$/.exec(s.t || "");
  return m ? [m[1], m[2]] : [s.k === "nazorat" ? "Yakun" : "", (s.t || "").replace(/^Nazorat\s*·\s*/, "Nazorat · ")];
}

// ===== xato savollar takrorlashi =====
export type Rev = { k: string; s: number; i: number; lv: number; due: number };
const GAP = [0, 1, 3, 7];
export const a0Rev = () => store.get<Rev[]>("f.a0.rev", []);
const revSet = (R: Rev[]) => store.set("f.a0.rev", R.slice(-300));
const DAYMS = 864e5, HOUR = 36e5;
/** A0 darsidagi xato javob — ertaga qaytadi (trace takrorlashga tushmaydi) */
export function revWrong(k: string, s: number, i: number) {
  const R = a0Rev(), x = R.find((r) => r.k === k && r.s === s && r.i === i), due = Date.now() + DAYMS - HOUR;
  if (x) { x.lv = 0; x.due = due; } else R.push({ k, s, i, lv: 0, due });
  revSet(R);
}
/** Takrorlash sessiyasidagi javob: to'g'ri → +1 / +3 / +7 kun, 4-to'g'ri — ro'yxatdan chiqadi; xato → ertaga */
export function revAnswer(ref: { k: string; s: number; i: number }, ok: boolean) {
  const R = a0Rev(), x = R.find((r) => r.k === ref.k && r.s === ref.s && r.i === ref.i);
  if (!x) return;
  if (ok) { x.lv = (x.lv || 0) + 1; if (x.lv >= GAP.length) R.splice(R.indexOf(x), 1); else x.due = Date.now() + GAP[x.lv] * DAYMS - HOUR; }
  else { x.lv = 0; x.due = Date.now() + DAYMS - HOUR; }
  revSet(R);
}
/** Muddati kelgan savollar (dars ma'lumotida item hali mavjud bo'lsa) */
export function revDue(lessons: (KbLesson | null)[]) {
  return a0Rev().filter((r) => {
    const n = Number(r.k.split(":")[1]);
    return r.due <= Date.now() && !!lessons[n - 1]?.steps[r.s]?.items[r.i];
  });
}

// ===== o'qish tezligi va ovozlar (faqat shu telefonda — IndexedDB) =====
export type Sp = { d: string; v: number };
export const a0Hist = () => store.get<Sp[]>("f.a0.sp", []);
export function addSpeed(v: number) { const H = a0Hist(); H.push({ d: dayKey(), v }); store.set("f.a0.sp", H.slice(-30)); a0Sk("oqish", true); }
function db(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open("mezon-a0", 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore("v"); } catch { /* */ } };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
}
export async function voicePut(k: "first" | "last", b: Blob) {
  const d = await db(); if (!d) return;
  try { d.transaction("v", "readwrite").objectStore("v").put(b, k); } catch { /* */ }
}
export async function voiceGet(k: "first" | "last"): Promise<Blob | null> {
  const d = await db(); if (!d) return null;
  return new Promise((ok) => {
    try { const q = d.transaction("v").objectStore("v").get(k); q.onsuccess = () => ok((q.result as Blob) || null); q.onerror = () => ok(null); } catch { ok(null); }
  });
}

// ===== A0 uy vazifasi =====
export type Hw = { id: number; book: string; unit: number; title?: string; due: string; teacher?: boolean; group_code?: string;
  mine?: { done?: boolean; progress?: { grade?: number; comment?: string; done?: number; tot?: number; avg?: number } } | null };
export const a0HwAll = () => store.get<Hw[]>("f.hw", []).filter((h) => !h.teacher && h.book === "a0");
export const a0HwFor = (n: number) => a0HwAll().find((h) => h.unit === n);
export function a0HwState(h: Hw, L: KbLesson | null) {
  const B = kbBest(a0Key(h.unit)), tot = L ? L.steps.length : 0;
  const v = L ? L.steps.map((_, i) => B[i]).filter((x): x is number => x !== undefined) : [];
  const sent = !!h.mine?.done || !!store.get<Record<string, number>>("f.hwsent", {})[h.id];
  const pr = h.mine?.progress || {};
  return { tot, done: v.length, avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0,
    full: tot > 0 && v.length >= tot, sent, grade: pr.grade || null, comment: pr.comment || "", late: h.due < dayKey() };
}
/** "2026-11-05" → "5.11" */
export const fmtDate = (d: string) => { const [, m, dd] = d.split("-").map(Number); return m && dd ? `${dd}.${m}` : d; };
