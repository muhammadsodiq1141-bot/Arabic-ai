// 14.11.2026: doska ko'rinishi (foydalanuvchi tanlagan «A» varianti). Ilova telefon uchun yasalgan (480px ustun) — elektron doska,
// proyektor yoki katta monitorda o'rtada ingichka ustun bo'lib, orqa partadan o'qilmasdi. Endi katta ekranda ilova o'zi kattalashadi;
// telefon va oddiy noutbukda (kengligi 1700 dan kichik) hech narsa o'zgarmaydi.
// Kattalik = balandlik / 600 (1920×1080 doskada 1,8), kenglik ham sig'adi. Chrome'da CSS zoom innerWidth'ni o'zgartirmaydi — sakrash yo'q.
//
// 26.11.2026 (foydalanuvchi): DOSKA REJIMI — doskada savolning javoblari pastda qolib, doskani surib topilardi.
// Rejim yoqilganda mashq ekrani ikki ustun bo'ladi (chapda topshiriq va savol, o'ngda javoblar) va bitta ekranga sig'adi;
// to'g'ri javobdan keyin ilova o'zi keyingi savolga o'tadi. Katta ekranda (doska) o'zi yoqiladi, noutbuk/proyektorda
// (kengligi 1000+) mashq sarlavhasidagi «Doska» tugmasi bilan yoqiladi. Telefonda rejim yo'q.
import { useSyncExternalStore } from "react";

const MIN_W = 1700, MIN_H = 850;
const KEY = "f.bm"; // 1 — yoqilgan, 0 — o'chirilgan, yo'q — avtomatik (katta ekranda yoqiladi)

export function boardZoom(w: number, h: number) {
  if (w < MIN_W || h < MIN_H) return 1;
  return Math.round(Math.min(h / 600, w / 1000) * 100) / 100;
}

/** doska rejimida kattalik: ikki ustun uchun kenglik ham kerak — balandlik / 640 (1920×1080 da 1,69) */
function bmZoom(w: number, h: number) {
  return Math.max(1, Math.round(Math.min(h / 640, w / 1100) * 100) / 100);
}

/** doska rejimini tanlash mumkin bo'lgan ekran (telefon emas — yotiq va keng) */
export const bmPossible = () => window.innerWidth >= 1000 && window.innerWidth > window.innerHeight;

function pref(): boolean | null {
  try { const v = localStorage.getItem(KEY); return v === null ? null : v === "1"; } catch { return null; }
}

export const bmOn = () => bmPossible() && (pref() ?? (window.innerWidth >= MIN_W && window.innerHeight >= MIN_H));

/** joriy kattalik. getBoundingClientRect va innerHeight ekran pikselida, style'dagi top/left esa kattalashtiriladi —
 *  koordinata bilan joylashadigan oynalar (Onboard ko'rsatmasi) qiymatni shunga bo'lishi kerak */
export const zoomOf = () => parseFloat(document.documentElement.style.zoom) || 1;

const subs = new Set<() => void>();
let apply = () => {};

export function bmSet(v: boolean) {
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* xotira yo'q */ }
  apply();
}

/** doska rejimi yoqilganmi (o'lcham o'zgarsa yoki tugma bosilsa qayta chiziladi) */
export function useBoardMode() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => document.documentElement.classList.contains("bm"));
}

/** tugmani ko'rsatish kerakmi (ekran keng va yotiq) */
export function useBoardPossible() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, bmPossible);
}

export function initBoard() {
  const root = document.documentElement;
  apply = () => {
    const w = window.innerWidth, h = window.innerHeight;
    const bm = bmOn();
    const z = bm ? bmZoom(w, h) : boardZoom(w, h);
    root.style.zoom = z > 1 ? String(z) : "";
    root.classList.toggle("board", z > 1);
    root.classList.toggle("bm", bm);
    // ekran balandligi CSS pikselida (zoom bilan 100dvh ishonchsiz) — doska rejimida mashq shu balandlikka sig'adi
    root.style.setProperty("--bmh", `${Math.floor(h / z)}px`);
    subs.forEach((f) => f());
  };
  apply();
  window.addEventListener("resize", apply);
}
