// 11.11.2026 (17b): «Matn bilan ishlash» holati — vahda sahifasi ham o'qiydi (ekranning o'zi alohida yuklanadi)
// f.tw.<kitob>:<vahda> = { l: necha marta tinglagan, r: o'qish tezliklari (so'z/daqiqa), s: aytib yuborgan vaqti, w: o'z gaplari }
import { store } from "./store";

export type TwProg = { l: number; r: number[]; s?: number; w?: number };
export const twKey = (book: string, unit: number) => `f.tw.${book}:${unit}`;
export const twGet = (book: string, unit: number) => store.get<TwProg>(twKey(book, unit), { l: 0, r: [] });
export const twSet = (book: string, unit: number, p: TwProg) => store.set(twKey(book, unit), p);
