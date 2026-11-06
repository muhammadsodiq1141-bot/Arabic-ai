// Natija ekranida shu mashq uchun berilgan qo'shimcha mukofotlar — suzuvchi xabar o'rniga kartaning ichida (11-partiya, 4-taklif)
import { useState } from "react";
import { CalendarCheck, Coins, Target } from "lucide-react";
import { gainTake } from "../lib/gainNote";

const icon = (m: string) => (/tanga/.test(m) ? Coins : /Haftalik/.test(m) ? CalendarCheck : Target);

export function GainNote() {
  const [m] = useState(gainTake);
  if (!m.length) return null;
  return (
    <ul className="gain-note" aria-label="Qo'shimcha mukofotlar">
      {m.map((x, k) => { const I = icon(x); return <li key={k}><I size={16} aria-hidden />{x}</li>; })}
    </ul>
  );
}
