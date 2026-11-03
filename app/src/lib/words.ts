// So'z ma'lumoti: rasm (EMO → FLX → 3D rasm, eski ilovadagi kabi harakatsiz arabcha bo'yicha), turkum, misol.
import { loadData } from "./data";

export type WordCard = { t?: string; ex?: [string, string, string?][]; syn?: string[][]; ant?: string[][]; pl?: string; v?: string[] };
export type Word = { ar: string; uz: string; hint?: string; img: string | null; card: WordCard | null };

export const strip = (s: string) => String(s).replace(/[ً-ْٰـ]/g, "").trim();

const POS: Record<string, string> = { ot: "ot", fel: "fe'l", "fe'l": "fe'l", sifat: "sifat", boshqa: "so'z", ravish: "ravish", olmosh: "olmosh" };
export const posLabel = (t?: string) => (t ? POS[t] || t : "");

export async function loadWords(bookId: string, unit: number, list: string[][]): Promise<Word[]> {
  const [emo, flx, wf] = await Promise.all([
    loadData<Record<string, string>>("EMO"),
    loadData<Record<string, number>>("FLX"),
    loadData<Record<string, WordCard>>(`wf/${bookId}`).catch(() => ({} as Record<string, WordCard>)),
  ]);
  return list.map(([ar, uz, hint]) => {
    const e = emo[strip(ar)];
    const i = e != null ? flx[String(e).replace(/️/g, "")] : undefined;
    return { ar, uz, hint, img: i != null ? `./img/fli/${i}.webp` : null, card: wf[`${ar}#u${unit}`] || wf[ar] || null };
  });
}

export function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
