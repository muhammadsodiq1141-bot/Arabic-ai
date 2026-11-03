// Saqlangan so'zlar (xatcho'p): f.saved = { "<harakatli arabcha>": { uz, at } }. Yangi kalit — eski ilovada yo'q,
// lekin "f." prefiksi tufayli serverdagi nusxaga (sync) birga ketadi va boshqa telefonda ham tiklanadi.
import { scheduleSync, store } from "./store";

export type Saved = { uz: string; at: number };
const KEY = "f.saved";

export const savedAll = () => store.get<Record<string, Saved>>(KEY, {});
export const savedHas = (ar: string) => !!savedAll()[ar];

export function toggleSaved(ar: string, uz: string) {
  const m = savedAll();
  if (m[ar]) delete m[ar];
  else m[ar] = { uz, at: Date.now() };
  store.set(KEY, m);
  scheduleSync();
  return !!m[ar];
}

export function removeSaved(ar: string) {
  const m = savedAll();
  delete m[ar];
  store.set(KEY, m);
  scheduleSync();
}
