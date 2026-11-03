// Nazariya (qoida matni; video tayyor bo'lganda shu yerga qo'yiladi) va grammatik test.
// Test nazariya ko'rilgandan keyin ochiladi. Natija eski ilova formatida: har qoida uchun {BK}rule.<vahda>.<i> (eng yaxshi %).
import { useEffect, useMemo, useState } from "react";
import { Check, Video, X } from "lucide-react";
import { img, loadData } from "../lib/data";
import { bkKey, type Book } from "../lib/progress";
import { gain, setBest, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle } from "../lib/words";
import { useNav } from "../state/nav";
import { Ar, ScreenHeader } from "../ui/kit";

type Rule = { t: string; ar: string; html: string; quiz: [string, string[], number, string?][] };
export const theoryKey = (book: string, unit: number) => `f.theory.${book}.${unit}`;

function useRules(bookId: string, unit: number) {
  const [r, setR] = useState<{ rules: Rule[]; unitAr: string } | null>(null);
  useEffect(() => {
    let a = true;
    loadData<Book>(`books/${bookId}`).then((b) => a && setR({ rules: (b.rules?.[unit] || []) as Rule[], unitAr: b.units.find((u) => u.n === unit)?.ar || "" }));
    return () => { a = false; };
  }, [bookId, unit]);
  return r;
}

export function TheoryScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { replace } = useNav();
  const r = useRules(bookId, unitN);
  if (!r) return <main className="screen"><ScreenHeader title="Nazariya" /><p className="muted pad">Yuklanmoqda…</p></main>;
  // nazariya ekrani test bilan almashtiriladi: testdan "Orqaga" — to'g'ri unit ekraniga
  const done = () => { store.set(theoryKey(bookId, unitN), 1); tg.haptic("success"); replace("test", { book: bookId, unit: unitN }); };
  return (
    <main className="screen">
      <ScreenHeader title={`${unitN}-vahda · Nazariya`} ar="الْقَوَاعِدُ" />
      <section className="vsoon"><Video size={26} aria-hidden /><span><b>Video dars tez orada</b><small>Hozircha qoidani matndan o'qing. Video qo'shilgach, shu yerda chiqadi.</small></span></section>
      {r.rules.length === 0 && <p className="muted pad">Bu vahdada grammatik qoida yo'q.</p>}
      {r.rules.map((x, i) => (
        <article key={i} className="card rule">
          <h2>{x.t}</h2>
          <Ar className="rule-ar">{x.ar}</Ar>
          <div className="rule-body" dangerouslySetInnerHTML={{ __html: x.html }} />
        </article>
      ))}
      {r.rules.length > 0 && <button type="button" className="btn primary wide" onClick={done}>O'qidim — testga o'tish</button>}
    </main>
  );
}

export function TestScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { back } = useNav();
  const r = useRules(bookId, unitN);
  const qs = useMemo(() => (r ? shuffle(r.rules.flatMap((rule, ri) => rule.quiz.map((q) => ({ ri, q })))) : []), [r]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [right, setRight] = useState<number[]>([]);
  if (!r) return <main className="screen"><p className="muted pad">Yuklanmoqda…</p></main>;
  if (!qs.length) return <main className="screen"><ScreenHeader title="Test" /><p className="muted pad">Bu vahdada test savoli yo'q.</p></main>;

  if (i >= qs.length) {
    const pct = Math.round((right.length / qs.length) * 100);
    return (
      <main className="round">
        <div className="r-done">
          <img src={img(pct >= 80 ? "medal" : "target")} alt="" />
          <h1>Test: {pct}%</h1>
          <p>{right.length} / {qs.length} to'g'ri. {pct >= 80 ? "Qoida o'zlashtirildi!" : "80% ga yetsa, qoida o'zlashtirilgan hisoblanadi. Nazariyani qayta ko'rib, yana urinib ko'ring."}</p>
          <button type="button" className="btn primary wide" onClick={back}>Davom etish</button>
        </div>
      </main>
    );
  }

  const { q } = qs[i];
  const [text, opts, ok, note] = q;
  const answer = (j: number) => {
    setPick(j);
    const good = j === ok;
    tg.haptic(good ? "light" : "error");
    if (good) setRight((x) => [...x, i]);
  };
  const nextQ = () => {
    const nr = pick === ok ? [...right] : right;
    if (i + 1 >= qs.length) {
      // har qoida bo'yicha natija (eski ilova formati) va XP
      r.rules.forEach((_, k) => {
        const mine = qs.map((x, n) => ({ x, n })).filter((o) => o.x.ri === k);
        if (mine.length) setBest(bkKey(bookId, `rule.${unitN}.${k}`), Math.round((mine.filter((o) => nr.includes(o.n)).length / mine.length) * 100));
      });
      gain("rule", nr.length * 2);
    }
    setPick(null); setI(i + 1);
  };
  return (
    <main className="round">
      <header className="r-top">
        <button type="button" className="r-close" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>Test</b><span className="r-count">{i + 1} / {qs.length}</span>
      </header>
      <div className="r-bar"><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <p className="r-hint">To'g'ri variantni tanlang</p>
      <section className="r-card tq"><span dir="auto">{text}</span></section>
      <div className="r-opts">
        {opts.map((o, j) => {
          const st = pick === null ? "" : j === ok ? "ok" : j === pick ? "no" : "dim";
          return <button key={j} type="button" className={`opt ${st}`} disabled={pick !== null} onClick={() => answer(j)}><span dir="auto" className="opt-mix">{o}</span></button>;
        })}
      </div>
      {pick !== null && (
        <div className={`r-fix ${pick === ok ? "good" : ""}`}>
          <p>{pick === ok ? <><Check size={18} aria-hidden /> To'g'ri!</> : <>To'g'ri javob: <b dir="auto">{opts[ok]}</b></>}{note ? <><br /><span dir="auto">{note}</span></> : null}</p>
          <button type="button" className="btn dark wide" onClick={nextQ}>{i + 1 >= qs.length ? "Natija" : "Keyingisi"}</button>
        </div>
      )}
    </main>
  );
}
