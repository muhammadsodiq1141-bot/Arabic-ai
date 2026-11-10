// 3-paket 4-qism (10.11.2026): tanga do'koni — turlar, mahsulot rasmini yuklash, «maqsad» (o'quvchi tanlagan mahsulot, telefonda saqlanadi).
import { api } from "./api";
import { API_KEY } from "./config";
import { DEMO } from "./demoFlag";
import { store } from "./store";
import { shrinkPhoto } from "./xtask";

export type ShopItem = {
  id: number; title: string; descr: string; price: number; stock: number; variants: string[] | null; per_limit: number | null;
  img: string | null; imgPath?: string | null; visible: boolean; sort: number; mine: number;
};
export type OrderStatus = "wait" | "done" | "cancel";
export type ShopOrder = { id: number; item_id: number; title: string; variant: string | null; price: number; status: OrderStatus; created_at: string; closed_at: string | null };
export type StaffOrder = { id: number; title: string; img: string | null; variant: string | null; price: number; status: OrderStatus; created_at: string; closed_at: string | null; name: string; group: string };
export type ShopState = { ready: boolean; bal: number; items: ShopItem[]; orders: ShopOrder[] };
export const ORDER_ST: Record<OrderStatus, string> = { wait: "Kutilmoqda", done: "Topshirildi", cancel: "Bekor qilindi" };

export type Goal = { id: number; title: string; price: number };
export const getGoal = () => store.get<Goal | null>("f.shopGoal", null);
export const setGoal = (g: Goal | null) => store.set("f.shopGoal", g);

/** admin: mahsulot rasmi — 800 px JPEG, ochiq «dokon» omboriga. Qaytaradi — ombordagi yo'l (i/<kalit>.jpg) */
export async function putShopImg(file: File): Promise<{ path: string; preview: string }> {
  const b = await shrinkPhoto(file, 800, 0.82);
  const r = await api<{ path: string; url: string }>("shopImg", { size: b.size });
  const preview = URL.createObjectURL(b);
  if (DEMO) return { path: r.path, preview };
  let res: Response;
  try { res = await fetch(r.url, { method: "PUT", headers: { "Content-Type": "image/jpeg", "x-upsert": "true", apikey: API_KEY }, body: b }); }
  catch { throw new Error("Rasm yuklanmadi. Internetni tekshiring."); }
  if (!res.ok) throw new Error("Rasm yuklanmadi, qayta urinib ko'ring");
  return { path: r.path, preview };
}
