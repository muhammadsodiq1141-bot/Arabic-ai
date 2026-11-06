// Maslahat zinapoyasi (12-partiya, A2; TMLT 8-bob — dinamik baholash): xato javobdan keyin to'g'ri javob darhol ochilmaydi.
// 1) ishora — o'quvchi yana urinadi; 2) qoida kartasi; 3) to'liq javob (savol xato hisoblanadi). Qoida bo'lmasa — 2 pog'ona.
import { useState, type ReactNode } from "react";
import { BookOpen, KeyRound, Lightbulb, Lock } from "lucide-react";
import { store } from "../lib/store";

export function HintLadder({ hint, rule, onReveal }: { hint: ReactNode; rule?: ReactNode; onReveal: () => void }) {
  const [ruleOpen, setRuleOpen] = useState(false);
  const canReveal = !rule || ruleOpen;
  return (
    <section className="hl" aria-live="polite" aria-label="Maslahat">
      <p className="hl-h">Bu javob to'g'ri emas. Yana bir urinib ko'ring.</p>
      <div className="hl-r on">
        <span className="hl-n" aria-hidden><Lightbulb size={16} /></span>
        <div className="hl-t"><b>Ishora</b><div className="hl-b">{hint}</div></div>
      </div>
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
      <button type="button" className="hl-r hl-ans" disabled={!canReveal} onClick={onReveal}>
        <span className="hl-n" aria-hidden>{canReveal ? <KeyRound size={16} /> : <Lock size={15} />}</span>
        <span className="hl-t"><b>Javobni ko'rsatish</b><small>{canReveal ? "Bu savol xato hisoblanadi" : "Avval qoidani ko'ring"}</small></span>
      </button>
    </section>
  );
}

/** maslahat bilan topilgan savollar soni — ustoz hisobotiga (2-bosqich) yig'iladi: f.hint = { "a1:3#2": 4, "rule:a1:3.0": 2 } */
export function noteHint(key: string) {
  const h = store.get<Record<string, number>>("f.hint", {});
  store.set("f.hint", { ...h, [key]: (h[key] || 0) + 1 });
}
