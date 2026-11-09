// Telegram Mini App bilan ishlash. Ilova Telegram'siz (brauzer, keyinchalik App Store / Play Market) ham ochiladi,
// shuning uchun Telegram'ga bog'liq hamma narsa shu faylda.
export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };

type WebApp = {
  initData: string;
  initDataUnsafe?: { user?: TgUser; start_param?: string };
  colorScheme?: "light" | "dark";
  ready(): void;
  expand(): void;
  isVersionAtLeast?(v: string): boolean;
  disableVerticalSwipes?(): void;
  enableVerticalSwipes?(): void;
  setBottomBarColor?(c: string): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  openTelegramLink?(url: string): void;
  onEvent?(e: string, cb: () => void): void;
  HapticFeedback?: { impactOccurred(s: string): void; notificationOccurred(s: string): void };
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void };
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
};

declare global {
  interface Window { Telegram?: { WebApp?: WebApp } }
}

const W = (): WebApp | undefined => window.Telegram?.WebApp;

export const tg = {
  get inTelegram() { return !!W()?.initData; },
  get initData() { return W()?.initData || ""; },
  get user(): TgUser | null { return W()?.initDataUnsafe?.user || null; },
  get startParam() { return W()?.initDataUnsafe?.start_param || ""; },
  get scheme(): "light" | "dark" { return W()?.colorScheme === "dark" ? "dark" : "light"; },
  haptic(kind: "light" | "medium" | "success" | "error" = "light") {
    const h = W()?.HapticFeedback;
    try {
      if (kind === "success" || kind === "error") h?.notificationOccurred(kind);
      else h?.impactOccurred(kind);
    } catch { /* eski Telegram */ }
  },
  openLink(url: string) {
    const w = W();
    try {
      if (url.startsWith("https://t.me/") && w?.openTelegramLink) return w.openTelegramLink(url);
    } catch { /* oddiy havola */ }
    window.open(url, "_blank", "noopener");
  },
  paint(bg: string) {
    const w = W();
    try {
      if (w?.isVersionAtLeast?.("6.1")) { w.setHeaderColor?.(bg); w.setBackgroundColor?.(bg); }
      if (w?.isVersionAtLeast?.("7.10")) w.setBottomBarColor?.(bg); // 1-paket D12: Android pastki paneli ham mavzu rangida
    } catch { /* eski Telegram */ }
  },
  /** 1-paket D11: barmoq bilan chizish yoki o'yin paytida ilova pastga surilib yopilmasin (ekrandan chiqishda qaytariladi) */
  swipes(on: boolean) {
    const w = W();
    try { if (w?.isVersionAtLeast?.("7.7")) { if (on) w.enableVerticalSwipes?.(); else w.disableVerticalSwipes?.(); } } catch { /* */ }
  },
  onTheme(cb: () => void) { W()?.onEvent?.("themeChanged", cb); },
  /** Telegram'ning o'z «Orqaga» tugmasi (6.1+): ichki ekranda ko'rinadi, bosilsa — brauzer tarixi orqaga */
  backButton(show: boolean) {
    const w = W();
    try {
      if (!w?.BackButton || !w.isVersionAtLeast?.("6.1")) return;
      if (!backBound) { backBound = true; w.BackButton.onClick(() => history.back()); }
      if (show) w.BackButton.show(); else w.BackButton.hide();
    } catch { /* eski Telegram */ }
  },
  /** mashq o'rtasida ilovani yopishdan oldin Telegram so'raydi (6.2+) */
  closeGuard(on: boolean) {
    const w = W();
    try {
      if (!w?.isVersionAtLeast?.("6.2")) return;
      if (on) w.enableClosingConfirmation?.(); else w.disableClosingConfirmation?.();
    } catch { /* eski Telegram */ }
  },
};
let backBound = false;

/** Bot havolasidan kelgan parametr: ?go=... (bot web_app tugmasi) yoki Telegram start_param. g_KOD — guruh, d_KOD — bellashuv */
export function startGo() {
  let v = "";
  try { v = new URLSearchParams(location.search).get("go") || ""; } catch { /* */ }
  return v || tg.startParam;
}

export function initTelegram() {
  const w = W();
  if (!w) return;
  try { w.ready(); w.expand(); } catch { /* */ }
  // 1-paket D11: pastga surib yopish butun ilovada o'chirilmaydi — faqat barmoq bilan chizish va o'yin ekranida (tg.swipes)
}
