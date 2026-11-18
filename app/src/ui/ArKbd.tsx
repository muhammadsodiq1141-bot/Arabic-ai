// 18.11.2026 (foydalanuvchi): ilova ichidagi arabcha klaviatura — telefondagi asl arabcha (Saudiya) tartibida, harflar o'z joyida.
// Telefonida arab klaviaturasi o'rnatilmagan o'quvchi ham yoza oladi. Ilova telefonning o'z klaviatura tilini almashtira olmaydi.
import { Delete } from "lucide-react";
import { tg } from "../lib/tg";

const ROWS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ذ", "ء", "ؤ", "ر", "ى", "ة", "و", "ز", "ظ", "د"],
];
const EXTRA = ["أ", "إ", "آ", "ئ", "لا"];

export function ArKbd({ onKey, onBack }: { onKey: (s: string) => void; onBack: () => void }) {
  const k = (s: string) => () => { tg.haptic("light"); onKey(s); };
  return (
    <div className="akb" dir="rtl" role="group" aria-label="Arabcha klaviatura">
      {ROWS.map((r, i) => (
        <div key={i} className="akb-r">
          {r.map((c) => <button key={c} type="button" onClick={k(c)}>{c}</button>)}
          {i === 2 && <button type="button" className="akb-del" aria-label="O'chirish" onClick={() => { tg.haptic("light"); onBack(); }}><Delete size={18} aria-hidden /></button>}
        </div>
      ))}
      <div className="akb-r">
        {EXTRA.map((c) => <button key={c} type="button" onClick={k(c)}>{c}</button>)}
        <button type="button" className="akb-sp" aria-label="Bo'sh joy" onClick={k(" ")}>bo'sh joy</button>
        <button type="button" onClick={k("،")}>،</button>
        <button type="button" onClick={k("؟")}>؟</button>
        <button type="button" onClick={k(".")}>.</button>
      </div>
    </div>
  );
}
