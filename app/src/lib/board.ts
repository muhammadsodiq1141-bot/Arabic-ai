// 14.11.2026: doska ko'rinishi (foydalanuvchi tanlagan «A» varianti). Ilova telefon uchun yasalgan (480px ustun) — elektron doska,
// proyektor yoki katta monitorda o'rtada ingichka ustun bo'lib, orqa partadan o'qilmasdi. Endi katta ekranda ilova o'zi kattalashadi;
// telefon va oddiy noutbukda (kengligi 1700 dan kichik) hech narsa o'zgarmaydi.
// Kattalik = balandlik / 600 (1920×1080 doskada 1,8), kenglik ham sig'adi. Chrome'da CSS zoom innerWidth'ni o'zgartirmaydi — sakrash yo'q.
const MIN_W = 1700, MIN_H = 850;

export function boardZoom(w: number, h: number) {
  if (w < MIN_W || h < MIN_H) return 1;
  return Math.round(Math.min(h / 600, w / 1000) * 100) / 100;
}

/** joriy kattalik. getBoundingClientRect va innerHeight ekran pikselida, style'dagi top/left esa kattalashtiriladi —
 *  koordinata bilan joylashadigan oynalar (Onboard ko'rsatmasi) qiymatni shunga bo'lishi kerak */
export const zoomOf = () => parseFloat(document.documentElement.style.zoom) || 1;

export function initBoard() {
  const root = document.documentElement;
  const apply = () => {
    const z = boardZoom(window.innerWidth, window.innerHeight);
    root.style.zoom = z > 1 ? String(z) : "";
    root.classList.toggle("board", z > 1);
  };
  apply();
  window.addEventListener("resize", apply);
}
