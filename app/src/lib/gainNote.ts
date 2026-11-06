// gain() xabarlari (kunlik maqsad, haftalik vazifa, +N tanga): natija ekrani ochilsa — kartaning ichida (GainNote),
// aks holda qisqa xabar (toast). MotivHost to'ldiradi; ketma-ket kelgan xabarlar (1,5 s ichida) bitta ro'yxatga qo'shiladi.
let last: { msgs: string[]; t: number; used: boolean } | null = null;

export function gainPush(msgs: string[]) {
  const now = Date.now();
  if (last && !last.used && now - last.t < 1500) last = { msgs: [...last.msgs, ...msgs], t: now, used: false };
  else last = { msgs, t: now, used: false };
}
/** natija ekrani: yangi (3 s ichidagi) xabarlarni oladi va «ko'rsatildi» deb belgilaydi (qayta chaqirilsa — o'sha ro'yxat) */
export function gainTake(): string[] {
  if (!last || Date.now() - last.t > 3000) return [];
  last.used = true;
  return last.msgs;
}
/** hali hech qayerda ko'rsatilmagan xabarlar — toast uchun; olingach «ko'rsatildi» bo'ladi */
export function gainPending(): string[] {
  if (!last || last.used) return [];
  last.used = true;
  return last.msgs;
}
