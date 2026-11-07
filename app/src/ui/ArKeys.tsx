// 17-partiya: telefonda arab klaviaturasi bo'lmasa — ekrandagi harflar (diktant uchun). Kursor turgan joyga yozadi.
import type { RefObject } from "react";
import { Delete, Space } from "lucide-react";

const ROWS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ء", "ئ", "ؤ", "ر", "ى", "ة", "و", "ز", "ظ", "د", "ذ"],
  ["أ", "إ", "آ", "لا", "؟", "،", "."],
];

export function ArKeys({ target, value, onChange }: { target: RefObject<HTMLTextAreaElement | HTMLInputElement | null>; value: string; onChange: (v: string) => void }) {
  const put = (s: string | null) => {
    const el = target.current;
    const a = el?.selectionStart ?? value.length, b = el?.selectionEnd ?? value.length;
    let v: string, pos: number;
    if (s === null) { // o'chirish
      if (a !== b) { v = value.slice(0, a) + value.slice(b); pos = a; }
      else { const cut = Array.from(value.slice(0, a)); cut.pop(); const head = cut.join(""); v = head + value.slice(a); pos = head.length; }
    } else { v = value.slice(0, a) + s + value.slice(b); pos = a + s.length; }
    onChange(v);
    requestAnimationFrame(() => { try { el?.setSelectionRange(pos, pos); } catch { /* */ } });
  };
  return (
    <div className="arkeys" dir="rtl" role="group" aria-label="Arabcha harflar">
      {ROWS.map((r, k) => (
        <div key={k} className="ak-row">
          {r.map((c) => <button key={c} type="button" className="ak" lang="ar" onPointerDown={(e) => e.preventDefault()} onClick={() => put(c)}>{c}</button>)}
          {k === 3 && <>
            <button type="button" className="ak ak-w" aria-label="Bo'sh joy" onPointerDown={(e) => e.preventDefault()} onClick={() => put(" ")}><Space size={18} aria-hidden /></button>
            <button type="button" className="ak ak-w" aria-label="O'chirish" onPointerDown={(e) => e.preventDefault()} onClick={() => put(null)}><Delete size={18} aria-hidden /></button>
          </>}
        </div>
      ))}
    </div>
  );
}
