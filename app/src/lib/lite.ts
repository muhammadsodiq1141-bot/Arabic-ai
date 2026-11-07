// 17-partiya (A6; TMLT 1, 2, 7-boblar — viloyatlarda trafik va qurilma tengsizligi): kam trafik rejimi.
// f.lite — multfilm va shadowing faqat audio + matn bilan (video o'rniga ~7 baravar yengil m4a), ustoz panelida belgi (_sum.lite).
// Vahdani oldindan yuklab olish (Wi-Fi'da): so'z va mashq matnlarining ovozi + vahda ma'lumotlari brauzer xotirasiga (offline.ts).
// Yuklab olinganlar ro'yxati faqat shu telefonda (v2.off — serverga ketmaydi).
import { clean, kitobUrls, sha1, TTS_BASE } from "./audio";
import { kbFile, kbKeyOf, kbTexts, type KbLesson } from "./kb";
import { audioReq, dataUrl, hasCaches, OFF_CACHE, offKeys } from "./offline";
import { store } from "./store";

export const isLite = () => store.get<boolean>("f.lite", false);
export const setLite = (v: boolean) => store.set("f.lite", v);

type Conn = { saveData?: boolean; effectiveType?: string; type?: string };
const conn = (): Conn | null => (navigator as unknown as { connection?: Conn }).connection || null;
/** Telefonda «trafikni tejash» yoqilgan yoki internet sekin (2G/3G) — rejimni taklif qilish uchun */
export const slowNet = () => { const c = conn(); return !!c && (!!c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || "")); };
/** Wi-Fi'dami: bilib bo'lmasa — null (iPhone va ko'p brauzerlar aytmaydi) */
export const onWifi = (): boolean | null => { const t = conn()?.type; return t ? t === "wifi" || t === "ethernet" : null; };

export type OffUnit = { at: number; n: number; kb: number };
export const offUnits = () => store.get<Record<string, OffUnit>>("v2.off", {});
export const offOf = (bookId: string, unitN: number) => offUnits()[`${bookId}:${unitN}`] || null;

/** Vahdani yuklab olish: ma'lumot fayllari + so'z va mashq matnlari ovozi. onStep(tayyor, jami) — jarayon */
export async function saveUnit(bookId: string, unitN: number, words: string[], onStep: (done: number, all: number) => void): Promise<OffUnit> {
  if (!hasCaches()) throw new Error("Bu telefonda yuklab olib bo'lmaydi");
  const c = await caches.open(OFF_CACHE);
  // 1) ma'lumot fayllari
  const kbk = kbKeyOf(bookId, unitN);
  const names = [`books/${bookId}`, `wf/${bookId}`, "FLX", ...(kbk ? [kbFile(kbk)] : [])];
  let bytes = 0;
  let kb: KbLesson | null = null;
  for (const n of names) {
    try {
      const r = await fetch(dataUrl(n));
      if (!r.ok) continue;
      const b = await r.clone().arrayBuffer();
      bytes += b.byteLength;
      await c.put(dataUrl(n), r);
      if (kbk && n === kbFile(kbk)) kb = JSON.parse(new TextDecoder().decode(b)) as KbLesson;
    } catch { /* keyingisi */ }
  }
  // 2) ovozlar: kitob audiosi (vaqtinchalik havola) yoki serverdagi tayyor ovoz
  const texts = [...new Set([...words, ...(kb ? kb.steps.flatMap(kbTexts) : [])].map(clean).filter(Boolean))].slice(0, 600);
  const urls = await kitobUrls(`${bookId}/${unitN}`, texts);
  const K = await offKeys();
  let done = 0, n = 0;
  onStep(0, texts.length);
  const queue = [...texts];
  const work = async () => {
    for (;;) {
      const t = queue.shift();
      if (t === undefined) return;
      try {
        const hk = await sha1(t);
        if (!K.has(hk)) {
          let r = urls[hk] ? await fetch(urls[hk]).catch(() => null) : null;
          if (!r || !r.ok) r = await fetch(TTS_BASE + hk + ".mp3").catch(() => null);
          if (r && r.ok) {
            const b = await r.blob();
            bytes += b.size;
            await c.put(audioReq(hk), new Response(b, { headers: { "Content-Type": b.type || "audio/mpeg" } }));
            K.add(hk); n++;
          }
        } else n++;
      } catch { /* bu ovoz o'tkazib yuboriladi */ }
      onStep(++done, texts.length);
    }
  };
  await Promise.all([work(), work(), work(), work()]);
  const res: OffUnit = { at: Date.now(), n, kb: Math.round(bytes / 1024) };
  store.set("v2.off", { ...offUnits(), [`${bookId}:${unitN}`]: res });
  return res;
}
