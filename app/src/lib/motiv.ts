// Motivatsiya (eski ilova, MOTIVATSIYA-SPEC): unvonlar (XP darajalari), 12 nishon, kunlik maqsad va vazifalar, tanga (x.s) va muzlatish,
// yutuq va ustozga hisobot matnlari. Kalitlar eski ilova bilan bir xil: x.t, x.d, x.c.<sana>, x.cl.<sana>, x.w.<dushanba>, x.s, x.f, x.fz, x.fchk, x.goal.
// Tasdiqlangan farqlar: XP = «yulduzcha», ⭐ (x.s) = «tanga»; darajalar «unvon» deb ataladi; unvon yoki nishon olinganda bir martalik tabrik
// (yangi kalitlar f.lvl, f.bdg); «A'lochi» — istalgan kitob testi; seriya hamma joyda muzlatish bilan; muzlatish ikki bosish bilan olinadi.
import { bkKey, dayKey, localRaw, streak, summarize, weekId } from "./progress";
import { dailyTasks, scheduleSync, store } from "./store";

/** [yulduzchadan, nomi, arabchasi] — LEVELS.json bilan aynan (nomlardagi apostrof oddiy ') */
export const UNVON: [number, string, string][] = [[0, "Mubtadi'", "مُبْتَدِئ"], [300, "Tolib", "طَالِب"], [1000, "Doris", "دَارِس"], [2500, "Bohis", "بَاحِث"], [5000, "Mohir", "مَاهِر"], [10000, "Miyzan", "مِيزَان"]];
export type Unvon = { i: number; name: string; ar: string; from: number; next: number | null; nextName: string | null };
export function levelOf(x: number): Unvon {
  let i = 0;
  for (let k = 0; k < UNVON.length; k++) if (x >= UNVON[k][0]) i = k;
  const nx = UNVON[i + 1];
  return { i, name: UNVON[i][1], ar: UNVON[i][2], from: UNVON[i][0], next: nx ? nx[0] : null, nextName: nx ? nx[1] : null };
}

export const xpTotal = () => store.get("x.t", 0);
export const xpToday = () => store.get<Record<string, number>>("x.d", {})[dayKey()] || 0;
export const tanga = () => store.get("x.s", 0);
export const freezes = () => store.get("x.f", 0);
export const goalXP = () => store.get("x.goal", 50);
export const GOALS: [number, string][] = [[30, "Yengil"], [50, "Oddiy"], [100, "Jiddiy"]];
/** seriya — muzlatilgan kunlar bilan */
export const streakNow = () => streak(store.get("a1.days", {}), store.get("x.fz", []));

// ===== kunlik vazifalar (ro'yxat store.ts dailyTasks — eski bilan bir xil; tanga gain() ichida beriladi) =====
export const TASKS: Record<string, { t: string; n: number; st: number }> = {
  lesson: { t: "Bugungi darsni tugating", n: 1, st: 2 },
  fc: { t: "10 ta so'zni to'g'ri yozing", n: 10, st: 1 },
  game: { t: "Bitta o'yinni oxirigacha o'ynang", n: 1, st: 1 },
  test80: { t: "Testda 80% va undan yuqori oling", n: 1, st: 2 },
  rule: { t: "Bitta qoida mashqini bajaring", n: 1, st: 1 },
  xp: { t: "Bugun 60 yulduzcha to'plang", n: 60, st: 2 },
};
export function taskVal(k: string) {
  return k === "xp" ? xpToday() : store.get<Record<string, number>>(`x.c.${dayKey()}`, {})[k] || 0;
}
/** shu hafta yulduzcha olingan kunlar (haftalik vazifa: 5 kun → 5 tanga) */
export function weekDays() {
  const D = store.get<Record<string, number>>("x.d", {});
  const w = weekId().split("-").map(Number);
  let n = 0;
  for (let i = 0; i < 7; i++) if ((D[dayKey(new Date(w[0], w[1] - 1, w[2] + i))] || 0) > 0) n++;
  return n;
}
export function todayTasks() {
  const cl = store.get<Record<string, number>>(`x.cl.${dayKey()}`, {});
  return dailyTasks().map((k) => {
    const T = TASKS[k], val = Math.min(taskVal(k), T.n);
    return { k, ...T, val, done: !!cl[k] || val >= T.n };
  });
}

// ===== muzlatish (10 tanga, ko'pi bilan 2 ta; bitta muzlatish bitta o'tkazib yuborilgan kunni yopadi) =====
export function buyFreeze(): { ok: boolean; msg: string } {
  if (freezes() >= 2) return { ok: false, msg: "Sizda 2 ta muzlatish bor — bu eng ko'pi" };
  if (tanga() < 10) return { ok: false, msg: "Muzlatish uchun 10 tanga kerak. Vazifalarni bajaring!" };
  store.set("x.s", tanga() - 10);
  store.set("x.f", freezes() + 1);
  scheduleSync();
  return { ok: true, msg: "Muzlatish olindi. Bir kun qoldirsangiz ham ketma-ketlik saqlanadi" };
}
/** kuniga bir marta (x.fchk): kecha faol emas, oldingi kun faol yoki muzlatilgan va muzlatish bor → kecha muzlatiladi */
export function applyFreeze(): boolean {
  const t = dayKey();
  if (store.get("x.fchk", "") === t) return false;
  store.set("x.fchk", t);
  const L = store.get<Record<string, number>>("a1.days", {}), fz = store.get<string[]>("x.fz", []);
  const sh = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return dayKey(d); };
  const y = sh(-1), y2 = sh(-2);
  if (!L[y] && !fz.includes(y) && (L[y2] || fz.includes(y2)) && freezes() > 0) {
    fz.push(y);
    store.set("x.fz", fz.slice(-30));
    store.set("x.f", freezes() - 1);
    scheduleSync();
    return true;
  }
  return false;
}

// ===== 17-partiya (M11; TMLT 12-bob — almashinadigan nishonlar): oy marafoni — har oy yangi nishon, shu oyda 20 kun mashq =====
export const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const SEASON = ["❄️", "❄️", "🌱", "🌱", "🌸", "☀️", "☀️", "☀️", "🍂", "🍂", "🍂", "❄️"];
export const MONTH_GOAL = 20;
export function monthDays(ym = dayKey().slice(0, 7)) {
  const D = store.get<Record<string, number>>("a1.days", {});
  return Object.keys(D).filter((k) => k.startsWith(ym) && D[k]).length;
}
export function monthBadge(ym = dayKey().slice(0, 7)): Badge & { n: number } {
  const m = Number(ym.slice(5, 7)) - 1, n = monthDays(ym);
  return { id: `m${ym}`, e: SEASON[m] || "🗓️", t: `${MONTHS[m]} marafoni`, d: `${MONTHS[m]} oyida ${MONTH_GOAL} kun mashq · ${Math.min(n, MONTH_GOAL)}/${MONTH_GOAL}`, ok: n >= MONTH_GOAL, n };
}

// ===== 12 nishon (har safar mavjud kalitlardan hisoblanadi; emoji — 3D rasm sifatida chiziladi) =====
const BOOK_IDS = ["a1", "a2", "b1", "b2", "c1", "md1", "md2"];
export type Badge = { id: string; e: string; t: string; d: string; ok: boolean };
export function knownTotal() { return summarize(localRaw()).known; }
export function badges(hasGroup: boolean): Badge[] {
  const D = store.get<Record<string, number>>("a1.days", {});
  const x = xpTotal(), sk = streakNow(), kn = knownTotal();
  const t100 = BOOK_IDS.some((b) => Object.values(store.get<Record<string, number>>(bkKey(b, "tests"), {})).some((v) => v >= 100));
  return [
    { id: "first", e: "🎯", t: "Birinchi qadam", d: "Birinchi yulduzcha", ok: x > 0 },
    { id: "week", e: "🔥", t: "Bir hafta", d: "7 kun ketma-ket", ok: sk >= 7 },
    { id: "w100", e: "📚", t: "Yuz so'z", d: "100 ta so'z yodlandi", ok: kn >= 100 },
    { id: "xp1000", e: "⚡", t: "Ming yulduzcha", d: "1000 yulduzcha to'plandi", ok: x >= 1000 },
    { id: "duel", e: "🏆", t: "G'olib", d: "Bellashuvda yutdi", ok: store.get("f.duelwins", 0) > 0 },
    { id: "err", e: "🧠", t: "Xato ovchisi", d: "10 ta xato tuzatildi", ok: store.get("f.errfix", 0) >= 10 },
    { id: "cert", e: "🎓", t: "Sertifikat", d: "Daraja testi topshirildi", ok: !!store.get("f.cert", null) },
    { id: "night", e: "🌙", t: "Tungi qushcha", d: "Uyqudan oldin takrorladi", ok: !!store.get("f.night", 0) },
    { id: "kw", e: "🎉", t: "Tanish so'zlar", d: "30 ta tanish so'z topildi", ok: Object.keys(store.get<Record<string, unknown>>("f.kw", {})).length >= 30 },
    { id: "group", e: "👥", t: "Jamoa", d: "Guruhga qo'shildi", ok: hasGroup },
    { id: "t100", e: "💯", t: "A'lochi", d: "Testda 100%", ok: t100 },
    { id: "month", e: "🗓️", t: "Oy davomida", d: "30 kun mashq", ok: Object.keys(D).length >= 30 },
    // 17-partiya (M11): joriy oy marafoni va oldingi oylarda olinganlari
    monthBadge(),
    ...[...new Set(Object.keys(D).map((k) => k.slice(0, 7)))].filter((ym) => ym !== dayKey().slice(0, 7)).sort().reverse()
      .map((ym) => monthBadge(ym)).filter((b) => b.ok).map((b) => ({ ...b, t: `${b.t} · ${b.id.slice(1, 5)}` })),
  ];
}

// ===== bir martalik tabrik: f.lvl — tabriklangan eng yuqori unvon, f.bdg — tabriklangan nishonlar =====
export type Cele = { lvl: Unvon | null; bdg: Badge[] };
/** yangi unvon yoki nishon bo'lsa — tabrik; kalitlar hali yo'q bo'lsa (birinchi tekshiruv) jimgina joriy holat yoziladi */
export function pendingCele(hasGroup: boolean): Cele | null {
  const L = levelOf(xpTotal());
  const got = badges(hasGroup).filter((b) => b.ok);
  const seenL = store.get<number | null>("f.lvl", null), seenB = store.get<string[] | null>("f.bdg", null);
  if (seenL === null || seenB === null) { store.set("f.lvl", L.i); store.set("f.bdg", got.map((b) => b.id)); return null; }
  const nb = got.filter((b) => !seenB.includes(b.id));
  const up = L.i > seenL;
  if (!up && !nb.length) return null;
  store.set("f.lvl", Math.max(seenL, L.i));
  store.set("f.bdg", [...new Set([...seenB, ...nb.map((b) => b.id)])]);
  scheduleSync();
  return { lvl: up ? L : null, bdg: nb };
}

// ===== Telegram matnlari (emoji — xabar matnida qoladi, foydalanuvchi qarori) =====
export function shareText() {
  return `Men Miyzan ilovasida arab tilini o'rganyapman: ${streakNow()} kun ketma-ket 🔥, ${knownTotal()} ta so'z, ${xpTotal()} yulduzcha. Sen ham qo'shil! 👇`;
}
type Sum = { streak?: number; xpw?: number; days?: number[]; books?: Record<string, [number, number]>; mlt?: number; test?: number | null };
export function reportText(s: Sum, name: string, login: string, bookName: (id: string) => string) {
  const bl = Object.entries(s.books || {}).map(([id, v]) => `• ${bookName(id)}: ${v[0]}/${v[1]} so'z`).join("\n");
  const act = (s.days || []).slice(-7).filter((x) => x > 0).length;
  return `📊 Miyzan hisobot\n👤 ${name}${login ? ` (${login})` : ""}\n🔥 Ketma-ket: ${s.streak || 0} kun · oxirgi 7 kunda ${act} kun faol\n⚡ Shu hafta: ${s.xpw || 0} yulduzcha\n`
    + bl + (s.test != null ? `\n🎯 Testlar o'rtachasi: ${s.test}%` : "") + `\n🎬 Ko'rilgan multfilm: ${s.mlt || 0}`;
}
