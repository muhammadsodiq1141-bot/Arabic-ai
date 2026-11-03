// Kartochka (yozib tekshirish) va So'z testi — eski ilova bo'lim tablari bilan bir xil mantiq (MASHQ-SPEC §2, §3).
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lightbulb, RotateCcw, Volume2, X } from "lucide-react";
import { say } from "../lib/audio";
import { loadData } from "../lib/data";
import { checkTyped, errAdd, itemsOf, picOf, srsSet, usePics, type Item, type PBook } from "../lib/practice";
import { bkKey } from "../lib/progress";
import { gain, knownOf, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle, strip } from "../lib/words";
import { useNav } from "../state/nav";
import { CountUp } from "../ui/CountUp";
import { Ar } from "../ui/kit";
import { Scale } from "../ui/Scale";

function useBookP(id: string) {
  const [b, setB] = useState<PBook | null>(null);
  useEffect(() => { loadData<PBook>(`books/${id}`).then(setB).catch(() => {}); }, [id]);
  return b;
}

// ===== Kartochka =====
export function CardsScreen({ bookId, unit }: { bookId: string; unit: number }) {
  const book = useBookP(bookId);
  const pics = usePics();
  if (!book || !pics) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  return <Cards book={book} unit={unit} />;
}

function Cards({ book, unit }: { book: PBook; unit: number }) {
  const { back } = useNav();
  const u = book.units.find((x) => x.n === unit)!;
  const all = useMemo(() => itemsOf(u), [u]);
  const [onlyNew, setOnlyNew] = useState(true);
  const [dir, setDir] = useState<"uz" | "ar">("uz");
  const build = (only: boolean) => { const k = knownOf(book.id, unit); return shuffle(only ? all.filter((x) => !k[x.ar]) : all); };
  const [deck, setDeck] = useState<Item[]>(() => build(true));
  const [val, setVal] = useState("");
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(0);
  const [state, setState] = useState<"ok" | "near" | "no" | "show" | null>(null);
  const [, force] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const card = deck[0];
  const known = Object.keys(knownOf(book.id, unit)).filter((k) => all.some((x) => x.ar === k)).length;

  const nextCard = (learned: boolean) => {
    setDeck((d) => {
      const [c, ...rest] = d;
      return learned && onlyNew ? rest : learned ? rest : [...rest, c]; // yodlangan — ro'yxatdan chiqadi (cheksiz aylanish yo'q)
    });
    setVal(""); setTries(0); setHint(0); setState(null);
  };
  const check = () => {
    if (!card || state) return;
    const r = checkTyped(card, val, dir);
    if (!r) return;
    if (r === "ok" || r === "near") {
      const first = !tries && !hint;
      srsSet(book, card.ar, first); // birinchi urinishda — yodlandi; aks holda takrorlashga va xatolar daftariga
      gain("fc", first ? 3 : 1);
      setState(r); tg.haptic("success");
      timer.current = window.setTimeout(() => nextCard(first), 900);
    } else {
      const t = tries + 1;
      setTries(t); setState(t >= 3 ? "show" : "no"); tg.haptic("error");
      if (t < 3) setTimeout(() => setState((s) => (s === "no" ? null : s)), 1400);
    }
  };
  const answerText = card ? (dir === "uz" ? card.uz : card.ar) : "";
  const hintText = card ? (dir === "ar" ? strip(card.ar).slice(0, hint + 1) : card.uz.slice(0, hint * 2 + 1)) + "…" : "";

  if (!card) {
    return (
      <main className="round">
        <div className="r-done">
          <Scale size={140} />
          <h1>Barakalla!</h1>
          <span className="kb-big">{known} / {all.length}</span>
          <p>Bu vahdadagi hamma so'zni yozib, yodladingiz.</p>
          <button type="button" className="btn primary wide" onClick={() => { setOnlyNew(false); setDeck(build(false)); }}><RotateCcw size={18} aria-hidden />Hammasini takrorlash</button>
          <button type="button" className="btn ghost wide" onClick={back}>Mashqqa qaytish</button>
        </div>
      </main>
    );
  }
  const pic = picOf(card.ar);
  return (
    <main className="round game">
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>Kartochka · {unit}-vahda</b>
        <span className="r-count">{known} / {all.length}</span>
      </header>
      <div className="seg small cd-dir" role="tablist" aria-label="Yo'nalish">
        <button type="button" role="tab" aria-selected={dir === "uz"} className={dir === "uz" ? "on" : ""} onClick={() => { setDir("uz"); setVal(""); setTries(0); setHint(0); setState(null); }}>Tarjimasini yozaman</button>
        <button type="button" role="tab" aria-selected={dir === "ar"} className={dir === "ar" ? "on" : ""} onClick={() => { setDir("ar"); setVal(""); setTries(0); setHint(0); setState(null); }}>Arabchasini yozaman</button>
      </div>
      <section className="r-card cd-card">
        {pic && <img className="cd-pic" src={pic} alt="" />}
        {dir === "uz"
          ? <div className="cd-q"><Ar className="r-ar">{card.ar}</Ar><button type="button" className="say" aria-label="Tinglash" onClick={() => void say(card.ar)}><Volume2 size={22} aria-hidden /></button></div>
          : <b className="cd-uz">{card.uz}</b>}
      </section>
      <form className="cd-form" onSubmit={(e) => { e.preventDefault(); check(); }}>
        <input className={`cd-in ${state || ""}`} dir={dir === "ar" ? "rtl" : "ltr"} lang={dir === "ar" ? "ar" : "uz"} value={val} disabled={!!state && state !== "no"}
          onChange={(e) => setVal(e.target.value)} placeholder={dir === "ar" ? "Arabcha yozing" : "Tarjimasini yozing"} autoComplete="off" autoCapitalize="off" spellCheck={false}
          aria-label={dir === "ar" ? "Arabcha javob" : "Tarjima"} />
        <button type="submit" className="btn primary" disabled={!val.trim() || (!!state && state !== "no")}>Tekshirish</button>
      </form>
      <p className={`cd-msg ${state === "ok" || state === "near" ? "good" : state === "no" || state === "show" ? "bad" : ""}`} role="status">
        {state === "ok" && <><Check size={16} aria-hidden /> To'g'ri! {answerText}</>}
        {state === "near" && <><Check size={16} aria-hidden /> Deyarli to'g'ri! {answerText}</>}
        {state === "no" && `Noto'g'ri, yana urinib ko'ring (${3 - tries} ta imkoniyat)`}
        {state === "show" && <>Javob: {dir === "ar" ? <Ar>{card.ar}</Ar> : <b>{card.uz}</b>}</>}
        {!state && hint > 0 && <>Yordam: {dir === "ar" ? <Ar>{hintText}</Ar> : hintText}</>}
      </p>
      {state === "show" ? (
        <button type="button" className="btn dark wide" onClick={() => nextCard(false)}>Keyingisi</button>
      ) : (
        <div className="r-cmp two">
          <button type="button" className="btn ghost" disabled={!!state && state !== "no"} onClick={() => setHint((h) => h + 1)}><Lightbulb size={18} aria-hidden />Yordam</button>
          <button type="button" className="btn ghost" disabled={!!state && state !== "no"} onClick={() => setState("show")}>Bilmayman</button>
        </div>
      )}
      <div className="cd-foot">
        <span>Bu davrada qoldi: {deck.length} ta so'z</span>
        <button type="button" className="kb-link" onClick={() => { const o = !onlyNew; setOnlyNew(o); setDeck(build(o)); setVal(""); setState(null); force((x) => x + 1); }}>
          {onlyNew ? "Hammasini takrorlash" : "Faqat yodlanmaganlar"}
        </button>
      </div>
    </main>
  );
}

// ===== So'z testi (10 savol) =====
export function WordTestScreen({ bookId, unit }: { bookId: string; unit: number }) {
  const book = useBookP(bookId);
  const [scope, setScope] = useState<"unit" | "upto">(() => (store.get<string>("f.qscope", "unit") === "upto" ? "upto" : "unit"));
  const [run, setRun] = useState(0);
  if (!book) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  return <WordTest key={`${scope}:${run}`} book={book} unit={unit} scope={scope} setScope={(s) => { store.set("f.qscope", s); setScope(s); }} again={() => setRun((x) => x + 1)} />;
}

function WordTest({ book, unit, scope, setScope, again }: { book: PBook; unit: number; scope: "unit" | "upto"; setScope: (s: "unit" | "upto") => void; again: () => void }) {
  const { back } = useNav();
  const qs = useMemo(() => {
    const pool = scope === "unit" ? itemsOf(book.units.find((x) => x.n === unit)!) : book.units.filter((u) => u.n <= unit).flatMap(itemsOf);
    return shuffle(pool).slice(0, Math.min(10, pool.length)).map((it) => {
      const dirAr = Math.random() < 0.5;
      const ds = shuffle(pool.filter((x) => x.ar !== it.ar && x.uz !== it.uz)).slice(0, 3);
      return { it, dirAr, opts: shuffle([it, ...ds]) };
    });
  }, [book, unit, scope]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const wrong = useRef<Item[]>([]);
  const [done, setDone] = useState(false);
  const n = qs.length;
  const finish = (sc: number) => {
    const p = sc / n;
    const k = bkKey(book.id, "tests");
    const T = store.get<Record<string, number>>(k, {});
    T[unit] = Math.max(T[unit] || 0, Math.round(p * 100));
    store.set(k, T);
    gain(p >= 0.8 ? "test80" : "test", 5 + sc);
    for (const w of wrong.current) errAdd(w.ar, book.id);
    setDone(true); tg.haptic("success");
  };
  if (done) {
    const p = score / n;
    return (
      <main className="round">
        <div className="r-done">
          <Scale size={140} balanced={p >= 0.7} star={p >= 0.7} />
          <h1>So'z testi: {Math.round(p * 100)}%</h1>
          <span className="kb-big">{score} / {n}</span>
          <p>{p >= 0.9 ? "A'lo! Bu vahda so'zlarini yaxshi bilasiz." : p >= 0.7 ? "Yaxshi natija. Xatolaringizni kartochkalarda takrorlang." : "So'zlarni kartochkalarda yana takrorlab, testni qayta ishlang."}</p>
          <p className="r-earn"><CountUp to={5 + score} />&nbsp;yulduzcha</p>
          {wrong.current.length > 0 && <div className="g-mist"><b>Takrorlash uchun:</b><ul>{wrong.current.map((w) => <li key={w.ar}><Ar>{w.ar}</Ar><span>{w.uz}</span></li>)}</ul></div>}
          <button type="button" className="btn primary wide" onClick={again}>Yana test ishlash</button>
          <button type="button" className="btn ghost wide" onClick={back}>Mashqqa qaytish</button>
        </div>
      </main>
    );
  }
  const q = qs[i];
  const val = (x: Item) => (q.dirAr ? x.uz : x.ar);
  const answer = (x: Item) => {
    if (pick) return;
    setPick(x.ar);
    if (x.ar === q.it.ar) setScore((s) => s + 1); else wrong.current.push(q.it);
  };
  const next = () => { setPick(null); if (i + 1 >= n) finish(score); else setI(i + 1); };
  return (
    <main className="round game">
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>So'z testi</b>
        <span className="r-count">{i + 1} / {n}</span>
      </header>
      {i === 0 && !pick && (
        <div className="seg small" role="tablist" aria-label="Qamrov">
          <button type="button" role="tab" aria-selected={scope === "unit"} className={scope === "unit" ? "on" : ""} onClick={() => setScope("unit")}>Faqat shu vahda</button>
          <button type="button" role="tab" aria-selected={scope === "upto"} className={scope === "upto" ? "on" : ""} onClick={() => setScope("upto")}>1–{unit}-vahdalar</button>
        </div>
      )}
      <div className="r-bar" role="progressbar" aria-valuenow={i} aria-valuemin={0} aria-valuemax={n} aria-label="Test"><i style={{ width: `${(i / n) * 100}%` }} /></div>
      <p className="r-hint">{q.dirAr ? "Tarjimasini tanlang" : "Arabchasini tanlang"}</p>
      <section className="r-card tq">{q.dirAr ? <Ar className="qz-ar">{q.it.ar}</Ar> : <span>{q.it.uz}</span>}</section>
      <div className="r-opts">
        {q.opts.map((x) => {
          const s = !pick ? "" : x.ar === q.it.ar ? "ok" : x.ar === pick ? "no" : "dim";
          return (
            <button key={x.ar} type="button" className={`opt ${q.dirAr ? "" : "opt-r"} ${s}`} disabled={!!pick} onClick={() => answer(x)}>
              {q.dirAr ? val(x) : <Ar className="opt-ar">{val(x)}</Ar>}
              {s === "ok" && <Check size={20} strokeWidth={3} className="opt-mark" aria-hidden />}{s === "no" && <X size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
            </button>
          );
        })}
      </div>
      {pick && (
        <div className={`r-fix ${pick === q.it.ar ? "good" : ""}`} role="status">
          <p>{pick === q.it.ar ? "To'g'ri!" : <>To'g'ri: {q.dirAr ? <b>{q.it.uz}</b> : <Ar>{q.it.ar}</Ar>}</>} · To'g'ri: {score}</p>
          <button type="button" className="btn dark wide" onClick={next}>{i + 1 >= n ? "Natija" : "Keyingisi"}</button>
        </div>
      )}
    </main>
  );
}
