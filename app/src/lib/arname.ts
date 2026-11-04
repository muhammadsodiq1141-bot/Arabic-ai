// Ismni arabcha yozish (sertifikat uchun): avval tayyor lug'at (AR_NAME_MAP), bo'lmasa harfma-harf o'girish — eski ilova bilan bir xil.
import { loadData } from "./data";

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

export async function arName(full: string) {
  const M = await loadData<Record<string, string>>("AR_NAME_MAP").catch(() => ({} as Record<string, string>));
  return String(full || "").trim().split(/\s+/).filter(Boolean).map((p) => {
    const k = p.toLowerCase().replace(/[’‘`']/g, "ʻ");
    return M[k] || M[k.replace(/ʻ/g, "'")] || translit(p);
  }).join(" ");
}
