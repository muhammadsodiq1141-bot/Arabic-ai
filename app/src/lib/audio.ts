// Arabcha so'z ovozi — eski ilovadagi zanjir bilan bir xil:
// 1) kitob audiosi (yopiq ombor, vaqtinchalik havola) → 2) serverdagi tayyor ovoz (tts ombori) →
// 3) serverda yangidan yaratish ("tts") → 4) telefonning o'z ovozi → 5) bo'lmasa — «ovozi hozircha yo'q» xabari. Fayl nomi = matnning SHA-1 kaliti (UTF-8).
import { api } from "./api";
import { API_URL } from "./config";
import { offAudio } from "./offline";
import { loadData } from "./data";
import { toast } from "../ui/Toast";

export const TTS_BASE = API_URL.replace(/\/functions\/v1\/api$/, "") + "/storage/v1/object/public/tts/";
const KB: Record<string, string> = {};
const kbAt: Record<string, number> = {}; // "papka|kalit" → so'ralgan vaqt (havola 6 soat amal qiladi, 5 soat ishlatamiz)
let el: HTMLAudioElement | null = null;
let tok = 0;
// Karnay tuzatishi (09.11.2026): telefon ovozni faqat bosish paytida ruxsat beradi. Ovoz serverdan kech kelsa (yaratish 2–5 s),
// ruxsat «unutiladi» va ovoz chiqmaydi. Shuning uchun bosishning o'zida element bir marta jim tovush bilan «ochiladi» —
// keyin shu elementda kech kelgan ovoz ham chalinadi (Chrome/Android va iOS shunday ishlaydi).
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
let unlocked = false;
function unlock(a: HTMLAudioElement) {
  if (unlocked) return;
  try { a.src = SILENT; const pr = a.play(); unlocked = true; void pr?.catch((e: Error) => { if (e?.name === "NotAllowedError") unlocked = false; }); } catch { /* */ }
}
// kitob audiosi bor so'zlar (sha1 kalitlari, kitob omborining ildizida) — vahda sahifasi ochilmagan bo'lsa ham topilsin
let KBSET: Promise<Set<string>> | null = null;
const kbHas = (hk: string) => {
  if (!KBSET) KBSET = loadData<string[]>("KB_AUDIO").then((a) => new Set(a)).catch(() => { KBSET = null; return new Set<string>(); }); // yuklanmasa — keyingi safar qayta
  return KBSET.then((s) => s.has(hk));
};
let failAt = 0;
/** ovoz topilmadi — xabar (ketma-ket o'qishda har so'z uchun emas, 15 soniyada bir marta) */
function noVoice() {
  if (Date.now() - failAt < 15000) return;
  failAt = Date.now();
  toast("Bu so'zning ovozi hozircha yo'q — tez orada qo'shiladi");
}

export const clean = (t: string) => String(t || "").replace(/<[^>]+>/g, "").replace(/×/g, "،").trim();

export async function sha1(t: string) {
  const b = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** 17-partiya (A6): matnlar kitob audiosining havolalari (kalit → havola) — vahdani yuklab olish uchun */
export async function kitobUrls(dir: string, texts: string[]) {
  await preloadKitob(dir, texts);
  const out: Record<string, string> = {};
  for (const t of texts) { const k = await sha1(clean(t)); if (KB[k]) out[k] = KB[k]; }
  return out;
}

// Darsning kitob audiosi havolalarini oldindan olib qo'yish (dir: "a1/4")
// Kalitma-kalit eslab qolinadi: bir papkadan avval so'zlar, keyin mashq matnlari so'ralsa ham hammasi keladi.
export async function preloadKitob(dir: string, texts: string[]) {
  const now = Date.now();
  const all = [...new Set(await Promise.all(texts.map((t) => sha1(clean(t)))))];
  const keys = all.filter((k) => now - (kbAt[`${dir}|${k}`] || 0) > 5 * 3600e3).slice(0, 800);
  if (!keys.length) return;
  keys.forEach((k) => { kbAt[`${dir}|${k}`] = now; delete KB[k]; });
  try {
    const r = await api<{ urls: Record<string, string> }>("kitobAudio", { dir, keys });
    Object.assign(KB, r.urls || {});
  } catch { keys.forEach((k) => { kbAt[`${dir}|${k}`] = 0; }); }
}

function device(t: string, my: number) {
  if (my !== tok) return;
  if (!("speechSynthesis" in window)) { noVoice(); return; }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    const all = speechSynthesis.getVoices();
    const v = all.find((x) => x.lang.toLowerCase().startsWith("ar"));
    // ko'p Android telefonlarda arabcha ovoz yo'q — unda gapirmaydi; jim qolmasdan aytamiz.
    // Ro'yxat bo'sh bo'lsa (ovozlar hali yuklanmagan) — baribir urinamiz; 1.5 s ichida boshlanmasa, xabar.
    if (!v && all.length) { noVoice(); return; }
    if (v) u.voice = v;
    else { const h = setTimeout(noVoice, 1500); u.onstart = () => clearTimeout(h); u.onerror = () => { clearTimeout(h); noVoice(); }; }
    u.lang = v?.lang || "ar-SA";
    u.rate = 0.8;
    speechSynthesis.speak(u);
  } catch { /* ovoz yo'q */ }
}

/** rate — tezlik (17-partiya: matnni 0.75× sekin tinglash); yuklab olingan vahda ovozi internetsiz ham ishlaydi */
export async function say(text: string, rate = 1) {
  const t = clean(text);
  if (!t) return;
  const my = ++tok;
  try { speechSynthesis.cancel(); } catch { /* */ }
  if (!el) { el = new Audio(); el.preload = "auto"; }
  const a = el;
  try { a.pause(); } catch { /* */ }
  unlock(a); // bosish paytida — kechikkan ovoz ham chalinsin
  const hk = await sha1(t);
  if (my !== tok) return;
  const off = await offAudio(hk).catch(() => null);
  if (my !== tok) return;
  a.defaultPlaybackRate = rate; a.playbackRate = rate;
  if (off) {
    a.onerror = () => device(t, my);
    a.src = off;
    a.play().catch((e: Error) => { if (e?.name === "NotAllowedError") device(t, my); });
    return;
  }
  const server = async () => {
    try {
      if (my === tok) toast("Ovoz tayyorlanmoqda…");
      const r = await api<{ url: string }>("tts", { t });
      if (my !== tok) return;
      a.onerror = () => device(t, my);
      a.src = r.url + "?v=1";
      await a.play();
    } catch { device(t, my); }
  };
  // tayyor fayl yo'q bo'lsa: kitob audiosi (bo'lsa) → bo'lmasa serverda yaratish
  const kitob = async () => {
    if (my === tok && !KB[hk] && await kbHas(hk)) {
      await preloadKitob("", [t]);
      if (my === tok && KB[hk]) {
        a.onerror = () => void server();
        a.src = KB[hk];
        a.play().catch((e: Error) => { if (e?.name === "NotAllowedError") device(t, my); });
        return;
      }
    }
    await server();
  };
  a.onerror = () => void kitob();
  a.src = KB[hk] || TTS_BASE + hk + ".mp3";
  a.play().catch((e: Error) => { if (e?.name === "NotAllowedError") device(t, my); });
}

/** Matnni aytib, tugashini kutish (matnni ketma-ket o'qish uchun). Ovoz tugamasa — matn uzunligiga qarab kutadi. */
export async function sayWait(text: string, rate = 1) {
  const t = clean(text);
  await say(t, rate);
  const ms = Math.max(2600, t.replace(/[ً-ْٰـ]/g, "").length * 170) / Math.min(1, rate);
  await new Promise<void>((res) => {
    let done = false;
    const fin = () => { if (done) return; done = true; el?.removeEventListener("ended", fin); res(); };
    el?.addEventListener("ended", fin);
    setTimeout(fin, ms);
  });
}
export function stopSay() { tok++; try { el?.pause(); } catch { /* */ } try { speechSynthesis.cancel(); } catch { /* */ } }
