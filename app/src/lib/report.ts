// Google jadvalga hisobot — eski ilovaning report() (index.html 3137, 3745) aynan shu maydonlar bilan. Bot 19:00 eslatmalari
// Apps Script'dagi «O'quvchilar» varag'iga tayanadi ("Oxirgi kun", "Takrorlash kutmoqda", "Ketma-ket kunlar") — TENGLIK-REJA, ochiq savol javobi.
// Faqat ilova ?r=<Apps Script id> bilan ochilganda ishlaydi (id sessiya davomida eslab qolinadi); force bo'lmasa 60 s ichida takrorlanmaydi.
import { loadData } from "./data";
import { allItems, dayNum, itemsOf, srsOf, type PBook } from "./practice";
import { bkKey, weekId } from "./progress";
import { store } from "./store";
import { tg } from "./tg";
import { streakNow, tanga, xpTotal } from "./motiv";

const RID = (() => {
  try {
    const q = new URLSearchParams(location.search).get("r");
    if (q) sessionStorage.setItem("v2.r", q);
    return q || sessionStorage.getItem("v2.r") || "";
  } catch { return ""; }
})();
let lastSync = 0;
let ME: { name?: string; full_name?: string | null; login?: string | null } | null = null;
/** joriy foydalanuvchi (ism va login) — Main o'rnatadi */
export const setReportMe = (m: typeof ME) => { ME = m; };

/** eski student(): Telegram'da "tg<id>", aks holda a1.sid ("w…") */
function sid() {
  const u = tg.user;
  if (u) return { id: `tg${u.id}`, name: [u.first_name, u.last_name].filter(Boolean).join(" "), username: u.username || "" };
  let id = store.get<string | null>("a1.sid", null);
  if (!id) { id = `w${Math.random().toString(36).slice(2, 10)}`; store.set("a1.sid", id); }
  return { id, name: store.get("a1.name", ""), username: "" };
}

export function report(kind: string, detail = "", score: number | null = null, total: number | null = null, force = false, unit?: number) {
  if (!RID) return;
  const now = Date.now();
  if (!force && now - lastSync < 60000) return;
  lastSync = now;
  void send(kind, detail, score, total, unit);
}

async function send(kind: string, detail: string, score: number | null, total: number | null, unit?: number) {
  try {
    const bid = store.get("a1.book", "a1");
    const book = await loadData<PBook>(`books/${bid}`);
    const st = sid();
    const name = ME?.full_name || ME?.name || st.name;
    const kn = (u: PBook["units"][number]) => { const k = store.get<Record<string, number>>(bkKey(bid, `known.${u.n}`), {}); return itemsOf(u).filter((x) => k[x.ar]).length; };
    const S = srsOf(bid), t = dayNum();
    const D = store.get<Record<string, number>>("x.d", {});
    const w = weekId().split("-").map(Number);
    let xpWeek = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(w[0], w[1] - 1, w[2] + i); xpWeek += D[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] || 0; }
    const body = {
      id: st.id, name: (name || "(ismsiz)") + (ME?.login ? ` · ${ME.login}` : ""), username: st.username, kind,
      detail: book.title + (detail ? ` · ${detail}` : ""), unit: unit ?? store.get(bkKey(bid, "last"), 1), score: score ?? "", total: total ?? "",
      known: book.units.reduce((a, u) => a + kn(u), 0), all: allItems(book).length,
      units: book.units.map((u) => `${u.n}:${kn(u)}/${itemsOf(u).length}`).join(" "),
      streak: streakNow(), due: allItems(book).filter((x) => S[x.ar] && S[x.ar].d <= t).length, book: book.title,
      tests: JSON.stringify(store.get(bkKey(bid, "tests"), {})), xpWeek, week: weekId(), xpTotal: xpTotal(), stars: tanga(), time: new Date().toISOString(),
    };
    await fetch(`https://script.google.com/macros/s/${RID}/exec`, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
  } catch { /* hisobot yuborilmasa — jim (eski ilovada ham) */ }
}
