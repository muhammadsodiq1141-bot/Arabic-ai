// Arabcha so'z ovozi — eski ilovadagi zanjir bilan bir xil:
// 1) kitob audiosi (yopiq ombor, vaqtinchalik havola) → 2) serverdagi tayyor ovoz (tts ombori) →
// 3) serverda yangidan yaratish ("tts") → 4) telefonning o'z ovozi. Fayl nomi = matnning SHA-1 kaliti (UTF-8).
import { api } from "./api";
import { API_URL } from "./config";

const TTS_BASE = API_URL.replace(/\/functions\/v1\/api$/, "") + "/storage/v1/object/public/tts/";
const KB: Record<string, string> = {};
const kbAt: Record<string, number> = {}; // "papka|kalit" → so'ralgan vaqt (havola 6 soat amal qiladi, 5 soat ishlatamiz)
let el: HTMLAudioElement | null = null;
let tok = 0;

export const clean = (t: string) => String(t || "").replace(/<[^>]+>/g, "").replace(/×/g, "،").trim();

export async function sha1(t: string) {
  const b = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
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
  if (my !== tok || !("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    const v = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith("ar"));
    if (v) u.voice = v;
    u.lang = v?.lang || "ar-SA";
    u.rate = 0.8;
    speechSynthesis.speak(u);
  } catch { /* ovoz yo'q */ }
}

export async function say(text: string) {
  const t = clean(text);
  if (!t) return;
  const my = ++tok;
  try { speechSynthesis.cancel(); } catch { /* */ }
  if (!el) { el = new Audio(); el.preload = "auto"; }
  const a = el;
  try { a.pause(); } catch { /* */ }
  const hk = await sha1(t);
  if (my !== tok) return;
  const server = async () => {
    try {
      const r = await api<{ url: string }>("tts", { t });
      if (my !== tok) return;
      a.onerror = () => device(t, my);
      a.src = r.url + "?v=1";
      await a.play();
    } catch { device(t, my); }
  };
  a.onerror = () => void server();
  a.src = KB[hk] || TTS_BASE + hk + ".mp3";
  a.play().catch((e: Error) => { if (e?.name === "NotAllowedError") device(t, my); });
}

/** Matnni aytib, tugashini kutish (matnni ketma-ket o'qish uchun). Ovoz tugamasa — matn uzunligiga qarab kutadi. */
export async function sayWait(text: string) {
  const t = clean(text);
  await say(t);
  const ms = Math.max(2600, t.replace(/[ً-ْٰـ]/g, "").length * 170);
  await new Promise<void>((res) => {
    let done = false;
    const fin = () => { if (done) return; done = true; el?.removeEventListener("ended", fin); res(); };
    el?.addEventListener("ended", fin);
    setTimeout(fin, ms);
  });
}
export function stopSay() { tok++; try { el?.pause(); } catch { /* */ } try { speechSynthesis.cancel(); } catch { /* */ } }
