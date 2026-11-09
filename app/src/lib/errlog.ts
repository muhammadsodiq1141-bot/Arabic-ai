// 1-paket (19-partiya): ilova xatolarini yozib borish — server «logErr» (api 14-versiya, app_errors jadvali).
// Faqat texnik ma'lumot: xato matni, qaysi ekran, ilova versiyasi, telefon/Telegram turi. O'quvchining javoblari va ismi yuborilmaydi.
// Navbat faqat shu telefonda (v2.errq — serverga sinxronlanmaydi), bir xil xato birlashtiriladi (n), internet bo'lganda yuboriladi.
import { DEMO } from "./demoFlag";

type E = { k: string; m: string; s?: string; v: string; ver: string; ua: string; n: number; at: number };
const QK = "v2.errq";
const MAX_Q = 30;
export const APP_VER = typeof __APP_VER__ === "string" ? __APP_VER__ : "dev";

let screen = "";
export const setErrScreen = (v: string) => { screen = v; };

const q = (): E[] => { try { return JSON.parse(localStorage.getItem(QK) || "[]") as E[]; } catch { return []; } };
const save = (x: E[]) => { try { localStorage.setItem(QK, JSON.stringify(x.slice(-MAX_Q))); } catch { /* xotira to'la */ } };

function uaShort() {
  const w = (window as unknown as { Telegram?: { WebApp?: { version?: string; platform?: string } } }).Telegram?.WebApp;
  const m = /(Android [\d.]+|iPhone OS [\d_]+|iPad|Windows NT [\d.]+|Mac OS X [\d_]+)/.exec(navigator.userAgent)?.[1] || "";
  const b = /(Chrome\/\d+|Version\/[\d.]+ Mobile|Firefox\/\d+)/.exec(navigator.userAgent)?.[1] || "";
  return [w?.platform ? `tg:${w.platform} ${w.version || ""}` : "brauzer", m, b].filter(Boolean).join(" · ").slice(0, 160);
}

// shovqin: foydalanuvchi harakatisiz ovoz ijrosi taqiqlangan, so'rov bekor qilingan va h.k. — xato emas
const NOISE = /NotAllowedError|AbortError|ResizeObserver loop|play\(\) request was interrupted|The operation was aborted|Script error\.?$/i;

let sent = 0;
let timer: number | undefined;
export function logErr(k: string, m: unknown, s?: string) {
  const msg = String((m as { message?: string })?.message ?? m ?? "").slice(0, 300);
  if (!msg || NOISE.test(msg)) return;
  const all = q();
  const same = all.find((e) => e.k === k && e.m === msg && e.v === screen);
  if (same) { same.n++; same.at = Date.now(); }
  else all.push({ k, m: msg, s: s ? String(s).slice(0, 1500) : undefined, v: screen, ver: APP_VER, ua: uaShort(), n: 1, at: Date.now() });
  save(all);
  clearTimeout(timer);
  timer = window.setTimeout(() => void flushErr(), 4000);
}

let flushing = false;
export async function flushErr() {
  if (flushing || DEMO || !navigator.onLine || sent >= 50) return;
  const all = q();
  if (!all.length) return;
  flushing = true;
  try {
    const { api } = await import("./api");
    const part = all.slice(0, 10);
    await api("logErr", { errs: part });
    sent += part.length;
    save(q().slice(part.length));
  } catch { /* keyinroq */ }
  flushing = false;
}

/** Ilova boshida bir marta: global xatolar, va'dalar, eskirgan kod bo'lagi (yangi versiya chiqqanda) */
export function initErrLog() {
  window.addEventListener("error", (e) => logErr("js", e.message || e.error, (e.error as Error | undefined)?.stack));
  window.addEventListener("unhandledrejection", (e) => logErr("promise", e.reason, (e.reason as Error | undefined)?.stack));
  // yangi versiya chiqqach eski bo'lak topilmasa — bir marta sahifani yangilaymiz (30 soniyada ko'pi bilan 1 marta)
  window.addEventListener("vite:preloadError", (e) => {
    const k = "v2.reloadAt", last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last > 30000) { e.preventDefault(); sessionStorage.setItem(k, String(Date.now())); location.reload(); }
    else logErr("chunk", (e as unknown as { payload?: Error }).payload || "preload");
  });
  window.addEventListener("online", () => void flushErr());
  setTimeout(() => void flushErr(), 8000);
}
