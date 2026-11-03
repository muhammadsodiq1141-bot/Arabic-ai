// Mazmunni himoya qilish (Telegram ichida skrinshotni to'liq taqiqlab bo'lmaydi):
// 1) har ekranda o'quvchining ismi va loginidan xira suv belgisi — tarqalgan rasm kimniki ekani ko'rinadi;
// 2) ilova fonga o'tganda (vazifalar ro'yxati, ekran yozuvi boshlanishi) mazmun yashiriladi;
// 3) matn nusxalash, uzoq bosib saqlash va sudrab olish o'chiriladi (CSS + hodisalar).
import { useEffect, useMemo } from "react";

export function Watermark({ name, login }: { name: string; login: string | null }) {
  const url = useMemo(() => {
    const label = [name, login].filter(Boolean).join(" · ").replace(/[<>&"]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="170"><text x="0" y="110" transform="rotate(-24 130 85)" font-family="Manrope,sans-serif" font-size="14" font-weight="700" fill="currentColor">${label}</text></svg>`;
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace("currentColor", "%23807055")}")`;
  }, [name, login]);
  return <div className="wmark" style={{ backgroundImage: url }} aria-hidden />;
}

export function usePrivacy() {
  useEffect(() => {
    const hide = () => document.documentElement.classList.toggle("obscured", document.visibilityState !== "visible");
    const block = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea")) return;
      e.preventDefault();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", () => document.documentElement.classList.add("obscured"));
    window.addEventListener("focus", () => document.documentElement.classList.remove("obscured"));
    for (const ev of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.addEventListener(ev, block);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      for (const ev of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.removeEventListener(ev, block);
    };
  }, []);
}
