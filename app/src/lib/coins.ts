// 3-paket (1-qism): tanga — SERVERDAGI hisob (api 15-versiya, coins jadvali). Telefonda faqat oxirgi ma'lum qoldiq (f.coinBal) — ko'rsatish uchun.
// Tanga uy vazifasi bahosi, qo'shimcha vazifa, darsdagi rag'bat va do'st taklifidan keladi; muzlatish va do'kon uchun sarflanadi.
// Eski telefondagi tanga (x.s, eski ilova bilan umumiy) bir marta serverga ko'chiriladi (server chegarasi bilan) — x.s o'zgartirilmaydi.
import { useEffect, useState } from "react";
import { api } from "./api";
import { store } from "./store";

export type CoinItem = { id: number; at: string; amount: number; kind: string; note: string | null };
export type CoinState = { ready: boolean; bal: number; items: CoinItem[]; freeze: number; grade?: Record<string, number> };

export const COIN_KIND: Record<string, string> = {
  hw: "uy vazifasi", extra: "qo'shimcha vazifa", class: "darsda", shop: "do'kon", freeze: "seriya muzlatish",
  ref: "do'st taklifi", migrate: "eski tangalar", admin: "admin",
};
/** server sozlamasi bilan bir xil (coin_rules.ref) — matnlarda ko'rsatish uchun */
export const REF_INVITER = 500, REF_FRIEND = 250;

export const coinBalCached = () => store.get<number>("f.coinBal", 0);

let last: CoinState | null = null;
let inflight: Promise<CoinState> | null = null;
const subs = new Set<(s: CoinState) => void>();

export function loadCoins(force = false): Promise<CoinState> {
  if (last && !force) return Promise.resolve(last);
  if (inflight) return inflight;
  const old = store.get("f.coinMig", 0) ? 0 : store.get<number>("x.s", 0);
  inflight = api<CoinState>("coins", old ? { old } : {}).then((r) => {
    if (r.ready) { store.set("f.coinBal", r.bal); if (!store.get("f.coinMig", 0)) store.set("f.coinMig", 1); }
    last = r; inflight = null;
    subs.forEach((f) => f(r));
    return r;
  }).catch((e) => { inflight = null; throw e; });
  return inflight;
}
/** sarf yoki kirimdan keyin (muzlatish, baho) — qayta yuklash */
export const refreshCoins = () => loadCoins(true).catch(() => null);

export function useCoins() {
  const [s, setS] = useState<CoinState | null>(last);
  useEffect(() => {
    subs.add(setS);
    void loadCoins().then(setS).catch(() => {});
    return () => { subs.delete(setS); };
  }, []);
  return { s, bal: s?.ready ? s.bal : coinBalCached() };
}

/** ilova ochilganda: oxirgi ko'rilgandan keyingi kirimlar → «+1000 tanga — uy vazifasi» (birinchi marta — faqat belgilab qo'yiladi) */
export function newCoinMsgs(items: CoinItem[]): string[] {
  if (!items.length) return [];
  const seen = store.get<number | null>("f.coinSeen", null);
  const top = Math.max(...items.map((x) => x.id));
  store.set("f.coinSeen", Math.max(top, seen || 0));
  if (seen === null) return [];
  return items.filter((x) => x.id > seen && x.amount > 0 && x.kind !== "migrate").slice(0, 3)
    .map((x) => `+${x.amount} tanga — ${COIN_KIND[x.kind] || x.kind}`);
}

export async function buyFreezeServer(): Promise<{ ok: boolean; msg: string }> {
  try {
    const r = await api<{ bal: number; price: number }>("freezeBuy", {});
    store.set("f.coinBal", r.bal);
    void refreshCoins();
    return { ok: true, msg: `Muzlatish olindi (−${r.price} tanga). Bir kun qoldirsangiz ham ketma-ketlik saqlanadi` };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : "Muzlatish olinmadi" };
  }
}

export const fmtCoins = (n: number) => n.toLocaleString("ru-RU").replace(/,/g, " ");
