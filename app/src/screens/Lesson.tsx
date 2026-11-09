// «Bugungi dars» (eski lesson, SOZ-QOIDA-DARS-SPEC §3): takrorlash vaqti kelgan so'zlar (8 tagacha) + joriy vahdaning 5 ta yangi so'zi
// (tanishuv, keyin tarjimasini yozish) + joriy qoidadan 3 savol (13-partiyagacha 5). Yakunda {BK}lessons[kun] = 1, qoida natijasi, gain("lesson", 20).
// Tasdiqlangan farqlar: joriy vahda va yangi so'zlar "yodlangan so'zlar" (known) bo'yicha — so'zlari to'liq yodlanmagan birinchi vahda;
// darsdagi xato so'zni yodlanganlardan o'chirmaydi (faqat xatolar daftari va takrorlash jadvali). Kartadagi reja darsning o'zi
// (eskisida qoida va takrorlash qayta tanlanardi); bo'sh dars boshlanmaydi; takrorlashda bir so'z ikki marta chiqmaydi.
// 12-partiya (A3): yangi so'z shu kuni 3 soatdan keyin yana qaytadi; 2+ pog'onadagi so'zlarning yarmi teskari yo'nalishda
// (o'zbekchadan arabchani eslash, o'zi baholaydi); chalkashadigan juftlar (sinonim/antonim, bir harf farqi) bitta darsga tushmaydi.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Volume2, X } from "lucide-react";
import { say } from "../lib/audio";
import { nextStep, pctOf } from "../lib/next";
import { isReadStep, kbKeyOf, loadKb, type KbLesson } from "../lib/kb";
import { STRANDS, strandToday, strandWeek, type Strand } from "../lib/strand";
import { goalOf, MIX } from "../lib/goal";
import type { Book } from "../lib/progress";
import { allItems, checkTyped, confusable, dayNum, errAdd, isDue, itemsOf, LATER_MS, picOf, SRS_INT, srsOf, usePics, type Item } from "../lib/practice";
import { loadData } from "../lib/data";
import { bkKey, dayKey } from "../lib/progress";
import { report } from "../lib/report";
import type { RQ } from "../lib/rx";
import { gain, knownOf, markKnown, scheduleSync, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle } from "../lib/words";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { toast } from "../ui/Toast";
import { useMults } from "./Mult";
import { shDaily } from "./Shadow";
import { spkAll } from "./Speak";
import { Ar } from "../ui/kit";
import { MixedText } from "../ui/Mixed";
import { streakNow } from "../lib/motiv";
import { qsFor, ruleBest, rulesIn, useRBook, type RBook } from "./Rules";
import { GainNote } from "../ui/GainNote";

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

/** kitobdagi sinonim/antonim juftlari (wf kartalari) — chalkashadigan so'zlarni bir darsga qo'ymaslik uchun */
export function useRel(bid: string) {
  const [rel, setRel] = useState<Set<string> | undefined>(undefined);
  useEffect(() => {
    let a = true;
    loadData<Record<string, { syn?: string[][]; ant?: string[][] }>>(`wf/${bid}`).then((wf) => {
      const s = new Set<string>();
      for (const [k, c] of Object.entries(wf || {})) { const ar = k.split("#")[0]; for (const p of [...(c.syn || []), ...(c.ant || [])]) if (p?.[0]) s.add(`${ar}|${p[0]}`); }
      if (a) setRel(s);
    }).catch(() => a && setRel(new Set()));
    return () => { a = false; };
  }, [bid]);
  return rel;
}

export function planLesson(book: RBook, rel?: Set<string>): Plan {
  const S = srsOf(book.id), t = dayNum();
  const seen = new Set<string>();
  const dueAll: Item[] = [];
  for (const x of allItems(book)) if (isDue(S[x.ar], t) && !seen.has(x.ar)) { seen.add(x.ar); dueAll.push(x); }
  // chalkashadigan juftlikdan bittasi keyingi darsga qoladi (Nation, 32-bet: birga o'rganilsa 50–100% qiyinroq)
  const due: Item[] = [];
  for (const x of shuffle(dueAll)) { if (due.length >= 8) break; if (!due.some((y) => confusable(x.ar, y.ar, rel))) due.push(x); }
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
function lessonSrs(book: RBook, it: Item, ok: boolean, fresh = false) {
  if (!ok) errAdd(it.ar, book.id);
  const key = bkKey(book.id, "srs");
  const S = store.get<Record<string, { b: number; d: number; h?: number }>>(key, {});
  const b = ok ? Math.min((S[it.ar]?.b || 0) + 1, 6) : 1;
  // yangi so'z to'g'ri yozilsa — shu kuni 3 soatdan keyin yana takrorlanadi (0-pog'ona)
  S[it.ar] = ok && fresh ? { b: 0, d: dayNum(), h: Date.now() + LATER_MS } : { b, d: dayNum() + SRS_INT[b] };
  store.set(key, S);
  if (ok) markKnown(book.id, it.u, it.ar);
  scheduleSync();
}

// ===== bosh sahifadagi karta: «Bugun» — 4 qism (13-partiya, A1; Nation: to'rt yo'l muvozanati) =====
// Tartib qat'iy (A8): oson boshlanadi (takror), o'rtada tinglash va gapirish, oson tugaydi (ravonlik — tanish so'zlar tezlikda).
// Qism bajarilgani: 1 — bugungi dars; 2–4 — shu kungi vaqt (lib/strand.ts) yoki kunlik shadowing.
const WD = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
type Part = { k: Strand; t: string; d: string; tag: string; done: boolean; run: () => void };
export function TodayCard({ bookId }: { bookId: string }) {
  const { go } = useNav();
  const { me } = useSession();
  const book = useRBook(bookId);
  const rel = useRel(bookId);
  const plan = useMemo(() => (book && rel ? planLesson(book, rel) : null), [book, rel]);
  const ms = useMults();
  const [kb, setKb] = useState<KbLesson | null | undefined>(undefined);
  const uN = plan?.u.n;
  useEffect(() => {
    if (!uN) return;
    const k = kbKeyOf(bookId, uN);
    if (!k) { setKb(null); return; }
    let a = true;
    loadKb(k).then((x) => a && setKb(x)).catch(() => a && setKb(null));
    return () => { a = false; };
  }, [bookId, uN]);
  // 1-paket (D4): ma'lumot kelguncha karta joyi band — pastdagi kartalar sakramaydi
  if (!book || !plan || kb === undefined) return <div className="card td-skel" aria-hidden />; // boshqa teg — React keyin yangi karta yaratadi (siljish emas)
  const D = lessonsOf(bookId), t = dayNum();
  const today = strandToday(), week = strandWeek();
  const rule = plan.rule ? rulesIn(book, plan.rule[0])[plan.rule[1]] : null;
  const empty = !plan.due.length && !plan.news.length && !plan.rule;
  // 2-qism: vahdaning navbatdagi qadami o'qish matni bo'lsa — o'sha (tartib buzilmaydi), aks holda multfilm
  const nx = nextStep(book as unknown as Book, plan.u.n, kb);
  const nst = nx.kind === "kb" && kb ? kb.steps[Number(nx.params.si)] : null;
  const readNext = !!nst && (isReadStep(nst) || /^\s*O[ʻ'’`]?qish/i.test(nst.t));
  const sh = ms?.length ? shDaily(ms, me?.level) : null;
  // 16-partiya: o'z gapi (ma'noli chiqarma) shadowing'dan oldin — vahda so'zlarining yarmidan ko'pi yodlangan, lekin shu vahdada hali gapirilmagan
  const spkU = pctOf(plan.u.words, knownOf(bookId, plan.u.n)) >= 50 && !spkAll()[`${bookId}:${plan.u.n}`];
  // ravonlik: so'zlari to'liq yodlangan eng oxirgi vahda (tanish so'zlar tezlikda), bo'lmasa — joriy vahda
  const fluU = [...book.units].reverse().find((u) => u.n <= plan.u.n && pctOf(u.words, knownOf(bookId, u.n)) >= 100)?.n || plan.u.n;
  const parts: Part[] = [
    { k: "f", tag: "Shakl", t: "Takrorlash va yangi so'zlar", done: !!D[t],
      d: empty ? "Bugun takrorlanadigan so'z yo'q" : [plan.due.length && `${plan.due.length} ta takror`, plan.news.length && `${plan.news.length} ta yangi so'z`, rule && "3 ta qoida savoli"].filter(Boolean).join(" · "),
      run: () => (empty ? toast("Bugun takrorlanadigan so'z yo'q — keyingi qismga o'ting") : go("lesson", { book: bookId, plan, n: Date.now() })) },
    { k: "i", tag: "Tinglash", done: today.i >= 120,
      t: readNext ? "Kitob matnini tinglab o'qish" : "Multfilm tomosha qiling",
      d: readNext ? `${plan.u.n}-vahda · ${nx.sub}` : "Arabcha subtitr va tarjima bilan · ~5 daqiqa",
      run: () => (readNext ? go(nx.view, nx.params) : ms && !ms.length ? toast("Multfilmlar tez orada qo'shiladi") : go("mults")) },
    spkU
      ? { k: "o", tag: "Gapirish", done: today.o >= 120, t: "O'zingiz gapiring",
          d: `«${plan.u.uz}» mavzusida · 60 → 45 → 30 soniya`, run: () => go("speak", { book: bookId, unit: plan.u.n, n: Date.now() }) }
      : { k: "o", tag: "Gapirish", done: today.o >= 120 || (!!sh && sh.done >= Math.min(5, sh.picks.length)),
          t: "Ovoz chiqarib gapirish",
          d: sh ? `Shadowing · ${sh.done} / ${sh.picks.length} ibora · ovozni faqat siz eshitasiz` : "Yuklanmoqda…",
          run: () => (sh?.picks.length ? go("shadow", { items: sh.items, mode: "card", daily: true, n: Date.now() }) : toast("Iboralar tez orada qo'shiladi")) },
    { k: "r", tag: "Ravonlik", done: today.r >= 60, t: "60 soniya: tanish so'zlar",
      d: `${fluU}-vahda so'zlari · tez javob bering`, run: () => go("game", { book: bookId, unit: fluU, game: "speed" }) },
  ];
  const doneN = parts.filter((x) => x.done).length;
  const curI = parts.findIndex((x) => !x.done);
  const mins = plan.mins + 9;
  // haftalik muvozanat: eng kam yo'l — maslahat (kamida 10 daqiqa yig'ilgach)
  const tot = week.i + week.o + week.f + week.r;
  // 15-partiya: shaxsiy reja bo'lsa — uning ulushlari, bo'lmasa teng (25%); eng katta kamomad
  const goal = goalOf();
  const tgt = goal ? MIX[goal.why] : { i: 25, o: 25, f: 25, r: 25 };
  const gap = (k: Strand) => tgt[k] / 100 - (tot ? week[k] / tot : 0);
  const low = STRANDS.reduce((m, x) => (gap(x.k) > gap(m.k) ? x : m), STRANDS[0]);
  const sk = streakNow();
  const act = store.get<Record<string, number>>("a1.days", {}), fz = store.get<string[]>("x.fz", []);
  return (
    <section className={`card today ${doneN === 4 ? "done" : ""}`} aria-label="Bugun">
      <div className="td-h">
        <span className="td-k">{doneN === 4 ? "Bugun · bajarildi" : `Bugun · ≈ ${mins} daqiqa`}</span>
        <span className="td-cnt">{doneN} / 4 qism</span>
      </div>
      <ol className="bg-list" aria-label="Bugungi 4 qism">
        {parts.map((x, k) => (
          <li key={x.k}>
            <button type="button" className={`bg-row ${x.done ? "dn" : ""} ${k === curI ? "on" : ""}`} onClick={() => { tg.haptic(); x.run(); }}>
              <span className="bg-n" aria-hidden>{x.done ? <Check size={15} strokeWidth={3} /> : k + 1}</span>
              <span className="bg-t"><b>{x.t}</b><small>{x.d}</small></span>
              <em className={`bg-tag s-${x.k}`}>{x.tag}</em>
            </button>
          </li>
        ))}
      </ol>
      {curI >= 0
        ? <button type="button" className="btn primary wide" onClick={() => { tg.haptic(); parts[curI].run(); }}>{doneN ? "Davom etish" : "Boshlash"}: {parts[curI].t.toLowerCase()}</button>
        : <>
            <p className="td-p muted">Barakalla! Bugungi 4 qism bajarildi. Ertaga yangi so'zlar va takrorlash vaqti kelgan so'zlar tayyor bo'ladi.</p>
            {!empty && <button type="button" className="btn ghost wide" onClick={() => go("lesson", { book: bookId, plan, n: Date.now() })}>Yana bir dars</button>}
          </>}
      <div className="bg-week" aria-label="Bu hafta — 4 yo'l">
        <div className="bg-wh"><b>Bu hafta — 4 yo'l</b><small>{Math.round(tot / 60)} daqiqa</small></div>
        {STRANDS.map((x) => {
          const pc = tot ? Math.round((week[x.k] / tot) * 100) : 0;
          return (
            <div key={x.k} className={`bg-m s-${x.k}`}>
              <span>{x.t}</span>
              <span className="bg-bar" role="progressbar" aria-valuenow={pc} aria-valuemin={0} aria-valuemax={100} aria-label={x.t}><i style={{ width: `${pc}%` }} /></span>
              <em>{pc}%</em>
            </div>
          );
        })}
        {tot >= 600 && week[low.k] / tot < (tgt[low.k] / 100) * 0.6 && <p className="bg-tip">{low.t} bu hafta kam ({Math.round((week[low.k] / tot) * 100)}%, {goal ? "rejangizda" : "tavsiya"} {tgt[low.k]}%). Shu qismga ko'proq vaqt ajrating.</p>}
      </div>
      <div className="td-week" aria-label={`${sk} kun ketma-ket`}>
        <b>{sk} kun ketma-ket</b>
        <span className="td-days">
          {Array.from({ length: 7 }, (_, k) => {
            const i = 6 - k, d = new Date(); d.setDate(d.getDate() - i);
            const dk = dayKey(d), on = !!act[dk] || fz.includes(dk);
            return <span key={k} className={`${on ? "on" : ""} ${i === 0 ? "now" : ""}`}><i>{on ? <Check size={11} strokeWidth={3.5} aria-hidden /> : null}</i>{WD[d.getDay()]}</span>;
          })}
        </span>
      </div>
    </section>
  );
}

// ===== dars =====
type Step = { k: "rev" | "rev2" | "intro" | "type"; it: Item; again?: boolean } | { k: "rq"; q: RQ };

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
  const [end, setEnd] = useState<{ mins: number; sk: number; xp: number; bonus: number; again: boolean } | null>(null);
  const t0 = useRef(Date.now());
  const okN = useRef(0); // birinchi urinishda to'g'ri yozilganlar (eski L.ok)
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!book) return;
    const s: Step[] = [];
    // ikki yo'nalish: kamida 2 marta eslangan so'zlarning har ikkinchisi o'zbekchadan arabchaga so'raladi
    const S = srsOf(bookId);
    let r2 = 0;
    plan.due.forEach((it) => s.push({ k: (S[it.ar]?.b || 0) >= 2 && r2++ % 2 === 0 ? "rev2" : "rev", it }));
    plan.news.forEach((it) => s.push({ k: "intro", it }));
    plan.news.forEach((it) => s.push({ k: "type", it }));
    if (plan.rule) qsFor(book, plan.rule[0], plan.rule[1], 3).forEach((q) => s.push({ k: "rq", q })); // 13-partiya: 5 → 3
    setSteps(s);
  }, [book]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = steps?.[i];
  useEffect(() => { if (cur && (cur.k === "rev" || cur.k === "type") && st === null) inp.current?.focus({ preventScroll: true }); }, [cur, st]);

  if (!book || !steps) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  const n = steps.length;
  const rule = plan.rule ? rulesIn(book, plan.rule[0])[plan.rule[1]] : null;

  const finish = () => {
    // bir marta: kun belgisi, dars qoidasi natijasi (eng yaxshisi), XP
    // 12-partiya (A5): kunning birinchi darsi — 20, keyingilari — 8 (Nation: oraliqli o'rganish to'plab o'rganishdan yaxshi);
    // vaqti kelgan 3+ so'z takrorlansa — +5 bonus
    const D = lessonsOf(bookId), again = !!D[dayNum()]; D[dayNum()] = 1; store.set(bkKey(bookId, "lessons"), D);
    const xp = again ? 8 : 20, bonus = plan.due.length >= 3 ? 5 : 0;
    if (plan.rule && rq.n) {
      const key = bkKey(bookId, `rule.${plan.rule[0]}.${plan.rule[1]}`);
      store.set(key, Math.max(store.get<number | null>(key, null) || 0, Math.round((rq.ok / rq.n) * 100)));
    }
    gain("lesson", xp);
    if (bonus) gain("rev", bonus);
    report("bugungi dars", plan.u.uz || "", okN.current + rq.ok, steps.filter((s) => s.k !== "intro").length, true, plan.u.n);
    tg.haptic("success");
    setEnd({ mins: Math.max(1, Math.round((Date.now() - t0.current) / 60000)), sk: streakNow(), xp, bonus, again });
  };
  const next = () => {
    setSt(null); setTries(0); setVal("");
    if (i + 1 >= n) finish();
    setI(i + 1);
    window.scrollTo(0, 0);
  };
  const check = () => {
    if (!cur || cur.k === "rq" || cur.k === "intro" || cur.k === "rev2") return;
    const r = checkTyped(cur.it, val, "uz");
    if (!r) return;
    if (r !== "no") {
      // "yaqin" javob ham to'g'ri; ikkinchi urinishdagi to'g'ri javob takrorlash uchun xato hisoblanadi (eski)
      if (!tries) okN.current++;
      setSt("ok"); lessonSrs(book, cur.it, tries === 0, cur.k === "type"); gain("fc", tries ? 1 : 3); tg.haptic("success");
    } else {
      const t = tries + 1;
      setTries(t); tg.haptic("error");
      if (t >= 2) {
        setSt("show"); lessonSrs(book, cur.it, false);
        if (cur.k === "rev" && !cur.again) setSteps([...steps, { ...cur, again: true }]);
      } else { setSt("no"); setVal(""); }
    }
  };
  const dunno = () => { if (!cur || cur.k === "rq" || cur.k === "intro" || cur.k === "rev2") return; setSt("show"); lessonSrs(book, cur.it, false); };
  // teskari yo'nalish: o'quvchi arabchasini eslab, o'zi baholaydi (yozish shart emas — telefonda arabcha klaviatura bo'lmasligi mumkin)
  const rate = (ok: boolean) => {
    if (!cur || cur.k !== "rev2") return;
    lessonSrs(book, cur.it, ok);
    if (ok) { okN.current++; gain("fc", 3); tg.haptic("success"); }
    else { tg.haptic("error"); if (!cur.again) setSteps([...steps, { k: "rev", it: cur.it, again: true }]); }
    next();
  };
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
    const e = end || { mins: 1, sk: streakNow(), xp: 0, bonus: 0, again: false };
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
          {e.xp > 0 && <p className="r-earn">+{e.xp + e.bonus}&nbsp;yulduzcha</p>}
          {e.bonus > 0 && <p className="muted ls-bonus">Shundan {e.bonus} tasi — vaqtida takrorlangan so'zlar uchun bonus</p>}
          {e.again && <p className="muted ls-bonus">Bugungi ikkinchi dars kamroq yulduzcha beradi — so'zlar kunlar oralab takrorlansa yaxshiroq eslab qolinadi.</p>}
          <GainNote />
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

  if (cur.k === "rev2") {
    const it = cur.it;
    const open = st === "show";
    return (
      <main className="round">
        {bar}
        <p className="ls-kind">Takrorlash · arabchasini eslang</p>
        <section className="r-card cd-card ls-card">
          <b className="ls-uz ls-q">{it.uz}</b>
          {open
            ? <div className="cd-q"><Ar className="ls-word">{it.ar}</Ar><button type="button" className="say" aria-label="Tinglash" onClick={() => void say(it.ar)}><Volume2 size={22} aria-hidden /></button></div>
            : <p className="muted ls-recall">Arabchasini eslang va ovoz chiqarib ayting. Keyin javobni ochib, o'zingizni tekshiring.</p>}
        </section>
        {open
          ? <div className="r-cmp two ls-rate">
              <button type="button" className="btn ghost" onClick={() => rate(false)}><X size={18} aria-hidden />Eslay olmadim</button>
              <button type="button" className="btn good" onClick={() => rate(true)}><Check size={18} aria-hidden />Esladim</button>
            </div>
          : <button type="button" className="btn primary wide ls-next" onClick={() => { setSt("show"); void say(it.ar); }}>Javobni ko'rish</button>}
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
