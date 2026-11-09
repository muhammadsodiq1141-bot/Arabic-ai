// «Ismingiz arabchada» (ISM-TANISHUV-SPEC §1): lotincha (yoki kirill) ism → arabcha (lug'at yoki harfma-harf), o'quvchi o'zi tuzata oladi.
// 3 haqiqiy shrift (12A): Nasx — Noto Naskh Arabic, Kufiy — Reem Kufi, Ruq'a — Aref Ruqaa (oxirgi ikkisi faqat shu sahifa ochilganda yuklanadi).
// Ulashish — tanlangan uslubdagi PNG karta (canvas). Kalitlar eskisi bilan bir xil: f.arnameSrc, f.arnameFix, f.arStyle (0–2).
import { useEffect, useMemo, useRef, useState } from "react";
import { Info, RotateCcw, Send, Share2 } from "lucide-react";
import { AR_KEYS, arMap, arNameParts, loadArMap, type ArMap } from "../lib/arname";
import { BOT_LINK, BOT_USER } from "../lib/config";
import { sharePng } from "../lib/sharePng";
import { scheduleSync, store } from "../lib/store";
import { tg } from "../lib/tg";
import { useSession } from "../state/session";
import { Ar, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import "./arname.css";

export const AR_STYLES = [
  { name: "Nasx", family: '"Noto Naskh Arabic"' },
  { name: "Kufiy", family: '"Reem Kufi"' },
  { name: "Ruq'a", family: '"Aref Ruqaa"' },
] as const;

const FONT_CSS = "https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@500;700&family=Aref+Ruqaa:wght@400;700&display=swap";
const SAMPLE = "اِسْمٌ عَرَبِيٌّ";
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

let cssP: Promise<void> | null = null;
/** Kufiy va Ruq'a shriftlarini bir marta ulaydi va berilgan matn harflari uchun hamma shrift yuklanguncha kutadi (8 s dan ko'p emas) */
export function loadArFonts(ar = "", lat = ""): Promise<void> {
  if (!cssP) cssP = new Promise<void>((res) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = FONT_CSS;
    l.id = "arname-fonts";
    l.onload = () => res();
    l.onerror = () => res();
    document.head.appendChild(l);
    window.setTimeout(res, 8000); // tarmoq sekin bo'lsa — kutib qolmaymiz
  });
  const t = SAMPLE + ar;
  const all = cssP.then(() => Promise.all([
    ...AR_STYLES.map((s) => document.fonts.load(`700 64px ${s.family}`, t)),
    document.fonts.load("800 40px Manrope", `Miyzan ${lat}`),
    document.fonts.load("700 40px Manrope", `Miyzan ${lat}`),
  ])).then(() => undefined, () => undefined);
  return Promise.race([all, wait(8000)]);
}

/* ---------- PNG karta (canvas) ---------- */
export type Pal = { bg: string; hero: string; ink: string; gold: string };
export const W = 1080, H = 1350, M = 56;

// Ranglar joriy mavzudan (kunduz/tun) olinadi — styles.css tokenlari
export function palette(): Pal {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return { bg: v("--bg", "#F3EBDD"), hero: v("--hero", "#2A2418"), ink: v("--hero-ink", "#FBF7EF"), gold: v("--gold", "#F5B544") };
}

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Miyzan belgisi (ui/kit Logo bilan bir xil chizma, 120×120 o'lchamda)
export function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, p: Pal) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 120, size / 120);
  ctx.beginPath(); ctx.arc(60, 60, 60, 0, Math.PI * 2);
  ctx.globalAlpha = 0.08; ctx.fillStyle = p.ink; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = p.gold; ctx.fillStyle = p.gold; ctx.lineCap = "round";
  ctx.lineWidth = 4;
  ctx.stroke(new Path2D("M60 30V86"));
  ctx.stroke(new Path2D("M26 38H94"));
  ctx.lineWidth = 1.6;
  ctx.stroke(new Path2D("M26 38L16 66M26 38L36 66M94 38L84 66M94 38L104 66"));
  ctx.fill(new Path2D("M44 92h32l-4-6H48z"));
  ctx.fill(new Path2D("M14 66q12 12 24 0z"));
  ctx.fill(new Path2D("M82 66q12 12 24 0z"));
  ctx.beginPath(); ctx.arc(60, 28, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.ink; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = '700 17px "Noto Naskh Arabic", serif'; ctx.direction = "rtl"; ctx.fillText("ع", 26, 62);
  ctx.font = "800 14px Manrope, sans-serif"; ctx.direction = "ltr"; ctx.fillText("a", 94, 62);
  ctx.restore();
}

// Bo'laklarni n ta ketma-ket qatorga bo'lishning hamma usullari
function splits(units: string[], n: number): string[][] {
  if (n === 1) return [[units.join(" ")]];
  const out: string[][] = [];
  for (let i = 1; i <= units.length - n + 1; i++) for (const rest of splits(units.slice(i), n - 1)) out.push([units.slice(0, i).join(" "), ...rest]);
  return out;
}

// So'zlar orasidagi bo'shliq (em): Kufiy shriftida bo'shliq juda tor — so'zlar qo'shilib ketmasin
const GAP = [0.24, 0.36, 0.24];

// Qator kengligi: so'zlar alohida o'lchanadi + bo'shliqlar (chizish ham so'zma-so'z)
function lineW(ctx: CanvasRenderingContext2D, line: string, gap: number) {
  const ws = line.split(" ");
  return ws.reduce((a, w) => a + ctx.measureText(w).width, 0) + (ws.length - 1) * gap;
}

// Arabcha ism: 1–3 qator, eng katta o'lcham; ko'proq qator faqat ancha kattaroq chiqsa tanlanadi.
// units — qator faqat shular orasida bo'linadi (masalan «مُحَمَّد عَلِي» = bitta «Muhammadali»)
function layoutAr(ctx: CanvasRenderingContext2D, units: string[], font: (s: number) => string, gapEm: number, maxW: number, maxH: number) {
  const all = units.join(" ");
  ctx.font = font(100);
  const g100 = Math.max(ctx.measureText(" ").width, gapEm * 100);
  const wOf = (s: string) => lineW(ctx, s, g100) / 100;
  let best = { lines: [all], size: 0 };
  for (let n = 1; n <= Math.min(3, units.length); n++) {
    let top = { lines: [all], size: 0 };
    for (const lines of splits(units, n)) {
      const size = Math.min(200, maxW / Math.max(...lines.map(wOf)), maxH / (n * 1.6));
      if (size > top.size) top = { lines, size };
    }
    if (!best.size || top.size > best.size * 1.18) best = top;
  }
  let size = Math.floor(best.size);
  const gapOf = (s: number) => (g100 * s) / 100;
  ctx.font = font(size);
  while (size > 12 && Math.max(...best.lines.map((l) => lineW(ctx, l, gapOf(size)))) > maxW) { size -= 2; ctx.font = font(size); }
  return { lines: best.lines, size, gap: gapOf(size) };
}

// Lotincha matnni kenglikka sig'dirish
function fitLat(ctx: CanvasRenderingContext2D, text: string, font: (s: number) => string, start: number, maxW: number) {
  let s = start;
  ctx.font = font(s);
  while (s > 14 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = font(s); }
  return s;
}

/** Ism kartasini canvas'ga chizadi (1080×1350). style: 0 Nasx, 1 Kufiy, 2 Ruq'a.
 *  units — ismning har lotincha so'ziga mos arabcha bo'lak (qator shular orasida bo'linadi); berilmasa — bo'shliq bo'yicha */
export async function drawArName(ar: string, lat: string, style: number, units?: string[], pal: Pal = palette()): Promise<HTMLCanvasElement> {
  await loadArFonts(ar, lat);
  const st = AR_STYLES[style] || AR_STYLES[0];
  const U = units && units.join(" ") === ar ? units : ar.split(" ").filter(Boolean);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas yo'q");

  // fon va karta
  ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
  rr(ctx, M, M, W - 2 * M, H - 2 * M, 64);
  ctx.fillStyle = pal.hero; ctx.fill();
  ctx.save();
  ctx.clip();
  const glow = ctx.createRadialGradient(W / 2, 330, 0, W / 2, 330, 640);
  glow.addColorStop(0, pal.gold); glow.addColorStop(1, pal.hero);
  ctx.globalAlpha = 0.16; ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  ctx.restore();
  // ikki qavat oltin hoshiya (sertifikatdagidek)
  ctx.strokeStyle = pal.gold;
  ctx.globalAlpha = 0.55; ctx.lineWidth = 4; rr(ctx, M + 22, M + 22, W - 2 * M - 44, H - 2 * M - 44, 46); ctx.stroke();
  ctx.globalAlpha = 0.3; ctx.lineWidth = 2; rr(ctx, M + 38, M + 38, W - 2 * M - 76, H - 2 * M - 76, 34); ctx.stroke();
  ctx.globalAlpha = 1;

  drawLogo(ctx, W / 2, 232, 132, pal);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.direction = "ltr";
  ctx.fillStyle = pal.gold;
  ctx.font = "800 30px Manrope, sans-serif";
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("ISMIM ARABCHADA", W / 2, 372);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";

  // arabcha ism: 410–930 oralig'ida, harakatlari bilan o'rtada
  const arFont = (s: number) => `700 ${s}px ${st.family}, "Noto Naskh Arabic", serif`;
  ctx.direction = "rtl";
  const { lines, size, gap } = layoutAr(ctx, U, arFont, GAP[style] ?? GAP[0], 820, 500);
  const step = size * 1.6;
  const m0 = ctx.measureText(lines[0]), mN = ctx.measureText(lines[lines.length - 1]);
  const top = -m0.actualBoundingBoxAscent, bottom = (lines.length - 1) * step + mN.actualBoundingBoxDescent;
  const base0 = 670 - (top + bottom) / 2;
  ctx.fillStyle = pal.gold;
  ctx.textAlign = "right";
  lines.forEach((l, i) => {
    let x = W / 2 + lineW(ctx, l, gap) / 2; // o'ngdan chapga, so'zma-so'z
    for (const w of l.split(" ")) { ctx.fillText(w, x, base0 + i * step); x -= ctx.measureText(w).width + gap; }
  });
  ctx.textAlign = "center";
  ctx.direction = "ltr";

  // oltin chiziq va lotincha ism
  rr(ctx, W / 2 - 60, 968, 120, 10, 5); ctx.fillStyle = pal.gold; ctx.fill();
  ctx.fillStyle = pal.ink;
  fitLat(ctx, lat, (s) => `800 ${s}px Manrope, sans-serif`, 58, 800);
  ctx.fillText(lat, W / 2, 1062);

  ctx.globalAlpha = 0.6;
  ctx.font = "700 28px Manrope, sans-serif";
  ctx.fillText(`Miyzan · @${BOT_USER}`, W / 2, H - M - 82);
  ctx.globalAlpha = 1;
  return c;
}

export function canvasPng(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
}

export const arNamePng = async (ar: string, lat: string, style: number, units?: string[]) => canvasPng(await drawArName(ar, lat, style, units));

/* ---------- Sahifa ---------- */
const clampStyle = (v: unknown) => { const n = Number(v); return n === 1 || n === 2 ? n : 0; };
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const themeNow = () => document.documentElement.dataset.theme || "light";

export function ArNameScreen() {
  const { me } = useSession();
  const meName = me?.full_name || me?.name || "";
  const [src, setSrc] = useState(() => String(store.get(AR_KEYS.src, "") || ""));
  const [srcDraft, setSrcDraft] = useState<string | null>(null); // yozish paytida (bo'sh qoldirish mumkin bo'lsin)
  const [fix, setFix] = useState(() => String(store.get(AR_KEYS.fix, "") || ""));
  const [fixDraft, setFixDraft] = useState<string | null>(null);
  const [style, setStyle] = useState(() => clampStyle(store.get(AR_KEYS.style, 0)));
  const [map, setMap] = useState<ArMap | null>(arMap);
  const [fontsOk, setFontsOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState(""); // ulashib ham, saqlab ham bo'lmasa — tayyor rasm ekranda
  const png = useRef<{ key: string; blob: Blob } | null>(null);

  useEffect(() => { if (!map) void loadArMap().then(setMap); }, [map]);

  const lat = src || meName;
  const parts = useMemo(() => arNameParts(lat, map || {}), [lat, map]);
  const units = parts.map((p) => p.ar).filter(Boolean);
  const auto = units.join(" ");
  const shown = fix || auto;
  const missing = map && !fix ? parts.filter((p) => !p.dict && p.ar).map((p) => p.src) : [];
  const caption = `Mening ismim arabchada: ${shown} ✨`;
  const keyOf = () => `${style}|${themeNow()}|${shown}|${lat}`;
  const key = keyOf();

  useEffect(() => {
    let on = true;
    void loadArFonts(shown, lat).then(() => { if (on) setFontsOk(true); });
    return () => { on = false; };
  }, [shown, lat]);

  // Rasm oldindan tayyorlanadi: «Ulashish» bosilganda navigator.share darhol chaqirilishi kerak
  useEffect(() => {
    setShot("");
    if (!shown || !fontsOk) return;
    let on = true;
    const t = window.setTimeout(() => {
      void arNamePng(shown, lat, style, fix ? undefined : units).then((blob) => { if (on) png.current = { key, blob }; }).catch(() => { /* bosilganda qayta urinadi */ });
    }, 300);
    return () => { on = false; window.clearTimeout(t); };
  }, [key, fontsOk]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot); }, [shot]);

  const onSrc = (v: string) => {
    setSrcDraft(v);
    const t = norm(v);
    setSrc(t);
    store.set(AR_KEYS.src, t);
    if (fix) { setFix(""); store.set(AR_KEYS.fix, ""); } // eskidek: yangi ismga avtomatik arabcha
    scheduleSync();
  };
  const onFix = (v: string) => {
    setFixDraft(v);
    const t = norm(v);
    const f = t && t !== auto ? t : ""; // avtomatik bilan bir xil yoki bo'sh — saqlanmaydi
    setFix(f);
    store.set(AR_KEYS.fix, f);
    scheduleSync();
  };
  const resetFix = () => { tg.haptic(); setFix(""); setFixDraft(null); store.set(AR_KEYS.fix, ""); scheduleSync(); };
  const pick = (i: number) => { tg.haptic(); setStyle(i); store.set(AR_KEYS.style, i); scheduleSync(); };

  const share = async () => {
    if (!shown || busy) return;
    tg.haptic();
    const k = keyOf();
    let blob = png.current?.key === k ? png.current.blob : null;
    if (!blob) {
      setBusy(true);
      blob = await arNamePng(shown, lat, style, fix ? undefined : units).catch(() => null);
      setBusy(false);
    }
    if (!blob) { toast("Rasm tayyorlanmadi. Qayta urinib ko'ring"); return; }
    const r = await sharePng(blob, "ismim-arabchada.png", caption);
    if (r === "saved") toast("Rasm yuklab olindi");
    else if (r === "failed") setShot(URL.createObjectURL(blob));
  };
  const shareText = () => {
    tg.haptic();
    tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(caption)}`);
  };

  const first = shown.split(" ")[0] || "اِسْم";
  return (
    <main className="screen">
      <ScreenHeader title="Ismingiz arabchada" />
      <section className="an-card" aria-label={shown ? `Ismingiz arabchada: ${shown}` : "Ismingiz arabchada"}>
        <span className="an-k">Ismim arabchada</span>
        {shown ? <Ar className={`an-big an-f${style}`}>{shown}</Ar> : <span className="an-empty">Ismingizni yozing</span>}
        <i className="an-bar" aria-hidden />
        <b className="an-lat">{lat || "—"}</b>
        <small>Miyzan · @{BOT_USER}</small>
      </section>

      <section className="card form an-form">
        <label>Ismingiz (lotincha)
          <input value={srcDraft ?? lat} onChange={(e) => onSrc(e.target.value)} onBlur={() => setSrcDraft(null)} autoComplete="off" autoCapitalize="words" spellCheck={false} maxLength={60} />
        </label>
        <label>Arabchada (kerak bo'lsa o'zingiz tuzating)
          <input className="an-arin" dir="rtl" lang="ar" value={fixDraft ?? shown} onChange={(e) => onFix(e.target.value)} onBlur={() => setFixDraft(null)} autoComplete="off" spellCheck={false} maxLength={80} />
        </label>
        {missing.length > 0 && (
          <p className="an-hint"><Info size={18} aria-hidden /><span>«{missing.join(", ")}» lug'atda yo'q — yozilishini tekshirib ko'ring</span></p>
        )}
        {fix && <button type="button" className="an-reset" onClick={resetFix}><RotateCcw size={16} aria-hidden />Avtomatik variantga qaytarish</button>}
      </section>

      <section className="card">
        <b className="an-h">Uslub</b>
        <div className="an-styles" role="group" aria-label="Yozuv uslubi">
          {AR_STYLES.map((s, i) => (
            <button key={s.name} type="button" className={i === style ? "on" : ""} aria-pressed={i === style} onClick={() => pick(i)}>
              <Ar className={`an-f${i}`}>{first}</Ar><small>{s.name}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="an-acts">
        <button type="button" className="btn primary wide" disabled={!shown || busy} onClick={() => void share()}>
          <Share2 size={18} aria-hidden />{busy ? "Rasm tayyorlanmoqda…" : "Rasm qilib ulashish"}
        </button>
        <button type="button" className="btn ghost wide" disabled={!shown} onClick={shareText}>
          <Send size={18} aria-hidden />Matnini Telegram'da yuborish
        </button>
      </div>

      {shot && (
        <section className="card an-shot">
          <img src={shot} alt={`Ismingiz arabchada: ${shown}`} />
          <p>Bu qurilmada rasmni to'g'ridan-to'g'ri ulashib bo'lmadi. Rasmni bosib turib saqlang yoki ekran rasmini oling.</p>
        </section>
      )}
    </main>
  );
}
