// 3-paket 3-qism (10.11.2026): qo'shimcha vazifa — umumiy turlar, fayl yuklash (server imzoli havola beradi), surat siqish, HTML'ni xavfsiz ochish.
import { api } from "./api";
import { API_KEY } from "./config";
import { DEMO } from "./demoFlag";

export type XAnswer = { text: boolean; voice: boolean; photo: boolean };
export type XMine = { id?: number; text?: string; grade: number | null; comment: string | null; created_at: string; photos?: number; audio?: boolean; result?: XResult | null };
export type XTask = {
  id: number; group_code: string; title: string; body: string; html: boolean; html_name: string | null; html_size: number | null;
  answer: XAnswer; coins5: number; due: string; created_at: string; teacher?: boolean; picked?: number;
  mine?: XMine | null; stats?: { total: number; done: number };
};
export type XResult = { ball: number; jami: number };

/** 5 baho — ustoz belgilagan tanga, 4 — 60%, 3 — 30% (server bilan bir xil) */
const PCT: Record<number, number> = { 5: 1, 4: 0.6, 3: 0.3, 2: 0, 1: 0 };
export const xCoins = (coins5: number, grade: number) => Math.round((coins5 || 0) * (PCT[grade] ?? 0));
export const HTML_MAX = 10 * 1048576;
const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
export const fmtDay = (d: string) => { const [, m, dd] = d.split("-").map(Number); return `${dd}-${OY[m - 1] || m}`; };
export const fmtMb = (n: number) => (n < 102400 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} MB`);
/** fayl HTML ekanini tekshirish (nomi va ichidagi teglar) */
export const looksHtml = (name: string, text: string) => /\.html?$/i.test(name) && /<(!doctype|html|head|body|div|section|main|p|h1)\b/i.test(text.slice(0, 20000));

/** faylni yopiq «vazifa» omboriga yuklash: server imzoli havola beradi, fayl to'g'ridan-to'g'ri omborga boradi. Qaytaradi — ombordagi yo'l. */
export async function putFile(kind: "html" | "photo", file: Blob, code?: string): Promise<string> {
  const r = await api<{ path: string; url: string }>("xUpload", { kind, code, size: file.size });
  if (DEMO) return r.path;
  let res: Response;
  try {
    // HTML matn sifatida saqlanadi (ombor havolasi brauzerda sahifa bo'lib ochilmasin) — ilova uni o'zi o'qib, qafasda ko'rsatadi
    res = await fetch(r.url, { method: "PUT", headers: { "Content-Type": kind === "html" ? "text/plain; charset=utf-8" : "image/jpeg", "x-upsert": "true", apikey: API_KEY }, body: file });
  } catch { throw new Error("Fayl yuklanmadi. Internetni tekshiring."); }
  if (!res.ok) throw new Error(res.status === 413 ? "Fayl juda katta" : "Fayl yuklanmadi, qayta urinib ko'ring");
  return r.path;
}

/** daftar surati: eng uzun tomoni 1600 px, JPEG 0.8 (odatda 200–400 KB) */
export async function shrinkPhoto(file: File, max = 1600, q = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", q));
    if (!b) throw new Error("rasm");
    return b;
  } catch { throw new Error("Surat ochilmadi — boshqa surat tanlang"); }
  finally { URL.revokeObjectURL(url); }
}

// HTML ichiga qo'shiladigan kichik ko'prik: sahifa o'lchami (keng sahifani telefon eniga moslash uchun) va test natijasi.
// Material ichida: window.miyzanNatija(8, 10) yoki parent.postMessage({ miyzan: "natija", ball: 8, jami: 10 }, "*").
const BRIDGE = '<script>(function(){var P=function(m){try{parent.postMessage(m,"*")}catch(e){}};'
  + 'window.miyzanNatija=function(b,j){P({miyzan:"natija",ball:+b,jami:+j})};'
  + 'var S=function(){var d=document.documentElement,b=document.body;P({miyzan:"olcham",w:Math.max(d.scrollWidth,b?b.scrollWidth:0)})};'
  + 'addEventListener("load",function(){S();setTimeout(S,700)});addEventListener("resize",S)})();</script>';
export function wrapHtml(src: string) {
  for (const re of [/<head[^>]*>/i, /<html[^>]*>/i, /<!doctype[^>]*>/i]) {
    const m = src.match(re);
    if (m && m.index !== undefined) return src.slice(0, m.index + m[0].length) + BRIDGE + src.slice(m.index + m[0].length);
  }
  return BRIDGE + src;
}
/** iframe'dan kelgan natija xabari */
export function readResult(d: unknown): XResult | null {
  const x = d as { miyzan?: string; ball?: number; jami?: number } | null;
  if (!x || x.miyzan !== "natija") return null;
  const b = Number(x.ball), j = Number(x.jami);
  return Number.isFinite(b) && Number.isFinite(j) && j > 0 && j <= 1000 && b >= 0 && b <= j ? { ball: Math.round(b), jami: Math.round(j) } : null;
}
