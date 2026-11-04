// Ismni arabcha yozish: avval tayyor lug'at (AR_NAME_MAP), bo'lmasa harfma-harf o'girish — eski ilova algoritmi.
// Farqlar (13A qarori): kirill yozuvi avval lotinga o'giriladi; g/o dan keyingi ʼ (U+02BC) ʻ deb olinadi
// («Ulugʼbek»da ortiqcha ع chiqmaydi); lug'atdagi ʼ li kalit «A'zam» kabi yozuvda ham topiladi.
import { useEffect, useState } from "react";
import { loadData } from "./data";
import { store } from "./store";

const TRC: [string, string][] = [["sh", "ش"], ["ch", "تش"], ["ng", "نغ"], ["gʻ", "غ"], ["g'", "غ"], ["kh", "خ"], ["b", "ب"], ["d", "د"], ["f", "ف"], ["g", "غ"], ["h", "ه"], ["j", "ج"], ["k", "ك"], ["l", "ل"], ["m", "م"], ["n", "ن"], ["p", "ب"], ["q", "ق"], ["r", "ر"], ["s", "س"], ["t", "ت"], ["v", "ف"], ["w", "و"], ["x", "خ"], ["y", "ي"], ["z", "ز"], ["ʼ", "ع"]];
const TRV: [string, string, string][] = [["oʻ", "و", "أُو"], ["o'", "و", "أُو"], ["a", "ا", "أ"], ["o", "و", "أُو"], ["u", "و", "أُو"], ["i", "ي", "إِي"], ["e", "ي", "إِي"]];

function translit(w: string) {
  w = w.toLowerCase().replace(/[’‘`]/g, "ʻ");
  let out = "", i = 0;
  while (i < w.length) {
    let hit = false;
    for (const [l, m, ini] of TRV) if (w.startsWith(l, i)) { out += i === 0 ? ini : m; i += l.length; hit = true; break; }
    if (!hit) for (const [l, a] of TRC) if (w.startsWith(l, i)) { out += a; i += l.length; hit = true; break; }
    if (!hit) i++;
  }
  return out;
}

// Kirill → lotin (o'zbek imlosi). «е» so'z boshida va unlidan keyin «ye», «ц» unlidan keyin «ts»
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ч: "ch", ш: "sh", щ: "sh", ъ: "ʼ", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "oʻ", қ: "q", ғ: "gʻ", ҳ: "h",
};
const CYR_V = /[аеёиоуэюяўы]/;
const LETTER = /[Ѐ-ӿa-zʻʼ']/i;

export function cyrToLat(s: string) {
  if (!/[Ѐ-ӿ]/.test(s)) return s;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i], lc = c.toLowerCase(), prev = (s[i - 1] || "").toLowerCase();
    const start = !prev || !LETTER.test(prev);
    let t: string;
    if (lc === "е") t = start || CYR_V.test(prev) || prev === "ъ" || prev === "ь" ? "ye" : "e";
    else if (lc === "ц") t = !start && CYR_V.test(prev) ? "ts" : "s";
    else if (lc in CYR) t = CYR[lc];
    else { out += c; continue; }
    if (c !== lc && t) t = t[0].toUpperCase() + t.slice(1); // bosh harf saqlanadi
    out += t;
  }
  return out;
}

// g va o dan keyingi ʼ (U+02BC) — aslida ʻ (gʻ, oʻ); boshqa joyda ʼ — tutuq belgisi (ع)
const fixTutuq = (s: string) => s.replace(/([go])ʼ/gi, "$1ʻ");

export type ArMap = Record<string, string>;
/** dict=false — so'z lug'atda yo'q, harfma-harf o'girilgan (harakatsiz) */
export type ArPart = { src: string; ar: string; dict: boolean };

/** Ismni so'zlarga bo'lib o'giradi: har so'z lug'atdanmi yoki harfma-harfmi — sahifadagi izoh uchun */
export function arNameParts(full: string, M: ArMap): ArPart[] {
  return String(full || "").trim().split(/\s+/).filter(Boolean).map((p) => {
    const w = fixTutuq(cyrToLat(p));
    const k = w.toLowerCase().replace(/[’‘`']/g, "ʻ");
    const d = M[k] || M[k.replace(/ʻ/g, "'")] || M[k.replace(/ʻ/g, "ʼ")];
    return { src: p, ar: d || translit(w), dict: !!d };
  });
}

export const arNameSync = (full: string, M: ArMap) => arNameParts(full, M).map((x) => x.ar).filter(Boolean).join(" ");

// Lug'at bir marta yuklanadi va xotirada turadi (sinxron myArName uchun)
let MAP: ArMap | null = null;
export const arMap = () => MAP;
export function loadArMap(): Promise<ArMap> {
  return loadData<ArMap>("AR_NAME_MAP").then((m) => (MAP = m)).catch(() => ({} as ArMap));
}

export async function arName(full: string) {
  return arNameSync(full, await loadArMap());
}

// «Ismingiz arabchada» sahifasining kalitlari (eski ilova bilan bir xil, serverga sinxronlanadi)
export const AR_KEYS = { src: "f.arnameSrc", fix: "f.arnameFix", style: "f.arStyle" } as const;

/** O'quvchining lotincha ismi: sahifada o'zgartirgani, bo'lmasa ro'yxatdagi ism (meName yoki f.me keshi) */
export function myLatName(meName?: string) {
  const me = store.get<{ full_name?: string | null; name?: string } | null>("f.me", null);
  return store.get(AR_KEYS.src, "") || meName || me?.full_name || me?.name || "";
}

/** Profil va sertifikat uchun: o'quvchi tuzatgan arabcha ism, bo'lmasa avtomatik o'girilgani.
 *  Lug'at hali yuklanmagan bo'lsa — harfma-harf; komponentda useMyArName ishlating (lug'at kelgach yangilanadi). */
export function myArName(meName?: string): string {
  if (!MAP) void loadArMap();
  return store.get(AR_KEYS.fix, "") || arNameSync(myLatName(meName), MAP || {});
}

/** myArName'ning React varianti: lug'at yuklangach o'zi qayta chiziladi */
export function useMyArName(meName?: string): string {
  const [, setN] = useState(0);
  useEffect(() => { if (!MAP) void loadArMap().then(() => setN((n) => n + 1)); }, []);
  return myArName(meName);
}
