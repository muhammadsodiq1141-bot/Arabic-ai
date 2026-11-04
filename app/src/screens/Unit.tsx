// Uy vazifasi — bitta unit (vahda): Lug'at (10 so'zli roundlar), Nazariya (video yoki qoida matni + test), Mashqlar.
// Pastda doim "Davom etish: <keyingi qadam>" tugmasi; keyingi qadam kartasi oltin halqa bilan belgilanadi; qulf sababini aytadi.
// Shuningdek "Darslar" bo'limi: joriy kitobning barcha vahdalari (uy vazifasi berilgani belgilanadi).
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Bookmark, Check, ChevronDown, ChevronRight, ChevronUp, KeyRound, Library, List, Lock, Ruler, Star } from "lucide-react";
import { preloadKitob } from "../lib/audio";
import { img, loadData } from "../lib/data";
import { GRADED, isReadStep, kbBest, kbKeyOf, kbOpen, loadKb, type KbLesson, type KbStep } from "../lib/kb";
import { dueText, gramPct, nextStep, pctOf, ROUND, rulesOf, theoryKey } from "../lib/next";
import { hwProgress, localRaw, type Book } from "../lib/progress";
import { itemsOf } from "../lib/practice";
import { report } from "../lib/report";
import { knownOf, store, syncNow } from "../lib/store";
import { tg } from "../lib/tg";
import { loadWords, type Word } from "../lib/words";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Emo } from "../ui/Emo";
import { Ar, ScreenHeader, SectionTitle } from "../ui/kit";
import { Scale } from "../ui/Scale";
import { toast } from "../ui/Toast";
import { DrillHub } from "./Madina";
import { HelpButton, useCoach } from "./Onboard";
import { ruleStats, type RBook } from "./Rules";
import { Round } from "./Round";

// topshiriq turi (qadam kaliti) bo'yicha belgi
const kbIcon = (k: string) => (/^(lugat|mufradat|tarakib)/.test(k) ? "📚" : /^(lmashq|tadrib)/.test(k) ? "🧩" : /^(oqish|matn|qiroat)/.test(k) ? "📖"
  : /^(suhbat|muhadatha|tinglash)/.test(k) ? "💬" : /^(qoida|qawaid)/.test(k) ? "🧑‍🏫" : /^(yozish|kitaba)/.test(k) ? "✏️" : "🎯");
export const bookOfLevel = (lvl?: string | null) => ({ A0: "a1", A1: "a1", A2: "a2", B1: "b1", B2: "b2", C1: "c1" } as Record<string, string>)[lvl || ""] || "a1";

function useBook(id: string) {
  const [b, setB] = useState<Book | null>(null);
  useEffect(() => { let a = true; loadData<Book>(`books/${id}`).then((x) => a && setB(x)).catch(() => {}); return () => { a = false; }; }, [id]);
  return b;
}

type HwItem = { book: string; unit: number; due: string; teacher?: boolean; mine?: { done?: boolean } | null };

export function Lessons() {
  const { me } = useSession();
  const { go } = useNav();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const book = useBook(bookId);
  // ustoz bergan vazifalar (bosh sahifa yuklagan kesh f.hw)
  const hw = store.get<HwItem[]>("f.hw", []).filter((h) => !h.teacher && !h.mine?.done && h.book === bookId);
  const rs = book ? ruleStats(book as RBook) : null;
  return (
    <main className="screen">
      <SectionTitle ar="الدُّرُوسُ" uz={book ? `Darslar · ${book.title}` : "Darslar"}
        right={<button type="button" className="sect-btn" onClick={() => go("books")}><Library size={18} aria-hidden />Kitoblar</button>} />
      {!book && <p className="muted pad">Yuklanmoqda…</p>}
      {book && rs && rs.all.length > 0 && (
        <button type="button" className="rrow" onClick={() => go("rules", { book: book.id })}>
          <span className="un"><Ruler size={20} aria-hidden /></span>
          <span className="ut"><b>Qoidalar</b><span className="ut-hw rr-sub">{rs.done} / {rs.all.length} o'zlashtirildi</span></span>
          <ArrowRight size={20} className="rr-go" aria-hidden />
        </button>
      )}
      <div className="ulist">
        {book?.units.map((u) => {
          const p = pctOf(u.words, knownOf(book.id, u.n));
          const h = hw.find((x) => x.unit === u.n);
          return (
            <button key={u.n} type="button" className={`urow ${h ? "hw-on" : ""}`} onClick={() => go("unit", { book: book.id, unit: u.n })}>
              <span className="un">{u.n}</span>
              <span className="ut">
                <b>{u.uz}</b>{u.ar && <Ar className="ut-ar">{u.ar}</Ar>}
                {h && <span className="ut-hw">Uy vazifasi · {dueText(h.due)}</span>}
              </span>
              <span className="up"><span className="b" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label="Yodlangan so'zlar"><i style={{ width: `${p}%` }} /></span><em>{p}%</em></span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

export function UnitScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { go } = useNav();
  const book = useBook(bookId);
  const u = book?.units.find((x) => x.n === unitN);
  const [words, setWords] = useState<Word[] | null>(null);
  const [open, setOpen] = useState<"voc" | "ex" | "rd" | null>(null);
  const kbKey = kbKeyOf(bookId, unitN);
  const [kb, setKb] = useState<KbLesson | null>(null);
  useEffect(() => { if (!kbKey) return; let a = true; loadKb(kbKey).then((x) => a && setKb(x)).catch(() => {}); return () => { a = false; }; }, [kbKey]);
  useEffect(() => {
    if (!u) return;
    let a = true;
    loadWords(bookId, unitN, u.words).then((w) => a && setWords(w));
    void preloadKitob(`${bookId}/${unitN}`, u.words.map((w) => w[0]));
    return () => { a = false; };
  }, [u, bookId, unitN]);

  const next = book ? nextStep(book, unitN, kb) : null;
  // keyingi qadam joylashgan bo'lim o'zi ochiladi (mashqlar ro'yxati yuklangach)
  const nextKind = next?.kind;
  const ready = !!book && (!kbKey || !!kb);
  const [celebrate, setCelebrate] = useState(false);
  useCoach("vahda", ready && !celebrate);
  const inited = useRef(false);
  useEffect(() => {
    if (!ready || inited.current) return;
    inited.current = true;
    const nsi = Number(next?.params?.si);
    const rd = nextKind === "kb" && bookId.startsWith("md") && !!kb?.steps[nsi] && isReadStep(kb.steps[nsi]);
    setOpen(nextKind === "kb" || nextKind === "done" ? (kbKey ? (rd ? "rd" : "ex") : "voc") : "voc");
  }, [ready, nextKind, kbKey]);
  // vahda endigina to'liq bajarilgan bo'lsa (shart: so'zlar, so'z testi, qoidalar ≥80%) — bir martalik tabrik, natija darhol serverga
  useEffect(() => {
    if (!ready || !book || store.get(`f.cele.${bookId}.${unitN}`, 0)) return;
    if (hwProgress(localRaw(), book, unitN).done) {
      setCelebrate(true); void syncNow(); tg.haptic("success");
      const bu = book.units.find((x) => x.n === unitN), kk = knownOf(bookId, unitN);
      if (bu) { const all = itemsOf(bu as Parameters<typeof itemsOf>[0]); report("boʻlim tugadi", bu.uz || "", all.filter((x) => kk[x.ar]).length, all.length, true, unitN); }
    }
  }, [ready, book, bookId, unitN]);

  if (!book || !u || !next) return <main className="screen"><ScreenHeader title="Uy vazifasi" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const known = knownOf(bookId, unitN);
  const rounds: string[][][] = [];
  for (let i = 0; i < u.words.length; i += ROUND) rounds.push(u.words.slice(i, i + ROUND));
  const vocPct = pctOf(u.words, known);
  const rules = rulesOf(book, unitN) as { ar?: string; html?: string; quiz?: unknown[] }[];
  const seen = !!store.get(theoryKey(bookId, unitN), 0);
  // nazariya kartasida birinchi qoidaning birinchi misoli (qoida matnidagi .ex bloki)
  const exAr = /class=["']ex["'][^>]*>\s*<div>\s*<span class=["']ar["']>([^<]+)</.exec(rules[0]?.html || "")?.[1] || "";
  const nq = rules.reduce((a, r) => a + (r.quiz?.length || 0), 0);
  const gram = gramPct(book, unitN);
  const finished = hwProgress(localRaw(), book, unitN).done; // uy vazifasi sharti: so'zlar, so'z testi va qoidalar ≥80%
  const kbB = kbKey ? kbBest(kbKey) : {};
  // Madina: o'qish matnlari alohida "O'qish" bo'limida (qadam raqamlari o'zgarmaydi — natijalar shu tartibga bog'langan)
  const split = bookId.startsWith("md");
  const allIdx = kb ? kb.steps.map((_, i) => i) : [];
  const rdIdx = split && kb ? allIdx.filter((i) => isReadStep(kb.steps[i])) : [];
  const exIdx = allIdx.filter((i) => !rdIdx.includes(i));
  const avg = (ix: number[]) => (ix.length ? Math.round(ix.reduce((a, i) => a + (kbB[i] || 0), 0) / ix.length) : 0);
  const exPct = avg(exIdx), rdPct = avg(rdIdx);
  const stepBtn = (s: KbStep, si: number, read: boolean) => {
    const on = kbOpen(kbB, si), b = kbB[si];
    const g = s.items.filter((x) => GRADED.includes(x.type)).length;
    const name = read ? s.t.split(" · ").slice(1).join(" · ") || s.t : s.t.split(" · ")[0];
    const d = read ? (s.d || `${s.items.length} matn`) : `${name} · ${g ? `${g} savol` : `${s.items.length} qism`}`;
    return (
      <button key={si} type="button" className={`rc kbc ${read ? "rdc" : ""} ${on ? "" : "lock"} ${isNext("kb", si) ? "next" : ""}`} aria-disabled={!on}
        aria-label={on ? undefined : `${si + 1}-topshiriq — avval ${si}-topshiriqni bajaring`}
        onClick={() => (on ? go("kb", { key: kbKey, si, book: bookId, unit: unitN }) : lockMsg(`Avval ${si}-topshiriqni bajaring`))}>
        <b>{read ? name : `${si + 1}-topshiriq`}</b><span className="d">{d}</span>
        {on ? <span className="ic"><Emo e={read ? "📖" : kbIcon(s.k)} size={34} /></span> : <span className="lk"><Lock size={14} aria-hidden /></span>}
        <span className="b"><i style={{ width: `${b ?? 0}%` }} /></span><span className="p">{on ? `${b ?? 0}%` : "Qulf"}</span>
      </button>
    );
  };
  const celeKey = `f.cele.${bookId}.${unitN}`;
  const assigned = store.get<HwItem[]>("f.hw", []).some((h) => !h.teacher && h.book === bookId && h.unit === unitN);
  const isNext = (kind: string, k?: number) => next.kind === kind && (k === undefined || next.params.n === k || next.params.si === k);
  const lockMsg = (m: string) => { tg.haptic("error"); toast(m); };

  return (
    <main className="screen unit has-cta">
      <ScreenHeader title={`${(u as { lbl?: string }).lbl || `${unitN}-vahda`} · ${u.uz}`} ar={u.ar}
        actions={<>
          <HelpButton k="vahda" />
          <button type="button" className="ibtn" aria-label={finished ? "Javoblar" : "Javoblar (vahda tugagach ochiladi)"}
            onClick={() => (finished ? go("soon", { title: "Javoblar" }) : lockMsg("Javoblar vahda to'liq bajarilgach ochiladi"))}>
            {finished ? <KeyRound size={22} aria-hidden /> : <Lock size={20} aria-hidden />}
          </button>
          <button type="button" className="ibtn" aria-label="Saqlangan so'zlar" onClick={() => go("saved")}><Bookmark size={22} aria-hidden /></button>
        </>} />

      <button type="button" className="ub v-voc" aria-expanded={open === "voc"} onClick={() => setOpen(open === "voc" ? null : "voc")}>
        <span className="ub-deco" aria-hidden>{words?.filter((w) => w.img).slice(0, 4).map((w) => <img key={w.ar} src={w.img!} alt="" />)}</span>
        <span className="ub-hd"><span className="ub-badge"><Star size={28} aria-hidden /></span>
          <span className="ub-tt"><Ar className="ub-ar">الْمُفْرَدَاتُ</Ar><span className="ub-uz">Lug'at · {u.words.length} so'z</span></span>
          <span className="ub-chev">{open === "voc" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span></span>
        <span className="ub-pr"><span className="b" role="progressbar" aria-valuenow={vocPct} aria-valuemin={0} aria-valuemax={100} aria-label="Lug'at"><i style={{ width: `${vocPct}%` }} /></span><em>{vocPct}%</em></span>
      </button>
      {open === "voc" && (
        <div className="tray">
          <button type="button" className="rc wl-rc" onClick={() => go("words", { book: bookId, unit: unitN })}>
            <b>So'zlar ro'yxati</b><span>{u.words.length + (u.phrases?.length || 0)} ta · misollar</span>
            <span className="ic"><List size={22} aria-hidden /></span><span className="p">Kartalar</span>
          </button>
          {rounds.map((r, i) => {
            const p = pctOf(r, known);
            return (
              <button key={i} type="button" className={`rc ${isNext("round", i + 1) ? "next" : ""}`} disabled={!words} onClick={() => go("round", { book: bookId, unit: unitN, n: i + 1 })}>
                <b>{i + 1}-round</b><span>{r.length} so'z</span>{p === 100 && <img src={img("medal")} alt="" />}
                <span className="b"><i style={{ width: `${p}%` }} /></span><span className="p">{p}%</span>
              </button>
            );
          })}
        </div>
      )}

      {rules.length > 0 && (
        <div className="vid">
          <button type="button" className={`vth ${isNext("theory") ? "next" : ""}`} onClick={() => go("theory", { book: bookId, unit: unitN })}>
            {seen && <span className="seen"><Check size={14} aria-hidden />O'qildi</span>}
            {exAr && <span className="vth-ex"><Ar>{exAr}</Ar></span>}
            <span className="pl"><span className="c"><BookOpen size={22} aria-hidden /></span>
              <span><small>Nazariya · {rules.length} ta qoida</small><Ar className="pl-ar">{rules[0].ar || "الْقَوَاعِدُ"}</Ar></span></span>
          </button>
          <button type="button" className={`vtest ${seen ? "" : "locked"} ${isNext("test") ? "next" : ""}`}
            onClick={() => (seen ? go("test", { book: bookId, unit: unitN }) : lockMsg("Test nazariyani o'qigach ochiladi"))}
            aria-label={seen ? `Grammatik test, ${gram}%` : "Grammatik test — nazariyani o'qigach ochiladi"}>
            <span><b>Test</b><span>{nq} savol</span></span>
            <span className="c">{seen ? <ArrowRight size={18} aria-hidden /> : <Lock size={16} aria-hidden />}</span>
            <em>{gram}%</em>
          </button>
        </div>
      )}

      {kbKey && rdIdx.length > 0 && kb && (
        <>
          <button type="button" className="ub v-ex v-rd" aria-expanded={open === "rd"} onClick={() => setOpen(open === "rd" ? null : "rd")}>
            <span className="ub-deco" aria-hidden><Emo e="📖" size={52} /><Emo e="⏱️" size={52} /></span>
            <span className="ub-hd"><span className="ub-badge"><Star size={28} aria-hidden /></span>
              <span className="ub-tt"><Ar className="ub-ar">الْقِرَاءَةُ</Ar><span className="ub-uz">O'qish · {rdIdx.length} matn</span></span>
              <span className="ub-chev">{open === "rd" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span></span>
            <span className="ub-pr"><span className="b" role="progressbar" aria-valuenow={rdPct} aria-valuemin={0} aria-valuemax={100} aria-label="O'qish"><i style={{ width: `${rdPct}%` }} /></span><em>{rdPct}%</em></span>
          </button>
          {open === "rd" && <div className="tray">{rdIdx.map((si) => stepBtn(kb.steps[si], si, true))}</div>}
        </>
      )}

      {kbKey && (!kb || exIdx.length > 0) && (
        <>
          <button type="button" className="ub v-ex" aria-expanded={open === "ex"} onClick={() => setOpen(open === "ex" ? null : "ex")}>
            <span className="ub-deco" aria-hidden><Emo e="📝" size={52} /><Emo e="💬" size={52} /><Emo e="📖" size={52} /></span>
            <span className="ub-hd"><span className="ub-badge"><Star size={28} aria-hidden /></span>
              <span className="ub-tt"><Ar className="ub-ar">التَّدْرِيبَاتُ</Ar><span className="ub-uz">Mashqlar{kb ? ` · ${exIdx.length} topshiriq` : ""}</span></span>
              <span className="ub-chev">{open === "ex" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span></span>
            {kb && <span className="ub-pr"><span className="b" role="progressbar" aria-valuenow={exPct} aria-valuemin={0} aria-valuemax={100} aria-label="Mashqlar"><i style={{ width: `${exPct}%` }} /></span><em>{exPct}%</em></span>}
          </button>
          {open === "ex" && (
            <div className="tray">
              {!kb && <p className="muted">Yuklanmoqda…</p>}
              {kb && exIdx.map((si) => stepBtn(kb.steps[si], si, false))}
            </div>
          )}
        </>
      )}

      {bookId.startsWith("md") && !!(u as { mem?: unknown }).mem && (
        <button type="button" className="ub v-ex v-mem" onClick={() => go("mem", { book: bookId, unit: unitN })}>
          <span className="ub-deco" aria-hidden><Emo e="🧩" size={52} /><Emo e="📖" size={52} /></span>
          <span className="ub-hd"><span className="ub-badge"><Star size={28} aria-hidden /></span>
            <span className="ub-tt"><Ar className="ub-ar">الْحِفْظُ</Ar><span className="ub-uz">Yodlash · Beton usuli</span></span>
            <span className="ub-chev"><ChevronRight size={18} /></span></span>
          <span className="ub-pr"><span className="b" role="progressbar" aria-valuenow={vocPct} aria-valuemin={0} aria-valuemax={100} aria-label="Yodlash"><i style={{ width: `${vocPct}%` }} /></span><em>{vocPct}%</em></span>
        </button>
      )}
      {bookId === "md1" && unitN === 1 && <DrillHub dkey="md1:1" />}

      {celebrate && <HwDone assigned={assigned} onClose={() => { store.set(celeKey, Date.now()); setCelebrate(false); }} />}

      <div className="ucta">
        {next.kind === "done" ? (
          <p className="ucta-done"><Check size={20} aria-hidden />Vahda bajarildi — natijalaringiz ustozga ko'rinadi</p>
        ) : (
          <button type="button" className="btn primary wide ucta-btn" onClick={() => go(next.view, next.params)}>
            <span><b>Davom etish: {next.label}</b><small>{next.sub}</small></span><ArrowRight size={22} aria-hidden />
          </button>
        )}
      </div>
    </main>
  );
}

/** Vahda to'liq bajarilganda bir marta chiqadigan ekran: tarozi muvozanatga keladi */
function HwDone({ assigned, onClose }: { assigned: boolean; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div className="hwdone" role="dialog" aria-modal="true" aria-labelledby="hwdone-t">
      <Scale size={200} />
      <h1 id="hwdone-t">{assigned ? "Uy vazifasi bajarildi" : "Vahda o'zlashtirildi"}</h1>
      <p>{assigned ? "Lug'at, test va qoidalar 80% dan yuqori. Natijangiz ustozingizga yuborildi." : "Lug'at, test va qoidalar 80% dan yuqori. Barakalla!"}</p>
      <button ref={btn} type="button" className="btn primary wide" onClick={onClose}>Davom etish</button>
    </div>
  );
}

export function RoundScreen({ bookId, unitN, n }: { bookId: string; unitN: number; n: number }) {
  const { back, replace } = useNav();
  const book = useBook(bookId);
  const [all, setAll] = useState<Word[] | null>(null);
  const u = book?.units.find((x) => x.n === unitN);
  useEffect(() => { if (!u) return; let a = true; loadWords(bookId, unitN, u.words).then((w) => a && setAll(w)); return () => { a = false; }; }, [u, bookId, unitN]);
  if (!all) return <main className="screen"><p className="muted pad">Yuklanmoqda…</p></main>;
  const words = all.slice((n - 1) * ROUND, n * ROUND);
  const more = all.length > n * ROUND;
  return <Round bookId={bookId} unit={unitN} n={n} words={words} pool={all} onExit={() => back()}
    onNextRound={more ? () => replace("round", { book: bookId, unit: unitN, n: n + 1 }) : undefined} />;
}
