// Maslahat zinapoyasi (12-partiya, A2; TMLT 8-bob — dinamik baholash): xato javobdan keyin to'g'ri javob darhol ochilmaydi.
// 1) ishora — o'quvchi yana urinadi; 2) qoida kartasi; 3) to'liq javob (savol xato hisoblanadi). Qoida bo'lmasa — 2 pog'ona.
// 17-partiya (A2): B1 dan boshlab avval faqat xato turi aytiladi (kind), ishora — o'quvchi so'rasa.
import { useState, type ReactNode } from "react";
import { BookOpen, KeyRound, Lightbulb, Lock, Tag } from "lucide-react";
import { store } from "../lib/store";

/** B1 va undan yuqori daraja — xato turi avval, ishora keyin */
export const typeFirst = (level?: string | null) => ["B1", "B2", "C1"].includes(String(level || ""));
/** mashq turi bo'yicha xato turi (A2 jadvali: harakat, harf, so'z tartibi, moslashuv, lug'at) */
export const ERR_KIND: Record<string, string> = {
  choose: "so'z yoki shakl tanlash", qa: "so'z yoki shakl tanlash", listen1: "eshitib tushunish (lug'at)", pick: "eshitib tushunish (lug'at)",
  letters: "harf va imlo", order: "so'z tartibi", classify: "guruhlash (so'z turi yoki shakli)", rule: "grammatik shakl (moslashuv)",
};

export function HintLadder({ hint, rule, onReveal, kind }: { hint: ReactNode; rule?: ReactNode; onReveal: () => void; kind?: string }) {
  const [ruleOpen, setRuleOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(!kind);
  const canReveal = !rule || ruleOpen;
  return (
    <section className="hl" aria-live="polite" aria-label="Maslahat">
      <p className="hl-h">Bu javob to'g'ri emas. Yana bir urinib ko'ring.</p>
      {kind && (
        <div className="hl-r on">
          <span className="hl-n" aria-hidden><Tag size={16} /></span>
          <div className="hl-t"><b>Xato turi</b><div className="hl-b">{kind}</div></div>
        </div>
      )}
      {hintOpen ? (
        <div className="hl-r on">
          <span className="hl-n" aria-hidden><Lightbulb size={16} /></span>
          <div className="hl-t"><b>Ishora</b><div className="hl-b">{hint}</div></div>
        </div>
      ) : (
        <button type="button" className="hl-r" onClick={() => setHintOpen(true)}>
          <span className="hl-n" aria-hidden><Lightbulb size={16} /></span>
          <span className="hl-t"><b>Ishorani ko'rish</b><small>Avval o'zingiz topib ko'ring</small></span>
        </button>
      )}
      {rule && (ruleOpen ? (
        <div className="hl-r on">
          <span className="hl-n" aria-hidden><BookOpen size={16} /></span>
          <div className="hl-t"><b>Qoida</b><div className="hl-b hl-rule">{rule}</div></div>
        </div>
      ) : (
        <button type="button" className="hl-r" onClick={() => setRuleOpen(true)}>
          <span className="hl-n" aria-hidden><BookOpen size={16} /></span>
          <span className="hl-t"><b>Qoidani ko'rish</b><small>Qisqa qoida kartasi</small></span>
        </button>
      ))}
      <button type="button" className="hl-r hl-ans" disabled={!canReveal || !hintOpen} onClick={onReveal}>
        <span className="hl-n" aria-hidden>{canReveal && hintOpen ? <KeyRound size={16} /> : <Lock size={15} />}</span>
        <span className="hl-t"><b>Javobni ko'rsatish</b><small>{!hintOpen ? "Avval ishorani ko'ring" : canReveal ? "Bu savol xato hisoblanadi" : "Avval qoidani ko'ring"}</small></span>
      </button>
    </section>
  );
}

/** maslahat bilan topilgan savollar soni — ustoz hisobotiga (2-bosqich) yig'iladi: f.hint = { "a1:3#2": 4, "rule:a1:3.0": 2 } */
export function noteHint(key: string) {
  const h = store.get<Record<string, number>>("f.hint", {});
  store.set("f.hint", { ...h, [key]: (h[key] || 0) + 1 });
}
