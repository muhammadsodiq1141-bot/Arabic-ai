// Qoidalar markazi (eski "rules" ko'rinishi): kitobning barcha qoidalari, qoida sahifasi va qayta urinishli mashq (SOZ-QOIDA-DARS-SPEC §2).
// Savollar: qoidaning tayyor savollari + 27 generator (lib/rx.ts, eski ruleQs aynan). Natija {BK}rule.<vahda>.<i> — eng yaxshisi.
// Tasdiqlangan farqlar: aralash mashq qoida natijalariga yozilmaydi, faqat yulduzcha (eskisida umumiy % hamma qoidaga yozilardi);
// "Qoidalarga qaytish" doim ishlaydi (eskisida aralash mashqdan keyin xato berardi); emoji o'rniga Lucide.
import { useEffect, useState } from "react";
import { ArrowRight, CircleCheck, Target, X } from "lucide-react";
import { loadData } from "../lib/data";
import type { PBook } from "../lib/practice";
import { bkKey } from "../lib/progress";
import { report } from "../lib/report";
import { ruleQs, type RQ, type RuleBook } from "../lib/rx";
import { gain, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle } from "../lib/words";
import { useNav } from "../state/nav";
import { CountUp } from "../ui/CountUp";
import { Ar, ScreenHeader } from "../ui/kit";
import { MixedText } from "../ui/Mixed";
import { Scale } from "../ui/Scale";

export type Rule = { t: string; ar: string; html: string; quiz: [string, string[], number, string?][] };
export type RBook = PBook & { gen?: Record<string, (string | null)[]> };
type U = RBook["units"][number] & { lbl?: string };

export const rulesIn = (b: RBook, u: number) => (b.rules?.[u] || []) as Rule[];
export const ruleKey = (bid: string, u: number, i: number) => bkKey(bid, `rule.${u}.${i}`);
/** null — hali mashq qilinmagan ("Boshlanmagan"); 0 — boshlangan */
export const ruleBest = (bid: string, u: number, i: number) => store.get<number | null>(ruleKey(bid, u, i), null);
export const unitLbl = (u: U) => u.lbl || `${u.n}-vahda`;
/** kitobdagi barcha qoidalar [vahda, i] va o'zlashtirilganlari (≥ 80%) */
export function ruleStats(b: RBook) {
  const all = b.units.flatMap((u) => rulesIn(b, u.n).map((_, i) => [u.n, i] as [number, number]));
  return { all, done: all.filter(([u, i]) => (ruleBest(b.id, u, i) || 0) >= 80).length };
}
/** eski ruleQs — kitob ma'lumoti rx.ts kutgan shaklda */
export const qsFor = (b: RBook, u: number, i: number, n: number) => ruleQs(b as unknown as RuleBook, u, i, n);

export function useRBook(id: string) {
  const [b, setB] = useState<RBook | null>(null);
  useEffect(() => { let a = true; loadData<RBook>(`books/${id}`).then((x) => a && setB(x)).catch(() => {}); return () => { a = false; }; }, [id]);
  return b;
}

function Badge({ b }: { b: number | null }) {
  if (b === null) return <span className="rbadge">Boshlanmagan</span>;
  if (b >= 80) return <span className="rbadge ok"><CircleCheck size={14} aria-hidden />O'zlashtirildi · {b}%</span>;
  return <span className="rbadge mid">Mashq qilinmoqda · {b}%</span>;
}

export function RulesHub({ bookId }: { bookId: string }) {
  const { go } = useNav();
  const book = useRBook(bookId);
  if (!book) return <main className="screen"><ScreenHeader title="Qoidalar" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const { all, done } = ruleStats(book);
  const units = (book.units as U[]).filter((u) => rulesIn(book, u.n).length);
  return (
    <main className="screen">
      <ScreenHeader title={`${book.title} qoidalari`} ar="اَلْقَوَاعِدُ" />
      <p className="m-info">Barcha grammatik qoidalar: o'qing, mashq qiling, o'zlashtiring</p>
      {!all.length ? <p className="muted pad">Bu kitobda grammatik qoida yo'q.</p> : (
        <section className="card rhead">
          <b>{done} / {all.length} qoida o'zlashtirildi</b>
          <span className="lt-bar"><i className="ok" style={{ width: `${Math.round((done / all.length) * 100)}%` }} /></span>
          <button type="button" className="btn primary wide" onClick={() => go("rprac", { book: bookId, list: all, title: `${book.title} · umumiy mashq`, n: Date.now() })}>
            <Target size={18} aria-hidden />Shu kitob bo'yicha mashq
          </button>
        </section>
      )}
      {units.map((u) => (
        <section key={u.n} className="rgroup" aria-label={unitLbl(u)}>
          <h2 className="rgroup-h">{unitLbl(u)} · {u.uz}</h2>
          {rulesIn(book, u.n).map((r, i) => (
            <button key={i} type="button" className="rcard" onClick={() => go("rule", { book: bookId, u: u.n, i })}>
              <span className="rnum">{i + 1}</span>
              <span className="rmeta"><b>{r.t}</b><Ar className="rmeta-ar">{r.ar}</Ar><Badge b={ruleBest(bookId, u.n, i)} /></span>
              <ArrowRight size={18} className="rgo" aria-hidden />
            </button>
          ))}
        </section>
      ))}
    </main>
  );
}

export function RuleDetail({ bookId, u, i }: { bookId: string; u: number; i: number }) {
  const { go } = useNav();
  const book = useRBook(bookId);
  const r = book ? rulesIn(book, u)[i] : null;
  if (!book || !r) return <main className="screen"><ScreenHeader title="Qoida" /><p className="muted pad">{book ? "Qoida topilmadi." : "Yuklanmoqda…"}</p></main>;
  const unit = book.units.find((x) => x.n === u) as U | undefined;
  return (
    <main className="screen">
      <ScreenHeader title={r.t} />
      <div className="rd-badge"><Badge b={ruleBest(bookId, u, i)} /></div>
      <article className="card rule">
        <div className="rule-h"><small>{unit ? unitLbl(unit) : `${u}-vahda`}</small><Ar className="rule-ar">{r.ar}</Ar></div>
        <div className="rule-body" dangerouslySetInnerHTML={{ __html: r.html }} />
      </article>
      <section className="card rcta">
        <b>Qoidani mustahkamlang</b>
        <small className="muted">10 ta savol. Xato javoblar oxirida qayta beriladi. 80% dan yuqori natija — qoida o'zlashtirildi.</small>
        <button type="button" className="btn primary wide" onClick={() => go("rprac", { book: bookId, list: [[u, i]], title: r.t, n: Date.now() })}>Mashqni boshlash</button>
      </section>
    </main>
  );
}

type PQ = RQ & { u: number; i: number; retry?: boolean; rc?: number };
const hasLatin = (s: string) => /[A-Za-z]/.test(s);
const isArOnly = (s: string) => /[؀-ۿ]/.test(s) && !hasLatin(s);

/** Qoida mashqi: bitta qoida — 10 savol; aralash — har qoidadan max(3, ceil(12/k)), jami 15.
 *  Faqat birinchi urinish hisobga kiradi; xato savol oxiriga qayta qo'shiladi (ko'pi bilan 2 marta). */
export function RulePractice({ bookId, list, title }: { bookId: string; list: [number, number][]; title: string }) {
  const { back, replace } = useNav();
  const book = useRBook(bookId);
  const [qs, setQs] = useState<PQ[] | null>(null);
  const [total, setTotal] = useState(0);
  const [k, setK] = useState(0);
  const [ans, setAns] = useState<number | null>(null);
  const [first, setFirst] = useState<Record<string, number>>({}); // "u.i" → birinchi urinishda to'g'ri
  const [res, setRes] = useState<{ p: number; ok: number; xp: number } | null>(null);
  useEffect(() => {
    if (!book) return;
    const multi = list.length > 1;
    const per = multi ? Math.max(3, Math.ceil(12 / list.length)) : 10;
    const all = shuffle(list.flatMap(([u, i]) => qsFor(book, u, i, per))).slice(0, multi ? 15 : 10);
    setQs(all); setTotal(all.length);
  }, [book]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!book || !qs) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  const again = () => replace("rprac", { book: bookId, list, title, n: Date.now() });

  if (res) {
    return (
      <main className="round">
        <div className="r-done">
          <Scale size={140} balanced={res.p >= 80} star={res.p >= 80} />
          <span className="kb-big">{res.p}%</span>
          <h1>{res.p >= 80 ? (list.length === 1 ? "Qoida o'zlashtirildi!" : "Barakalla!") : "Yana bir marta mashq qiling"}</h1>
          <p>Birinchi urinishda {res.ok} / {total} to'g'ri. Xato savollar qayta berildi va to'g'rilandi.</p>
          {list.length > 1 && <p className="muted">Umumiy mashq qoidalar natijasini o'zgartirmaydi — har bir qoidani alohida mashq qiling.</p>}
          <p className="r-earn"><CountUp to={res.xp} />&nbsp;yulduzcha</p>
          <button type="button" className="btn primary wide" onClick={again}>Yana mashq</button>
          <button type="button" className="btn ghost wide" onClick={back}>Qoidalarga qaytish</button>
        </div>
      </main>
    );
  }
  if (!qs.length) return <main className="round"><p className="muted pad">Bu qoida uchun savol yo'q.</p><button type="button" className="btn dark wide" onClick={back}>Orqaga</button></main>;

  const q = qs[k];
  const good = ans !== null && q.opts[ans] === q.ans;
  const answer = (j: number) => {
    if (ans !== null) return;
    setAns(j);
    const ok = q.opts[j] === q.ans;
    tg.haptic(ok ? "success" : "error");
    if (!q.retry && ok) setFirst((f) => ({ ...f, [`${q.u}.${q.i}`]: (f[`${q.u}.${q.i}`] || 0) + 1 }));
    if (!ok && (q.rc || 0) < 2) setQs([...qs, { ...q, retry: true, rc: (q.rc || 0) + 1, opts: shuffle(q.opts) }]);
  };
  const next = () => {
    if (k + 1 < qs.length) { setK(k + 1); setAns(null); return; }
    // yakun: bitta qoida mashqi natijasi shu qoidaga yoziladi (eng yaxshisi). Aralash mashq faqat yulduzcha beradi —
    // unda har qoidaga 1–2 savol tushadi, natijasi qoidani "o'zlashtirildi" qilmasligi kerak (foydalanuvchi qarori). XP eski yamoq bo'yicha
    const okAll = Object.values(first).reduce((a, b) => a + b, 0);
    if (list.length === 1) {
      const key = ruleKey(bookId, list[0][0], list[0][1]);
      store.set(key, Math.max(store.get<number | null>(key, null) || 0, Math.round((okAll / total) * 100)));
    }
    const xp = okAll / total >= 0.8 ? 15 : 10;
    gain("rule", xp);
    tg.haptic("success");
    report(`qoida: ${title}`, book.title, okAll, total, true);
    setRes({ p: Math.round((okAll / total) * 100), ok: okAll, xp });
  };
  return (
    <main className="round">
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>{title}</b>
        <span className="r-count">{k + 1} / {qs.length}</span>
      </header>
      <div className="r-bar" role="progressbar" aria-valuenow={k} aria-valuemin={0} aria-valuemax={qs.length} aria-label="Mashq"><i style={{ width: `${(k / qs.length) * 100}%` }} /></div>
      <section className="r-card tq">
        {q.retry && <span className="rbadge mid rp-again">Qayta urinish</span>}
        {isArOnly(q.q) ? <Ar className="qz-ar">{q.q}</Ar> : <span dir="ltr"><MixedText text={q.q} /></span>}
      </section>
      <div className="r-opts">
        {q.opts.map((o, j) => {
          const s = ans === null ? "" : o === q.ans ? "ok" : j === ans ? "no" : "dim";
          return (
            <button key={j} type="button" className={`opt ${s} ${isArOnly(o) ? "opt-r" : ""}`} disabled={ans !== null} onClick={() => answer(j)}>
              {isArOnly(o) ? <Ar className="opt-ar">{o}</Ar> : <span dir="ltr"><MixedText text={o} /></span>}
            </button>
          );
        })}
      </div>
      {ans !== null && (
        <div className={`r-fix ${good ? "good" : ""}`} role="status">
          <p><b>{good ? "To'g'ri!" : "Noto'g'ri."}</b>{q.why ? <> <span dir="ltr"><MixedText text={q.why} /></span></> : null}</p>
          <button type="button" className="btn dark wide" onClick={next}>{k + 1 >= qs.length ? "Natija" : "Keyingisi"}</button>
        </div>
      )}
    </main>
  );
}
