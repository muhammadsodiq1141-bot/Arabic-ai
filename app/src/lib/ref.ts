// 14-partiya: do'stni taklif qilish. Havola: t.me/<bot>?start=r_MJ-12345 → bot ilovani ?go=r_MJ-12345 bilan ochadi (yoki start_param).
// Yangi o'quvchi ro'yxatdan o'tganda kod serverga ketadi (register.ref). Admin kirishni tasdiqlagach: taklif qilganga 10 tanga
// (me.refNew → refClaim), yangi o'quvchiga 5 tanga (me.refBy, bir marta — f.refGot). Server: 13-versiya.
import { api } from "./api";
import { BOT_LINK } from "./config";
import { scheduleSync, store } from "./store";
import { startGo } from "./tg";

export const REF_INVITER = 10, REF_FRIEND = 5;
export function refFromStart() {
  const m = /^r_(MJ-\d{5})$/i.exec(startGo() || "");
  return m ? m[1].toUpperCase() : "";
}
/** start parametridagi kodni eslab qoladi — ro'yxatdan o'tish keyinroq bo'lishi mumkin */
export function keepRef() {
  const r = refFromStart();
  if (r && !store.get("f.ref", "")) store.set("f.ref", r);
  return store.get("f.ref", "") || r;
}
export const refLink = (login: string) => `${BOT_LINK}?start=r_${login}`;
const addCoins = (n: number) => { store.set("x.s", store.get("x.s", 0) + n); scheduleSync(); };

/** bosh sahifa ochilganda (serverdan ma'lumot tiklangach): do'stlar uchun mukofot va yangi o'quvchining o'z mukofoti → xabar yoki "" */
let claimed = false; // bir sessiyada bir marta (bosh sahifa bir necha marta ochilishi mumkin)
export async function claimRef(me: { refNew?: number; refBy?: boolean }) {
  if (claimed) return "";
  claimed = true;
  const msgs: string[] = [];
  if (me.refBy && !store.get("f.refGot", 0)) {
    store.set("f.refGot", 1); addCoins(REF_FRIEND);
    msgs.push(`Do'stingiz taklifi bilan keldingiz — +${REF_FRIEND} tanga`);
  }
  if ((me.refNew || 0) > 0) {
    try {
      const r = await api<{ n: number }>("refClaim", { n: me.refNew });
      if (r.n > 0) { addCoins(r.n * REF_INVITER); msgs.push(r.n > 1 ? `${r.n} ta do'stingiz qo'shildi — +${r.n * REF_INVITER} tanga` : `Do'stingiz qo'shildi — +${REF_INVITER} tanga`); }
    } catch { /* keyingi safar */ }
  }
  return msgs.join(" · ");
}
