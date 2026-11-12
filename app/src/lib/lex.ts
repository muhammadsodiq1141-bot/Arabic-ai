// 2-paket (20-partiya): o'qishda yordam — matndagi so'zni umumiy lug'atdan topish (LEX.json, yig'ishda kitoblardan yasaladi)
// va «siz bilgan so'zlar» foizi. Nation: 98% — ravon o'qish, 95% — lug'at bilan o'qisa bo'ladi, undan kam — qiyin.
// Lug'atda topilmagan so'zlar (ismlar, kam uchraydigan so'zlar, fe'lning boshqa zamoni) foizga kirmaydi — shuning uchun «~».
import { useEffect, useState } from "react";
import { loadData } from "./data";
import { bkKey } from "./progress";
import { store } from "./store";

export type LexE = { ar: string; uz: string; b: string; u: number; k: number };
type Raw = [string, string, string, number, number][];

const HAR = /[ً-ْٰـ]/g;
/** solishtirish kaliti: harakatsiz, alif va alif maqsura bir xil (ة saqlanadi — olmosh ـه bilan aralashmasin: الأُمَّةُ ≠ أُمُّهُ) */
export const nk = (s: string) => s.replace(HAR, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[ئؤ]/g, "ء") // شَيْئًا ~ شَيْءٌ
  .replace(/[^ء-ي ]/g, "").replace(/\s+/g, " ").trim();

/** kitob darajasi: pastroq darajadagi so'zlar o'quvchiga tanish deb hisoblanadi */
export const RANK: Record<string, number> = { a1: 1, md1: 1, md2: 2, a2: 2, b1: 3, b2: 4, c1: 5 };
/** o'quvchining joriy kitobi darajasi (a1.book) — undan pastdagi so'zlar tanish; matn darajasi baland bo'lsa — matnniki */
export const rankFor = (b?: string) => Math.max(RANK[b || ""] || 1, RANK[store.get<string>("a1.book", "a1")] || 1);
const LVL: Record<string, string> = { a1: "A1", a2: "A2", b1: "B1", b2: "B2", c1: "C1", md1: "Madina 1", md2: "Madina 2" };
const KIND = ["", "ibora", "matndagi so'z", "qo'shimcha so'z"];
export const srcLabel = (e: LexE) => (e.b === "core" ? "Yordamchi so'z" : e.b === "qosh" ? "Qo'shimcha lug'at" : [`${LVL[e.b] || e.b} · ${e.u}-vahda`, KIND[e.k]].filter(Boolean).join(" · "));

export type Lex = { idx: Map<string, LexE[]> };
let LEX: Promise<Lex> | null = null;
export function loadLex() {
  if (!LEX) {
    LEX = loadData<Raw>("LEX").then((raw) => {
      const idx = new Map<string, LexE[]>();
      const put = (k: string, e: LexE, m = idx) => {
        if (k.length < 2) return;
        const a = m.get(k);
        if (!a) m.set(k, [e]); else if (!a.includes(e)) a.push(e);
      };
      for (const [ar, uz, b, u, k] of raw) {
        const e = { ar, uz, b, u, k };
        const n = nk(ar);
        put(n, e);
        // «يَكْتُبُ / كَتَبَ» kabi juft yozuvlar — har qismi alohida
        const parts = ar.split(/\s*[/،,]\s*/);
        if (parts.length > 1) for (const p of parts) put(nk(p), e);
      }
      return { idx };
    }).catch((e) => { LEX = null; throw e; });
  }
  return LEX;
}
export function useLex() {
  const [lex, setLex] = useState<Lex | null>(null);
  useEffect(() => {
    let on = true;
    loadLex().then((l) => { if (on) setLex(l); }).catch(() => { /* lug'atsiz ham matn o'qiladi */ });
    return () => { on = false; };
  }, []);
  return lex;
}

// old qo'shimchalar: وَ/فَ + بِـ/لِـ/كَـ/سَـ + الـ; oxirgi: olmosh, ko'plik, juftlik
const P1 = ["", "و", "ف"], P2 = ["", "ب", "ل", "ك", "س"], P3 = ["", "ال"];
const SUF = ["", "ه", "ها", "هم", "هما", "كم", "نا", "ني", "ي", "ك", "ات", "ون", "ين", "ان", "تان", "تين", "وا"];
/** kesilgandan keyin 2 harfli o'zak faqat shu so'zlar uchun (فِيهِ، مِنْهُ، مَعَنَا، وَهُوَ، أَبِي…) — aks holda لَكُمْ → كَمْ kabi xato */
const SHORT = new Set(["في", "من", "عن", "مع", "هو", "هي", "لا", "اب", "اخ", "يد", "فم", "اي", "ان", "ام", "عم", "جد", "قد", "لم", "لن", "كل"]); // 12.11: أُمِّي، عَمِّي، جَدِّي، وَقَدْ، وَلَمْ، وَلَنْ، وَكُلُّ (كم/ما qo'shilmadi: harakatsiz matnda لكم → كم, كما → ما bo'lib qolardi)
/** qidiruv nomzodlari va «narxi» (nechta qo'shimcha kesilgan) */
function cands(t: string) {
  const out = new Map<string, number>();
  const add = (x: string, cost: number) => {
    if (!(x.length >= 3 || (x.length === 2 && (!cost || SHORT.has(x))))) return;
    if (!out.has(x) || out.get(x)! > cost) out.set(x, cost);
  };
  add(t, 0);
  for (const a of P1) for (const b of P2) for (const c of P3) {
    const p = a + b + c;
    let rest: string | null = t.startsWith(p) ? t.slice(p.length) : null;
    if (rest === null && b === "ل" && c === "ال" && t.startsWith(a + "لل")) rest = t.slice(a.length + 2); // لِلطَّالِبِ
    if (rest === null || rest.length < 2) continue;
    const pc = (a ? 0.4 : 0) + (b ? 1 : 0) + (c ? 0.3 : 0); // وَ/فَ va الـ juda ko'p — «arzon»
    for (const s of SUF) {
      if (s && (!rest.endsWith(s) || rest.length - s.length < 2)) continue;
      const st = s ? rest.slice(0, -s.length) : rest, cost = pc + (s ? 1 : 0);
      add(st, cost);
      if (s === "ات") add(st + "ة", cost); // مُعَلِّمَاتٌ → مُعَلِّمَةٌ
      if (s && st.endsWith("ت")) add(st.slice(0, -1) + "ة", cost + 0.5); // سَيَّارَتِي → سَيَّارَةٌ
      if (c) add("ال" + st, cost);
    }
  }
  return out;
}

const score = (e: LexE, ctx?: { b: string; u: number }) =>
  (ctx && e.b === ctx.b ? (e.u <= ctx.u ? 0 : 1) : 10) + (e.b === "core" ? 0 : RANK[e.b] || 9) + e.k * 0.1;

// harakat va hamza bo'yicha moslik: وَكَانَ → كَانَ (كَأَنَّ emas), فَمَنْ → مَنْ (مِنْ emas)
const VOW: Record<string, string> = { "َ": "a", "ً": "a", "ُ": "u", "ٌ": "u", "ِ": "i", "ٍ": "i", "ْ": "0" }; // 0 — sukun
type Seq = { c: string; v: string; d: boolean }[];
function seq(s: string): Seq {
  const out: Seq = [];
  for (const ch of s.replace(/ى/g, "ي")) {
    if (VOW[ch]) { if (out.length) out[out.length - 1].v = VOW[ch]; }
    else if (ch === "\u0651") { if (out.length) out[out.length - 1].d = true; } // shadda
    else if (/[\u0621-\u064A]/.test(ch)) out.push({ c: ch, v: "", d: false });
  }
  return out;
}
const flat = (c: string) => (/[أإآٱ]/.test(c) ? "ا" : c === "ة" ? "ت" : /[ئؤ]/.test(c) ? "ء" : c);
/** f: 2 — harflar (hamza bilan) va harakatlar mos; 1 — faqat hamzasiz mos; 0 — harakat zid (oxirgi harf — i'rob — solishtirilmaydi).
 *  pen: shadda yoki oxirgi harakat farqi — faqat bir xil yoziladigan so'zlar orasida tanlash uchun (إِنَّ / إِنْ, أَنَّ / أَنْ, لَكَ / لَكِ) */
function fit(tok: Seq, e: Seq) {
  let best = 0, pen = 9;
  for (let o = 0; o + e.length <= tok.length; o++) {
    let exact = true, ok = true, p = 0;
    for (let i = 0; i < e.length && ok; i++) {
      const t = tok[o + i], x = e[i], last = i === e.length - 1;
      if (flat(t.c) !== flat(x.c)) { ok = false; break; }
      if (t.c !== x.c) exact = false;
      if (!last && t.v && x.v && t.v !== x.v) ok = false;
      if ((t.v || t.d) && (x.v || x.d)) {
        if (t.d !== x.d) p++;
        if (last && t.v && x.v && t.v !== x.v) p++;
      }
    }
    if (!ok) continue;
    const f = exact ? 2 : 1;
    if (f > best || (f === best && p < pen)) { best = f; pen = p; }
  }
  return { f: best, pen: best ? pen : 0 };
}

/** 12.11.2026: juft yozuv (يَكْتُبُ / كَتَبَ) — harakat har shakl bilan alohida solishtiriladi (avval butun satr bilan solishtirilib, harakatli matnda hech topilmasdi) */
const SEQ = new WeakMap<LexE, Seq[]>();
function fitE(tok: Seq, e: LexE) {
  let ss = SEQ.get(e);
  if (!ss) { ss = e.ar.split(/\s*[/،,]\s*/).filter(Boolean).map(seq); SEQ.set(e, ss); }
  let best = { f: 0, pen: 0 };
  for (const s of ss) { const r = fit(tok, s); if (r.f > best.f || (r.f === best.f && r.pen < best.pen)) best = r; }
  return best;
}

export function lookup(lex: Lex, token: string, ctx?: { b: string; u: number }): LexE | null {
  const tk = token.replace(/[^ء-ْٰـ ]/g, " ").replace(/\s+/g, " ").trim(); // 12.11: «عَامًا.» — tinish belgisi tanvinli alif tekshiruviga halaqit bermasin
  return look(lex, tk, ctx) || altLook(lex, tk, ctx);
}

/** 12.11.2026: topilmasa — ikkinchi urinish (faqat asos shakl lug'at so'ziga TO'LIQ mos kelsa; aks holda — «topilmadi»):
 *  hozirgi/kelasi zamon fe'li (أُرِيدُ، سَأَذْهَبُ → يُرِيدُ، يَذْهَبُ), muannas sifat (جَمِيلَةٌ → جَمِيلٌ), muannas ko'plik (مُعَلِّمَاتٌ → مُعَلِّمَةٌ),
 *  o'tgan zamon (ذَهَبْتُ → ذَهَبَ, faqat fe'l yozuvi), أَبُوكَ / أَخُوهُ, savol hamzasi (أَهَذَا → هَذَا).
 *  Qattiq moslik sababi: oddiy qidiruv qo'shimcha kesib, boshqa so'z topib qo'yadi (سَعِيدَةٌ → عِيدٌ, الدِّينِيَّةِ → الدَّيْنُ). */
const SUFS = new Set(SUF.filter(Boolean));
/** lug'at yozuvining qismlari (يَكْتُبُ / كَتَبَ — har biri), «ال»siz */
const parts = (e: LexE) => e.ar.split(/\s*[/،,]\s*/).map((p) => nk(p).replace(/^ال/, "")).filter((p) => p.length >= 2);
/** x so'zi e yozuviga to'liq mosmi: faqat و/ف va «ال» old qo'shimchasi; tail — olmosh qo'shimchasiga ruxsat (fe'llar uchun) */
function same(x: string, e: LexE, tail: boolean, min = 2) {
  const n = nk(x), xs = [n, n.replace(/^[وف]/, ""), n.replace(/^[وف]?ال/, "")].filter((c) => c.length >= min);
  return parts(e).some((p) => xs.some((c) => c === p || (tail && p.length >= 3 && c.startsWith(p) && SUFS.has(c.slice(p.length)))));
}
const isVerb = (e: LexE) => /\u064E$/.test(e.ar.trim()) || e.ar.includes("/") || parts(e).some((p) => p.startsWith("ي") && p.length >= 3);
/** ة bilan boshqa ma'noli so'z bo'lib qoladiganlar: كِتَابَةٌ ≠ كِتَابٌ, طَرِيقَةٌ ≠ طَرِيقٌ, قُدْرَةٌ ≠ قِدْرٌ, عَامَّةٌ ≠ عَامٌ */
const FEM_NO = new Set(["كتاب", "طريق", "قدر", "عام", "خال", "سار", "صف", "ام", "اي", "سلام"]);
/** «أَ» bilan boshlanadigan, savol hamzasi bo'lmagan so'zlar */
const Q_NO = new Set(["الا", "اما", "اذا", "ان", "انا", "او", "ام", "اي", "اين", "اذن", "اول", "اولا", "اهم", "اهل"]);

function altLook(lex: Lex, token: string, ctx?: { b: string; u: number }, deep = true): LexE | null {
  const w = token.replace(/[^\u0621-\u0652\u0670\u0640 ]/g, "").trim(); // tinish belgilari (كَثِيرَةً.) halaqit bermasin
  const tryW = (x: string, ok: (e: LexE) => boolean) => {
    if (!x || x === w || nk(x).length < 2) return null;
    const e = look(lex, x, ctx);
    return e && ok(e) ? e : null;
  };
  // hozirgi/kelasi zamon fe'li: أُرِيدُ / نُرِيدُ / تَقْلَقْ / سَأَذْهَبُ → يُرِيدُ / يَقْلَقُ / يَذْهَبُ (old harfining harakati shaxsga qarab o'zgarmaydi)
  const m = /^((?:[\u0648\u0641]\u064E?)?)(?:\u0633\u064E?)?([\u0623\u0646\u062A])(.{3,})$/.exec(w);
  let e = m ? tryW(m[1] + "\u064A" + m[3], (x) => isVerb(x) && same(m[1] + "\u064A" + m[3], x, true, 3)) : null;
  // sifatning muannasi: جَمِيلَةٌ → جَمِيلٌ (faqat aynan shu so'z, qo'shimchasiz; fe'l emas)
  if (!e) {
    const f = w.replace(/\u0629[\u064B-\u0652]*$/, "");
    const c = nk(f).replace(/^[وف]?(ال)?/, "");
    if (f !== w && c.length >= 3 && !FEM_NO.has(c)) e = tryW(f, (x) => !isVerb(x) && same(f, x, false, 3));
  }
  // o'tgan zamon: ذَهَبْتُ / أَكَلْتُ / قُلْتَ / ذَهَبْتُمْ → ذَهَبَ ... (faqat fe'l yozuvi — ذَهَبٌ «oltin» emas)
  if (!e) {
    const p = /^(.{3,}?)\u062A[\u064F\u064E\u0650]?(?:\u0645[\u0652\u064F]?|\u0646\u0651?\u064E?|\u0645\u064E\u0627)?$/.exec(w);
    if (p) e = tryW(p[1], (x) => isVerb(x) && same(p[1], x, false, 3));
  }
  // muannas ko'plik: مُعَلِّمَاتٌ → مُعَلِّمَةٌ (harakat solishtirishi «ات»ni «ة» bilan mos ko'rmaydi)
  if (!e) { const f = w.replace(/\u0627\u062A[\u064B-\u0652]*$/, "\u0629"); e = tryW(f, (x) => same(f, x, false, 3)); }
  // أَبُوكَ / أَبَا / أَخُوهُ → أَبٌ / أَخٌ (faqat olmosh qo'shimchasi bilan: أَبْوَابٌ emas)
  if (!e) { const b = /^(?:[وف])?(اب|اخ)[واي](ك|ه|ها|هم|كم|نا|ي)?$/.exec(nk(w)); if (b) e = look(lex, b[1] === "اب" ? "أَبٌ" : "أَخٌ", ctx); }
  // savol hamzasi: أَهَذَا / أَأَنْتَ / أَتَعْرِفُ → هَذَا / أَنْتَ / تَعْرِفُ (bir marta). Keyingi harf sukun yoki shaddali bo'lsa — savol emas (أَكْبَرُ، أَوَّلًا)
  if (!e && deep && /^\u0623\u064E/.test(w) && nk(w).length >= 3 && !Q_NO.has(nk(w)) && !/^\u0623\u064E.[\u0652\u0651]/.test(w)) {
    const r = w.slice(2);
    e = tryW(r, (x) => same(r, x, true)) || altLook(lex, r, ctx, false);
  }
  return e;
}

/** sinov uchun: faqat ikkinchi urinishda topilgan (asosiy qidiruv topmagan) */
export const lookupAltOnly = (lex: Lex, token: string) => (look(lex, token) ? null : altLook(lex, token));

function look(lex: Lex, token: string, ctx?: { b: string; u: number }): LexE | null {
  const t = nk(token);
  if (t.length < 2) return null;
  const ts = seq(token);
  const voc = ts.some((x) => x.v); // harakatli matnda harakati zid so'z olinmaydi: المُعَلِّمَاتُ ≠ مَعْلَمٌ
  let best: LexE | null = null, bs = Infinity;
  const cs = cands(t);
  // tanvinli alif: شَيْئًا → شَيْء, كِتَابًا → كِتَاب
  if (/\u064B\u0627$|\u0627\u064B$/.test(token) && t.endsWith("ا")) for (const [c, k] of cands(t.slice(0, -1))) if (!cs.has(c)) cs.set(c, k);
  for (const [c, cost] of cs) {
    for (const e of lex.idx.get(c) || []) {
      const { f, pen } = fitE(ts, e);
      if (voc && !f) continue;
      // tartib: avval kam kesilgani, keyin harakati mosi, keyin tanishroq daraja — الِاجْتِمَاعِيِّ → اجْتِمَاعِيٌّ, فِكْرَتُهُ → فِكْرَةٌ (كُرَةٌ emas)
      const sc = cost * 10 - f * 3 + pen * 2 + score(e, ctx) * 0.1;
      if (sc < bs) { bs = sc; best = e; }
    }
  }
  return best;
}

/** so'z o'quvchiga tanishmi: pastroq daraja, takrorlash jadvalida bor yoki «yodlangan» */
export function knownTest(rank: number) {
  const S = new Map<string, Record<string, unknown>>();
  const srs = (b: string) => { let x = S.get(b); if (!x) { x = store.get<Record<string, unknown>>(bkKey(b, "srs"), {}); S.set(b, x); } return x; };
  return (e: LexE) => {
    // yordamchi so'z (tur 4) — hamma uchun tanish; mazmunli umumiy so'z (tur 5: شَيْءٌ، أَكْثَرُ…) — A1 dan keyin
    if (e.b === "core") return e.k === 4 || rank > 1;
    if (e.b === "qosh") return e.k === 4 || rank > 1; // 12.11: ism/joy — tanish; qo'shimcha so'z — A1 dan keyin
    if ((RANK[e.b] || 9) < rank) return true;
    if (srs(e.b)[e.ar]) return true;
    return !!(store.get<Record<string, unknown>>(bkKey(e.b, `known.${e.u}`), {})[e.ar] || store.get<Record<string, unknown>>(bkKey(e.b, `xk.${e.u}`), {})[e.ar]);
  };
}
export const inSrs = (e: LexE) => !!store.get<Record<string, unknown>>(bkKey(e.b, "srs"), {})[e.ar];

export const tokensOf = (s: string) => s.split(/[\s.,،؛؟!?:«»"()[\]—–…-]+/).filter(Boolean);

export type Cover = { tot: number; hit: number; pct: number; ok: boolean; unknown: LexE[] };
/** matnlar bo'yicha qamrov: pct — lug'atda topilgan so'zlar ichida tanishlari; ok — kamida minHit qismi topilgan (aks holda foiz ko'rsatilmaydi).
 *  Multfilmda ismlar ko'p (شَرْشَبِيل، سَامِي) — u yerda 40% yetarli, kitob matnida 50% */
export function coverage(lex: Lex, texts: string[], ctx: { b: string; u: number } | undefined, rank: number, minHit = 0.5): Cover {
  const isK = knownTest(rank);
  let tot = 0, hit = 0, kn = 0;
  const unk = new Map<string, { e: LexE; n: number }>();
  for (const s of texts) for (const w of tokensOf(s)) {
    if (nk(w).length < 2) continue;
    tot++;
    const e = lookup(lex, w, ctx);
    if (!e) continue;
    hit++;
    if (isK(e)) kn++;
    else { const x = unk.get(e.ar); if (x) x.n++; else unk.set(e.ar, { e, n: 1 }); }
  }
  return { tot, hit, pct: hit ? Math.floor((kn / hit) * 100) : 0, ok: tot >= 8 && hit / tot >= minHit, unknown: [...unk.values()].sort((a, b) => b.n - a.n).map((x) => x.e) };
}
export const covLabel = (p: number) => (p >= 98 ? "oson" : p >= 95 ? "mos" : "qiyin");
