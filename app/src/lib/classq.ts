// Chiqarishdan oldingi tuzatish (10.11.2026): darsda tanga — yuborilmagan tangalar navbati.
// Har berish telefonda saqlanadi va server tasdiqlagandan keyin o'chiriladi. Internet uzilsa yoki ilova yopilsa — keyingi ochilishda qayta yuboriladi
// (batch kaliti bir xil, server ikki marta yozmaydi). So'rovlar navbat bilan ketadi — kunlik limit ketma-ket tez bosishda ham to'g'ri hisoblanadi.
import { api } from "./api";
import { store } from "./store";

export type CcItem = { code: string; kids: string[]; amount: number; why: string; batch: string };
export type CcResult = { given: Record<string, number>; capped: string[]; total: number; today: Record<string, number> };
const KEY = "f.ccQueue";
const get = () => store.get<CcItem[]>(KEY, []);
const put = (q: CcItem[]) => store.set(KEY, q);
let chain: Promise<unknown> = Promise.resolve();
const flying = new Map<string, Promise<CcResult>>(); // yo'ldagi so'rovlar — qayta yuborishda takrorlanmasin

/** navbatga qo'shib yuborish; natija — server javobi (yoki xato) */
export function ccSend(it: CcItem): Promise<CcResult> {
  const f = flying.get(it.batch);
  if (f) return f;
  if (!get().some((x) => x.batch === it.batch)) put([...get(), it]);
  const run = chain.then(async () => {
    const r = await api<CcResult>("classCoins", { code: it.code, amount: it.amount, why: it.why, kids: it.kids, batch: it.batch });
    put(get().filter((x) => x.batch !== it.batch));
    return r;
  });
  flying.set(it.batch, run);
  chain = run.catch(() => null).finally(() => flying.delete(it.batch));
  return run;
}

/** oldingi ochilishda yuborilmay qolganlarini qayta yuborish (Ustoz paneli va Darsda tanga ochilganda) */
export function ccResend(): void {
  for (const it of get()) void ccSend(it).catch(() => { /* keyingi safar */ });
}
