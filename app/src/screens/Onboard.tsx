// Yangi o'quvchi: tanishuv (3 slayd), bo'limga birinchi kirishdagi ko'rsatmalar va «?» yordam varag'i (ISM-TANISHUV-SPEC §2–§4).
// Kalitlar: f.ob.intro (tanishuv ko'rilgan), f.ob.tip.<kalit> (ko'rsatma tugagan — har qanday sababda). Ko'rsatma faqat ekranda ko'rinadigan
// elementlar bilan boshlanadi; bittasi ham ko'rinmasa — kalit yozilmaydi va keyingi safar yana uriniladi (eskidek).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { OB_HELP, OB_INTRO, OB_TIPS, type Tip } from "../lib/obText";
import { store } from "../lib/store";

// ===== tanishuv =====
export function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = OB_INTRO[i], n = OB_INTRO.length, last = i === n - 1;
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => { go.current?.focus(); }, [i]);
  return (
    <div className="obx" role="dialog" aria-modal="true" aria-label="Tanishuv">
      <div className="obx-in">
        <div className="obx-top">
          <span className="obx-dots" aria-hidden>{OB_INTRO.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</span>
          {!last && <button type="button" className="obx-skip" onClick={onDone}>O'tkazib yuborish</button>}
        </div>
        <div className="obx-h"><span>{i + 1} / {n}</span><b>{s.t}</b><p>{s.d}</p></div>
        <ol className="obx-rows">
          {s.rows.map((r, k) => <li key={k}><span className="obx-n">{k + 1}</span><span><b>{r[0]}</b><small>{r[1]}</small></span></li>)}
        </ol>
        {s.note && <p className="obx-note">{s.note}</p>}
        <span className="obx-sp" />
        <button ref={go} type="button" className="btn primary wide obx-go" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? "Boshlaymiz" : "Keyingisi"}</button>
      </div>
    </div>
  );
}

// ===== ko'rsatmalar =====
type Coach = { key: string; steps: Tip[]; i: number };
let cur: Coach | null = null;
let blocked = false; // tanishuv ochiq — ko'rsatma boshlanmaydi
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const visible = (el: Element | null) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
export const setCoachBlocked = (v: boolean) => { blocked = v; };

export function startCoach(key: string) {
  if (cur || blocked || store.get(`f.ob.tip.${key}`, 0)) return;
  const steps = (OB_TIPS[key] || []).filter((s) => visible(document.querySelector(s.sel)));
  if (!steps.length) return;
  cur = { key, steps, i: 0 };
  emit();
}
export function endCoach() {
  if (cur) store.set(`f.ob.tip.${cur.key}`, 1);
  cur = null;
  emit();
}
/** ekran tayyor bo'lgach (ready) 450 ms dan keyin ko'rsatma; ekrandan chiqilsa — tugaydi */
export function useCoach(key: string, ready = true) {
  useEffect(() => {
    if (!ready) return;
    const h = window.setTimeout(() => startCoach(key), 450);
    return () => { window.clearTimeout(h); if (cur?.key === key) endCoach(); };
  }, [key, ready]);
}

export function CoachHost() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [th, setTh] = useState(160);
  const step = cur ? cur.steps[cur.i] : null;
  // nishonni ko'rinadigan joyga surish va o'lchash (aylantirish va o'lcham o'zgarganda qayta)
  useEffect(() => {
    if (!step) { setRect(null); return; }
    const el = document.querySelector(step.sel);
    if (!visible(el)) { endCoach(); return; }
    const fixed = getComputedStyle(el!).position === "fixed" || !!el!.closest(".bnav");
    if (!fixed) el!.scrollIntoView({ block: "center" });
    const place = () => { const e = document.querySelector(step.sel); if (e) setRect(e.getBoundingClientRect()); };
    const h = window.setTimeout(place, fixed ? 0 : 260);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => { window.clearTimeout(h); window.removeEventListener("scroll", place); window.removeEventListener("resize", place); };
  }, [step]);
  useLayoutEffect(() => { if (tip.current) setTh(tip.current.offsetHeight); }, [step, rect]);
  const nb = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (rect) nb.current?.focus({ preventScroll: true }); }, [rect]);
  if (!cur || !step || !rect) return null;
  const p = 6, H = window.innerHeight, W = window.innerWidth;
  const top = Math.max(4, rect.top - p), hh = Math.min(rect.height + p * 2, H * 0.5);
  const below = top + hh + 14 + th < H - 8;
  const ty = below ? top + hh + 14 : Math.max(8, top - 14 - th);
  const n = cur.steps.length, last = cur.i === n - 1;
  const next = () => { if (!cur) return; if (cur.i < n - 1) { cur = { ...cur, i: cur.i + 1 }; emit(); } else endCoach(); };
  return (
    <div className="obc">
      <div className="obc-hole" style={{ left: Math.max(4, rect.left - p), top, width: Math.min(W - 8, rect.width + p * 2), height: hh }} />
      <div ref={tip} className="obc-tip" role="dialog" aria-label="Ko'rsatma" style={{ top: ty }}>
        <span className="obc-k">Ko'rsatma · {cur.i + 1} / {n}</span>
        <b>{step.t}</b>
        <p>{step.d}</p>
        <div className="obc-btns">
          <button type="button" className="obc-x" onClick={endCoach}>Ko'rsatmani yopish</button>
          <button ref={nb} type="button" className="btn dark obc-n" onClick={next}>{last ? "Tushunarli" : "Keyingisi"}</button>
        </div>
      </div>
    </div>
  );
}

// ===== «?» yordam =====
export function HelpButton({ k }: { k: string }) {
  const [open, setOpen] = useState(false);
  const H = OB_HELP[k];
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) ok.current?.focus(); }, [open]);
  if (!H) return null;
  const show = () => { if (cur) endCoach(); setOpen(true); };
  const again = () => {
    setOpen(false);
    if (!H.coach) return;
    store.set(`f.ob.tip.${H.coach}`, 0);
    window.scrollTo(0, 0);
    window.setTimeout(() => startCoach(H.coach!), 200);
  };
  return (
    <>
      <button type="button" className="obq" aria-label="Yordam: bu bo'lim nima?" onClick={show}>?</button>
      {open && (
        <div className="obh">
          <div className="obh-bg" onClick={() => setOpen(false)} />
          <div className="obh-sheet" role="dialog" aria-modal="true" aria-label="Yordam">
            <i className="obh-grab" aria-hidden />
            <span className="obh-k">Bu bo'lim nima?</span>
            <b className="obh-t">{H.t}</b>
            <ol className="obh-steps">{H.s.map((s, i) => <li key={i}><span>{i + 1}</span><span><b>{s[0]}</b><small>{s[1]}</small></span></li>)}</ol>
            <p className="obh-tip">Maslahat: {H.tip}</p>
            {H.coach && <button type="button" className="obh-again" onClick={again}>Ko'rsatmani qayta ko'rish</button>}
            <button ref={ok} type="button" className="btn dark wide" onClick={() => setOpen(false)}>Tushunarli</button>
          </div>
        </div>
      )}
    </>
  );
}
