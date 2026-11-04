// Kunduzgi (bej) va tungi (xaki) mavzu. Eski ilova bilan bir xil kalitlar (serverga sinxron): f.theme ("light" | "dark" | "auto")
// va f.nightAuto — 21:00 dan 06:00 gacha tungi rejim (ISM-TANISHUV-SPEC §5). Farq (foydalanuvchi qarori): qo'lda «Kunduz» tanlansa,
// avtomatik tungi rejim o'chadi. Holat bitta (modul darajasida) — App va Profil bir xil holatni ko'radi; tekshiruv har 60 s va ilovaga qaytganda.
import { useEffect, useState } from "react";
import { store } from "../lib/store";
import { tg } from "../lib/tg";

export type ThemePref = "auto" | "light" | "dark";
const BG = { light: "#F3EBDD", dark: "#262A1F" };
const OLD = "v2.theme"; // avvalgi v2 kaliti (xom satr, sinxron emas) — bir marta f.theme ga ko'chiriladi

function readPref(): ThemePref {
  let p = store.get<string | null>("f.theme", null);
  if (p === null) {
    try { const o = localStorage.getItem(OLD); if (o === "light" || o === "dark") { p = o; store.set("f.theme", o); } } catch { /* */ }
  }
  return p === "light" || p === "dark" ? p : "auto";
}
const nightAuto = () => store.get("f.nightAuto", false);
export const isNightHour = () => { const h = new Date().getHours(); return h >= 21 || h < 6; };

export function themeNow(): "light" | "dark" {
  if (nightAuto() && isNightHour()) return "dark";
  const p = readPref();
  if (p !== "auto") return p;
  return tg.inTelegram ? tg.scheme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const subs = new Set<() => void>();
let last = "";
function apply() {
  const t = themeNow();
  document.documentElement.dataset.theme = t;
  if (t !== last) { last = t; document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BG[t]); tg.paint(BG[t]); }
  subs.forEach((f) => f());
}
let started = false;
function start() {
  if (started) return;
  started = true;
  apply();
  tg.onTheme(apply);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply);
  window.setInterval(apply, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") apply(); });
}

export function useTheme() {
  const [, force] = useState(0);
  useEffect(() => {
    start();
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return {
    pref: readPref(),
    night: nightAuto(),
    set: (p: ThemePref) => { store.set("f.theme", p); if (p === "light") store.set("f.nightAuto", false); apply(); },
    setNight: (v: boolean) => { store.set("f.nightAuto", v); apply(); },
  };
}
