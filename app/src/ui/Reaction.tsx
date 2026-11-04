// Reaksiya stikerlari: javobdan keyin ekran tepasida «sakrab» chiqadigan 3D rasm + ibora (eski .rk) va profil sozlamalari.
// Overlay o'z ildizida (body) turadi — useReactions() Main'da bir marta chaqiriladi, shunda har qanday ekran ustida chiqadi.
// Uchqunlar eskida tizim emojisi edi (⭐ ✨ 🔥 💛 🎉) — bu yerda Lucide ikonlari.
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { Flame, Heart, PartyPopper, Sparkles, Star, Volume2 } from "lucide-react";
import {
  rkBig, rkCount, rkFirstHi, rkLoad, rkOn, rkReady, rkResetCount, rkSetOn, rkSetSnd, rkSnd, rkSound, rkTake,
  type RkData, type RkKind, type RkPick,
} from "../lib/reaction";
import "./reaction.css";

type Shown = { id: number; kind: RkKind; p: RkPick; img?: string; badge?: string; burst: { x: number; y: number; d: string }[] };
let push: ((s: Shown | null) => void) | null = null;
let seq = 0;

function show(kind: RkKind, force = false, badge?: string) {
  const D = rkReady();
  if (!D) { rkLoad().then(() => show(kind, force, badge)).catch(() => { /* rasmlar yuklanmadi */ }); return; }
  const p = rkTake(kind, force);
  if (!p) return;
  const big = rkBig(kind), n = kind === "bad" ? 0 : big ? 14 : 8;
  // uchqunlar doira bo'ylab teng burchakda, radius 95–125px (katta: 130–160px), kechikish 0–0,15 s
  const burst = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2, r = (big ? 130 : 95) + Math.random() * 30;
    return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r), d: (Math.random() * 0.15).toFixed(2) };
  });
  push?.({ id: ++seq, kind, p, img: p[0] >= 0 ? D.img[p[0]] : undefined, badge, burst });
  rkSound(kind);
}

// ===== hodisalar =====
/** KB yoki drill javobi: xato — «bad», ketma-ket 3/5/8/12 to'g'ri — «streak» (yorliq bilan), qolgani — «ok» */
export function reactMark(ok: boolean) {
  const r = rkCount(ok);
  show(r.kind, false, r.badge);
}
export const reactOk = () => reactMark(true);
export const reactBad = () => reactMark(false);
/** KB qadami yakuni: 70% va yuqori — 400 ms keyin «done», 100% — «champ» + «100%» yorlig'i */
export function reactStepEnd(pct: number) {
  if (pct >= 70) window.setTimeout(() => show(pct >= 100 ? "champ" : "done", false, pct >= 100 ? "100%" : undefined), 400);
}
/** «Xush kebsiz!» — majburiy (stikerlar o'chiq bo'lsa ham) */
export const reactHi = () => show("hi", true);
/** «Chiqish» bosilganda ketma-ketlik hisobi nolga tushadi */
export const reactReset = () => rkResetCount();

const SPARK = [Star, Sparkles, Flame, Heart, PartyPopper];

function Layer() {
  const [s, setS] = useState<Shown | null>(null);
  useEffect(() => { push = setS; return () => { push = null; }; }, []);
  useEffect(() => {
    if (!s) return;
    const h = window.setTimeout(() => setS(null), rkBig(s.kind) ? 2600 : 1900);
    return () => clearTimeout(h);
  }, [s]);
  if (!s) return null;
  const big = rkBig(s.kind), ar = /[؀-ۿ]/.test(s.p[1]);
  return (
    <div key={s.id} className={`rk rk-${s.kind}${big ? " big" : ""}`} aria-hidden="true">
      <div className="rk-in">
        {s.burst.map((b, k) => {
          const I = SPARK[k % 5];
          return <i key={k} className={`rk-s${k % 5}`} style={{ "--x": `${b.x}px`, "--y": `${b.y}px`, "--d": `${b.d}s` } as CSSProperties}><I size={22} /></i>;
        })}
        {s.img
          ? <><img src={s.img} alt="" draggable={false} /><b className={ar ? "ar" : undefined} dir={ar ? "rtl" : undefined}>{s.p[1]}</b></>
          : <div className={`rk-card${ar ? " ar" : ""}`} dir={ar ? "rtl" : undefined}>{s.p[1].split("\n").map((t, k) => <Fragment key={k}>{k > 0 && <br />}{t}</Fragment>)}</div>}
        {s.badge && <span className="rk-n">{s.badge}</span>}
      </div>
    </div>
  );
}

let mounted = false;
/** Main'da bir marta: overlay'ni body'ga joylaydi va yangi foydalanuvchiga 700 ms keyin bir marta «Xush kebsiz!» chiqaradi */
export function useReactions() {
  useEffect(() => {
    if (!mounted) {
      mounted = true;
      const el = document.createElement("div");
      el.id = "rk-root";
      document.body.appendChild(el);
      createRoot(el).render(<Layer />);
      rkLoad().catch(() => { /* keyingi chaqiruvda yana urinadi */ });
    }
    if (rkFirstHi()) window.setTimeout(reactHi, 700);
  }, []);
}

// ===== profil sozlamalari =====
const thumb = (d: RkData | null) => (d ? d.img[(d.set.ok.find((x) => x[0] >= 0) || [0])[0]] : null);

export function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <button type="button" className={`rk-tg${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={onClick}><i /></button>;
}

/** Profil: reaksiya stikerlarini yoqish / o'chirish va ovoz (yoqilganda darhol namuna stiker / ohang) */
export function ReactionSettings() {
  const [on, setOn] = useState(rkOn);
  const [snd, setSnd] = useState(rkSnd);
  const [img, setImg] = useState(() => thumb(rkReady()));
  useEffect(() => { if (!img) rkLoad().then((d) => setImg(thumb(d))).catch(() => { /* rasm yo'q */ }); }, [img]);
  const flipOn = () => { const was = rkOn(); rkSetOn(!was); setOn(!was); if (!was) show("ok", true); };
  const flipSnd = () => { const v = !rkSnd(); rkSetSnd(v); setSnd(v); if (v) rkSound("ok"); };
  return (
    <section className="card rk-set">
      <div className="rk-row">
        {img ? <img src={img} alt="" draggable={false} /> : <span className="rk-ic" />}
        <div><b>Reaksiya stikerlari</b><small>To'g'ri javobda «Ot dushi, brat!», seriyada «Boss!»</small></div>
        <Switch on={on} label="Stikerlar" onClick={flipOn} />
      </div>
      <div className="rk-row">
        <span className="rk-ic" aria-hidden="true"><Volume2 size={26} /></span>
        <div><b>Ovoz effekti</b><small>Stiker bilan qisqa ohang</small></div>
        <Switch on={snd} label="Ovoz effekti" onClick={flipSnd} />
      </div>
    </section>
  );
}
