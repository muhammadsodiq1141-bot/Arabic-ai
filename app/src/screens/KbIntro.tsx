// 12.11.2026: mashq oldidan karta (foydalanuvchi tanlagan «A» varianti). O'quvchi ilovadagi mashqda nimani, qanday va nega
// qilayotganini tushunsin: kitobdagi joyi · topshiriq (arabcha + o'zbekcha) · ilovada qanday bajariladi · nega · bitta yechilgan namuna.
// Birinchi kirishda to'liq chiqadi; keyin sarlavhadagi «i» tugmasi bilan qayta ochiladi.
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { GRADED, HOW, insUz, isAr, stepLabel, tipOf, type KbItem, type KbLesson, type KbStep } from "../lib/kb";
import { Ar } from "../ui/kit";

const BOOK: Record<string, string> = { a1: "Manhaj A1", a2: "Manhaj A2", b1: "Manhaj B1", b2: "Manhaj B2", c1: "Manhaj C1", md1: "Madina 1", md2: "Madina 2" };

/** nega: Manhaj bo'limi bo'yicha; Madina (va topilmasa) — mashq turi bo'yicha */
const NEGA_STEP: [RegExp, string][] = [
  [/^(lugat|lmashq)/, "Yangi so'zlarning ma'nosi va yozilishini mustahkamlaysiz."],
  [/^tinglash/, "Arabcha nutqni eshitib tushunishni mashq qilasiz."],
  [/^(oqish|qiroat|matn)/, "Matnni tushunib o'qishni mashq qilasiz."],
  [/^(suhbat|muhadatha)/, "Kundalik suhbatda kerak bo'ladigan savol va javoblarni o'rganasiz."],
  [/^(qoida|qawaid)/, "Qoidani gap ichida qo'llashni mashq qilasiz."],
  [/^yozish/, "So'z va gaplarni to'g'ri yozishni o'rganasiz — kitobdagi yozma mashqning o'zi."],
  [/^nazorat/, "Vahdani qanchalik o'zlashtirganingizni tekshirasiz."],
];
const NEGA_TYPE: Record<string, string> = {
  choose: "Darsdagi so'z va qoidani gap ichida to'g'ri ishlatishni mashq qilasiz.",
  qa: "Savolni tushunib, mos javobni topishni mashq qilasiz.",
  tf: "Gapning ma'nosini tushunib, to'g'ri-noto'g'risini ajratasiz.",
  order: "Arabcha gapda so'zlar qanday tartibda turishini o'rganasiz.",
  match: "So'z va ma'nolarni bir-biriga bog'lashni mashq qilasiz.",
  classify: "So'zlarni turiga qarab ajratishni o'rganasiz.",
  letters: "So'zning yozilishini harfma-harf eslab qolasiz.",
  listen1: "So'zni eshitib tanishni mashq qilasiz.",
  hear: "Tovushni eshitib farqlashni mashq qilasiz.",
  pick: "So'zni rasm orqali eslab qolasiz.",
  free: "O'z javobingizni arabcha yozishni mashq qilasiz — ustozingiz tekshiradi.",
};
const nega = (st: KbStep, type: string) => NEGA_STEP.find(([re]) => re.test(st.k))?.[1] || NEGA_TYPE[type] || "Darsda o'tilganini mustahkamlaysiz.";

const BLANK = /…+|\.{3,}/;
/** aralash matn: arabcha bo'laklar arabcha shriftda va o'z yo'nalishida */
const TextMix = ({ t }: { t: string }) => <>{t.split(/([؀-ۿ][؀-ۿ\s،؟]*[؀-ۿ])/).map((x, k) => (k % 2 ? <Ar key={k}>{x}</Ar> : x))}</>;
/** birinchi savol yechilgan holda — kitobdagi «مِثَالٌ» kabi */
/** ltr — o'zbekcha savol/javob aralash namuna (arabcha yo'nalishda chalkashmasin) */
function demoOf(it: KbItem): { ar: ReactNode; uz?: string; ltr?: boolean } | null {
  const ok = typeof it.ok === "string" ? it.ok : "";
  switch (it.type) {
    case "choose": case "qa": {
      if (it.full && ok && it.full.includes(ok)) { const [a, ...b] = it.full.split(ok); return { ar: <>{a}<mark>{ok}</mark>{b.join(ok)}</>, uz: it.fz || it.why }; }
      if (it.q && ok && isAr(it.q) && BLANK.test(it.q)) { const [a, ...b] = it.q.split(BLANK); return { ar: <>{a}<mark>{ok}</mark>{b.join(" ")}</>, uz: it.fz || it.why }; }
      if (it.q && ok && isAr(it.q) && isAr(ok)) return { ar: <>{it.q} <span className="kbi-arr">←</span> <mark>{ok}</mark></>, uz: it.why };
      if (it.q && ok) return { ltr: true, ar: <><TextMix t={it.q} /> <span className="kbi-arr">→</span> <mark><TextMix t={ok} /></mark></>, uz: it.why };
      return null;
    }
    case "listen1": return it.ar && ok ? { ltr: true, ar: <><Ar>{it.ar}</Ar> <span className="kbi-arr">→</span> <mark>{ok}</mark></> } : null;
    case "tf": return it.s ? { ar: <>{it.s}</>, uz: `${it.ok ? "To'g'ri" : "Noto'g'ri"}${it.uz ? ` — ${it.uz.replace(/^(Noto[ʻ'’]?g[ʻ'’]?ri|To[ʻ'’]?g[ʻ'’]?ri)[:.]?\s*/i, "")}` : ""}` } : null;
    case "order": return ok ? { ar: <mark>{ok}</mark>, uz: it.uz } : null;
    case "letters": return it.show ? { ar: <mark>{it.show}</mark>, uz: it.uz } : null;
    case "match": { const p = it.pairs?.[0]; if (!p) return null; return isAr(p[1]) ? { ar: <><mark>{p[0]}</mark> <span className="kbi-arr">—</span> <mark>{p[1]}</mark></> } : { ltr: true, ar: <><Ar>{p[0]}</Ar> <span className="kbi-arr">—</span> <mark>{p[1]}</mark></> }; }
    case "pick": return it.ar && ok ? { ar: <>{it.ar} <span className="kbi-arr">→</span> <span className="kbi-emo">{ok}</span></> } : null;
    default: return null;
  }
}

/** mashq kartasi kerakmi: faqat o'qish/tanishtiruv bo'lmagan topshiriqlar */
export const introFor = (st: KbStep) => st.items.some((x) => GRADED.includes(x.type) || x.type === "free");

export function KbIntro({ L, st, lessonKey, unitN, onClose }: { L: KbLesson; st: KbStep; lessonKey: string; unitN: number; onClose?: () => void }) {
  const b = lessonKey.split(":")[0];
  const lbl = stepLabel(st);
  const first = st.items.find((x) => GRADED.includes(x.type)) || st.items.find((x) => x.type === "free") || st.items[0];
  const ins = first?.ins || st.items.find((x) => x.ins)?.ins || "";
  const lessons = (L as KbLesson & { lessons?: number[] }).lessons || [];
  const where: ReactNode = b.startsWith("md")
    ? <>{BOOK[b]} · {lessons.length ? `${lessons.join("–")}-dars` : `${unitN}-qism`}{lbl.bet ? ` · ${lbl.bet}` : ""}</>
    : /^nazorat/.test(st.k) ? <>{BOOK[b] || b} · {unitN}-vahda yakunidagi test</>
    : <>{BOOK[b] || b} · {unitN}-vahda · {lbl.ar ? <>«<Ar>{lbl.ar}</Ar>» bo'limi</> : lbl.name}</>;
  const demo = first ? demoOf(first) : null;
  const kinds = new Set(st.items.filter((x) => GRADED.includes(x.type) || x.type === "free").map((x) => x.type)).size;
  return (
    <section className={`kbi${onClose ? " sheet" : ""}`} aria-label="Bu mashq haqida">
      {onClose && <header className="kbi-h"><b>Bu mashq haqida</b><button type="button" className="ibtn" aria-label="Yopish" onClick={onClose}><X size={18} aria-hidden /></button></header>}
      <div className="kbi-row"><em>Kitobda</em><span>{where}</span></div>
      {ins && <div className="kbi-row"><em>Topshiriq</em><span><Ar className="kbi-ins">{ins}</Ar><br />{insUz(ins, first?.type || "")}</span></div>}
      <div className="kbi-row"><em>Ilovada</em><span>{HOW[first?.type || ""] || tipOf(first?.type || "")}{kinds > 1 ? " Topshiriqda bir necha xil mashq bor — har birining yo'riqnomasi savol tepasida." : ""}</span></div>
      <div className="kbi-row"><em>Nega</em><span>{nega(st, first?.type || "")}</span></div>
      {demo && (
        <div className="kbi-demo"><span className="kbi-lbl">Namuna — 1-savol javobi bilan</span>{demo.ltr ? <div className="kbi-s ltr">{demo.ar}</div> : <Ar className="kbi-s">{demo.ar}</Ar>}{demo.uz && <small>{demo.uz}</small>}</div>
      )}
    </section>
  );
}
