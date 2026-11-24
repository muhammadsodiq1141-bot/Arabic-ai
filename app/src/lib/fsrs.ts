// 24.11.2026 (P2.1): FSRS-5 — so'zni qachon takrorlashni xotira modeli bilan hisoblash (standart 19 parametr, kun aniqligida).
// Foydalanuvchi qarorlari: eslab qolish maqsadi 90%; 2-urinishdagi to'g'ri javob — «Hard» (qiyin eslay oldi); yangi so'z kuniga 10 (A0–A1 da 8).
// Yozuv formati (eski ilova bilan mos): {b, d, h?, x:[s, k, l, n, f]} — b (pog'ona) va d (qaysi kuni) yozilishda davom etadi,
// x — FSRS holati: s barqarorlik (kun), k qiyinlik (1–10), l oxirgi takror kuni, n takrorlar soni, f unutishlar soni.
// Eski yozuv (x yo'q) birinchi takrorda ko'chiriladi: s = SRS_INT[b], l = d − SRS_INT[b], k = 5,3. Manba: open-spaced-repetition FSRS-5 (ts-fsrs 4.x bilan solishtirilgan).

export const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
export const RETAIN = 0.9;
const DECAY = -0.5, FACTOR = 19 / 81, MAX_IVL = 36500;
/** 1 — Again (unutdi), 2 — Hard (qiyin eslay oldi), 3 — Good (esladi), 4 — Easy (oson, tez) */
export type Rating = 1 | 2 | 3 | 4;
export type FsrsX = [number, number, number, number, number]; // s, k, l, n, f

const clampD = (d: number) => Math.min(10, Math.max(1, d));
const r8 = (v: number) => Math.round(v * 1e8) / 1e8;
/** t kundan keyin eslab qolish ehtimoli */
export const retrievability = (t: number, s: number) => Math.pow(1 + (FACTOR * Math.max(0, t)) / s, DECAY);
export const interval = (s: number, retain = RETAIN) => Math.min(MAX_IVL, Math.max(1, Math.round((s / FACTOR) * (Math.pow(retain, 1 / DECAY) - 1))));
const initS = (g: Rating) => Math.max(W[g - 1], 0.1);
const initD = (g: Rating) => r8(W[4] - Math.exp((g - 1) * W[5]) + 1);
function nextD(d: number, g: Rating) {
  const dd = -W[6] * (g - 3);
  const nd = d + (dd * (10 - d)) / 9; // chiziqli so'ndirish (FSRS-5)
  return clampD(r8(W[7] * initD(4) + (1 - W[7]) * nd)); // o'rtachaga qaytish
}
function recallS(d: number, s: number, r: number, g: Rating) {
  const hard = g === 2 ? W[15] : 1, easy = g === 4 ? W[16] : 1;
  return r8(s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy));
}
const forgetS = (d: number, s: number, r: number) => r8(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]));
const shortS = (s: number, g: Rating) => r8(s * Math.exp(W[17] * (g - 3 + W[18])));

/** bitta takror: x — oldingi holat (yo'q bo'lsa — birinchi marta), today — kun raqami. Qaytaradi: yangi holat va keyingi takrorgacha kunlar */
export function review(x: FsrsX | null, g: Rating, today: number, retain = RETAIN): { x: FsrsX; ivl: number } {
  const n = (x?.[3] || 0) + 1;
  const f = (x?.[4] || 0) + (g === 1 ? 1 : 0);
  const t = x ? today - x[2] : 0;
  const r = x && t > 0 ? retrievability(t, x[0]) : 1;
  const stab = (q: Rating) => {
    if (!x) return initS(q);
    const [s0, k0] = x;
    if (t <= 0) return shortS(s0, q); // shu kunning o'zida qayta ko'rildi
    return q === 1 ? Math.min(forgetS(k0, s0, r), s0) : recallS(k0, s0, r, q);
  };
  const S4 = ([1, 2, 3, 4] as Rating[]).map((q) => Math.max(0.1, stab(q)));
  const k = x ? nextD(x[1], g) : clampD(initD(g));
  // baholar tartibi (ts-fsrs bilan bir xil): Hard ≥ Again + 1, Good ≥ Hard + 1, Easy ≥ Good + 1 kun
  const I = S4.map((s) => interval(s, retain));
  I[0] = Math.min(I[0], I[1]); I[1] = Math.max(I[1], I[0] + 1); I[2] = Math.max(I[2], I[1] + 1); I[3] = Math.max(I[3], I[2] + 1);
  // unutilgan so'z (Again) ertasi kuni qaytadi — eski tizimdagidek (qayta o'rganish qadami); FSRS barqarorligi baribir kamayadi
  const ivl = g === 1 ? 1 : I[g - 1];
  return { x: [r8(S4[g - 1]), r8(k), today, n, f], ivl };
}

/** eski pog'ona yozuvidan (b, d) FSRS holatiga — so'z birinchi marta takrorlanganda */
export function fromLegacy(b: number, d: number, ints: number[], hard = false): FsrsX | null {
  if (!b || b < 1) return null; // 0-pog'ona — hali birinchi takror bo'lmagan yangi so'z
  const s = ints[Math.min(b, ints.length - 1)];
  return [s, hard ? 7.5 : 5.3, d - s, b, 0];
}

/** yangi intervalga mos eski pog'ona (eski kod va «yodlangan» hisoblari ishlayversin) */
export function legacyB(ivl: number, ints: number[]) {
  let b = 1;
  for (let i = 1; i < ints.length; i++) if (ints[i] <= ivl) b = i;
  return b;
}
