// 24.11.2026 (P3.1): shaxsiy vaqtdagi eslatma — o'quvchi vaqt va kunlarni tanlaydi, bot shu vaqtda Telegram'ga yozadi.
// Server: api 24 (remGet / remSet / remTest), bot remind() (Apps Script har 5 daqiqadagi tick). Bot _sum'dan o'qiydi:
//   dq = [bugungi kun raqami, [bugun, +1 … +7 kunda takrorlanadigan so'zlar]] (ilova yopiq bo'lsa ham to'g'ri son), ld — oxirgi mashq kuni.
import { loadData } from "./data";
import { allItemsX, dayNum, srsOf, type PBook } from "./practice";
import { store } from "./store";

export type Rem = { on: boolean; min: number; days: number; tz: number };
export const REM_DEF: Rem = { on: true, min: 19 * 60, days: 127, tz: 300 };
export const REM_TIMES = [7 * 60, 13 * 60, 19 * 60, 21 * 60];
/** Du … Ya; bit = JS getDay() (0 = yakshanba) — server va bot bilan bir xil */
export const REM_DAYS: [number, string][] = [[1, "Du"], [2, "Se"], [3, "Ch"], [4, "Pa"], [5, "Ju"], [6, "Sh"], [0, "Ya"]];
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const tzNow = () => -new Date().getTimezoneOffset();
export function daysText(b: number) {
  if ((b & 127) === 127) return "har kuni";
  if ((b & 127) === 62) return "ish kunlari";
  return REM_DAYS.filter(([d]) => b & (1 << d)).map(([, t]) => t).join(", ") || "kun tanlanmagan";
}

/** joriy kitob: bugun va keyingi 7 kunda takrorlanadigan so'zlar (yig'ma: i-kunga qadar muddati kelganlar) */
export async function dueAhead(): Promise<[number, number[]]> {
  const bid = store.get("a1.book", "a1");
  const t = dayNum();
  const book = await loadData<PBook>(`books/${bid}`);
  const S = srsOf(bid);
  const ds = allItemsX(book).map((x) => S[x.ar]?.d).filter((d): d is number => typeof d === "number");
  return [t, Array.from({ length: 8 }, (_, i) => ds.filter((d) => d <= t + i).length)];
}

/** oxirgi mashq kuni (a1.days kaliti «YYYY-MM-DD») — kun raqamida; hali yo'q bo'lsa null */
export function lastDay(): number | null {
  const L = store.get<Record<string, number>>("a1.days", {});
  const ks = Object.keys(L).filter((k) => L[k] > 0 && /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  if (!ks.length) return null;
  const [y, m, d] = ks[ks.length - 1].split("-").map(Number);
  return dayNum(new Date(y, m - 1, d));
}

/** eslatma matni — server remText bilan bir xil mazmun (ekrandagi «Xabar namunasi» uchun; emoji ekranda ko'rsatilmaydi) */
export function remPreview(name: string, n: number, streak: number) {
  const who = (name || "").split(" ")[0] || "Do'stim";
  const title = n > 0 ? `${who}, takrorlash vaqti keldi` : `${who}, bugungi darsingiz tayyor`;
  const body = n > 0 ? `Bugun ${n} ta so'z ≈ ${Math.max(1, Math.ceil((n * 25) / 60))} daqiqa — eslab qolish uchun aynan shu kuni takrorlash kerak.`
    : "Bir necha daqiqa: yangi so'zlar va qisqa mashq.";
  return { title, body, streak: streak >= 2 ? `Seriyangiz ${streak} kun — uzilmasin!` : "", btn: n > 0 ? "Takrorlashni boshlash" : "Darsni boshlash" };
}
