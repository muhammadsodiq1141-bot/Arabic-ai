// O'quvchining qisqa hisoboti (_sum) — ustoz va admin panellari FAQAT shuni o'qiydi. Eski ilovadagi mySummary bilan aynan bir xil format:
// {v:1, at, streak, xpw (hafta XP), xpt (BUGUNGI XP), days[14], book, books:{id:[yodlangan, jami]}, mlt, sh, test, ob?, kb?, a0?}
// Server sync'da _sum'ni shu bilan almashtiradi; yubormasak — o'chib ketadi va ustoz o'quvchi natijasini ko'rmaydi.
import { loadData, type BookIndex } from "./data";
import { loadKb } from "./kb";
import { bkKey, dayKey, weekId } from "./progress";
import { store } from "./store";

const get = <T>(k: string, d: T) => store.get<T>(k, d);

// seriya: faol kunlar yoki "muzlatilgan" kunlar (eski ilovadagi streak bilan bir xil)
function streakFz() {
  const L = get<Record<string, number>>("a1.days", {});
  const fz = get<string[]>("x.fz", []);
  const on = (k: string) => !!L[k] || fz.includes(k);
  const d = new Date();
  if (!on(dayKey(d))) d.setDate(d.getDate() - 1);
  let c = 0;
  while (on(dayKey(d))) { c++; d.setDate(d.getDate() - 1); }
  return c;
}

export function localKeys(re: RegExp) {
  const out: string[] = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && re.test(k)) out.push(k); } } catch { /* */ }
  return out;
}

export async function mySummary(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { v: 1, at: new Date().toISOString(), books: {} };
  try { out.streak = streakFz(); } catch { out.streak = 0; }
  if (get<boolean>("f.lite", false)) out.lite = 1; // 17-partiya (A6): ustoz panelida «trafigi cheklangan» belgisi
  try {
    const D = get<Record<string, number>>("x.d", {});
    const w = weekId().split("-").map(Number);
    let xpw = 0;
    for (let i = 0; i < 7; i++) xpw += D[dayKey(new Date(w[0], w[1] - 1, w[2] + i))] || 0;
    out.xpw = xpw; out.xpt = D[dayKey()] || 0;
  } catch { /* */ }
  try {
    const L = get<Record<string, number>>("a1.days", {});
    const days: number[] = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(L[dayKey(d)] || 0); }
    out.days = days;
  } catch { /* */ }
  const book = get("a1.book", "a1");
  try {
    out.book = book;
    const idx = await loadData<BookIndex>("books/index");
    const books: Record<string, [number, number]> = {};
    for (const b of idx) {
      const re = b.id === "a1" ? /^a1\.known\.\d+$/ : new RegExp(`^bk\\.${b.id}\\.known\\.\\d+$`);
      const kn = localKeys(re).reduce((a, k) => a + Object.keys(get<Record<string, unknown>>(k, {})).length, 0);
      if (kn > 0 || b.id === book) books[b.id] = [kn, b.words];
    }
    out.books = books;
  } catch { /* */ }
  try {
    out.mlt = Object.keys(get<Record<string, unknown>>("f.mdone", {})).length;
    const S = get<{ date?: string; done?: unknown[] }>("f.shd", {});
    out.sh = S.date === dayKey() ? (S.done || []).length : 0;
  } catch { /* */ }
  try {
    const v = Object.values(get<Record<string, number>>(bkKey(book, "tests"), {}));
    out.test = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  } catch { /* */ }
  // birinchi hafta yo'li (eski ilova)
  try {
    const W = get<{ start: number; done?: Record<string, number>; hide?: boolean } | null>("f.ob.wk", null);
    if (W && !W.hide) {
      const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(W.start).setHours(0, 0, 0, 0)) / 864e5) + 1;
      out.ob = { d: Math.min(d, 8), n: Object.keys(W.done || {}).length };
    }
  } catch { /* */ }
  // kitob mashqlari: {dars: [bajarilgan qadamlar, jami qadamlar, o'rtacha %]}
  try {
    const K: Record<string, [number, number, number]> = {};
    for (const k of localKeys(/^f\.kb\.(a0|a1|md1|md2):\d+$/)) {
      const key = k.slice(5);
      const v = Object.values(get<Record<string, number>>(k, {}));
      if (!v.length) continue;
      const L = await loadKb(key).catch(() => null);
      if (L) K[key] = [v.length, L.steps.length, Math.round(v.reduce((a, b) => a + b, 0) / v.length)];
    }
    if (Object.keys(K).length) out.kb = K;
  } catch { /* */ }
  // A0: 28 harf holati (0/1/2), o'qish tezligi, takrorlashdagi savollar
  try {
    const L = get<Record<string, { c?: number; w?: number; t?: number }>>("f.a0.L", {});
    if (Object.keys(L).length) {
      const LET = await loadData<[string, string, string, number][]>("A0_LET");
      const st = (l: string) => { const x = L[l]; if (!x) return 0; return (x.c || 0) >= 4 && x.t ? 2 : x.c || x.t ? 1 : 0; };
      const H = get<{ v: number }[]>("f.a0.sp", []);
      const a0: Record<string, unknown> = { m: LET.map((r) => st(r[0])).join(""), sp: H.length ? H[H.length - 1].v : null };
      const R = get<unknown[]>("f.a0.rev", []);
      if (R.length) a0.rv = R.length;
      out.a0 = a0;
    }
  } catch { /* */ }
  return out;
}
