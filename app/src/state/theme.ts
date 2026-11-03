// Kunduzgi (bej) va tungi (xaki) mavzu: Telegram yoki telefon sozlamasiga ergashadi, o'quvchi o'zi ham tanlay oladi.
import { useEffect, useState } from "react";
import { tg } from "../lib/tg";

export type ThemePref = "auto" | "light" | "dark";
const KEY = "v2.theme";
const BG = { light: "#F3EBDD", dark: "#262A1F" };

const read = (): ThemePref => {
  try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "auto"; } catch { return "auto"; }
};
const resolve = (p: ThemePref): "light" | "dark" =>
  p !== "auto" ? p : tg.inTelegram ? tg.scheme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read);
  useEffect(() => {
    const apply = () => {
      const t = resolve(pref);
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BG[t]);
      tg.paint(BG[t]);
    };
    apply();
    tg.onTheme(apply);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);
  const set = (p: ThemePref) => { try { localStorage.setItem(KEY, p); } catch { /* */ } setPref(p); };
  return { pref, set };
}
