// Qoida mashqi savol generatorlari (RX.*) va ruleQs — eski ilovadan (index.html 3426–3521) aynan ko'chirilgan.
// Manba tavsifi: _mahalliy/SOZ-QOIDA-DARS-SPEC.md (§2.5, §2.8). Arabcha satrlar manbadan skript bilan olingan
// (_mahalliy/sinov/rx/build_rx.py) — qo'lda tahrirlamang, harakatlar aynan bo'lishi kerak.
import { shuffle } from "./words";

export type RQ = { q: string; opts: string[]; ans: string; why?: string };
export const RX: Record<string, () => RQ> = {};

const rnd = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
// to'g'ri javob + takrorlanmagan chalg'ituvchilar (ko'pi bilan 4 variant), oxirida aralashtiriladi
function mcq(q: string, correct: string, distractors: string[], why: string): RQ {
  const opts = [correct];
  for (const d of shuffle(distractors)) { if (opts.length >= 4) break; if (!opts.includes(d)) opts.push(d); }
  return { q, opts: shuffle(opts), ans: correct, why };
}

// ===== shaxslar, fe'llar, tuslash qo'shimchalari =====
type Per = { k: string; ar: string; uz: string };
const PER: Per[] = [
  { k: "ana", ar: "أَنَا", uz: "men" }, { k: "anta", ar: "أَنْتَ", uz: "sen (erkak)" }, { k: "anti", ar: "أَنْتِ", uz: "sen (ayol)" },
  { k: "huwa", ar: "هُوَ", uz: "u (erkak)" }, { k: "hiya", ar: "هِيَ", uz: "u (ayol)" }, { k: "nahnu", ar: "نَحْنُ", uz: "biz" },
  { k: "antuma", ar: "أَنْتُمَا", uz: "sizlar ikkingiz" }, { k: "huma_m", ar: "هُمَا", uz: "ular ikkisi (erkak)" },
  { k: "huma_f", ar: "هُمَا", uz: "ular ikkisi (ayol)" }, { k: "antum", ar: "أَنْتُمْ", uz: "sizlar (erkaklar)" },
  { k: "antunna", ar: "أَنْتُنَّ", uz: "sizlar (ayollar)" }, { k: "hum", ar: "هُمْ", uz: "ular (erkaklar)" },
  { k: "hunna", ar: "هُنَّ", uz: "ular (ayollar)" },
];
const PP = (k: string) => PER.find((p) => p.k === k)!;
const SG = ["ana", "anta", "anti", "huwa", "hiya"], PL = ["nahnu", "antuma", "huma_m", "huma_f", "antum", "antunna", "hum", "hunna"];
// b — o'tgan zamon o'zagi, pr — hozirgi zamon o'zagi (old qo'shimchasiz), im — buyruq o'zagi
type Verb = { uz: string; b: string; pr: string; im: string };
const VERBS: Verb[] = [
  { uz: "yozmoq", b: "كَتَب", pr: "كْتُب", im: "اُكْتُب" }, { uz: "bormoq", b: "ذَهَب", pr: "ذْهَب", im: "اِذْهَب" },
  { uz: "oʻtirmoq", b: "جَلَس", pr: "جْلِس", im: "اِجْلِس" }, { uz: "dars qilmoq", b: "دَرَس", pr: "دْرُس", im: "اُدْرُس" },
  { uz: "ichmoq", b: "شَرِب", pr: "شْرَب", im: "اِشْرَب" }, { uz: "ochmoq", b: "فَتَح", pr: "فْتَح", im: "اِفْتَح" },
  { uz: "yashamoq", b: "سَكَن", pr: "سْكُن", im: "اُسْكُن" }, { uz: "qaytmoq", b: "رَجَع", pr: "رْجِع", im: "اِرْجِع" },
  { uz: "tushunmoq", b: "فَهِم", pr: "فْهَم", im: "اِفْهَم" }, { uz: "ishlamoq", b: "عَمِل", pr: "عْمَل", im: "اِعْمَل" },
  { uz: "eshitmoq", b: "سَمِع", pr: "سْمَع", im: "اِسْمَع" }, { uz: "yuvmoq", b: "غَسَل", pr: "غْسِل", im: "اِغْسِل" },
];
const PAST_END: Record<string, string> = {
  ana: "ْتُ", anta: "ْتَ", anti: "ْتِ", huwa: "َ", hiya: "َتْ", nahnu: "ْنَا", antuma: "ْتُمَا", huma_m: "َا", huma_f: "َتَا", antum: "ْتُمْ",
  antunna: "ْتُنَّ", hum: "ُوا", hunna: "ْنَ",
};
const PRES_PRE: Record<string, string> = { ana: "أَ", nahnu: "نَ", huwa: "يَ", huma_m: "يَ", hum: "يَ", hunna: "يَ" };
const PRES_END: Record<string, string> = {
  anti: "ِينَ", antuma: "َانِ", huma_m: "َانِ", huma_f: "َانِ", antum: "ُونَ", hum: "ُونَ", antunna: "ْنَ", hunna: "ْنَ",
};
const past = (v: Verb, k: string) => v.b + PAST_END[k];
const pres = (v: Verb, k: string) => (PRES_PRE[k] || "تَ") + v.pr + (PRES_END[k] || "ُ");
const IMP_END: Record<string, string> = { anta: "ْ", anti: "ِي", antuma: "َا", antum: "ُوا", antunna: "ْنَ" };
const NAHY_END: Record<string, string> = { anta: "ْ", anti: "ِي", antuma: "َا", antum: "ُوا", antunna: "ْنَ" };

// tuslash savoli: kind past — o'tgan zamon, aks holda hozirgi zamon; chalg'ituvchilar — shu fe'lning boshqa shaxslari
function genConj(kind: string, set: string[]): RQ {
  const v = rnd(VERBS), k = rnd(set), p = PP(k);
  const f = kind === "past" ? past : pres; const correct = f(v, k);
  const others = PER.filter((x) => x.k !== k).map((x) => f(v, x.k)).filter((x) => x !== correct);
  const lab = p.ar + (k.startsWith("huma") ? " (" + (k === "huma_m" ? "erkak" : "ayol") + ")" : "");
  return mcq(lab + " … (" + v.uz + (kind === "past" ? ", oʻtgan zamon" : ", hozirgi zamon") + ")", correct, others,
    kind === "past" ? p.uz + " uchun oʻtgan zamon qoʻshimchasi: ـ" + PAST_END[k] : p.uz + ": " + (PRES_PRE[k] || "تَ") + "… " + (PRES_END[k] || "ُ"));
}
RX.pastSg = () => genConj("past", SG); // o'tgan zamon, birlik shaxslar
RX.pastPl = () => genConj("past", PL); // o'tgan zamon, ikkilik va ko'plik
RX.presSg = () => genConj("pres", SG); // hozirgi zamon, birlik
RX.presPl = () => genConj("pres", PL); // hozirgi zamon, ikkilik va ko'plik
// fe'l turi: moziy / muzoriy / amr
RX.verbType = () => {
  const v = rnd(VERBS), t = rnd(["past", "pres", "imp"]); const k = rnd(["huwa", "ana", "nahnu", "hiya"]);
  const form = t === "past" ? past(v, k) : t === "pres" ? pres(v, k) : v.im + "ْ";
  const lab: Record<string, string> = { past: "oʻtgan zamon (مَاضٍ)", pres: "hozirgi-kelasi (مُضَارِعٌ)", imp: "buyruq (أَمْرٌ)" };
  return mcq(form + " — bu qaysi feʼl?", lab[t], Object.values(lab), t === "pres" ? "Boshida أ / ت / ي / ن harfi bor: muzori." : t === "imp" ? "Buyruq: ا bilan boshlanib, sukun bilan tugaydi." : "Oxiri qoʻshimcha bilan tugagan: oʻtgan zamon.");
};
// kelasi zamon: سَـ + hozirgi zamon
RX.future = () => {
  const v = rnd(VERBS), k = rnd(["ana", "huwa", "hiya", "nahnu", "anta"]), p = PP(k); const c = "سَ" + pres(v, k);
  return mcq(p.ar + " … غَدًا (" + v.uz + ", kelasi zamon)", c, [past(v, k), pres(v, k), "سَ" + past(v, k), "سَوْفَ " + past(v, k)], "Kelasi zamon: سَـ yoki سَوْفَ + hozirgi zamon feʼli.");
};
// buyruq (60%) yoki qaytariq لَا (40%); savoldagi «…ga» shakli eskidagidek
RX.imperative = () => {
  const v = rnd(VERBS), k = rnd(["anta", "anti", "antuma", "antum", "antunna"]), p = PP(k); const neg = Math.random() < 0.4;
  const c = neg ? "لَا تَ" + v.pr + NAHY_END[k] : v.im + IMP_END[k];
  const others = ["anta", "anti", "antuma", "antum", "antunna"].filter((x) => x !== k).map((x) => (neg ? "لَا تَ" + v.pr + NAHY_END[x] : v.im + IMP_END[x]));
  return mcq((neg ? "Qaytariq" : "Buyruq") + ": " + p.uz + "ga «" + v.uz + (neg ? " — qilma" : "") + "»", c, others, (neg ? "لَا + muzori, oxiri: " : "Buyruq oxiri: ") + (neg ? NAHY_END[k] : IMP_END[k]) + " (" + p.uz + ")");
};
// kishilik olmoshi: birlik (5 ta savol) va ko'plik
RX.pronSg = () => { const p = rnd(PER.slice(0, 5)); return mcq("«" + p.uz + "» arabchada?", p.ar, PER.slice(0, 6).map((x) => x.ar), "Erkak va ayol uchun olmosh har xil."); };
RX.pronPl = () => { const p = rnd(PER.filter((x) => !x.k.startsWith("huma") && PL.includes(x.k))); return mcq("«" + p.uz + "» arabchada?", p.ar, PL.map((x) => PP(x).ar), "Koʻplikda ham erkak/ayol farqi bor: أنتم / أنتنّ, هم / هنّ."); };

// ===== otlar va ko'rsatish olmoshlari =====
type Noun = [string, string, string]; // [ot, jins m/f, tarjima]
const NOUNS: Noun[] = [
  ["كِتَاب", "m", "kitob"], ["قَلَم", "m", "qalam"], ["بَيْت", "m", "uy"], ["بَاب", "m", "eshik"], ["مَكْتَب", "m", "ish stoli, idora"],
  ["كُرْسِيّ", "m", "stul"], ["طَالِب", "m", "talaba"], ["مُعَلِّم", "m", "oʻqituvchi"], ["مَدْرَسَة", "f", "maktab"], ["سَيَّارَة", "f", "mashina"],
  ["غُرْفَة", "f", "xona"], ["حَقِيبَة", "f", "sumka"], ["طَالِبَة", "f", "talaba (qiz)"], ["مَدِينَة", "f", "shahar"], ["طَاوِلَة", "f", "stol"],
  ["جَامِعَة", "f", "universitet"],
];
// «bu»: ikkala tarmoqda ham tanvin bir xil (eskidagidek)
RX.demSg = () => { const n = rnd(NOUNS); return mcq("… " + n[0] + (n[1] === "m" ? "ٌ" : "ٌ") + " (" + n[2] + ")", n[1] === "m" ? "هٰذَا" : "هٰذِهِ", ["هٰذَا", "هٰذِهِ", "هٰؤُلَاءِ"], n[1] === "f" ? "ـة bilan tugagan: ayol jinsi → هٰذِهِ" : "Erkak jinsi → هٰذَا"); };
const dualOf = (n: Noun) => (n[1] === "f" ? n[0].slice(0, -1) + "تَانِ" : n[0] + "َانِ");
// ikkilik son
RX.dual = () => {
  const n = rnd(NOUNS); const c = dualOf(n); const base = n[1] === "f" ? n[0].slice(0, -1) : n[0];
  return mcq(n[0] + " (" + n[2] + ") → ikkita", c, (n[1] === "f" ? [n[0] + "َانِ", base + "َاتٌ", n[0] + "ُونَ", n[0] + "ٌ"] : [n[0] + "ُونَ", n[0] + "َاتٌ", n[0] + "ٌ", n[0] + "ِينَ"]), n[1] === "f" ? "ـة → ت, keyin ـَانِ qoʻshiladi." : "Otga ـَانِ qoʻshiladi.");
};
RX.dualDem = () => { const n = rnd(NOUNS); const c = n[1] === "m" ? "هٰذَانِ" : "هَاتَانِ"; return mcq("… " + dualOf(n) + " (" + n[2] + ", ikkita)", c, ["هٰذَانِ", "هَاتَانِ", "هٰذَا", "هٰذِهِ"], n[1] === "m" ? "Erkak ikkilik → هٰذَانِ" : "Ayol ikkilik → هَاتَانِ"); };
// to'g'ri ko'plik
const SOUND: [string, string][] = [
  ["مُعَلِّم", "m"], ["مُهَنْدِس", "m"], ["مُسَافِر", "m"], ["مُوَظَّف", "m"], ["مُدَرِّس", "m"], ["لَاعِب", "m"], ["مُعَلِّمَة", "f"],
  ["طَالِبَة", "f"], ["مُمَرِّضَة", "f"], ["مُدِيرَة", "f"], ["مُهَنْدِسَة", "f"], ["سَيَّارَة", "f"],
];
RX.soundPl = () => {
  const n = rnd(SOUND); const base = n[1] === "f" ? n[0].slice(0, -1) : n[0]; const c = n[1] === "f" ? base + "َاتٌ" : n[0] + "ُونَ";
  return mcq(n[0] + " → koʻplik", c, (n[1] === "f" ? [n[0] + "ُونَ", n[0] + "َاتٌ", base + "َانِ"] : [n[0] + "َاتٌ", n[0] + "َانِ", n[0] + "ٌ"]), n[1] === "f" ? "Ayol: ة tushib, ـَاتٌ qoʻshiladi." : "Erkak (odam): ـُونَ qoʻshiladi.");
};
// siniq ko'plik: [birlik, ko'plik]
const BROKEN: [string, string][] = [
  ["كِتَاب", "كُتُب"], ["قَلَم", "أَقْلَام"], ["بَيْت", "بُيُوت"], ["رَجُل", "رِجَال"], ["طَبِيب", "أَطِبَّاء"], ["حَقِيبَة", "حَقَائِب"],
  ["دَرْس", "دُرُوس"], ["صَدِيق", "أَصْدِقَاء"], ["وَلَد", "أَوْلَاد"], ["بِنْت", "بَنَات"], ["طَالِب", "طُلَّاب"], ["مَدِينَة", "مُدُن"],
  ["شَارِع", "شَوَارِع"], ["يَوْم", "أَيَّام"], ["سُوق", "أَسْوَاق"], ["بَاب", "أَبْوَاب"], ["قَمِيص", "قُمْصَان"], ["غُرْفَة", "غُرَف"],
];
RX.brokenPl = () => { const n = rnd(BROKEN); return mcq(n[0] + " → koʻplik", n[1], BROKEN.filter((x) => x !== n).map((x) => x[1]).concat([n[0] + "ُونَ", n[0] + "َاتٌ"]), "Siniq koʻplik: yodlab olinadi (" + n[0] + " – " + n[1] + ")."); };
// ko'plik ko'rsatish olmoshi: odamlar / jonsiz narsalar
const HUM: string[] = ["طُلَّابٌ", "مُعَلِّمُونَ", "مُهَنْدِسُونَ", "طَالِبَاتٌ", "أَطِبَّاءُ", "رِجَالٌ", "أَوْلَادٌ", "بَنَاتٌ", "مُمَرِّضَاتٌ"], NONHUM: string[] = [
  "كُتُبٌ", "بُيُوتٌ", "سَيَّارَاتٌ", "أَقْلَامٌ", "حَقَائِبُ", "مُسْتَشْفَيَاتٌ", "غُرَفٌ", "أَسْوَاقٌ",
];
RX.plDem = () => { const h = Math.random() < 0.5; const w = rnd(h ? HUM : NONHUM); return mcq("… " + w, h ? "هٰؤُلَاءِ" : "هٰذِهِ", ["هٰؤُلَاءِ", "هٰذِهِ", "هٰذَا", "هٰذَانِ"], h ? "Odamlar koʻpligi → هٰؤُلَاءِ" : "Jonsiz narsalar koʻpligi → هٰذِهِ"); };
RX.plDemPron = () => (Math.random() < 0.5 ? RX.plDem() : RX.pronPl());
// uzoqni ko'rsatish olmoshi
RX.farDem = () => {
  const opts: [string, string, Noun[] | null][] = [["هٰذَا", "ذٰلِكَ", NOUNS.filter((n) => n[1] === "m")], ["هٰذِهِ", "تِلْكَ", NOUNS.filter((n) => n[1] === "f")], ["هٰؤُلَاءِ", "أُولٰئِكَ", null]]; const o = rnd(opts);
  const noun = o[2] ? rnd(o[2])[0] + "ٌ" : rnd(HUM); return mcq("Uzoqdagi: … " + noun, o[1], ["ذٰلِكَ", "تِلْكَ", "أُولٰئِكَ", "هٰذَا"], o[0] + " → " + o[1]);
};
// egalik qo'shimchasi (ayol otda ة → ت)
const POSS: Record<string, string> = {
  ana: "ِي", anta: "ُكَ", anti: "ُكِ", huwa: "ُهُ", hiya: "ُهَا", nahnu: "ُنَا", antum: "ُكُمْ", hum: "ُهُمْ", antuma: "ُكُمَا", antunna: "ُكُنَّ",
  hunna: "ُهُنَّ",
};
RX.possessive = () => {
  const n = rnd(NOUNS.slice(0, 6).concat(NOUNS.slice(8, 13))); const k = rnd(Object.keys(POSS)); const stem = n[1] === "f" ? n[0].slice(0, -1) + "ت" : n[0];
  const c = stem + POSS[k]; const others = Object.keys(POSS).filter((x) => x !== k).map((x) => stem + POSS[x]);
  return mcq(n[0] + " (" + n[2] + ") + " + PP(k).ar + " = ?", c, others, PP(k).uz + " → ـ" + POSS[k] + (n[1] === "f" ? " (ة → ت)" : ""));
};

// ===== sifat, gap va yuklamalar =====
// ortiqlik darajasi: [sifat, أَفْعَل, tarjima]
const ADJ: [string, string, string][] = [
  ["كَبِير", "أَكْبَر", "katta"], ["صَغِير", "أَصْغَر", "kichik"], ["طَوِيل", "أَطْوَل", "uzun"], ["قَصِير", "أَقْصَر", "qisqa"],
  ["جَمِيل", "أَجْمَل", "chiroyli"], ["سَرِيع", "أَسْرَع", "tez"], ["كَثِير", "أَكْثَر", "koʻp"], ["قَرِيب", "أَقْرَب", "yaqin"],
  ["بَعِيد", "أَبْعَد", "uzoq"], ["سَهْل", "أَسْهَل", "oson"], ["ثَقِيل", "أَثْقَل", "ogʻir"], ["نَظِيف", "أَنْظَف", "toza"],
  ["قَدِيم", "أَقْدَم", "eski"], ["رَخِيص", "أَرْخَص", "arzon"],
];
RX.comparative = () => { const a = rnd(ADJ); return mcq(a[0] + " (" + a[2] + ") → «" + a[2] + "roq»", a[1] + " مِنْ", ADJ.filter((x) => x !== a).map((x) => x[1] + " مِنْ").concat([a[0] + " مِنْ", a[0] + "َةٌ مِنْ"]), "أَفْعَلُ qolipi: " + a[0] + " → " + a[1]); };
// sifat moslashuvi: [ot, to'g'ri sifat, noto'g'ri sifat, tur]
const ADJF: [string, string, string, string][] = [
  ["بَيْتٌ", "كَبِيرٌ", "كَبِيرَةٌ", "m"], ["مَدِينَةٌ", "جَمِيلَةٌ", "جَمِيلٌ", "f"], ["الطَّالِبُ", "الْمُجْتَهِدُ", "مُجْتَهِدٌ", "def"],
  ["السَّيَّارَةُ", "الْجَدِيدَةُ", "جَدِيدَةٌ", "def"], ["غُرْفَةٌ", "وَاسِعَةٌ", "وَاسِعٌ", "f"],
  ["طَالِبَتَانِ", "مُجْتَهِدَتَانِ", "مُجْتَهِدَةٌ", "dual"], ["مُعَلِّمُونَ", "نَشِيطُونَ", "نَشِيطٌ", "pl"],
  ["الْكِتَابُ", "الْمُفِيدُ", "مُفِيدٌ", "def"], ["قَلَمٌ", "أَزْرَقُ", "زَرْقَاءُ", "m"], ["الْمَدْرَسَةُ", "الْكَبِيرَةُ", "كَبِيرَةٌ", "def"],
];
RX.adjective = () => { const a = rnd(ADJF); return mcq(a[0] + " … (sifatni tanlang)", a[1], [a[2]], ({ m: "Erkak ot → erkak sifat.", f: "Ayol ot → sifatga ة qoʻshiladi.", def: "Otda الـ bor → sifatda ham الـ boʻladi.", dual: "Ikkilik ot → sifat ham ikkilik.", pl: "Koʻplik → sifat ham koʻplik." } as Record<string, string>)[a[3]]); };
// ismli gapda xabar: [mubtado, to'g'ri xabar, noto'g'ri, izoh]
const NOM: [string, string, string, string][] = [
  ["الْعَمَلُ", "صَعْبٌ", "الصَّعْبُ", "Xabarda الـ boʻlmaydi."], ["الْبَيْتُ", "كَبِيرٌ", "الْكَبِيرُ", "Xabarda الـ boʻlmaydi."],
  ["الْمَدِينَةُ", "جَمِيلَةٌ", "جَمِيلٌ", "Xabar mubtadoga jinsda moslashadi."],
  ["الطَّالِبَةُ", "نَشِيطَةٌ", "نَشِيطٌ", "Ayol mubtado → xabar ham ayol."], ["الْقَهْوَةُ", "لَذِيذَةٌ", "لَذِيذٌ", "قهوة ayol jinsida."],
  ["الدَّرْسُ", "سَهْلٌ", "سَهْلَةٌ", "درس erkak jinsida."], ["الطَّقْسُ", "حَارٌّ", "الْحَارُّ", "Xabarda الـ boʻlmaydi."],
  ["الْغُرْفَةُ", "وَاسِعَةٌ", "وَاسِعٌ", "غرفة ayol jinsida."],
];
RX.nominal = () => { const n = rnd(NOM); return mcq(n[0] + " … (toʻgʻri xabar)", n[1], [n[2]], n[3]); };
// so'roq so'zlari: [gap, javob]
const QW: [string, string][] = [
  ["… اسْمُكَ؟ — اسْمِي أَحْمَدُ", "مَا"], ["… هٰذَا؟ — هٰذَا أَبِي", "مَنْ"], ["… تَسْكُنُ؟ — فِي طَشْقَنْدَ", "أَيْنَ"],
  ["… حَالُكَ؟ — بِخَيْرٍ", "كَيْفَ"], ["… تَعْمَلُ؟ — أَعْمَلُ مُعَلِّمًا", "مَاذَا"], ["… الدَّرْسُ؟ — فِي السَّاعَةِ التَّاسِعَةِ", "مَتَى"],
  ["… تَدْرُسُ الْعَرَبِيَّةَ؟ — لِأَنَّهَا جَمِيلَةٌ", "لِمَاذَا"], ["… عُمُرُكَ؟ — عِشْرُونَ سَنَةً", "كَمْ"],
  ["… تُحِبُّ الشَّايَ؟ — نَعَمْ", "هَلْ"], ["… كِتَابٍ تُرِيدُ؟ — الْأَحْمَرَ", "أَيَّ"], ["… أَخًا لَكَ؟ — ثَلَاثَةٌ", "كَمْ"],
  ["… تُسَافِرُ؟ — بِالطَّائِرَةِ", "كَيْفَ"],
];
RX.qwords = () => { const q = rnd(QW); return mcq(q[0], q[1], ["مَا", "مَنْ", "أَيْنَ", "كَيْفَ", "مَاذَا", "مَتَى", "لِمَاذَا", "كَمْ", "هَلْ"], "Javobga qarang: u nimani bildiryapti?"); };
// predloglar
const PREP: [string, string][] = [
  ["سَافَرْتُ … طَشْقَنْدَ (dan)", "مِنْ"], ["ذَهَبْتُ … الْمَدْرَسَةِ (ga)", "إِلَى"], ["الْكِتَابُ … الْحَقِيبَةِ (ichida)", "فِي"],
  ["الْقَلَمُ … الطَّاوِلَةِ (ustida)", "عَلَى"], ["يَبْحَثُ … الْمِفْتَاحِ (qidiradi)", "عَنْ"], ["أُسَافِرُ … الْقِطَارِ (bilan)", "بِـ"],
  ["هٰذِهِ الْهَدِيَّةُ … أُمِّي (uchun)", "لِـ"], ["وَصَلْتُ … الْمَطَارِ", "إِلَى"], ["تَحَدَّثَ … الدَّرْسِ (haqida)", "عَنْ"],
  ["أَشْعُرُ … الْبَرْدِ", "بِـ"], ["رَجَعَ أَبِي … الْعَمَلِ (dan)", "مِنْ"], ["أَسْكُنُ … شَقَّةٍ صَغِيرَةٍ", "فِي"],
];
RX.preps = () => { const q = rnd(PREP); return mcq(q[0], q[1], ["مِنْ", "إِلَى", "فِي", "عَلَى", "عَنْ", "بِـ", "لِـ"], "Predlogdan keyingi ot kasra (i) bilan tugaydi."); };
// o'rin va payt ravishlari (izoh payt ravishlarida ham shu — eskidagidek)
const ADV: [string, string][] = [
  ["الْقِطَّةُ … الْكُرْسِيِّ (ostida)", "تَحْتَ"], ["الْكِتَابُ … الطَّاوِلَةِ (ustida)", "فَوْقَ"],
  ["الْمَلَابِسُ … الْخِزَانَةِ (ichida)", "دَاخِلَ"], ["يَقِفُ الْمُعَلِّمُ … الطُّلَّابِ (oldida)", "أَمَامَ"],
  ["الْحَدِيقَةُ … الْبَيْتِ (orqasida)", "خَلْفَ"], ["أَسْتَيْقِظُ … (ertalab)", "صَبَاحًا"], ["أَنَامُ … (kechasi)", "لَيْلًا"],
  ["أَرْجِعُ مِنَ الْعَمَلِ … (kechqurun)", "مَسَاءً"], ["أَتَغَدَّى … (tushda)", "ظُهْرًا"], ["الْأَوْلَادُ … الْبَيْتِ (tashqarisida)", "خَارِجَ"],
];
RX.adverbs = () => { const q = rnd(ADV); return mcq(q[0], q[1], ADV.map((x) => x[1]), "Ravishdan keyingi ot kasra bilan tugaydi."); };
// son va sanalmish: [gap, to'g'ri, noto'g'ri]
const NUMQ: [string, string, string][] = [
  ["اشْتَرَيْتُ ثَلَاثَةَ …", "أَقْلَامٍ", "قَلَمًا"], ["فِي الْمَكْتَبَةِ خَمْسَةُ …", "كُتُبٍ", "كِتَابًا"],
  ["دَرَسْتُ تِسْعَةَ …", "أَيَّامٍ", "يَوْمًا"], ["قَرَأْتُ عِشْرِينَ …", "كِتَابًا", "كُتُبٍ"],
  ["فِي الصَّفِّ أَحَدَ عَشَرَ …", "طَالِبًا", "طُلَّابٍ"], ["عِنْدِي سَبْعَةُ …", "إِخْوَةٍ", "أَخًا"],
  ["سَكَنْتُ هُنَا خَمْسِينَ …", "سَنَةً", "سَنَوَاتٍ"], ["اشْتَرَيْتُ أَرْبَعَةَ عَشَرَ …", "قَلَمًا", "أَقْلَامٍ"],
];
RX.numbers = () => { const q = rnd(NUMQ); return mcq(q[0], q[1], [q[2]], "3–10 → koʻplik (kasra); 11–99 → birlik (fatha, «-an»)."); };
// to'ldiruvchi (fatha): [gap, to'g'ri, noto'g'ri]
const MAF: [string, string, string][] = [
  ["يَنْتَظِرُ الْمُسَافِرُ …", "الْقِطَارَ", "الْقِطَارُ"], ["كَتَبَ الطَّالِبُ …", "الدَّرْسَ", "الدَّرْسُ"],
  ["شَرِبَ أَحْمَدُ …", "الْمَاءَ", "الْمَاءُ"], ["أَخَذَ الْمَرِيضُ …", "الدَّوَاءَ", "الدَّوَاءِ"],
  ["فَتَحَتْ فَاطِمَةُ …", "النَّافِذَةَ", "النَّافِذَةُ"], ["يَقْرَأُ أَبِي …", "الْجَرِيدَةَ", "الْجَرِيدَةِ"],
  ["اشْتَرَتْ أُمِّي …", "خُبْزًا", "خُبْزٌ"], ["سَمِعْتُ …", "صَوْتًا", "صَوْتٌ"],
];
RX.mafool = () => { const q = rnd(MAF); return mcq(q[0] + " (toʻldiruvchi)", q[1], [q[2]], "Vositasiz toʻldiruvchi (مَفْعُولٌ بِهِ) fatha oladi."); };
// inkor yuklamalari: [gap, javob]
const NEG: [string, string][] = [
  ["… الطَّبِيبُ مَشْغُولًا", "لَيْسَ"], ["… أَذْهَبُ إِلَى الْعَمَلِ غَدًا (bormayman)", "لَنْ"], ["… يَأْخُذِ الدَّوَاءَ أَمْسِ", "لَمْ"],
  ["… أُحِبُّ الْقَهْوَةَ (hozir)", "لَا"], ["… أَكَلْتُ اللَّحْمَ (oʻtgan zamon)", "مَا"], ["… الْجَوُّ حَارًّا الْيَوْمَ", "لَيْسَ"],
  ["… أُسَافِرَ فِي الصَّيْفِ (kelasi)", "لَنْ"], ["… أَفْهَمِ الدَّرْسَ أَمْسِ", "لَمْ"], ["… يَشْرَبُ أَخِي الشَّايَ (hozir)", "لَا"],
  ["… الْكِتَابُ صَعْبًا", "لَيْسَ"],
];
RX.negation = () => { const q = rnd(NEG); return mcq(q[0], q[1], ["لَيْسَ", "لَا", "لَمْ", "لَنْ", "مَا"], "لَيْسَ – ismli gap; لَمْ / مَا – oʻtgan; لَا – hozirgi; لَنْ – kelasi."); };

// ===== qoida mashqi savollari =====
export type RuleBook = { gen?: Record<string, (string | null)[]>; rules?: Record<string, { quiz?: [string, string[], number, string?][] }[]> };
/** Eski ruleQs(u, i, n) bilan aynan: qoidaning barcha quiz savollari (variantlar aralashtirilgan, ans — to'g'ri variant MATNI),
 *  keyin generator savollari (q+ans takrorlanmasin, ko'pi bilan 200 urinish) n tagacha; oxirida aralashtirib slice(0, n). */
export function ruleQs(book: RuleBook, u: number, i: number, n: number): (RQ & { u: number; i: number })[] {
  const r = book.rules?.[u]?.[i];
  const out: (RQ & { u: number; i: number })[] = (r?.quiz || []).map((q) => ({ q: q[0], opts: shuffle(q[1]), ans: q[1][q[2]], why: q[3], u, i }));
  const gn = ((book.gen || {})[u] || [])[i]; const g = gn ? RX[gn] : undefined;
  const seen = new Set(out.map((x) => x.q + x.ans)); let guard = 0;
  while (g && out.length < n && guard++ < 200) { const x = g(); if (!seen.has(x.q + x.ans)) { seen.add(x.q + x.ans); out.push({ ...x, u, i }); } }
  return shuffle(out).slice(0, n);
}
