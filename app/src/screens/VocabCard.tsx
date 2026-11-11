// 11.11.2026 (M3): «So'z boyligim» kartasi (Baholar) va bosh sahifa eslatmasi — yengil fayl, test ekrani (Vocab.tsx) alohida yuklanadi.
import { BookOpenCheck } from "lucide-react";
import { vDue, vHist, vNext } from "../lib/vocab";
import { useNav } from "../state/nav";

const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const fmtDay = (d: string) => { const [, m, dd] = d.split("-").map(Number); return `${dd}-${OY[m - 1] || m}`; };

/** Baholar: oxirgi natija yoki taklif */
export function VocabCard() {
  const { go } = useNav();
  const h = vHist(), last = h[h.length - 1];
  const due = vDue();
  return (
    <button type="button" className={`rowbtn vs-row${due ? " due" : ""}`} onClick={() => go("vst")}>
      <BookOpenCheck size={24} aria-hidden />
      <span><b>So'z boyligim{last ? ` · ≈ ${last.n.toLocaleString("ru-RU")} so'z` : ""}</b>
        <small>{!last ? "5 daqiqalik test — qancha so'z bilasiz?" : due ? "Qayta o'lchash vaqti keldi" : `${fmtDay(last.d)} · keyingisi ${fmtDay(vNext() || last.d)}`}</small></span>
    </button>
  );
}

/** bosh sahifa: birinchi marta (biroz so'z yodlagach) va har 30 kunda bir */
export function VocabHomeCard({ known }: { known: number }) {
  const { go } = useNav();
  if (!vDue() || known < 20) return null;
  const last = vHist().slice(-1)[0];
  return (
    <button type="button" className="rowbtn vs-row due" onClick={() => go("vst")}>
      <BookOpenCheck size={24} aria-hidden />
      <span><b>{last ? "So'z boyligingizni qayta o'lchang" : "Qancha so'z bilasiz?"}</b><small>{last ? `Oxirgi natija: ≈ ${last.n.toLocaleString("ru-RU")} so'z · 5 daqiqa` : "5 daqiqalik test — natija va o'sish grafigi"}</small></span>
    </button>
  );
}
