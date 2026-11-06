// Reaksiya stikerlari (eski ilova 9189–9227 bilan aynan bir xil mantiq): KB va drill javobida 3D rasm + ibora chiqadi.
// Kalitlar eski ilova bilan umumiy: f.stk.off (yo'q = yoqilgan), f.stk.snd (yo'q = ovoz bor), f.stk.hi («Xush kebsiz!» bir marta).
// Rasmlar — Microsoft Fluent UI Emoji 3D (MIT litsenziyasi): RK_IMG.json, turlar va yozuvlar — RK_SET.json.
import { loadData } from "./data";
import { store } from "./store";
import { isNightHour } from "../state/theme";

export type RkKind = "ok" | "bad" | "streak" | "champ" | "done" | "hi";
/** [rasm raqami (RK_IMG) yoki -1 — faqat yozuvli qora karta, yozuv] */
export type RkPick = [number, string];
export type RkData = { set: Record<RkKind, RkPick[]>; img: string[] };

let data: RkData | null = null;
let loading: Promise<RkData> | null = null;
/** Ma'lumot bir marta yuklanadi; yuklangach `rkReady()` darhol qaytaradi */
export function rkLoad(): Promise<RkData> {
  if (!loading) {
    loading = Promise.all([loadData<RkData["set"]>("RK_SET"), loadData<string[]>("RK_IMG")]).then(([set, img]) => (data = { set, img }));
    loading.catch(() => { loading = null; });
  }
  return loading;
}
export const rkReady = () => data;

export const rkOn = () => !store.get<boolean>("f.stk.off", false);
export const rkSnd = () => store.get<boolean>("f.stk.snd", true) !== false;
export const rkSetOn = (on: boolean) => store.set("f.stk.off", !on);
export const rkSetSnd = (on: boolean) => store.set("f.stk.snd", on);
/** Yangi foydalanuvchi: «Xush kebsiz!» hali chiqmagan bo'lsa true qaytaradi va belgini qo'yadi */
export function rkFirstHi() {
  if (store.get<boolean>("f.stk.hi", false)) return false;
  store.set("f.stk.hi", true);
  return true;
}

/** Katta stikerlar: 2,6 s, rasm 176px, 14 ta uchqun */
export const rkBig = (k: RkKind) => k === "streak" || k === "champ" || k === "hi";

// tur ichida teng ehtimol, lekin oxirgisi ketma-ket takrorlanmaydi
const LAST: Partial<Record<RkKind, number>> = {};
function rkPick(kind: RkKind): RkPick | null {
  const L = data?.set[kind] || [];
  if (!L.length) return null;
  let i: number;
  do { i = Math.floor(Math.random() * L.length); } while (L.length > 1 && i === LAST[kind]);
  LAST[kind] = i;
  return L[i];
}

let lastT = 0;
/** Eski rkShow tartibi: o'chiq → yo'q; tanlash; 600 ms ichida ikkinchisi → yo'q (force — majburiy, cheklovsiz) */
export function rkTake(kind: RkKind, force = false): RkPick | null {
  if (!force && !rkOn()) return null;
  const p = rkPick(kind);
  if (!p) return null;
  const now = Date.now();
  if (!force && now - lastT < 600) return null;
  lastT = now;
  return p;
}

// ketma-ket to'g'ri javoblar: faqat «Chiqish» bilan nolga tushadi (qadamlar va drill orasida saqlanadi), o'chiq bo'lsa ham sanaladi
const SER = [3, 5, 8, 12];
let streakN = 0;
export function rkCount(ok: boolean): { kind: RkKind; badge?: string } {
  streakN = ok ? streakN + 1 : 0;
  if (!ok) return { kind: "bad" };
  if (SER.includes(streakN)) return { kind: "streak", badge: `${streakN} ta ketma-ket!` };
  return { kind: "ok" };
}
export const rkResetCount = () => { streakN = 0; };

// ovoz: WebAudio, AudioContext bitta (birinchi ovozda yaratiladi)
let ac: AudioContext | null = null;
export function rkSound(kind: RkKind) {
  if (!rkSnd() || isNightHour()) return; // kechasi stiker ovozi chalinmaydi
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac = ac || new AC();
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime, good = kind !== "bad";
    const N: [number, number][] = kind === "bad" ? [[330, 0], [262, 0.13]]
      : kind === "champ" || kind === "streak" ? [[523, 0], [659, 0.08], [784, 0.16], [1046, 0.26]]
      : [[660, 0], [880, 0.09], [1320, 0.18]];
    for (const [f, d] of N) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = good ? "triangle" : "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(good ? 0.15 : 0.1, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + (good ? 0.24 : 0.32));
      o.connect(g).connect(ac.destination);
      o.start(t + d);
      o.stop(t + d + 0.4);
    }
  } catch { /* ovoz yo'q */ }
}
