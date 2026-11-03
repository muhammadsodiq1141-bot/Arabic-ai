// 7 ta so'z o'yini (eski ilova "O'yinlar" tabi bilan bir xil qoidalar; _mahalliy/MASHQ-SPEC.md §1).
// Yakunda (bir sessiyada bir marta): gain("game", 10) va rekord {BK}best.<o'yin>.<vahda> (Juftini top — kamroq urinish yaxshi).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Delete, Eraser, Heart, X } from "lucide-react";
import { loadData } from "../lib/data";
import { AB, bestKey, emoOf, itemsOf, picOf, poolFor, usePics, type Item, type PBook } from "../lib/practice";
import { gain, saveRecord, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle, strip } from "../lib/words";
import { useNav } from "../state/nav";
import { CountUp } from "../ui/CountUp";
import { Ar } from "../ui/kit";
import { Scale } from "../ui/Scale";

export const GAME_NAMES: Record<string, string> = {
  match: "Juftini top", pic: "Rasmni top", bubble: "Pufakchalar", million: "Million so'm", letters: "Harflardan yig'", speed: "60 soniya", order: "Gapni tartibla", synant: "Sinonim va antonim",
};
const LOWER = new Set(["match"]);
const pickN = <T,>(a: T[], n: number) => shuffle(a).slice(0, n);

export function GameScreen({ bookId, unit, game }: { bookId: string; unit: number; game: string }) {
  const [book, setBook] = useState<PBook | null>(null);
  const [run, setRun] = useState(0); // "Yana o'ynash" — yangi sessiya
  const pics = usePics();
  useEffect(() => { loadData<PBook>(`books/${bookId}`).then(setBook).catch(() => {}); }, [bookId]);
  if (!book || !pics) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  const p = { book, unit, onAgain: () => setRun((x) => x + 1) };
  if (game === "match") return <Match key={run} {...p} />;
  if (game === "pic") return <Pic key={run} {...p} />;
  if (game === "bubble") return <Bubble key={run} {...p} />;
  if (game === "million") return <Million key={run} {...p} />;
  if (game === "letters") return <Letters key={run} {...p} />;
  if (game === "speed") return <Speed key={run} {...p} />;
  if (game === "order") return <Order key={run} {...p} />;
  return <main className="round"><p className="muted pad">O'yin topilmadi.</p></main>;
}

type GP = { book: PBook; unit: number; onAgain: () => void };

/** O'yin tugadi: XP va rekord — faqat bir marta */
function useFinish(book: PBook, unit: number, game: string) {
  const done = useRef(false);
  return (score: number) => {
    if (done.current) return false;
    done.current = true;
    gain("game", 10);
    tg.haptic("success");
    return saveRecord(bestKey(book.id, game, unit), score, LOWER.has(game));
  };
}

function Head({ title, stat }: { title: string; stat?: ReactNode }) {
  const { back } = useNav();
  return (
    <header className="r-top">
      <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
      <b>{title}</b>
      <span className="r-count">{stat}</span>
    </header>
  );
}

function End({ title, big, sub, good, record, wrong, onAgain }: { title: string; big: string; sub: string; good: boolean; record?: boolean; wrong?: { ar: string; uz: string }[]; onAgain: () => void }) {
  const { back } = useNav();
  const uniq = wrong ? [...new Map(wrong.map((w) => [w.ar, w])).values()] : [];
  return (
    <main className="round">
      <div className="r-done">
        <Scale size={140} balanced={good} star={good} />
        <h1>{title}</h1>
        <span className="kb-big">{big}</span>
        <p>{sub}</p>
        {record && <span className="g-rec">Yangi rekord!</span>}
        <p className="r-earn"><CountUp to={10} />&nbsp;yulduzcha</p>
        {uniq.length > 0 && (
          <div className="g-mist"><b>Takrorlash uchun:</b>
            <ul>{uniq.slice(0, 8).map((w) => <li key={w.ar}><Ar>{w.ar}</Ar><span>{w.uz}</span></li>)}</ul>
          </div>
        )}
        <button type="button" className="btn primary wide" onClick={onAgain}>Yana o'ynash</button>
        <button type="button" className="btn ghost wide" onClick={back}>Boshqa o'yin</button>
      </div>
    </main>
  );
}

// ===== 1. Juftini top =====
function Match({ book, unit, onAgain }: GP) {
  const u = book.units.find((x) => x.n === unit)!;
  const cards = useMemo(() => {
    const its = pickN(itemsOf(u), 6);
    return shuffle(its.flatMap((it) => [{ it, face: "ar" as const }, { it, face: picOf(it.ar) ? ("pic" as const) : ("uz" as const) }]));
  }, [u]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const t0 = useRef(Date.now());
  const finish = useFinish(book, unit, "match");
  const [res, setRes] = useState<{ rec: boolean; sec: number } | null>(null);

  const tap = (k: number) => {
    const c = cards[k];
    if (lock || open.includes(k) || done.includes(c.it.ar)) return;
    const o = [...open, k];
    if (o.length < 2) { setOpen(o); return; }
    setMoves((m) => m + 1);
    if (cards[o[0]].it.ar === c.it.ar) {
      const d = [...done, c.it.ar];
      setDone(d); setOpen([]); tg.haptic("light");
      if (d.length === 6) { const m = moves + 1; setRes({ rec: finish(m), sec: Math.round((Date.now() - t0.current) / 1000) }); }
    } else { setOpen(o); setLock(true); setTimeout(() => { setOpen([]); setLock(false); }, 900); }
  };
  if (res) return <End title="Hamma juftlar topildi!" big={`${moves} urinish`} sub={`${res.sec} soniyada`} good={moves <= 12} record={res.rec} onAgain={onAgain} />;
  return (
    <main className="round game">
      <Head title="Juftini top" stat={`${done.length}/6`} />
      <p className="r-hint">Ikkita kartochkani oching: rasm yoki tarjimani arabcha so'z bilan juftlang. Urinish: {moves}</p>
      <div className="mt-grid">
        {cards.map((c, k) => {
          const shown = open.includes(k) || done.includes(c.it.ar);
          return (
            <button key={k} type="button" className={`mc ${shown ? "up" : ""} ${done.includes(c.it.ar) ? "ok" : ""}`} onClick={() => tap(k)}
              aria-label={shown ? (c.face === "ar" ? c.it.ar : c.it.uz) : "Yopiq kartochka"}>
              {!shown ? <span className="mc-back" aria-hidden /> : c.face === "ar" ? <Ar className="mc-ar">{c.it.ar}</Ar>
                : c.face === "pic" ? <><img src={picOf(c.it.ar)!} alt="" /><small>{c.it.uz}</small></> : <span className="mc-uz">{c.it.uz}</span>}
            </button>
          );
        })}
      </div>
    </main>
  );
}

// ===== 2. Rasmni top =====
function Pic({ book, unit, onAgain }: GP) {
  const qs = useMemo(() => {
    const pool = poolFor(book, unit, (x) => !!picOf(x.ar), 4);
    return pickN(pool, Math.min(8, pool.length)).map((it) => {
      const others = pickN(pool.filter((x) => x.ar !== it.ar && emoOf(x.ar) !== emoOf(it.ar)), 3);
      return { it, opts: shuffle([it, ...others]) };
    });
  }, [book, unit]);
  return <Choice4 book={book} unit={unit} game="pic" qs={qs} onAgain={onAgain} />;
}

function Choice4({ book, unit, game, qs, onAgain }: GP & { game: string; qs: { it: Item; opts: Item[] }[] }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<Item[]>([]);
  const [res, setRes] = useState<boolean | null>(null);
  const finish = useFinish(book, unit, game);
  const n = qs.length;
  if (res !== null || !n) {
    const p = n ? score / n : 0;
    return <End title={p === 1 ? "A'lo!" : "Yaxshi!"} big={`${score} / ${n}`} sub="to'g'ri javob" good={p >= 0.7} record={!!res} wrong={wrong} onAgain={onAgain} />;
  }
  const q = qs[i];
  const answer = (o: Item) => {
    if (pick) return;
    setPick(o.ar);
    if (o.ar === q.it.ar) { setScore((s) => s + 1); tg.haptic("light"); } else { setWrong((w) => [...w, q.it]); tg.haptic("error"); }
  };
  const next = () => { setPick(null); if (i + 1 >= n) setRes(finish(score)); else setI(i + 1); };
  return (
    <main className="round game">
      <Head title="Rasmni top" stat={`${i + 1}/${n} · ${score}`} />
      <div className="r-img g-pic"><img src={picOf(q.it.ar)!} alt="Rasm" /></div>
      <p className="r-hint">Bu nima? Arabchasini tanlang.</p>
      <div className="r-opts">
        {q.opts.map((o) => {
          const s = !pick ? "" : o.ar === q.it.ar ? "ok" : o.ar === pick ? "no" : "dim";
          return <button key={o.ar} type="button" className={`opt opt-r ${s}`} disabled={!!pick} onClick={() => answer(o)}><Ar className="opt-ar">{o.ar}</Ar>
            {s === "ok" && <Check size={20} strokeWidth={3} className="opt-mark" aria-hidden />}{s === "no" && <X size={20} strokeWidth={3} className="opt-mark" aria-hidden />}</button>;
        })}
      </div>
      {pick && (
        <div className={`r-fix ${pick === q.it.ar ? "good" : ""}`} role="status">
          <p>{pick === q.it.ar ? "To'g'ri! " : "To'g'ri javob: "}<Ar>{q.it.ar}</Ar> — {q.it.uz}</p>
          <button type="button" className="btn dark wide" onClick={next}>{i + 1 >= n ? "Natija" : "Keyingisi"}</button>
        </div>
      )}
    </main>
  );
}

// ===== 3. Pufakchalar =====
const BUB_COLORS = ["b1", "b2", "b3", "b4"];
function Bubble({ book, unit, onAgain }: GP) {
  const pool = useMemo(() => itemsOf(book.units.find((x) => x.n === unit)!), [book, unit]);
  const [stage, setStage] = useState<"ready" | "play" | "end">("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState<{ it: Item; opts: Item[]; dur: number; delays: number[]; id: number } | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [popped, setPopped] = useState<string | null>(null);
  const [wrong, setWrong] = useState<Item[]>([]);
  const [rec, setRec] = useState(false);
  const finish = useFinish(book, unit, "bubble");
  const best = store.get<number | null>(bestKey(book.id, "bubble", unit), null);
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const newRound = (sc: number) => {
    const it = pool[Math.floor(Math.random() * pool.length)];
    const others = pickN(pool.filter((x) => x.ar !== it.ar && x.uz !== it.uz), 3);
    const dur = Math.max(3.6, 7.5 - sc * 0.25) * (reduce ? 1.6 : 1);
    setRound({ it, opts: shuffle([it, ...others]), dur, delays: [0, 1, 2, 3].map(() => Math.random() * 0.9), id: Date.now() });
    setGone([]); setPopped(null);
  };
  const lose = (it?: Item) => {
    if (it) setWrong((w) => (w.some((x) => x.ar === it.ar) ? w : [...w, it]));
    setLives((l) => {
      const nl = l - 1;
      if (nl <= 0) setTimeout(() => { setRec(finish(score)); setStage("end"); }, 350);
      return nl;
    });
  };
  if (stage === "end") return <End title="O'yin tugadi!" big={`${score} ball`} sub={rec ? "Yangi rekord!" : "Yana urinib ko'ring"} good={score >= 8} record={rec} wrong={wrong} onAgain={onAgain} />;
  if (stage === "ready") {
    return (
      <main className="round game">
        <Head title="Pufakchalar" />
        <section className="g-ready">
          <p>Tepada o'zbekcha so'z chiqadi. Pastdan arabcha so'zli pufakchalar uchib chiqadi: to'g'risini qochib ketmasidan bosing! 3 ta jon bor, har to'g'ri javobdan keyin pufakchalar tezlashadi.</p>
          {best !== null && <p className="g-best">Rekordingiz: {best}</p>}
          <button type="button" className="btn primary wide" onClick={() => { setStage("play"); newRound(0); }}>Boshlash</button>
        </section>
      </main>
    );
  }
  return (
    <main className="round game">
      <Head title="Pufakchalar" stat={<span className="g-lives" aria-label={`${lives} jon, ${score} ball`}>{[0, 1, 2].map((k) => <Heart key={k} size={16} className={k < lives ? "on" : ""} aria-hidden />)} {score}</span>} />
      <p className="g-target">Arabchasini ushlang: <b>{round?.it.uz}</b></p>
      <div className="bub-arena" key={round?.id}>
        {round?.opts.map((o, k) => !gone.includes(o.ar) && (
          <button key={o.ar} type="button" className={`bub ${BUB_COLORS[k]} ${popped === o.ar ? "pop" : ""}`}
            style={{ left: `${4 + k * 24}%`, animationDuration: `${round.dur}s`, animationDelay: `${round.delays[k]}s` }}
            onAnimationEnd={(e) => {
              if (e.animationName !== "bub-up" || o.ar !== round.it.ar || popped) return;
              lose(round.it); if (lives > 1) newRound(score);
            }}
            onClick={() => {
              if (popped) return;
              if (o.ar === round.it.ar) { setPopped(o.ar); tg.haptic("light"); const sc = score + 1; setScore(sc); setTimeout(() => newRound(sc), 380); }
              else { tg.haptic("error"); setGone((g) => [...g, o.ar]); lose(round.it); }
            }}>
            <Ar>{o.ar}</Ar>
          </button>
        ))}
      </div>
    </main>
  );
}

// ===== 4. Million so'm =====
const LADDER = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 300000, 500000, 1000000];
const SAFE = [3, 7]; // 0 dan sanaladi: 4-savol (5 000) va 8-savol (100 000 so'm) kafolatlanadi
const som = (n: number) => `${n.toLocaleString("ru-RU")} so'm`;
const short = (n: number) => (n >= 1e6 ? "1 mln" : n >= 1000 ? `${n / 1000}k` : String(n));
function Million({ book, unit, onAgain }: GP) {
  const base = useMemo(() => book.units.filter((u) => u.n <= unit).flatMap(itemsOf), [book, unit]);
  const pool = useMemo(() => {
    const own = shuffle(itemsOf(book.units.find((x) => x.n === unit)!));
    const seen = new Set<string>(), out: Item[] = [];
    for (const x of [...own, ...shuffle(base)]) if (!seen.has(x.ar)) { seen.add(x.ar); out.push(x); if (out.length >= 14) break; }
    return out;
  }, [book, unit, base]);
  const make = (it: Item, i: number) => {
    const ds = pickN(base.filter((x) => x.ar !== it.ar && x.uz !== it.uz && (i < 6 || x.u === it.u)), 3);
    const opts = shuffle([it, ...ds]);
    return { it, opts, dirAr: i % 2 === 0 };
  };
  const [qi, setQi] = useState(1); // hovuzdan olingan savollar soni
  const [i, setI] = useState(0);
  const [q, setQ] = useState(() => make(pool[0], 0));
  const [pick, setPick] = useState<string | null>(null);
  const [hide, setHide] = useState<string[]>([]);
  const [used, setUsed] = useState({ half: false, swap: false });
  const [end, setEnd] = useState<{ correct: number; rec: boolean } | null>(null);
  const finish = useFinish(book, unit, "million");

  if (end) {
    const won = end.correct >= 12;
    const safe = SAFE.filter((s) => s < end.correct);
    const money = won ? 1000000 : safe.length ? LADDER[safe[safe.length - 1]] : 0;
    return <End title={won ? "Siz millioner bo'ldingiz!" : "O'yin tugadi"} big={som(money)} sub={won ? "Barcha 12 savolga to'g'ri javob berdingiz" : `${end.correct} ta savolga to'g'ri javob`} good={end.correct >= 8} record={end.rec} onAgain={onAgain} />;
  }
  const val = (x: Item) => (q.dirAr ? x.uz : x.ar);
  const ok = pick !== null && pick === q.it.ar;
  const answer = (x: Item) => { if (pick) return; setPick(x.ar); tg.haptic(x.ar === q.it.ar ? "light" : "error"); };
  const stop = (correct: number) => setEnd({ correct, rec: finish(correct >= 12 ? 12 : correct) });
  const next = () => {
    const ni = i + 1;
    if (ni >= 12 || qi >= pool.length) { stop(ni); return; }
    setI(ni); setQ(make(pool[qi], ni)); setQi(qi + 1); setPick(null); setHide([]);
  };
  return (
    <main className="round game">
      <Head title="Million so'm" stat={som(i ? LADDER[i - 1] : 0)} />
      <ol className="ml-ladder" aria-label="Pog'onalar">
        {LADDER.map((v, k) => <li key={k} className={`${k === i ? "now" : k < i ? "past" : ""} ${SAFE.includes(k) ? "safe" : ""}`}>{short(v)}</li>)}
      </ol>
      <p className="r-hint">{i + 1}-savol · {som(LADDER[i])}</p>
      <section className="r-card tq">
        {q.dirAr ? <><Ar className="qz-ar">{q.it.ar}</Ar><small className="qz-hint">Bu so'zning tarjimasi qaysi?</small></> : <span>«{q.it.uz}» arabchada qanday?</span>}
      </section>
      <div className="r-opts">
        {q.opts.map((x, k) => {
          if (hide.includes(x.ar)) return <span key={x.ar} className="opt ghost" aria-hidden />;
          const s = !pick ? "" : x.ar === q.it.ar ? "ok" : x.ar === pick ? "no" : "dim";
          return (
            <button key={x.ar} type="button" className={`opt ${q.dirAr ? "" : "opt-r"} ${s}`} disabled={!!pick} onClick={() => answer(x)}>
              <span className="ml-k">{"ABCD"[k]}</span>{q.dirAr ? val(x) : <Ar className="opt-ar">{val(x)}</Ar>}
            </button>
          );
        })}
      </div>
      {!pick && (
        <div className="ml-help">
          <button type="button" className="btn ghost" disabled={used.half} onClick={() => { setUsed({ ...used, half: true }); setHide(pickN(q.opts.filter((x) => x.ar !== q.it.ar), 2).map((x) => x.ar)); }}>50 : 50</button>
          <button type="button" className="btn ghost" disabled={used.swap || qi >= pool.length} onClick={() => { setUsed({ ...used, swap: true }); setQ(make(pool[qi], i)); setQi(qi + 1); setHide([]); }}>Almashtirish</button>
        </div>
      )}
      {pick && (
        <div className={`r-fix ${ok ? "good" : ""}`} role="status">
          <p>{ok ? `To'g'ri! +${som(LADDER[i])}` : <>Afsus, noto'g'ri. To'g'risi: {q.dirAr ? <b>{q.it.uz}</b> : <Ar>{q.it.ar}</Ar>}</>}</p>
          <button type="button" className="btn dark wide" onClick={() => (ok ? next() : stop(i))}>{ok ? (i === 11 ? "Yakunlash" : "Keyingi savol") : "Natija"}</button>
        </div>
      )}
    </main>
  );
}

// ===== 5. Harflardan yig' =====
const okLetters = (x: Item) => { const s = strip(x.ar); return !/[\s×]/.test(s) && s.length >= 3 && s.length <= 7; };
function Letters({ book, unit, onAgain }: GP) {
  const qs = useMemo(() => {
    const pool = poolFor(book, unit, okLetters, 6);
    return pickN(pool, Math.min(8, pool.length)).map((it) => {
      const L = Array.from(strip(it.ar));
      const extra = pickN(Array.from(AB).filter((c) => !L.includes(c)), 2);
      return { it, L, tiles: shuffle([...L, ...extra]).map((c, id) => ({ c, id })) };
    });
  }, [book, unit]);
  const [i, setI] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [state, setState] = useState<"ok" | "no" | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<Item[]>([]);
  const [res, setRes] = useState<boolean | null>(null);
  const finish = useFinish(book, unit, "letters");
  const n = qs.length;
  if (res !== null || !n) { const p = n ? score / n : 0; return <End title={p === 1 ? "A'lo!" : "Barakalla!"} big={`${score} / ${n}`} sub="so'z to'g'ri yozildi" good={p >= 0.7} record={!!res} wrong={wrong} onAgain={onAgain} />; }
  const q = qs[i];
  const check = (b: number[]) => {
    if (b.length !== q.L.length) return;
    const ok = b.map((id) => q.tiles[id].c).join("") === strip(q.it.ar);
    setState(ok ? "ok" : "no");
    if (ok) { setScore((s) => s + 1); tg.haptic("light"); } else { setWrong((w) => [...w, q.it]); tg.haptic("error"); }
  };
  const add = (id: number) => { if (state) return; const b = [...built, id]; setBuilt(b); check(b); };
  const next = () => { setBuilt([]); setState(null); if (i + 1 >= n) setRes(finish(score + 0)); else setI(i + 1); };
  const pic = picOf(q.it.ar);
  return (
    <main className="round game">
      <Head title="Harflardan yig'" stat={`${i + 1}/${n} · ${score}`} />
      {pic && <div className="g-smallpic"><img src={pic} alt="" /></div>}
      <p className="r-hint">Shu so'zni arabcha yozing:</p>
      <p className="g-word">{q.it.uz}</p>
      <div className={`lt-slots ${state || ""}`} dir="rtl">
        {q.L.map((_, k) => (
          <button key={k} type="button" className={`lt-slot ${built[k] !== undefined ? "on" : ""}`} disabled={!!state || built[k] === undefined}
            onClick={() => setBuilt(built.slice(0, k))} aria-label={built[k] !== undefined ? `${k + 1}-harfni o'chirish` : `${k + 1}-katak`}>
            {built[k] !== undefined && <Ar>{q.tiles[built[k]].c}</Ar>}
          </button>
        ))}
      </div>
      <div className="kb-tiles" dir="rtl">
        {q.tiles.map((t) => <button key={t.id} type="button" className={`tile ${built.includes(t.id) ? "ghost" : ""}`} disabled={!!state || built.includes(t.id)} onClick={() => add(t.id)}><Ar>{t.c}</Ar></button>)}
      </div>
      {!state && (
        <div className="r-cmp two">
          <button type="button" className="btn ghost" disabled={!built.length} onClick={() => setBuilt(built.slice(0, -1))}><Delete size={18} aria-hidden />O'chirish</button>
          <button type="button" className="btn ghost" onClick={() => { setState("no"); setWrong((w) => [...w, q.it]); }}>Bilmayman</button>
        </div>
      )}
      {state && (
        <div className={`r-fix ${state === "ok" ? "good" : ""}`} role="status">
          <p>{state === "ok" ? "To'g'ri! " : "To'g'ri yozilishi: "}<Ar>{q.it.ar}</Ar></p>
          <button type="button" className="btn dark wide" onClick={next}>{i + 1 >= n ? "Natija" : "Keyingisi"}</button>
        </div>
      )}
    </main>
  );
}

// ===== 6. 60 soniya =====
function Speed({ book, unit, onAgain }: GP) {
  const pool = useMemo(() => itemsOf(book.units.find((x) => x.n === unit)!), [book, unit]);
  const [stage, setStage] = useState<"ready" | "play" | "end">("ready");
  const [left, setLeft] = useState(60);
  const [ok, setOk] = useState(0);
  const [bad, setBad] = useState(0);
  const [wrong, setWrong] = useState<Item[]>([]);
  const [rec, setRec] = useState(false);
  const make = () => {
    const it = pool[Math.floor(Math.random() * pool.length)];
    const truth = Math.random() < 0.5;
    const other = pool.filter((x) => x.uz !== it.uz);
    return { it, truth: truth || !other.length, shown: truth || !other.length ? it.uz : other[Math.floor(Math.random() * other.length)].uz };
  };
  const [q, setQ] = useState(make);
  const finish = useFinish(book, unit, "speed");
  const okRef = useRef(0);
  okRef.current = ok;
  useEffect(() => {
    if (stage !== "play") return;
    const h = setInterval(() => setLeft((l) => {
      if (l <= 1) { clearInterval(h); setRec(finish(okRef.current)); setStage("end"); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(h);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const best = store.get<number | null>(bestKey(book.id, "speed", unit), null);
  if (stage === "end") return <End title="Vaqt tugadi!" big={`${ok} ta`} sub={`to'g'ri javob, ${bad} ta xato`} good={ok >= 12} record={rec} wrong={wrong} onAgain={onAgain} />;
  if (stage === "ready") {
    return (
      <main className="round game">
        <Head title="60 soniya" />
        <section className="g-ready">
          <span className="sp-ring big" aria-hidden>60</span>
          <p>Arabcha so'z va tarjima chiqadi. Tarjima to'g'ri bo'lsa «To'g'ri», noto'g'ri bo'lsa «Noto'g'ri» tugmasini bosing. Xato uchun ball ayirilmaydi.</p>
          {best !== null && <p className="g-best">Rekordingiz: {best} ta</p>}
          <button type="button" className="btn primary wide" onClick={() => setStage("play")}>Boshlash</button>
        </section>
      </main>
    );
  }
  const answer = (yes: boolean) => {
    if (yes === q.truth) { setOk((x) => x + 1); tg.haptic("light"); } else { setBad((x) => x + 1); setWrong((w) => [...w, q.it]); tg.haptic("error"); }
    setQ(make());
  };
  return (
    <main className="round game">
      <Head title="60 soniya" stat={`${ok} ✓ · ${bad} ✗`} />
      <span className={`sp-ring ${left <= 10 ? "low" : ""}`} role="timer" aria-label={`${left} soniya qoldi`} style={{ ["--p" as string]: `${(left / 60) * 100}` }}>{left}</span>
      <p className="r-hint">To'g'rimi?</p>
      <section className="r-card tq sp-card"><Ar className="qz-ar">{q.it.ar}</Ar><b className="sp-tr">{q.shown}</b></section>
      <div className="kb-tf">
        <button type="button" className="opt" onClick={() => answer(false)}><X size={20} aria-hidden />Noto'g'ri</button>
        <button type="button" className="opt" onClick={() => answer(true)}><Check size={20} aria-hidden />To'g'ri</button>
      </div>
    </main>
  );
}

// ===== 7. Gapni tartibla =====
function Order({ book, unit, onAgain }: GP) {
  const qs = useMemo(() => {
    const S = book.sent || {};
    const own = shuffle(S[unit] || []);
    const prev = pickN(Object.entries(S).filter(([k]) => +k < unit).flatMap(([, v]) => v), 2);
    return [...own, ...prev].map(([ar, uz]) => {
      const parts = ar.split(" ");
      let t = shuffle(parts);
      for (let k = 0; k < 10 && t.join(" ") === ar && parts.length > 1; k++) t = shuffle(parts);
      return { ar, uz, tiles: t.map((w, id) => ({ w, id })) };
    });
  }, [book, unit]);
  const [i, setI] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [state, setState] = useState<"ok" | "no" | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<{ ar: string; uz: string }[]>([]);
  const [res, setRes] = useState<boolean | null>(null);
  const finish = useFinish(book, unit, "order");
  const n = qs.length;
  if (res !== null || !n) { const p = n ? score / n : 0; return <End title={p === 1 ? "A'lo!" : "Barakalla!"} big={`${score} / ${n}`} sub="gap to'g'ri tuzildi" good={p >= 0.6} record={!!res} wrong={wrong} onAgain={onAgain} />; }
  const q = qs[i];
  const check = () => {
    const ok = built.map((id) => q.tiles[id].w).join(" ") === q.ar;
    setState(ok ? "ok" : "no");
    if (ok) { setScore((s) => s + 1); tg.haptic("light"); } else { setWrong((w) => [...w, { ar: q.ar, uz: q.uz }]); tg.haptic("error"); }
  };
  const next = () => { setBuilt([]); setState(null); if (i + 1 >= n) setRes(finish(score)); else setI(i + 1); };
  return (
    <main className="round game">
      <Head title="Gapni tartibla" stat={`${i + 1}/${n} · ${score}`} />
      <p className="r-hint">Shu gapni arabcha tuzing (o'ngdan chapga):</p>
      <p className="g-word">{q.uz}</p>
      <div className={`kb-line ${state === "ok" ? "ok" : state === "no" ? "bad" : ""}`} dir="rtl">
        {built.length ? built.map((id, k) => <button key={k} type="button" className="tile on" disabled={!!state} onClick={() => setBuilt(built.filter((_, j) => j !== k))}><Ar>{q.tiles[id].w}</Ar></button>)
          : <span className="muted kb-ph">Pastdagi so'zlarni tartib bilan bosing</span>}
      </div>
      <div className="kb-tiles" dir="rtl">
        {q.tiles.map((t) => <button key={t.id} type="button" className={`tile ${built.includes(t.id) ? "ghost" : ""}`} disabled={!!state || built.includes(t.id)} onClick={() => setBuilt([...built, t.id])}><Ar>{t.w}</Ar></button>)}
      </div>
      {!state && (
        <div className="r-cmp two">
          <button type="button" className="btn ghost" disabled={!built.length} onClick={() => setBuilt([])}><Eraser size={18} aria-hidden />Tozalash</button>
          <button type="button" className="btn primary" disabled={built.length !== q.tiles.length} onClick={check}>Tekshirish</button>
        </div>
      )}
      {state && (
        <div className={`r-fix ${state === "ok" ? "good" : ""}`} role="status">
          <p>{state === "ok" ? "To'g'ri!" : <>To'g'risi: <Ar className="g-sent">{q.ar}</Ar></>}</p>
          <button type="button" className="btn dark wide" onClick={next}>{i + 1 >= n ? "Natija" : "Keyingisi"}</button>
        </div>
      )}
    </main>
  );
}

/** O'yinni o'ynash mumkinmi (savol yetadimi) — menyuda ko'rsatish uchun */
export function gameAvailable(book: PBook, unit: number, game: string) {
  const u = book.units.find((x) => x.n === unit);
  if (!u) return false;
  if (game === "order") return !!(book.sent?.[unit]?.length);
  if (game === "pic") return poolFor(book, unit, (x) => !!picOf(x.ar), 4).length >= 4;
  if (game === "letters") return poolFor(book, unit, okLetters, 6).length >= 3;
  return itemsOf(u).length >= 6 || game !== "match";
}
