// 14-partiya: do'stni taklif qilish. Havola: t.me/<bot>?start=r_MJ-12345 → bot ilovani ?go=r_MJ-12345 bilan ochadi (yoki start_param).
// Yangi o'quvchi ro'yxatdan o'tganda kod serverga ketadi (register.ref). Admin kirishni tasdiqlagach: taklif qilganga 10 tanga
// (me.refNew → refClaim), yangi o'quvchiga 5 tanga (me.refBy, bir marta — f.refGot). Server: 13-versiya.
import { refreshCoins } from "./coins";
import { api } from "./api";
import { BOT_LINK } from "./config";
import { store } from "./store";
import { startGo } from "./tg";

export { REF_INVITER, REF_FRIEND } from "./coins"; // 3-paket: tanga serverda (coin_rules.ref)
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

/** bosh sahifa ochilganda (serverdan ma'lumot tiklangach): do'stlar uchun mukofot va yangi o'quvchining o'z mukofoti → xabar yoki "" */
let claimed = false; // bir sessiyada bir marta (bosh sahifa bir necha marta ochilishi mumkin)
export async function claimRef(me: { refNew?: number; refBy?: boolean }) {
  if (claimed) return "";
  claimed = true;
  const msgs: string[] = [];
  // 3-paket: mukofot serverda yoziladi (refFriend — bir marta, refClaim — har yangi tasdiqlangan do'st uchun)
  if (me.refBy && !store.get("f.refGot2", 0)) {
    try {
      const r = await api<{ coins: number }>("refFriend", {});
      store.set("f.refGot2", 1);
      if (r.coins > 0) msgs.push(`Do'stingiz taklifi bilan keldingiz — +${r.coins} tanga`);
    } catch { /* keyingi safar */ }
  }
  if ((me.refNew || 0) > 0) {
    try {
      const r = await api<{ n: number; coins?: number }>("refClaim", { n: me.refNew });
      if (r.n > 0) { const c = r.coins || 0; msgs.push(r.n > 1 ? `${r.n} ta do'stingiz qo'shildi${c ? ` — +${c} tanga` : ""}` : `Do'stingiz qo'shildi${c ? ` — +${c} tanga` : ""}`); }
    } catch { /* keyingi safar */ }
  }
  if (msgs.length) void refreshCoins();
  return msgs.join(" · ");
}
