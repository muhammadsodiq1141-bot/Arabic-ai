// Tanishuv, bo'lim ko'rsatmalari va «?» yordam matnlari (eski OB_INTRO, OB_TIPS, OB_HELP — ISM-TANISHUV-SPEC §2–§4),
// yangi ilova tuzilishiga moslangan: XP → yulduzcha, ⭐ → tanga, bo'lim/dars → vahda, yangi pastki menyu. Loyiha: _mahalliy/10-MATNLAR-DRAFT.md.

export type Slide = { t: string; d: string; rows: [string, string][]; note?: string };
export const OB_INTRO: Slide[] = [
  { t: "Mezon'ga xush kelibsiz", d: "Bu yerda arab tilini kitob, lug'at, multfilm va gapirish mashqi orqali tizimli o'rganasiz.",
    rows: [["Darslar", "Manhaj A1–C1, Madina 1–2: so'zlar, qoidalar va kitob mashqlari"], ["Mashq", "O'yinlar, kartochka, multfilm, takrorlash va bellashuv"], ["Guruh", "Ustozingiz bilan birga o'qish va uy vazifalari"]] },
  { t: "Har kuni 15 daqiqa", d: "Mezon har kuni nima qilishni o'zi ko'rsatadi. Shunchaki ketma-ket bajaring.",
    rows: [["Bugun — 4 qism", "Takrorlash, tinglash, gapirish va ravonlik · ~15 daq"], ["Kunlik vazifalar", "Bajarsangiz tanga olasiz; tanga seriyangizni saqlab qoladi"], ["Gapirish", "3 ta gapni ovoz chiqarib takrorlang · 3 daq"]],
    note: "Ustozingiz vazifa bersa, u bosh sahifada «Uy vazifasi» kartasida chiqadi — avval shuni bajaring." },
  { t: "Adashsangiz — «?» ni bosing", d: "Har bir bo'limning tepasida «?» tugmasi bor. U shu bo'lim nima va qanday ishlashini 3 qadamda tushuntiradi.",
    rows: [["Birinchi hafta yo'li", "Bosh sahifada har kuni tayyor 3 ta vazifa"], ["Ko'rsatmalar", "Bo'limga ilk kirganingizda nimani bosishni ko'rsatamiz"]] },
];

/** ko'rsatma qadamlari: sel — yoritiladigan element (ekranda ko'rinmasa qadam tashlab ketiladi) */
export type Tip = { sel: string; t: string; d: string };
export const OB_TIPS: Record<string, Tip[]> = {
  home: [
    { sel: ".wk-card", t: "Birinchi hafta yo'li", d: "Har kuni shu yerda 3 ta vazifa chiqadi. «Boshlash» ni bossangiz, kerakli bo'lim o'zi ochiladi." },
    { sel: ".today", t: "Bugun — 4 qism", d: "Takrorlash, tinglash, gapirish va ravonlik. Tartib bilan bajaring — «Davom etish» keyingi qismni o'zi ochadi." },
    { sel: ".bnav", t: "Pastki menyu", d: "Darslar — kitob va vahdalar; Mashq — o'yin, multfilm, takrorlash; Baholar — natijalaringiz; Profil — guruh va sozlamalar." },
  ],
  vahda: [
    { sel: ".vp-voc", t: "Lug'at", d: "So'zlar 10 tadan roundlarga bo'lingan. «So'zlar ro'yxati» da har bir so'zni tinglab, misollarini ko'rasiz." },
    { sel: ".vp-theory", t: "Nazariya va test", d: "Nazariya lug'at va mashqlarning 1-qismidan keyin ochiladi, keyin test. 80% va undan yuqori natija — qoida o'zlashtirildi." },
    { sel: ".ucta-btn", t: "Davom etish", d: "Qayerdan davom etishni bilmasangiz, shu tugmani bosing — keyingi qadam o'zi ochiladi." },
  ],
  mult: [
    { sel: ".mbig", t: "Videoni boshlang", d: "Pastdagi matn video bilan birga rangga kirib boradi." },
    { sel: ".mline", t: "Gapni bosing", d: "Qaysi gapni bossangiz, video shu joydan aytadi. Tushunmagan so'zingizni bosib, ma'nosini ko'ring." },
    { sel: ".klag", t: "Yozuv sinxroni", d: "Yozuv ovozdan oldin ketsa «+» ni, kech qolsa «−» ni bosing." },
  ],
  shadow: [
    { sel: ".shph", t: "Tinglang", d: "Video gapni ikki marta aytadi. Ikkinchi marta «Navbat sizda» chiqadi — video bilan birga ayting." },
    { sel: ".shbig", t: "Yozib, solishtiring", d: "«Yozish» ni bosing, gapni ayting. Keyin o'z ovozingizni asl ovoz bilan solishtiring." },
  ],
};

export type Help = { t: string; s: [string, string][]; tip: string; coach?: string };
export const OB_HELP: Record<string, Help> = {
  home: { t: "Bosh sahifa", coach: "home", s: [["Uy vazifasi", "Ustozingiz vazifa bersa, shu kartada chiqadi. Avval shuni bajaring."],
    ["Bugun — 4 qism", "Har kuni takrorlash, tinglash, gapirish va ravonlik. Kunlik vazifalarni bajarsangiz, tanga olasiz."],
    ["Yulduzcha va reyting", "Har bir mashq uchun yulduzcha olasiz. Reyting har dushanba yangilanadi."]], tip: "Kuniga 10 daqiqa ham yetarli — asosiysi har kuni." },
  vahda: { t: "Vahda", coach: "vahda", s: [["Lug'at", "So'zlarni roundlarda yodlang. «So'zlar ro'yxati» da tinglab, misollarini ko'ring."],
    ["Nazariya va test", "Qoidani o'qing, keyin testda o'zingizni sinang."], ["Mashqlar", "Kitobdagi topshiriqlar: o'qish, tinglash, yozish. Har biri oldingisidan keyin ochiladi."]],
    tip: "Tartib: Lug'at → Mashqlar (1-qism) → Nazariya → Test → Mashqlar (2-qism). Har qadam oldingisidan keyin ochiladi." },
  practice: { t: "Mashq", s: [["O'yinlar va kartochka", "So'zlarni o'yin bilan mustahkamlang, kartochkada yozib yodlang."],
    ["Multfilmlar va takrorlash", "Arabcha subtitrli multfilmlar; gaplarni video bilan birga ovoz chiqarib aytish."],
    ["Xatolar va bellashuv", "Xato so'zlarni qayta mashq qiling, do'stingiz bilan bellashing."]], tip: "Gapirish uchun eng foydalisi — Takrorlash." },
  mults: { t: "Multfilmlar", s: [["Darajani tanlang", "Yuqoridagi tugmalar — A1, A2 va hokazo."], ["Multfilmni oching", "Video, lug'at va test bo'limlari bor."],
    ["Takrorlash rejimi", "Har bir gapni tinglab, ovoz chiqarib takrorlaysiz."]], tip: "Avval lug'atni ko'rib chiqsangiz, video osonroq tushuniladi." },
  mult: { t: "Multfilm ko'rish", coach: "mult", s: [["Tinglang", "Matn video bilan birga rangga kirib boradi. Tezlikni 0.75x qilsangiz osonroq."],
    ["Gapni bosing", "Video shu gapdan aytadi. «Aylana» — bitta gapni qayta-qayta eshitish."], ["Yozuv sinxroni", "Yozuv ovozdan oldin ketsa «+», kech qolsa «−» ni bosing."]],
    tip: "Bir multfilmni 2–3 marta ko'ring: avval tarjima bilan, keyin tarjimasiz." },
  shadow: { t: "Takrorlash (shadowing)", coach: "shadow", s: [["Tinglang", "Video gapni aytadi, so'zlar rangga kirib boradi."],
    ["Birga ayting", "Ikkinchi marta «Navbat sizda» chiqadi — video bilan baravar gapiring."],
    ["Yozib, solishtiring", "«Yozish» ni bosing, gapni ayting, keyin o'z ovozingizni asl ovoz bilan solishtiring."]], tip: "Kuniga 3–5 ta gap yetarli. Tezlikni 0.75x qilib boshlang." },
};
