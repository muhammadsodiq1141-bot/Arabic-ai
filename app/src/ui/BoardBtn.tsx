// 26.11.2026: «Doska rejimi» tugmasi — mashq sarlavhasida va Sinf rejimida. Faqat keng yotiq ekranda ko'rinadi (lib/board.ts)
import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Presentation } from "lucide-react";
import { bmSet, useBoardMode, useBoardPossible } from "../lib/board";
import { tg } from "../lib/tg";
import { toast } from "./Toast";

export function BoardBtn({ label }: { label?: boolean }) {
  const on = useBoardMode();
  const can = useBoardPossible();
  if (!can) return null;
  const click = () => {
    tg.haptic();
    bmSet(!on);
    toast(on ? "Doska rejimi o'chirildi" : "Doska rejimi yoqildi: savol va javoblar bitta ekranda, to'g'ri javobdan keyin keyingi savolga o'zi o'tadi");
  };
  return label
    ? <button type="button" className={`hdr-lbl bm-btn ${on ? "on" : ""}`} aria-pressed={on} onClick={click}><Presentation size={17} aria-hidden />{on ? "Doska rejimi: yoqilgan" : "Doska rejimi"}</button>
    : <button type="button" className={`ibtn bm-btn ${on ? "on" : ""}`} aria-pressed={on} aria-label="Doska rejimi" title={on ? "Doska rejimini o'chirish" : "Doska rejimi"} onClick={click}><Presentation size={19} aria-hidden /></button>;
}

/** doska rejimida mashqning javob qismi o'ng ustunga chiqadi (Kitob.tsx: bm-ans). Oddiy rejimda joyida qoladi */
export const AnsCtx = createContext<{ on: boolean; el: HTMLElement | null }>({ on: false, el: null });
export function Ans({ children }: { children: ReactNode }) {
  const { on, el } = useContext(AnsCtx);
  if (!on) return <>{children}</>;
  return el ? createPortal(children, el) : null;
}
