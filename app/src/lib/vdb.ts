// 16-partiya: ovoz yozuvlari faqat shu telefonda (IndexedDB «mezon-voice»). Serverga yuborilmaydi — o'quvchi xohlasa ustozga alohida yuboradi.
function open(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const r = indexedDB.open("mezon-voice", 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore("v"); } catch { /* */ } };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
}
export async function vPut(k: string, b: Blob) {
  const d = await open(); if (!d) return;
  try { d.transaction("v", "readwrite").objectStore("v").put(b, k); } catch { /* xotira to'la */ }
}
export async function vGet(k: string): Promise<Blob | null> {
  const d = await open(); if (!d) return null;
  return new Promise((ok) => {
    try { const q = d.transaction("v").objectStore("v").get(k); q.onsuccess = () => ok((q.result as Blob) || null); q.onerror = () => ok(null); } catch { ok(null); }
  });
}
