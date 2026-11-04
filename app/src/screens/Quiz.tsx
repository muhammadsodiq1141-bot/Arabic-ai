// Umumiy 4 variantli test sessiyasi (eski "qs" dvigateli): xatolar ustida ishlash, sinonim va antonim, tanish so'zlar.
// To'g'ri javob → xatolar daftaridan 1 kamayadi (errOk); xato → daftarga (track bo'lsa). f.acc — profildagi aniqlik.
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { errAdd, errOk } from "../lib/practice";
import { store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { CountUp } from "../ui/CountUp";
import { Ar } from "../ui/kit";
import { MixedText } from "../ui/Mixed";
import { Scale } from "../ui/Scale";

export type QItem = { q: string; qAr?: boolean; hint?: string; opts: string[]; optsAr?: boolean; ans: number; why?: string; it?: { ar: string; b: string }; tag?: string };
export type QEnd = { title: string; sub: string; xp: number; again?: () => void; againLabel?: string; backLabel?: string };
/** onEnd — yakun ekrani shu yerda; finish — yakunda boshqa sahifaga o'tiladi (bellashuv, daraja testi), sec — sarflangan soniya */
export type QConf = {
  title: string; items: QItem[]; track?: boolean; auto?: boolean; onOk?: (it: QItem) => void;
  repeatWrong?: boolean; // birinchi o'tishdagi xatolar oxirida bir marta qaytadi (Beton mashq)
  onEnd?: (score: number, n: number, wrong: QItem[]) => QEnd; finish?: (score: number, n: number, wrong: QItem[], sec: number) => void;
};

export function QuizScreen({ conf }: { conf: QConf }) {
  const { back } = useNav();
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const wrong = useRef<QItem[]>([]);
  const [end, setEnd] = useState<QEnd | null>(null);
  const [waiting, setWaiting] = useState(false);
  const t0 = useRef(Date.now());
  const [items, setItems] = useState(conf.items);
  const [again, setAgain] = useState(false);
  const n = items.length;
  const it = items[i];

  const next = () => {
    setPick(null);
    if (i + 1 >= n && conf.repeatWrong && !again && wrong.current.length) {
      // xatolar o'sha variantlar tartibida oxiriga bir marta qo'shiladi
      setItems([...items, ...wrong.current.map((x) => ({ ...x }))]);
      wrong.current = []; setAgain(true); setI(i + 1);
      return;
    }
    if (i + 1 >= n) {
      tg.haptic("success");
      const sec = Math.round((Date.now() - t0.current) / 1000);
      if (conf.finish) { setWaiting(true); conf.finish(score, n, wrong.current, sec); }
      else if (conf.onEnd) setEnd(conf.onEnd(score, n, wrong.current));
    }
    else setI(i + 1);
  };
  // to'g'ri javobdan keyin avtomatik o'tish (auto)
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (pick === null || !it || pick !== it.ans || conf.auto === false) return;
    const h = setTimeout(() => nextRef.current(), 650);
    return () => clearTimeout(h);
  }, [pick, it, conf.auto]);

  if (waiting) return <main className="round"><div className="r-done"><p>Natija saqlanmoqda…</p></div></main>;
  if (end) {
    const p = n ? score / n : 0;
    return (
      <main className="round">
        <div className="r-done">
          <Scale size={140} balanced={p >= 0.6} star={p >= 0.6} />
          <h1>{end.title}</h1>
          <span className="kb-big">{score} / {n}</span>
          <p>{end.sub}</p>
          {end.xp > 0 && <p className="r-earn"><CountUp to={end.xp} />&nbsp;yulduzcha</p>}
          {end.again && <button type="button" className="btn primary wide" onClick={end.again}>{end.againLabel || "Yana o'ynash"}</button>}
          <button type="button" className={`btn ${end.again ? "ghost" : "primary"} wide`} onClick={back}>{end.backLabel || "Mashqqa qaytish"}</button>
        </div>
      </main>
    );
  }
  if (!it) return <main className="round"><p className="muted pad">Savol yo'q.</p><button type="button" className="btn dark wide" onClick={back}>Orqaga</button></main>;

  const answer = (k: number) => {
    if (pick !== null) return;
    setPick(k);
    const ok = k === it.ans;
    if (ok) { setScore((s) => s + 1); if (it.it) errOk(it.it.ar); conf.onOk?.(it); }
    else { wrong.current.push(it); if (it.it && conf.track !== false) errAdd(it.it.ar, it.it.b); }
    tg.haptic(ok ? "success" : "error");
    const acc = store.get<{ ok: number; n: number }>("f.acc", { ok: 0, n: 0 });
    store.set("f.acc", { ok: acc.ok + (ok ? 1 : 0), n: acc.n + 1 });
  };

  return (
    <main className="round">
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>{conf.title}</b>
        <span className="r-count">{i + 1} / {n}</span>
      </header>
      <div className="r-bar" role="progressbar" aria-valuenow={i} aria-valuemin={0} aria-valuemax={n} aria-label="Test"><i style={{ width: `${(i / n) * 100}%` }} /></div>
      <section className="r-card tq">
        {it.qAr ? <Ar className="qz-ar">{it.q}</Ar> : <span dir="ltr"><MixedText text={it.q} /></span>}
        {it.hint && <small className="qz-hint">{it.hint}</small>}
      </section>
      <div className="r-opts">
        {it.opts.map((o, k) => {
          const s = pick === null ? "" : k === it.ans ? "ok" : k === pick ? "no" : "dim";
          return (
            <button key={k} type="button" className={`opt ${s} ${it.optsAr ? "opt-r" : ""}`} disabled={pick !== null} onClick={() => answer(k)}>
              {it.optsAr ? <Ar className="opt-ar">{o}</Ar> : <span dir="ltr"><MixedText text={o} /></span>}
              {s === "ok" && <Check size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
              {s === "no" && <X size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <div className={`r-fix ${pick === it.ans ? "good" : ""}`} role="status">
          <p>{pick === it.ans ? "To'g'ri!" : <>To'g'ri javob: {it.optsAr ? <Ar>{it.opts[it.ans]}</Ar> : <b><MixedText text={it.opts[it.ans]} /></b>}</>}{it.why ? <><br /><span dir="ltr"><MixedText text={it.why} /></span></> : null}</p>
          <button type="button" className="btn dark wide" onClick={next}>{i + 1 >= n ? "Natija" : "Davom etish"}</button>
        </div>
      )}
    </main>
  );
}
