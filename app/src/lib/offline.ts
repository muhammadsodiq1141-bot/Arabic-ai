// 17-partiya (A6): oldindan yuklab olingan vahdalar — brauzer xotirasi (Cache Storage). Bu modul boshqa modullarni import qilmaydi
// (audio.ts va data.ts undan foydalanadi). Ovoz kaliti — matnning SHA-1 si (audio.ts bilan bir xil).
export const OFF_CACHE = "mezon-off-1";
export const hasCaches = () => typeof caches !== "undefined";
export const audioReq = (hk: string) => new URL(`./off/a/${hk}`, location.href).toString();
export const dataUrl = (name: string) => new URL(`./data/${name}.json`, location.href).toString();

let keys: Set<string> | null = null;
let keysP: Promise<Set<string>> | null = null;
/** Xotiradagi ovozlar kalitlari (bir marta o'qiladi) */
export function offKeys(): Promise<Set<string>> {
  if (keys) return Promise.resolve(keys);
  if (!keysP) {
    keysP = (async () => {
      const s = new Set<string>();
      if (hasCaches()) {
        try { const c = await caches.open(OFF_CACHE); (await c.keys()).forEach((r) => { const m = /\/off\/a\/([0-9a-f]{40})$/.exec(r.url); if (m) s.add(m[1]); }); } catch { /* xotira yopiq */ }
      }
      keys = s;
      return s;
    })();
  }
  return keysP;
}

const blobs = new Map<string, string>();
/** Ovoz xotirada bo'lsa — shu telefon ichidagi havola (internetsiz ishlaydi) */
export async function offAudio(hk: string): Promise<string | null> {
  const K = await offKeys();
  if (!K.has(hk)) return null;
  const had = blobs.get(hk);
  if (had) return had;
  try {
    const r = await (await caches.open(OFF_CACHE)).match(audioReq(hk));
    if (!r) { K.delete(hk); return null; }
    const u = URL.createObjectURL(await r.blob());
    blobs.set(hk, u);
    return u;
  } catch { return null; }
}

/** Internet bo'lmasa — oldindan yuklangan ma'lumot fayli */
export async function offData(name: string): Promise<unknown | null> {
  if (!hasCaches()) return null;
  try { const r = await (await caches.open(OFF_CACHE)).match(dataUrl(name)); return r ? await r.json() : null; } catch { return null; }
}
