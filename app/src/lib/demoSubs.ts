// 24.11.2026 (api 25): ustoz bahosi — sinov rejimi (demo.ts dan). ?demo=approved — o'quvchi: «Baholar → Ustoz izohlari»
// (subMine, subSeen, me.marksNew; ?mk=0 — bo'sh holat). Ustoz (?demo=teacher) ro'yxati demo.ts da (teacherDemo → subList).
// Sinov uchun: window.__seen — subSeen'ga borgan id lar, window.__sub — oxirgi subSend, window.__sg — subGrade so'rovlari.
const iso = (minAgo: number) => new Date(Date.now() - minAgo * 6e4).toISOString();
const q = new URLSearchParams(location.search);
type W = { __seen?: number[]; __sub?: unknown; __subs?: unknown[] };
const w = window as unknown as W;

const mine: Record<string, unknown>[] = q.get("mk") === "0" ? [] : [
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
const isNew = (x: Record<string, unknown>) => x.grade !== null && !x.seen_at;
export const subsNew = () => mine.filter(isNew).length;

export function subsDemo(action: string, p: Record<string, unknown>): Record<string, unknown> | null {
  if (action === "subMine") return { ok: true, ready: true, items: mine.map((x) => ({ ...x })) };
  if (action === "subSeen") {
    const ids = ((p.ids as number[]) || []).map(Number);
    w.__seen = [...(w.__seen || []), ...ids];
    let n = 0;
    for (const x of mine) if (ids.includes(x.id as number) && isNew(x)) { x.seen_at = new Date().toISOString(); n++; }
    return { ok: true, n };
  }
  if (action === "subSend") { w.__sub = p; w.__subs = [...(w.__subs || []), p]; return { ok: true, audio: !!p.audio }; }
  return null;
}
