// Emoji o'rniga 3D rasm (eski ilovadagi fl3d kabi): FLX — emoji → rasm raqami. Rasmi yo'q emoji o'zicha qoladi.
// "📕📕📕" kabi takror emojilar ham har biri alohida rasmga aylanadi.
import { useEffect, useState } from "react";
import { loadData } from "../lib/data";

let FLX: Record<string, number> | null = null;
// Intl.Segmenter (harflarni to'g'ri bo'lish: 👩‍🎓 bitta belgi) — eski telefonlarda bo'lmasa oddiy bo'linadi
type Seg = { segment(s: string): Iterable<{ segment: string }> };
const SegC = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => Seg }).Segmenter;
const seg = SegC ? new SegC("uz", { granularity: "grapheme" }) : null;
const graphemes = (s: string) => (seg ? [...seg.segment(s)].map((x) => x.segment) : Array.from(s));
export const emoSrc = (e: string) => { const i = FLX?.[e.replace(/️/g, "")]; return i != null ? `./img/fli/${i}.webp` : null; };

export function useFlx() {
  const [ready, setReady] = useState(!!FLX);
  useEffect(() => { if (!FLX) loadData<Record<string, number>>("FLX").then((m) => { FLX = m; setReady(true); }).catch(() => setReady(true)); }, []);
  return ready;
}

export function Emo({ e, size = 64 }: { e: string; size?: number }) {
  useFlx();
  const parts = graphemes(e.trim());
  const small = parts.length > 2 ? Math.max(28, Math.round(size / Math.min(parts.length, 4) * 1.6)) : size;
  return (
    <span className="emo" aria-hidden>
      {parts.map((g, k) => {
        const src = emoSrc(g);
        return src ? <img key={k} src={src} alt="" width={small} height={small} draggable={false} /> : <span key={k} className="emo-t" style={{ fontSize: small * 0.8 }}>{g}</span>;
      })}
    </span>
  );
}

// Matn boshidagi emoji (masalan "👋 salom") — rasm + qolgan matn
const LEAD = /^((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️)+)\s*/u;
export function EmoLead({ text, size = 28 }: { text: string; size?: number }) {
  const m = LEAD.exec(text);
  if (!m) return <>{text}</>;
  return <><Emo e={m[1]} size={size} /> {text.slice(m[0].length)}</>;
}
