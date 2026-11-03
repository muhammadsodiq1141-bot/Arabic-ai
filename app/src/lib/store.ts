// Progressni saqlash — ESKI ILOVA BILAN AYNAN BIR XIL kalit va formatda, shunda ikkala ilova bitta telefonda
// bir-birining ishini ko'radi va serverdagi nusxa ham bir xil bo'ladi.
// Kalitlar: a1.* / bk.<kitob>.* / x.* / f.*  (qiymat — JSON). Server bilan "load" (bo'sh telefonga tiklash) va "sync".
import { api } from "./api";
import { loadData } from "./data";
import { bkKey, dayKey, hwProgress, weekId, type Book } from "./progress";
import { mySummary } from "./summary";
import { tg } from "./tg";

const PREFIX = /^(a1\.|bk\.|x\.|f\.)/;
const SYNC_SKIP = /^(x\.fchk|f\.me|f\.hw|f\.syncAt)$/;

export const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v === null ? d : (JSON.parse(v) as T); } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* xotira to'la */ } },
};

// Bitta telefonda bir nechta Telegram akkaunti: eski ilovadagi kod bilan bir xil (acct.owner, acct.<tgId>)
export function accountSwitch(id?: string | number | null) {
  const curId = id ?? tg.user?.id;
  if (!curId) return;
  try {
    const L = localStorage, cur = String(curId);
    let owner = L.getItem("acct.owner");
    if (!owner) { try { const m = JSON.parse(L.getItem("f.me") || "null"); if (m?.tg) owner = String(m.tg); } catch { /* */ } }
    if (!owner || owner === cur) { L.setItem("acct.owner", cur); return; }
    const ks: string[] = [];
    const snap: Record<string, string> = {};
    for (let i = 0; i < L.length; i++) { const k = L.key(i); if (k && PREFIX.test(k)) ks.push(k); }
    ks.forEach((k) => { snap[k] = L.getItem(k) ?? ""; });
    try { L.setItem(`acct.${owner}`, JSON.stringify(snap)); } catch { /* */ }
    ks.forEach((k) => L.removeItem(k));
    const back = L.getItem(`acct.${cur}`);
    if (back) { try { const o = JSON.parse(back) as Record<string, string>; for (const k in o) L.setItem(k, o[k]); } catch { /* */ } L.removeItem(`acct.${cur}`); }
    L.setItem("acct.owner", cur);
  } catch { /* xotira yopiq */ }
}

export const localEmpty = () => !store.get("x.t", 0) && !Object.keys(store.get<Record<string, number>>("a1.days", {})).length;

function collect() {
  const o: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && PREFIX.test(k) && !SYNC_SKIP.test(k)) o[k] = localStorage.getItem(k) ?? "";
    }
  } catch { /* */ }
  return o;
}

// Ilova ochilganda: telefon bo'sh bo'lsa — serverdagi nusxani tiklash (eski bootSync bilan bir xil)
let booted: Promise<void> | null = null;
export function bootSync(meCache: { tg?: number | null }): Promise<void> {
  if (booted) return booted;
  booted = (async () => {
    if (!tg.user && meCache.tg) accountSwitch(meCache.tg); // Telegram'siz (login) kirishda ham akkaunt bo'yicha ajratish
    store.set("f.me", meCache);
    try {
      const r = await api<{ data: Record<string, string> | null }>("load");
      if (r.data && localEmpty()) for (const k in r.data) { try { localStorage.setItem(k, r.data[k]); } catch { /* */ } }
      else scheduleSync();
    } catch { /* oflayn */ }
  })();
  return booted;
}

// XP va faollik (eski gain/logAct ning asosiy qismi: kunlik va jami XP, hisoblagichlar, faol kunlar)
export function gain(kind: string, xp: number) {
  const t = dayKey();
  const D = store.get<Record<string, number>>("x.d", {});
  D[t] = (D[t] || 0) + xp;
  store.set("x.d", D);
  store.set("x.t", store.get("x.t", 0) + xp);
  const c = store.get<Record<string, number>>(`x.c.${t}`, {});
  c[kind] = (c[kind] || 0) + 1;
  store.set(`x.c.${t}`, c);
  const L = store.get<Record<string, number>>("a1.days", {});
  L[t] = (L[t] || 0) + 1;
  store.set("a1.days", L);
  scheduleSync();
}

export function markKnown(bookId: string, unit: number, ar: string) {
  const k = bkKey(bookId, `known.${unit}`);
  const m = store.get<Record<string, number>>(k, {});
  if (m[ar]) return false;
  m[ar] = 1;
  store.set(k, m);
  scheduleSync();
  return true;
}
export const knownOf = (bookId: string, unit: number) => store.get<Record<string, number>>(bkKey(bookId, `known.${unit}`), {});

export function setBest(key: string, pct: number) {
  if (pct > store.get(key, 0)) store.set(key, pct);
  scheduleSync();
}
export function setTest(bookId: string, unit: number, pct: number) {
  const k = bkKey(bookId, "tests");
  const m = store.get<Record<string, number>>(k, {});
  if (pct > (m[unit] || 0)) { m[unit] = pct; store.set(k, m); }
  scheduleSync();
}

// Serverga yuborish (eski syncNow bilan bir xil: data, haftalik XP, uy vazifasi holati)
let timer: number | undefined;
let syncing = false;
export function scheduleSync() { clearTimeout(timer); timer = window.setTimeout(() => void syncNow(), 12000); }
export async function syncNow() {
  if (syncing) return;
  syncing = true;
  clearTimeout(timer);
  try {
    const D = store.get<Record<string, number>>("x.d", {});
    const w = weekId().split("-").map(Number);
    let xpWeek = 0;
    for (let i = 0; i < 7; i++) xpWeek += D[dayKey(new Date(w[0], w[1] - 1, w[2] + i))] || 0;
    const items = store.get<{ id: number; book: string; unit: number; teacher?: boolean }[]>("f.hw", []).filter((h) => !h.teacher && h.book !== "a0");
    const hw = [];
    for (const h of items) {
      try {
        const book = await loadData<Book>(`books/${h.book}`);
        const p = hwProgress(collect(), book, h.unit);
        hw.push({ id: h.id, progress: { words: p.words, test: p.test, rules: p.rules, done: p.done }, done: p.done });
      } catch { /* kitob yuklanmadi */ }
    }
    // _sum (qisqa hisobot) — eski ilova ham har sync'da yuboradi; yuborilmasa server uni o'chiradi va ustoz paneli bo'sh qoladi
    const sum = await mySummary().catch(() => undefined);
    await api("sync", { data: collect(), week: weekId(), xpWeek, hw, ...(sum ? { sum } : {}) });
    store.set("f.syncAt", Date.now());
  } catch { /* keyinroq */ }
  syncing = false;
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void syncNow(); });
