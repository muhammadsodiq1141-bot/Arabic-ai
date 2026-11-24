// 24.11.2026 (api 25): ustoz bahosi — sinov rejimi (demo.ts dan). ?demo=approved — o'quvchi: «Baholar → Ustoz izohlari»
// (subMine, subSeen, me.marksNew; ?mk=0 — bo'sh holat). Ustoz (?demo=teacher) ro'yxati demo.ts da (teacherDemo → subList).
// Sinov uchun: window.__seen — subSeen'ga borgan id lar, window.__sub — oxirgi subSend, window.__sg — subGrade so'rovlari.
// 24.11.2026 (api 27, U3 qayta yozish): javob 60 — ustoz va o'quvchi rejimlari orasida UMUMIY (localStorage «demo.u3»): ustoz qayta yozishni
// so'raydi (subGrade redo) → o'quvchida «Qayta yozing» → subRedo → ustozda 2-urinish va «Oldingi urinish» → … → 3-urinishda faqat baho.
// O'quvchida 60 faqat ustoz unga tegingandan keyin chiqadi (part A sinovi o'zgarmasin). window.__redo — oxirgi subRedo.
const iso = (minAgo: number) => new Date(Date.now() - minAgo * 6e4).toISOString();
const q = new URLSearchParams(location.search);
type W = { __seen?: number[]; __sub?: unknown; __subs?: unknown[]; __redo?: unknown };
const w = window as unknown as W;
type R = Record<string, unknown>;

const mine: R[] = q.get("mk") === "0" ? [] : [
  { id: 51, lesson: "read:a2:3", step: "read", item: 2, created_at: iso(60 * 5), graded_at: iso(40), grade: 4, audio: true, title: "A2 · 3-vahda · Xulosa",
    text: "Xulosa · AI bahosi 8/10 (mazmun 4/4, til 2/3, ravonlik 2/3). Asosiy fikr bor: Omir ish qidiryapti.",
    comment: "Asosiy fikrlar to'liq · سَيَّارَةٌ — muannas, demak هٰذِهِ", praise: "Asosiy fikrlar to'liq", fix: "سَيَّارَةٌ — muannas, demak هٰذِهِ",
    tags: ["Grammatika"], t_audio: true, t_sec: 18, ai: { k: "sum", total: 8, content: 4, language: 2, fluency: 2 }, seen_at: null },
  { id: 50, lesson: "a1:4", step: "yozish", item: 10, created_at: iso(60 * 26), graded_at: iso(60 * 20), grade: 5, audio: false, title: null,
    text: "أَنَا طَالِبٌ فِي الْجَامِعَةِ. أَعْمَلُ مِنَ الصَّبَاحِ حَتَّى الْمَسَاءِ.", comment: "Mazmun to'liq va aniq", praise: "Mazmun to'liq va aniq", fix: null,
    tags: null, t_audio: false, t_sec: null, ai: null, seen_at: null },
  { id: 49, lesson: "a2:3", step: "oqish1", item: 4, created_at: iso(30), graded_at: null, grade: null, comment: null, audio: true, title: "A2 · 3-vahda · Oʻqish",
    text: "1) لِماذا يَبْحَثُ عامِرٌ عَنْ شَقَّةٍ؟\n— لِأَنَّهُ يَعْمَلُ فِي الْمَدِينَةِ · AI: To'g'ri\n2) كَمْ غُرْفَةً في الشَّقَّةِ؟\n— غُرْفَتانِ · AI: Qisman to'g'ri (sonni to'liq ayting)",
    ai: { k: "q", ok: 1, part: 1, no: 0, n: 2 }, seen_at: null },
  { id: 47, lesson: "a1:3", step: "suhbat", item: 5, created_at: iso(60 * 24 * 4), graded_at: iso(60 * 24 * 3), grade: 3, audio: false, // eski (v2) baho — faqat izoh
    text: "هَذَا بَيْتِي. هُوَ كَبِيرٌ.", comment: "Harakatlarga e'tibor bering", seen_at: iso(60 * 24 * 3) },
];

// ===== U3: umumiy javob 60 =====
const KEY = "demo.u3";
const U3_0 = (): R => ({ id: 60, lesson: "a2:4", step: "yozish", item: 3, title: "A2 · 4-vahda · Yozish", text: "هَذَا سَيَّارَةٌ جَدِيدَةٌ. أَنَا أَسْكُنُ فِي الْمَدِينَةِ.",
  created_at: iso(45), graded_at: null, grade: null, comment: null, audio: false, praise: null, fix: null, tags: null, t_audio: false, t_sec: null,
  ai: null, seen_at: null, attempt: 1, redo: null, tries: [], touched: false, name: "Aziz Karimov", login: "MJ-48213" });
function u3(): R { try { const v = localStorage.getItem(KEY); if (v) return JSON.parse(v) as R; } catch { /* */ } return U3_0(); }
function u3Set(x: R) { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* */ } }
/** ustoz ro'yxati uchun */
export const u3Teacher = (): R => { const { touched: _t, ...x } = u3(); void _t; return x; };
/** ustoz bahosi yoki qayta yozish so'rovi (server 27 qoidalari bilan) */
export function u3Grade(p: R): R {
  const x = u3(), n = Number(x.attempt) || 1;
  if (p.redo === true && n >= 3) throw new Error("3-urinish — endi faqat baho qo'yiladi");
  const fix = String(p.fix || ""), praise = String(p.praise || "");
  if (p.redo === true && !fix && !p.audio && !(x.t_audio && p.voice !== "del")) throw new Error("Avval bitta tuzatishni yozing yoki ovozli izoh qoldiring");
  const t_audio = p.audio ? true : p.voice === "del" ? false : x.t_audio;
  Object.assign(x, { grade: p.redo === true ? null : Number(p.grade), redo: p.redo === true ? "asked" : null, praise: praise || null, fix: fix || null,
    tags: (p.tags as string[] | undefined)?.length ? p.tags : null, t_audio, t_sec: p.audio ? Number(p.t_sec) || 1 : t_audio ? x.t_sec : null,
    comment: [praise, fix].filter(Boolean).join(" · ") || null, graded_at: new Date().toISOString(), seen_at: null, touched: true });
  u3Set(x);
  return { ok: true, coins: 0, t_audio: !!p.audio, ...(p.redo === true ? { redo: true, attempt: n } : {}) };
}
const mineAll = () => { const x = u3(); return x.touched ? [x, ...mine] : mine; };

const isNew = (x: R) => (x.grade !== null || x.redo === "asked") && !x.seen_at;
export const subsNew = () => mineAll().filter(isNew).length;

export function subsDemo(action: string, p: R): R | null {
  if (action === "subMine") return { ok: true, ready: true, items: mineAll().map((x) => { const { touched: _t, name: _n, login: _l, ...y } = x; void _t; void _n; void _l; return { ...y }; }) };
  if (action === "subSeen") {
    const ids = ((p.ids as number[]) || []).map(Number);
    w.__seen = [...(w.__seen || []), ...ids];
    let n = 0;
    for (const x of mine) if (ids.includes(x.id as number) && isNew(x)) { x.seen_at = new Date().toISOString(); n++; }
    const u = u3();
    if (ids.includes(60) && u.touched && isNew(u)) { u.seen_at = new Date().toISOString(); u3Set(u); n++; }
    return { ok: true, n };
  }
  if (action === "subRedo") {
    const x = u3();
    w.__redo = { ...p, audio: p.audio ? `<${String(p.audio).length} belgi>` : undefined };
    if (Number(p.id) !== 60 || x.redo !== "asked") throw new Error("Ustoz bu javobni qayta yozishni so'ramagan");
    const text = String(p.text || "").trim() || "🎙 Ovozli javob";
    if (text.length < 2 && !p.audio) throw new Error("Tuzatilgan javobni yozing yoki ovoz bilan ayting");
    const cur = { n: Number(x.attempt) || 1, text: x.text, audio: !!x.audio, praise: x.praise ?? null, fix: x.fix ?? null, tags: x.tags ?? null, t_audio: !!x.t_audio, t_sec: x.t_sec ?? null, at: x.created_at };
    const n = (Number(x.attempt) || 1) + 1;
    Object.assign(x, { text, audio: !!p.audio, created_at: new Date().toISOString(), grade: null, comment: null, graded_at: null, praise: null, fix: null, tags: null,
      t_audio: false, t_sec: null, seen_at: null, redo: null, attempt: n, tries: [...((x.tries as unknown[]) || []), cur].slice(-2) });
    u3Set(x);
    return { ok: true, attempt: n, audio: !!p.audio };
  }
  if (action === "subSend") { w.__sub = p; w.__subs = [...(w.__subs || []), p]; return { ok: true, audio: !!p.audio }; }
  return null;
}
