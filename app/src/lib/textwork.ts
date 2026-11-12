// 11.11.2026 (17b): «Matn bilan ishlash» holati — vahda sahifasi va «Bugun» rejasi ham o'qiydi (ekranning o'zi alohida yuklanadi)
// f.tw.<kitob>:<vahda> = { l: necha marta tinglagan, r: barcha o'qish tezliklari (so'z/daqiqa), rg: matn bo'yicha tezliklar (12.11),
//   rl: rg paydo bo'lgunga qadar o'qishlar soni (eski yozuv), s: aytib bo'lgan vaqti, w: o'z gaplari }
import { store } from "./store";

export type TwProg = { l: number; r: number[]; rg?: Record<string, number[]>; rl?: number; s?: number; w?: number };
export const twKey = (book: string, unit: number) => `f.tw.${book}:${unit}`;
export const twGet = (book: string, unit: number) => store.get<TwProg>(twKey(book, unit), { l: 0, r: [] });
export const twSet = (book: string, unit: number, p: TwProg) => store.set(twKey(book, unit), p);
/** «3 marta o'qi» — bitta matnni necha marta o'qigan (eng ko'p o'qilgan matn bo'yicha; eski yozuvda — jami) */
export const twReads = (p: TwProg) => Math.max(p.rl ?? (p.rg ? 0 : p.r.length), ...Object.values(p.rg || {}).map((a) => a.length), 0);
/** zanjirning bajarilgan qadamlari: 0–3 */
export const twSteps = (p: TwProg) => (p.l > 0 ? 1 : 0) + (twReads(p) >= 3 ? 1 : 0) + (p.s ? 1 : 0);
/** bitta matn tezliklari (grafik uchun) */
export const twOf = (p: TwProg, key: string) => (p.rg ? p.rg[key] || [] : p.r);
/** yangi o'qish natijasi: matn bo'yicha ham, umumiy ham */
export function twAddRead(p: TwProg, key: string, wpm: number): TwProg {
  const rg = { ...(p.rg || {}) };
  rg[key] = [...(rg[key] || []), wpm].slice(-12);
  return { ...p, r: [...p.r, wpm].slice(-12), rg, rl: p.rg ? p.rl : p.r.length };
}
/** ovoz chiqarib o'qishda ishonarli eng yuqori tezlik (so'z/daqiqa) — undan tezi «tugmani bosib qo'ygan» deb hisoblanadi */
export const WPM_MAX: Record<string, number> = { a1: 150, md1: 150, a2: 180, md2: 180, b1: 220, b2: 220, c1: 240 };
