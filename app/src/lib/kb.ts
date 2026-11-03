// Kitob mashqlari (KB) — eski ilovadagi dvigatel bilan bir xil mantiq va saqlash formati:
// natija f.kb.<a1:N> = { qadamIdx: eng yaxshi % }, XP gain("game", max(5, to'g'ri×2)),
// erkin javob subSend {lesson, step, item, text[, audio, mime], title}; internet bo'lmasa f.kbq navbatiga.
import { api, ApiError } from "./api";
import { loadData } from "./data";
import { KB_INS_UZ, KB_TIP } from "./kbText";
import { scheduleSync, store } from "./store";
import { shuffle } from "./words";

export type KbItem = {
  type: string; ins?: string; title?: string; q?: string; qz?: string; s?: string; uz?: string; ar?: string; say?: string;
  pic?: string; full?: string; fz?: string; why?: string; hint?: string; show?: string; see?: string;
  ok?: string | boolean; alt?: string[]; opts?: string[]; pool?: string[]; letters?: string[]; extra?: string;
  words?: (string | number)[][] | string[]; pairs?: string[][]; cols?: string[]; lines?: string[][];
};
export type KbStep = { k: string; t: string; ar?: string; d?: string; rule?: { h: string; p: string[] }; items: KbItem[] };
export type KbLesson = { title: string; uz: string; book?: string; steps: KbStep[] };

export const GRADED = ["choose", "qa", "listen1", "letters", "match", "tf", "classify", "order", "hear", "pick", "trace"];
export const isAr = (s: unknown) => /[؀-ۿ]/.test(String(s ?? ""));

export const kbFile = (key: string) => `kb/${key.replace(":", "-")}`;
export const loadKb = (key: string) => loadData<KbLesson>(kbFile(key));
/** Kitobda shu vahda uchun mashqlar bormi (hozircha faqat A1 — a1:1…a1:12) */
export const kbKeyOf = (bookId: string, unit: number) => (bookId === "a1" && unit >= 1 && unit <= 12 ? `a1:${unit}` : null);

const bestKey = (key: string) => `f.kb.${key}`;
export const kbBest = (key: string) => store.get<Record<string, number>>(bestKey(key), {});
export function kbSaveBest(key: string, si: number, pct: number) {
  const B = kbBest(key);
  if (B[si] === undefined || pct > B[si]) { B[si] = pct; store.set(bestKey(key), B); }
  scheduleSync();
}
/** Topshiriqlar ketma-ket ochiladi: oldingisi kamida bir marta bajarilgan bo'lsa */
export const kbOpen = (B: Record<string, number>, si: number) => si === 0 || B[si - 1] !== undefined;

// Ko'rsatma tarjimasi (eski kbInsUz bilan bir xil)
const norm = (t: string) => String(t).replace(/[ً-ْٰـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
  .replace(/[()،,.:/؟!«»\-]/g, " ").replace(/\s+/g, " ").trim();
export function insUz(ins: string | undefined, type: string) {
  if (!ins) return KB_TIP[type] || "";
  const n = norm(ins);
  if (KB_INS_UZ[n]) return KB_INS_UZ[n];
  const k = Object.keys(KB_INS_UZ).filter((x) => n.startsWith(x)).sort((a, b) => b.length - a.length)[0];
  return k ? KB_INS_UZ[k] : KB_TIP[type] || "";
}
export const tipOf = (type: string) => KB_TIP[type] || "";

// "Tushunmadim" bosilganda: topshiriqni qanday bajarish (har tur uchun qisqa yo'riqnoma)
export const HOW: Record<string, string> = {
  choose: "Savolni o'qing (karnay bo'lsa — tinglang) va pastdagi variantlardan bittasini bosing. Javobdan keyin izoh chiqadi.",
  listen1: "Karnayni bosib so'zni tinglang. Keyin uning ma'nosini variantlardan tanlang.",
  pick: "Karnayni bosib so'zni tinglang va shu so'zga mos rasmni bosing.",
  tf: "Gapni o'qing yoki tinglang. Matnga mos bo'lsa — «To'g'ri», mos bo'lmasa — «Noto'g'ri».",
  letters: "Pastdagi harflarni so'zdagi tartibda bosing. Xato bossangiz, yuqoridagi harfni bosib qaytaring.",
  order: "Pastdagi so'zlarni gapdagi tartibda bosing (arabcha o'ngdan chapga o'qiladi). Xato bossangiz, yuqoridagi so'zni bosib qaytaring.",
  match: "Avval o'ng ustundagi so'zni bosing, keyin chap ustundan uning juftini bosing. Topilgan juftlar yashil bo'ladi.",
  classify: "Avval so'zni bosing, keyin u tegishli ustunni bosing. Hammasi joylangach «Tekshirish»ni bosing.",
  free: "Savolga arabcha javob yozing yoki ovoz bilan ayting, keyin «Ustozga yuborish»ni bosing. Ustoz tekshirib baho qo'yadi.",
};

/** Mashq boshlanishida variantlar aralashtiriladi (eski kbPrep bilan bir xil) */
export type Prepared = KbItem & { tiles?: { l: string; i: number }[] | string[]; right?: string[]; pics?: string[]; order?: number[] };
export function prep(it: KbItem): Prepared {
  const x: Prepared = { ...it };
  if (x.opts) x.opts = shuffle(x.opts);
  if (x.type === "letters") x.tiles = shuffle((x.letters || []).map((l, i) => ({ l, i })));
  if (x.type === "order") x.tiles = shuffle([...(x.words as string[]), ...(x.extra ? [x.extra] : [])]);
  if (x.type === "match") x.right = shuffle((x.pairs || []).map((p) => p[1]));
  if (x.type === "pick") x.pics = shuffle([String(x.ok), ...shuffle((x.pool || []).filter((p) => p !== x.ok)).slice(0, 3)]);
  if (x.type === "classify") x.order = shuffle((x.words || []).map((_, i) => i));
  return x;
}

/** To'g'ri javob matni (xato bannerida ko'rsatiladi) */
export function rightOf(it: KbItem) {
  if (it.type === "letters") return it.show || "";
  if (it.type === "tf") return it.ok ? "To'g'ri" : "Noto'g'ri";
  if (it.type === "pick") return it.ar || "";
  if (it.full) return it.full;
  return it.ok !== undefined ? String(it.ok) : "";
}

/** Javobdan keyin eshittiriladigan matn (eski kbAnswer) va savol ochilganda avtomatik ovoz (eski kbAutoPlay) */
export const sayAfter = (it: KbItem) => it.full || (it.type === "pick" ? it.ar : it.say ? it.say : it.type === "listen1" ? it.ar : isAr(it.ok) ? String(it.ok) : it.q) || "";
export const sayAuto = (it: KbItem) => (it.type === "pick" ? it.ar : it.say ? it.say : it.type === "listen1" ? it.ar : it.type === "tf" ? it.s : null) || null;

/** Darsdagi barcha arabcha matnlar — kitob audiosi havolalarini oldindan olish uchun */
export function kbTexts(st: KbStep) {
  const s = new Set<string>();
  const add = (v: unknown) => { if (typeof v === "string" && isAr(v) && v.length < 400) s.add(v); };
  for (const it of st.items) {
    [it.ar, it.say, it.s, it.full, it.show, it.ok, it.q].forEach(add);
    it.opts?.forEach(add);
    it.lines?.forEach((l) => add(l[1]));
    if (it.type === "intro") (it.words as string[][] | undefined)?.forEach((w) => add(w[0]));
    it.pairs?.forEach((p) => add(p[0]));
  }
  return [...s].slice(0, 400);
}

// ===== Ustozga yuborish (erkin javob va "Tushunmadim"). Internet bo'lmasa navbatga =====
export type Sub = { lesson: string; step: string; item: number; text: string; title?: string; audio?: string; mime?: string };
const QKEY = "f.kbq";
export async function sendSub(s: Sub): Promise<"srv" | "local"> {
  try { await api("subSend", s); return "srv"; }
  catch (e) {
    // faqat internet yo'qligida navbatga qo'yiladi (ovozsiz); boshqa xatoni foydalanuvchiga ko'rsatamiz
    if (e instanceof ApiError && e.status === 0 && !s.audio) {
      const Q = store.get<Sub[]>(QKEY, []);
      Q.push(s); store.set(QKEY, Q);
      return "local";
    }
    throw e;
  }
}
let flushing = false;
export async function kbFlush() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    for (;;) {
      const Q = store.get<Sub[]>(QKEY, []);
      if (!Q.length) break;
      await api("subSend", Q[0]);
      store.set(QKEY, store.get<Sub[]>(QKEY, []).slice(1));
    }
  } catch { /* keyinroq */ }
  flushing = false;
}

// Ovozli javob: eski ilovadagi format tartibi va 32 kbit/s
export const recMime = () => ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/mp4", "audio/webm"]
  .find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || "";
export const blobB64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, ""));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});
