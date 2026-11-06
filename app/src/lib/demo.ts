// Sinov rejimi: faqat shu kompyuterda (localhost) va manzilda ?demo=... bo'lsa ishlaydi. Serverga umuman murojaat qilmaydi,
// hamma ma'lumot soxta. Haqiqiy saytda (github.io) yoqilmaydi.
const q = new URLSearchParams(location.search);
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
export const DEMO: string | null = local ? q.get("demo") : null; // pending | rejected | approved | admin | new | teacher

let demoRef = 2; // ?rd=1 — mukofoti olinmagan do'stlar (refClaim kamaytiradi)
const people = [
  { sid: "tg101", name: "Aziz Karimov", tgName: "Aziz", user: "aziz_k", level: "A1", group: { code: "K7QX2M", title: "A1-ertalab", teacher: "Domla" }, at: new Date(Date.now() - 5 * 6e4).toISOString(), seen: null },
  { sid: "tg102", name: "Zarina Saidova", tgName: "Zarina", user: "", level: "A0", group: null, at: new Date(Date.now() - 36e5).toISOString(), seen: null, ref: "Aziz Karimov · MJ-48213" },
  { sid: "tg103", name: "Bekzod Toshev", tgName: "Bek", user: "bek_t", level: "A2", group: { code: "P4WZ8N", title: "A2-kechki", teacher: "Malika" }, at: new Date(Date.now() - 864e5).toISOString(), seen: null },
  { sid: "tg104", name: "Madina Yusupova", tgName: "Madina", user: "madina_y", level: "A1", group: { code: "K7QX2M", title: "A1-ertalab", teacher: "Domla" }, at: new Date(Date.now() - 2 * 864e5).toISOString(), seen: null },
];

export async function demoApi(action: string, p: Record<string, unknown>): Promise<Record<string, unknown>> {
  await new Promise((r) => setTimeout(r, 250));
  const admin = DEMO === "admin";
  const teacher = DEMO === "teacher";
  if (action === "me" && teacher) {
    return {
      ok: true, id: "tg201", name: "Malika", full_name: "Malika Rahimova", login: "MJ-20017", level: "C1", tg: 201, admin: false, access: "approved",
      group: { code: "K7QX2M", title: "A1-ertalab", teacher: true }, teacher: true,
      myGroups: [{ code: "K7QX2M", title: "A1-ertalab" }, { code: "P4WZ8N", title: "A2-kechki" }],
    };
  }
  if (teacher || (admin && ["groupMembers", "subList", "hwList", "hwStatus", "groupKick", "groupDelete"].includes(action))) { const t = teacherDemo(action, p); if (t) return t; }
  const pr = profileDemo(action, p, admin); if (pr) return pr;
  if (action === "me") {
    if (DEMO === "new") return { ok: true, id: "tg101", name: "Aziz", full_name: null, login: null, level: null, group: null, admin: false, access: "pending" };
    return {
      ok: true, id: "tg101", name: "Aziz", full_name: admin ? "Bosh admin" : "Aziz Karimov", login: admin ? "MJ-10001" : "MJ-48213", level: "A1",
      group: admin ? null : dGroup, admin, tg: 101, teacherReq: dReq,
      access: admin ? "approved" : DEMO === "rejected" ? "rejected" : DEMO === "approved" ? "approved" : "pending",
      ...(q.get("rd") === "1" ? { refNew: 2, refBy: true } : {}),
    };
  }
  if (action === "register") return { ok: true, login: "MJ-48213", pin: "305917" };
  if (action === "load") {
    const d = new Date(), k = (n: number) => { const x = new Date(d); x.setDate(d.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
    return { ok: true, data: {
      "x.t": "1240", "x.s": "18", "a1.book": '"a1"',
      "a1.days": JSON.stringify({ [k(0)]: 3, [k(1)]: 2, [k(2)]: 5, [k(3)]: 1 }),
      "x.d": JSON.stringify({ [k(0)]: 40, [k(1)]: 55 }),
      "a1.known.1": JSON.stringify(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`s${i}`, 1]))),
      "a1.known.4": JSON.stringify({ "مُوَظَّفٌ": 1, "أَرْضٌ": 1, "فَلَّاحٌ": 1, "عُطْلَةٌ": 1, "حَلَّاقٌ": 1, "شَرِكَةٌ": 1, "دُكَّانٌ": 1, "فُنْدُقٌ": 1, "رَاتِبٌ": 1, "أَزُورُ": 1, "أَقِفُ": 1, "أَرْكَبُ": 1 }),
      "a1.tests": JSON.stringify({ 4: 70 }),
    } };
  }
  if (action === "hwList") return { ok: true, items: [{ id: 7, group_code: "K7QX2M", book: "a1", unit: 4, title: "Kasblar va ishlar", due: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), mine: null, teacher: false }] };
  if (action === "leaderboard") {
    // soxta reyting: haftalik yoki umumiy, guruh yoki butun markaz, daraja bo'yicha filtr (server 12-versiya javobi shaklida)
    const all = p.period === "all";
    const names = ["Madina Y.", "Bekzod T.", "Aziz K.", "Dilnoza R.", "Javohir M.", "Sardor A.", "Nilufar S.", "Otabek U.", "Shahzoda B.", "Jasur N.", "Kamola H.", "Ulug'bek D.", "Mohira E.", "Sanjar O."];
    const lv = ["A1", "A2", "A1", "A1", "B1", "A1", "A2", "A0", "A1", "A1", "B1", "A1", "A2", "A1"];
    let rows = names.map((n, i) => ({ n, x: Math.round((all ? 2600 : 160) * Math.pow(0.86, i)), me: n === "Aziz K.", lvl: lv[i] }));
    if (p.level) rows = rows.filter((r) => r.lvl === p.level);
    if (p.scope === "group") rows = rows.filter((_, i) => i % 3 !== 1);
    const k = rows.findIndex((r) => r.me);
    return { ok: true, week: p.week, period: all ? "all" : "week", level: p.level || null, top: rows, me: k >= 0 ? { rank: k + 1, x: rows[k].x } : null, group: p.scope === "group" ? "K7QX2M" : null };
  }
  // 14-partiya: do'stni taklif qilish (?demo=approved&rd=1 — 2 ta do'st tasdiqlangan, mukofot kutilmoqda)
  if (action === "refList") return { ok: true, items: [{ n: "Bekzod T.", st: "approved", at: null }, { n: "Zarina S.", st: "pending", at: null }, { n: "Madina Y.", st: "approved", at: null }] };
  if (action === "refClaim") { const n = Math.min(Number(p.n) || 0, demoRef); demoRef -= n; return { ok: true, n }; }
  if (action === "adminRequests") return { ok: true, status: p.status || "pending", items: p.status === "rejected" ? people.slice(3) : people.slice(0, 3) };
  if (action === "adminApprove") return { ok: true, n: Array.isArray(p.sids) ? p.sids.length : 1 };
  if (action === "kitobAudio") return { ok: true, urls: {} }; // kitob audiosi yo'q — ovoz tts omboridan yoki telefondan
  if (action === "tts") throw new Error("demo: server ovozi yo'q"); // telefonning o'z ovoziga o'tadi
  if (action === "subSend") return { ok: true, id: 1 };
  if (action.startsWith("duel")) return duelDemo(action, p);
  return { ok: true }; // sync va boshqalar
}

// ===== Ustoz rejimi (?demo=teacher): guruh o'quvchilari, javoblar, vazifalar =====
const iso = (minAgo: number) => new Date(Date.now() - minAgo * 6e4).toISOString();
const day = (n: number) => { const x = new Date(); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const sum = (o: Record<string, unknown>) => ({ v: 1, at: iso(30), book: "a1", mlt: 0, sh: 0, ...o });
const MEM: Record<string, unknown>[] = [
  { name: "Aziz", full_name: "Aziz Karimov", login: "MJ-48213", level: "A1", username: "aziz_k", last_seen: iso(20), kid: "k1", xp: 95,
    sum: sum({ streak: 4, xpw: 95, xpt: 40, days: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 5, 2, 3], books: { a1: [42, 302] }, test: 70, kb: { "a1:4": [2, 10, 92] } }) },
  { name: "Madina", full_name: "Madina Yusupova", login: "MJ-48877", level: "A1", username: "madina_y", last_seen: iso(200), kid: "k2", xp: 160,
    sum: sum({ streak: 9, xpw: 160, xpt: 25, days: [1, 2, 1, 3, 2, 0, 1, 2, 3, 2, 4, 2, 3, 1], books: { a1: [118, 302] }, test: 88, kb: { "a1:3": [10, 10, 95], "a1:4": [6, 10, 81] } }) },
  { name: "Dilnoza", full_name: "Dilnoza Rahmonova", login: "MJ-49002", level: "A1", username: "", last_seen: iso(60 * 26), kid: "k3", xp: 102,
    sum: sum({ streak: 0, xpw: 102, xpt: 0, days: [0, 1, 1, 0, 2, 0, 0, 1, 0, 2, 3, 1, 0, 0], books: { a1: [77, 302] }, test: 64 }) },
  { name: "Sardor", full_name: "Sardor Aliyev", login: "MJ-49110", level: "A1", username: "sardor_a", last_seen: iso(60 * 24 * 5), kid: "k4", xp: 0,
    sum: sum({ streak: 0, xpw: 0, xpt: 0, days: [1, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], books: { a1: [20, 302] }, test: null }) },
  { name: "Nilufar", full_name: "Nilufar Saidova", login: "MJ-49231", level: "A0", username: "nilu", last_seen: iso(90), kid: "k5", xp: 65,
    sum: sum({ streak: 3, xpw: 65, xpt: 15, days: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1], books: { a1: [0, 302] }, test: null, a0: { m: "2222211110000000000000000000", sp: 18 } }) },
  { name: "Otabek", full_name: "Otabek Umarov", login: "MJ-49360", level: "A1", username: "", last_seen: null, kid: "k6", xp: 0, sum: null },
];
function teacherDemo(action: string, p: Record<string, unknown>): Record<string, unknown> | null {
  if (action === "groupMembers") return { ok: true, members: p.code === "P4WZ8N" ? MEM.slice(0, 2).map((m) => ({ ...m, level: "A2" })) : MEM };
  if (action === "subList") return { ok: true, items: [
    { id: 31, lesson: "a1:4", step: "suhbat", item: 5, text: "أَنَا طَالِبٌ فِي الْجَامِعَةِ. أَعْمَلُ مِنَ الصَّبَاحِ حَتَّى الْمَسَاءِ.", created_at: iso(35), grade: null, comment: null, audio: false, name: "Aziz Karimov", login: "MJ-48213" },
    { id: 32, lesson: "a1:4", step: "yozish", item: 10, text: "🎙 Ovozli javob", created_at: iso(120), grade: null, comment: null, audio: true, name: "Madina Yusupova", login: "MJ-48877" },
    { id: 33, lesson: "a1:4", step: "lmashq2", item: 302, text: "Tushunmadim: «Lugʻat mashqlari» topshirig'ida 2 ta savolni o'tkazib yubordi (3, 7-savol).", created_at: iso(240), grade: null, comment: null, audio: false, name: "Dilnoza Rahmonova", login: "MJ-49002" },
    { id: 30, lesson: "a1:3", step: "yozish", item: 9, text: "هَذِهِ جَامِعَتِي. هِيَ كَبِيرَةٌ وَجَمِيلَةٌ.", created_at: iso(60 * 30), grade: 5, comment: "Barakalla!", audio: false, name: "Madina Yusupova", login: "MJ-48877" },
  ] };
  if (action === "subAudio") throw new Error("Sinov rejimida ovoz yo'q");
  if (action === "hwList") return { ok: true, items: [
    { id: 7, group_code: "K7QX2M", book: "a1", unit: 4, title: "Kasblar va ishlar", due: day(2), mine: null, teacher: true, stats: { total: 6, done: 2 } },
    { id: 8, group_code: "P4WZ8N", book: "a2", unit: 2, title: "", due: day(-1), mine: null, teacher: true, stats: { total: 2, done: 0 } },
  ] };
  if (action === "hwStatus") return { ok: true, rows: MEM.map((m, i) => ({ n: m.full_name, lg: m.login, done: i === 1 || i === 2, progress: i < 3 ? { words: [60, 100, 95][i], test: [70, 90, 82][i], rules: [50, 100, 80][i] } : null })) };
  if (["subGrade", "hwDelete", "groupKick", "groupDelete"].includes(action)) return { ok: true };
  if (action === "hwCreate") return { ok: true, id: 9 };
  return null;
}

// Bellashuv (soxta): DEMO01 — raqib sifatida o'ynash mumkin; QW4K7P — tugagan bellashuv
let duelDone: { score: number; time: number } | null = null;
const DQ = [
  ["مُعَلِّمٌ", ["o'qituvchi", "talaba", "shifokor", "haydovchi"], 0], ["بَيْتٌ", ["maktab", "uy", "bozor", "masjid"], 1],
  ["كِتَابٌ", ["daftar", "qalam", "kitob", "sumka"], 2], ["مَاءٌ", ["non", "choy", "sut", "suv"], 3], ["قَلَمٌ", ["qalam", "stol", "eshik", "deraza"], 0],
  ["سَيَّارَةٌ", ["poyezd", "mashina", "samolyot", "velosiped"], 1],
].map(([q, opts, ans]) => ({ q, qAr: true, opts, optsAr: false, ans }));
function duelDemo(action: string, p: Record<string, unknown>): Record<string, unknown> {
  const id = String(p.id || "").toUpperCase();
  if (action === "duelCreate") return { ok: true, id: "NEW7Q2" };
  if (action === "duelFinish") { duelDone = { score: Number(p.score) || 0, time: Number(p.time) || 0 }; return { ok: true }; }
  if (action === "duelMine") return { ok: true, items: [
    { id: "QW4K7P", mineCreator: true, c: "Aziz K.", o: "Madina Y.", cs: 8, os: 6 },
    { id: "ZX81LM", mineCreator: true, c: "Aziz K.", o: null, cs: 7, os: null },
  ] };
  if (action === "duelGet") {
    if (id === "DEMO01") return { ok: true, id, book: "a1", questions: DQ,
      creator: { n: "Bekzod T.", score: duelDone ? 4 : null, time: duelDone ? 40 : null, me: false },
      opponent: duelDone ? { n: "Aziz K.", score: duelDone.score, time: duelDone.time, me: true } : null, canPlay: !duelDone, finished: !!duelDone };
    if (id === "QW4K7P") return { ok: true, id, book: "a1", questions: DQ, creator: { n: "Aziz K.", score: 8, time: 52, me: true },
      opponent: { n: "Madina Y.", score: 6, time: 61, me: false }, canPlay: false, finished: true };
    if (id === "ZX81LM") return { ok: true, id, book: "a1", questions: DQ, creator: { n: "Aziz K.", score: 7, time: 48, me: true }, opponent: null, canPlay: false, finished: false };
    throw new Error("Bellashuv topilmadi");
  }
  return { ok: true };
}

// Profil va admin (soxta, sahifa yangilanguncha eslab qoladi): guruh, ustozlik so'rovi, yangi PIN, admin ro'yxatlari
let dGroup: { code: string; title: string; teacher: boolean } | null = { code: "K7QX2M", title: "A1-ertalab", teacher: false };
let dReq = false;
function profileDemo(action: string, p: Record<string, unknown>, admin: boolean): Record<string, unknown> | null {
  if (action === "groupJoin") {
    const code = String(p.code || "").toUpperCase();
    if (code !== "K7QX2M" && code !== "P4WZ8N") throw new Error("Bunday guruh topilmadi");
    dGroup = { code, title: code === "K7QX2M" ? "A1-ertalab" : "A2-kechki", teacher: false };
    return { ok: true, code, title: dGroup.title };
  }
  if (action === "groupLeave") { dGroup = null; return { ok: true }; }
  if (action === "teacherRequest") { dReq = true; return { ok: true, pending: true }; }
  if (action === "newPin") return { ok: true, login: "MJ-48213", pin: "482913" };
  if (!admin) return null;
  if (action === "adminOverview") return { ok: true,
    totals: { students: 148, teachers: 6, groups: 9, today: 37, week: 96, newWeek: 12, noGroup: 14, xp: 52310 },
    levels: { A0: 21, A1: 64, A2: 33, B1: 18, B2: 8, C1: 4 },
    teachers: [{ name: "Malika Rahimova", groups: 2, n: 31, week: 24, last: new Date().toISOString() }],
    groups: [
      { code: "K7QX2M", title: "A1-ertalab", teacher: "Malika Rahimova", n: 18, today: 7, week: 15, xp: 4200, words: 96 },
      { code: "P4WZ8N", title: "A2-kechki", teacher: "Malika Rahimova", n: 13, today: 4, week: 9, xp: 2900, words: 184 },
      { code: "Z9TT3K", title: "A0-alifbo", teacher: "Domla", n: 21, today: 9, week: 17, xp: 3100, words: 12 },
    ] };
  if (action === "adminTeachers") return { ok: true,
    requests: [{ id: "tg301", name: "Sardor Aliyev", login: "MJ-30112", level: "C1", at: new Date(Date.now() - 3 * 36e5).toISOString(), note: "Markazda A1 guruhini o'qitaman" }],
    teachers: [{ id: "tg201", name: "Malika Rahimova", login: "MJ-20017", level: "C1", at: null, note: "", byGroup: false }, { id: "tg202", name: "Domla", login: "MJ-20005", level: "C1", at: null, note: "", byGroup: true }] };
  if (action === "adminSetTeacher") return { ok: true };
  if (action === "adminUsers") return { ok: true, users: people.map((x, i) => ({
    tg: 101 + i, name: x.tgName, full: x.name, user: x.user, level: x.level, group: x.group?.title || "", teacher: false, seen: x.at, at: x.at, words: [96, 12, 184, 41][i] ?? null })) };
  if (action === "kitobCount") return { ok: true, n: 1240 };
  if (action === "kitobPut") return { ok: true, up: Array.isArray(p.files) ? p.files.length : 0, skip: 0, bad: 0 };
  return null;
}
