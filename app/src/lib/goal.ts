// 15-partiya (M1, M11): o'quvchining maqsadi va shaxsiy reja, o'ziga ishonch shkalasi.
// Kalitlar (sinxronlanadi): f.goal = {why, mins, exp, at}, f.conf = [{at, v: [1..5 ×5]}]. Reja kunlik maqsadni (x.goal) ham moslaydi.
import { scheduleSync, store } from "./store";
import type { Mix } from "./strand";

export type Why = "talk" | "read" | "exam" | "work";
export type Goal = { why: Why; mins: number; exp: number; at: number };
export const WHY: { k: Why; t: string; d: string }[] = [
  { k: "talk", t: "Suhbat", d: "Arabcha gaplashish" },
  { k: "read", t: "Kitob va matn o'qish", d: "Arabcha matnni tushunish" },
  { k: "exam", t: "Imtihon yoki sertifikat", d: "Maktab, universitet, CEFR" },
  { k: "work", t: "Ish yoki safar", d: "Kerakli iboralar tezroq" },
];
export const MINS = [10, 20, 30, 45];
export const EXP = ["Yo'q, birinchi marta", "Harflarni bilaman", "Oddiy matn o'qiyman", "Kitob o'qiganman"];
/** maqsadga qarab haftalik vaqtning 4 yo'lga bo'linishi (%). Suhbat va o'qish — Nation (3.3-jadval); imtihon va ish — taxmin */
export const MIX: Record<Why, Mix> = {
  talk: { i: 25, o: 25, f: 25, r: 25 },
  read: { i: 39, o: 11, f: 25, r: 25 },
  exam: { i: 30, o: 15, f: 35, r: 20 },
  work: { i: 30, o: 30, f: 20, r: 20 },
};
export const goalOf = () => store.get<Goal | null>("f.goal", null);
/** kunlik maqsad (yulduzcha) daqiqaga qarab: 10 → 30, 20 → 50, 30+ → 100 (GOALS bilan bir xil qiymatlar) */
export const dailyOf = (mins: number) => (mins <= 10 ? 30 : mins <= 20 ? 50 : 100);
export function setGoal(g: Goal) {
  store.set("f.goal", g);
  store.set("x.goal", dailyOf(g.mins));
  scheduleSync();
}

// o'ziga ishonch shkalasi (TMLT, 6-bob, 6.1-jadval asosida soddalashtirilgan): boshida, 4-haftada va har oy
export const CONF_Q = [
  "Arabcha harflarni o'qiy olaman",
  "Oddiy gapni eshitib tushunaman",
  "O'zim haqimda 3 ta gap ayta olaman",
  "Kitobdagi mashqni o'zim bajara olaman",
  "Arabcha gapirganda xavotirlanmayman",
];
export type Conf = { at: number; v: number[] };
export const confAll = () => store.get<Conf[]>("f.conf", []);
export const confAvg = (c: Conf) => Math.round((c.v.reduce((a, b) => a + b, 0) / c.v.length) * 10) / 10;
export function addConf(v: number[]) {
  const A = confAll();
  A.push({ at: Date.now(), v });
  store.set("f.conf", A.slice(-12));
  scheduleSync();
}
