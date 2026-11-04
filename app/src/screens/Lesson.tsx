// «Bugungi dars» (eski lesson, SOZ-QOIDA-DARS-SPEC §3): takrorlash vaqti kelgan so'zlar (8 tagacha) + joriy vahdaning 5 ta yangi so'zi
// (tanishuv, keyin tarjimasini yozish) + joriy qoidadan 5 savol. Yakunda {BK}lessons[kun] = 1, qoida natijasi, gain("lesson", 20).
// Tasdiqlangan farqlar: joriy vahda va yangi so'zlar "yodlangan so'zlar" (known) bo'yicha — so'zlari to'liq yodlanmagan birinchi vahda;
// darsdagi xato so'zni yodlanganlardan o'chirmaydi (faqat xatolar daftari va takrorlash jadvali). Kartadagi reja darsning o'zi
// (eskisida qoida va takrorlash qayta tanlanardi); bo'sh dars boshlanmaydi; takrorlashda bir so'z ikki marta chiqmaydi.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, Ruler, Sparkles, Volume2, X } from "lucide-react";
import { say } from "../lib/audio";
import { pctOf } from "../lib/next";
import { allItems, checkTyped, dayNum, errAdd, itemsOf, picOf, SRS_INT, srsOf, usePics, type Item } from "../lib/practice";
import { bkKey } from "../lib/progress";
import { report } from "../lib/report";
import type { RQ } from "../lib/rx";
import { gain, knownOf, markKnown, scheduleSync, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle } from "../lib/words";
import { useNav } from "../state/nav";
import { Ar } from "../ui/kit";
import { MixedText } from "../ui/Mixed";
import { qsFor, ruleBest, rulesIn, unitLbl, useRBook, type RBook } from "./Rules";

type Unit = RBook["units"][number] & { lbl?: string };
export type Plan = { u: Unit; due: Item[]; news: Item[]; rule: [number, number] | null; mins: number };

const lessonsOf = (bid: string) => store.get<Record<string, number>>(bkKey(bid, "lessons"), {});
/** kitob bo'yicha ketma-ket dars kunlari (bugun bo'lmasa — kechadan orqaga) */
export function lessonStreak(bid: string) {
  const D = lessonsOf(bid);
  let c = 0, d = dayNum();
  if (!D[d]) d--;
  while (D[d]) { c++; d--; }
  return c;
}

export function planLesson(book: RBook): Plan {
  const S = srsOf(book.id), t = dayNum();
  const seen = new Set<string>();
  const dueAll: Item[] = [];
  for (const x of allItems(book)) if (S[x.ar] && S[x.ar].d <= t && !seen.has(x.ar)) { seen.add(x.ar); dueAll.push(x); }
  const due = shuffle(dueAll).slice(0, 8);
  const u: Unit = book.units.find((x) => pctOf(x.words, knownOf(book.id, x.n)) < 100) || book.units[book.units.length - 1];
  const K = knownOf(book.id, u.n);
  const news = itemsOf(u).filter((x) => !K[x.ar] && !S[x.ar]).slice(0, 5);
  const R = rulesIn(book, u.n);
  let rule: [number, number] | null = null;
  for (let i = 0; i < R.length; i++) if ((ruleBest(book.id, u.n, i) || 0) < 80) { rule = [u.n, i]; break; }
  if (!rule && R.length) rule = [u.n, Math.floor(Math.random() * R.length)];
  return { u, due, news, rule, mins: Math.max(3, Math.round(due.length * 0.4 + news.length + (rule ? 2 : 0))) };
}

/** darsdagi javob: to'g'ri — keyingi pog'ona va "yodlangan"; xato — xatolar daftari va ertaga takrorlash (yodlangan belgisi qoladi) */
function lessonSrs(book: RBook, it: Item, ok: boolean) {
  if (!ok) errAdd(it.ar, book.id);
  const key = bkKey(book.id, "srs");
  const S = store.get<Record<string, { b: number; d: number }>>(key, {});
  const b = ok ? Math.min((S[it.ar]?.b || 0) + 1, 6) : 1;
  S[it.ar] = { b, d: dayNum() + SRS_INT[b] };
  store.set(key, S);
  if (ok) markKnown(book.id, it.u, it.ar);
  scheduleSync();
}

// ===== bosh sahifadagi karta =====
const WD = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
export function TodayCard({ bookId }: { bookId: string }) {
  const { go } = useNav();
  const book = useRBook(bookId);
  const plan = useMemo(() => (book ? planLesson(book) : null), [book]);
  if (!book || !plan) return null;
  const D = lessonsOf(bookId), t = dayNum();
  const done = !!D[t];
  const empty = !plan.due.length && !plan.news.length && !plan.rule;
  const rule = plan.rule ? rulesIn(book, plan.rule[0])[plan.rule[1]] : null;
  const sk = lessonStreak(bookId);
  return (
    <section className={`card today ${done ? "done" : ""}`} aria-label="Bugungi dars">
      <div className="td-h">
        <span className="td-k">{done ? "Bugungi dars" : `Bugungi dars · ${unitLbl(plan.u)}`}</span>
        {done ? <span className="td-ok"><Check size={15} strokeWidth={3} aria-hidden />Bajarildi</span> : !empty && <span className="muted">≈ {plan.mins} daqiqa</span>}
      </div>
      {done ? (
        <>
          <b className="td-title">Barakalla! Ertaga yangi dars tayyor bo'ladi</b>
          <p className="muted td-p">Xohlasangiz, yana mashq qiling: {plan.due.length ? `${plan.due.length} ta so'z takrorlashni kutyapti.` : "o'yin yoki qoida mashqini tanlang."}</p>
        </>
      ) : (
        <>
          <b className="td-title">{plan.u.uz}</b>
          {empty ? <p className="muted td-p">Bugun takrorlanadigan so'z yo'q. Ertaga yangi dars tayyor bo'ladi.</p> : (
            <ul className="td-list">
              {plan.due.length > 0 && <li><RotateCcw size={17} aria-hidden />{plan.due.length} ta so'zni takrorlash</li>}
              {plan.news.length > 0 && <li><Sparkles size={17} aria-hidden />{plan.news.length} ta yangi so'z</li>}
              {rule && <li><Ruler size={17} aria-hidden />Qoida: {rule.t}</li>}
            </ul>
          )}
        </>
      )}
      <div className="td-week" aria-label={`${sk} kun ketma-ket dars`}>
        <b>{sk} kun ketma-ket</b>
        <span className="td-days">
          {Array.from({ length: 7 }, (_, k) => {
            const i = 6 - k, d = new Date(); d.setDate(d.getDate() - i);
            return <span key={k} className={`${D[t - i] ? "on" : ""} ${i === 0 ? "now" : ""}`}><i>{D[t - i] ? <Check size={11} strokeWidth={3.5} aria-hidden /> : null}</i>{WD[d.getDay()]}</span>;
          })}
        </span>
      </div>
      {!empty && (
        <button type="button" className={`btn ${done ? "ghost" : "primary"} wide`} onClick={() => go("lesson", { book: bookId, plan, n: Date.now() })}>
          {done ? "Yana bir dars" : "Darsni boshlash"}
        </button>
      )}
    </section>
  );
}

// ===== dars =====
type Step = { k: "rev" | "intro" | "type"; it: Item; again?: boolean } | { k: "rq"; q: RQ };

export function LessonScreen({ bookId, plan }: { bookId: string; plan: Plan }) {
  const { back } = useNav();
  const book = useRBook(bookId);
  usePics();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [i, setI] = useState(0);
  const [st, setSt] = useState<null | "ok" | "no" | "show" | number>(null); // number — qoida savolida tanlangan variant
  const [tries, setTries] = useState(0);
  const [val, setVal] = useState("");
  const [rq, setRq] = useState({ ok: 0, n: 0 });
  const [end, setEnd] = useState<{ mins: number; sk: number } | null>(null);
  const t0 = useRef(Date.now());
  const okN = useRef(0); // birinchi urinishda to'g'ri yozilganlar (eski L.ok)
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!book) return;
    const s: Step[] = [];
    plan.due.forEach((it) => s.push({ k: "rev", it }));
    plan.news.forEach((it) => s.push({ k: "intro", it }));
    plan.news.forEach((it) => s.push({ k: "type", it }));
    if (plan.rule) qsFor(book, plan.rule[0], plan.rule[1], 5).forEach((q) => s.push({ k: "rq", q }));
    setSteps(s);
  }, [book]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = steps?.[i];
  useEffect(() => { if (cur && (cur.k === "rev" || cur.k === "type") && st === null) inp.current?.focus({ preventScroll: true }); }, [cur, st]);

  if (!book || !steps) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  const n = steps.length;
  const rule = plan.rule ? rulesIn(book, plan.rule[0])[plan.rule[1]] : null;

  const finish = () => {
    // bir marta: kun belgisi, dars qoidasi natijasi (eng yaxshisi), XP
    const D = lessonsOf(bookId); D[dayNum()] = 1; store.set(bkKey(bookId, "lessons"), D);
    if (plan.rule && rq.n) {
      const key = bkKey(bookId, `rule.${plan.rule[0]}.${plan.rule[1]}`);
      store.set(key, Math.max(store.get<number | null>(key, null) || 0, Math.round((rq.ok / rq.n) * 100)));
    }
    gain("lesson", 20);
    report("bugungi dars", plan.u.uz || "", okN.current + rq.ok, steps.filter((s) => s.k !== "intro").length, true, plan.u.n);
    tg.haptic("success");
    setEnd({ mins: Math.max(1, Math.round((Date.now() - t0.current) / 60000)), sk: lessonStreak(bookId) });
  };
  const next = () => {
    setSt(null); setTries(0); setVal("");
    if (i + 1 >= n) finish();
    setI(i + 1);
    window.scrollTo(0, 0);
  };
  const check = () => {
    if (!cur || cur.k === "rq" || cur.k === "intro") return;
    const r = checkTyped(cur.it, val, "uz");
    if (!r) return;
    if (r !== "no") {
      // "yaqin" javob ham to'g'ri; ikkinchi urinishdagi to'g'ri javob takrorlash uchun xato hisoblanadi (eski)
      if (!tries) okN.current++;
      setSt("ok"); lessonSrs(book, cur.it, tries === 0); gain("fc", tries ? 1 : 3); tg.haptic("success");
    } else {
      const t = tries + 1;
      setTries(t); tg.haptic("error");
      if (t >= 2) {
        setSt("show"); lessonSrs(book, cur.it, false);
        if (cur.k === "rev" && !cur.again) setSteps([...steps, { ...cur, again: true }]);
      } else { setSt("no"); setVal(""); }
    }
  };
  const dunno = () => { if (!cur || cur.k === "rq" || cur.k === "intro") return; setSt("show"); lessonSrs(book, cur.it, false); };
  const pickRq = (k: number) => {
    if (!cur || cur.k !== "rq" || st !== null) return;
    const ok = cur.q.opts[k] === cur.q.ans;
    setSt(k); setRq({ ok: rq.ok + (ok ? 1 : 0), n: rq.n + 1 }); tg.haptic(ok ? "success" : "error");
  };

  const bar = (
    <>
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Darsni to'xtatish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>Bugungi dars</b>
        <span className="r-count">{Math.min(i + 1, n)} / {n}</span>
      </header>
      <div className="r-bar" role="progressbar" aria-valuenow={i} aria-valuemin={0} aria-valuemax={n} aria-label="Dars"><i style={{ width: `${n ? (Math.min(i, n) / n) * 100 : 100}%` }} /></div>
    </>
  );

  if (end || !cur) {
    const e = end || { mins: 1, sk: lessonStreak(bookId) };
    return (
      <main className="round">
        {bar}
        <div className="r-done">
          <span className="ls-done"><Check size={44} strokeWidth={3} aria-hidden /></span>
          <h1>Bugungi dars tugadi</h1>
          <p className="muted">{e.mins} daqiqa · {e.sk} kun ketma-ket</p>
          <div className="ls-sum">
            <span><b>{plan.due.length}</b>so'z takrorlandi</span>
            <span><b>{plan.news.length}</b>yangi so'z</span>
            <span><b>{rq.n ? `${Math.round((rq.ok / rq.n) * 100)}%` : "—"}</b>qoida</span>
          </div>
          <p className="r-earn">+20&nbsp;yulduzcha</p>
          <p className="muted ls-tmr">Ertaga yangi so'zlar va takrorlash vaqti kelgan so'zlar sizni kutadi.</p>
          <button type="button" className="btn primary wide" onClick={back}>Bosh sahifaga</button>
        </div>
      </main>
    );
  }

  if (cur.k === "intro") {
    const pic = picOf(cur.it.ar);
    return (
      <main className="round">
        {bar}
        <p className="ls-kind">Yangi so'z</p>
        <section className="r-card cd-card ls-card">
          {pic && <img className="cd-pic" src={pic} alt="" />}
          <Ar className="ls-word">{cur.it.ar}</Ar>
          <b className="ls-uz">{cur.it.uz}</b>
          {cur.it.hint && <span className="chip">o'zbekchada ham bor: {cur.it.hint}</span>}
          <button type="button" className="btn ghost" onClick={() => void say(cur.it.ar)}><Volume2 size={18} aria-hidden />Tinglash</button>
        </section>
        <button type="button" className="btn primary wide ls-next" onClick={next}>Tushundim</button>
      </main>
    );
  }

  if (cur.k === "rq") {
    const q = cur.q;
    const arOnly = (s: string) => /[؀-ۿ]/.test(s) && !/[A-Za-z]/.test(s);
    return (
      <main className="round">
        {bar}
        <p className="ls-kind">Qoida · {rule?.t}</p>
        <section className="r-card tq">{arOnly(q.q) ? <Ar className="qz-ar">{q.q}</Ar> : <span dir="ltr"><MixedText text={q.q} /></span>}</section>
        <div className="r-opts">
          {q.opts.map((o, k) => {
            const s = st === null ? "" : o === q.ans ? "ok" : k === st ? "no" : "dim";
            return (
              <button key={k} type="button" className={`opt ${s} ${arOnly(o) ? "opt-r" : ""}`} disabled={st !== null} onClick={() => pickRq(k)}>
                {arOnly(o) ? <Ar className="opt-ar">{o}</Ar> : <span dir="ltr"><MixedText text={o} /></span>}
              </button>
            );
          })}
        </div>
        {st !== null && (
          <div className={`r-fix ${typeof st === "number" && q.opts[st] === q.ans ? "good" : ""}`} role="status">
            {q.why && <p><span dir="ltr"><MixedText text={q.why} /></span></p>}
            <button type="button" className="btn dark wide" onClick={next}>Davom etish</button>
          </div>
        )}
      </main>
    );
  }

  // takrorlash va yangi so'zni yozish: arabchadan o'zbekchaga, tarjima ko'rsatilmaydi
  const it = cur.it;
  const pic = picOf(it.ar);
  const shown = st === "ok" || st === "show";
  return (
    <main className="round">
      {bar}
      <p className="ls-kind">{cur.k === "rev" ? "Takrorlash" : "Yozib mustahkamlang"}</p>
      <section className={`r-card cd-card ls-card ${st === "no" ? "shake" : ""}`}>
        {pic && <img className="cd-pic" src={pic} alt="" />}
        <div className="cd-q"><Ar className="ls-word">{it.ar}</Ar><button type="button" className="say" aria-label="Tinglash" onClick={() => void say(it.ar)}><Volume2 size={22} aria-hidden /></button></div>
      </section>
      {!shown && (
        <form className="cd-form" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <input ref={inp} className={`cd-in ${st === "no" ? "no" : ""}`} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Tarjimasini yozing…"
            aria-label="Tarjima" enterKeyHint="done" autoComplete="off" autoCapitalize="off" spellCheck={false} lang="uz" />
          <button type="submit" className="btn primary" disabled={!val.trim()}>Tekshirish</button>
        </form>
      )}
      <p className={`cd-msg ${st === "ok" ? "good" : st === "no" || st === "show" ? "bad" : ""}`} role="status">
        {st === "ok" && <><Check size={16} aria-hidden /> To'g'ri — {it.uz}</>}
        {st === "show" && <>Javob: <b>{it.uz}</b></>}
        {st === "no" && "Yana bir urinib ko'ring"}
      </p>
      {shown
        ? <button type="button" className="btn primary wide ls-next" onClick={next}>Davom etish</button>
        : <button type="button" className="btn ghost wide ls-next" onClick={dunno}>Bilmayman</button>}
    </main>
  );
}
