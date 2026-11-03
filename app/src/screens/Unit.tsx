// Uy vazifasi — bitta unit (vahda): Lug'at (10 so'zli roundlar), Nazariya (video yoki qoida matni + test), Mashqlar.
// Shuningdek "Darslar" bo'limi: joriy kitobning barcha vahdalari.
import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, Check, ChevronDown, ChevronUp, KeyRound, Lock, Play, Star } from "lucide-react";
import { preloadKitob } from "../lib/audio";
import { img, loadData } from "../lib/data";
import { bkKey, hwProgress, localRaw, type Book } from "../lib/progress";
import { knownOf, store } from "../lib/store";
import { tg } from "../lib/tg";
import { GRADED, kbBest, kbKeyOf, kbOpen, loadKb, type KbLesson } from "../lib/kb";
import { loadWords, type Word } from "../lib/words";
import { Emo } from "../ui/Emo";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, ScreenHeader, SectionTitle } from "../ui/kit";
import { Round } from "./Round";
import { theoryKey } from "./Theory";

const SIZE = 10;
// topshiriq turi (qadam kaliti) bo'yicha belgi
const kbIcon = (k: string) => (/^(lugat|mufradat|tarakib)/.test(k) ? "📚" : /^(lmashq|tadrib)/.test(k) ? "🧩" : /^(oqish|matn|qiroat)/.test(k) ? "📖"
  : /^(suhbat|muhadatha|tinglash)/.test(k) ? "💬" : /^(qoida|qawaid)/.test(k) ? "🧑‍🏫" : /^(yozish|kitaba)/.test(k) ? "✏️" : "🎯");
export const bookOfLevel = (lvl?: string | null) => ({ A0: "a1", A1: "a1", A2: "a2", B1: "b1", B2: "b2", C1: "c1" } as Record<string, string>)[lvl || ""] || "a1";

function useBook(id: string) {
  const [b, setB] = useState<Book | null>(null);
  useEffect(() => { let a = true; loadData<Book>(`books/${id}`).then((x) => a && setB(x)).catch(() => {}); return () => { a = false; }; }, [id]);
  return b;
}

const pctOf = (words: string[][], known: Record<string, number>) => (words.length ? Math.round((words.filter((w) => known[w[0]]).length / words.length) * 100) : 0);

export function Lessons() {
  const { me } = useSession();
  const { go } = useNav();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const book = useBook(bookId);
  return (
    <main className="screen">
      <SectionTitle ar="الدُّرُوسُ" uz={book ? `Darslar · ${book.title}` : "Darslar"} />
      {!book && <p className="muted pad">Yuklanmoqda…</p>}
      <div className="ulist">
        {book?.units.map((u) => {
          const p = pctOf(u.words, knownOf(book.id, u.n));
          return (
            <button key={u.n} type="button" className="urow" onClick={() => go("unit", { book: book.id, unit: u.n })}>
              <span className="un">{u.n}</span>
              <span className="ut"><b>{u.uz}</b>{u.ar && <Ar className="ut-ar">{u.ar}</Ar>}</span>
              <span className="up"><span className="b"><i style={{ width: `${p}%` }} /></span><em>{p}%</em></span>
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
  const [open, setOpen] = useState<"voc" | "ex" | null>("voc");
  const kbKey = kbKeyOf(bookId, unitN);
  const [kb, setKb] = useState<KbLesson | null>(null);
  useEffect(() => { if (!kbKey) return; let a = true; loadKb(kbKey).then((x) => a && setKb(x)).catch(() => {}); return () => { a = false; }; }, [kbKey]);
  const kbB = kbKey ? kbBest(kbKey) : {};
  const exPct = kb?.steps.length ? Math.round(kb.steps.reduce((a, _, i) => a + (kbB[i] || 0), 0) / kb.steps.length) : 0;
  useEffect(() => {
    if (!u) return;
    let a = true;
    loadWords(bookId, unitN, u.words).then((w) => a && setWords(w));
    void preloadKitob(`${bookId}/${unitN}`, u.words.map((w) => w[0]));
    return () => { a = false; };
  }, [u, bookId, unitN]);

  if (!book || !u) return <main className="screen"><ScreenHeader title="Uy vazifasi" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const known = knownOf(bookId, unitN);
  const rounds: string[][][] = [];
  for (let i = 0; i < u.words.length; i += SIZE) rounds.push(u.words.slice(i, i + SIZE));
  const vocPct = pctOf(u.words, known);
  const rules = (book.rules?.[unitN] || []) as { ar?: string; html?: string; quiz?: unknown[] }[];
  const seen = !!store.get(theoryKey(bookId, unitN), 0);
  // nazariya kartasida birinchi qoidaning birinchi misoli (qoida matnidagi .ex bloki)
  const exAr = /class=["']ex["'][^>]*>\s*<div>\s*<span class=["']ar["']>([^<]+)</.exec(rules[0]?.html || "")?.[1] || "";
  const nq = rules.reduce((a, r) => a + (r.quiz?.length || 0), 0);
  // grammatik test natijasi — qoidalar bo'yicha eng yaxshi foizlarning o'rtachasi (eski ilova: {BK}rule.<vahda>.<i>)
  const gram = rules.length ? Math.round(rules.reduce((a, _, i) => a + store.get(bkKey(bookId, `rule.${unitN}.${i}`), 0), 0) / rules.length) : 0;
  const finished = hwProgress(localRaw(), book, unitN).done; // uy vazifasi sharti: so'zlar, so'z testi va qoidalar ≥80%

  return (
    <main className="screen unit">
      <ScreenHeader title={`${unitN}-vahda · ${u.uz}`} ar={u.ar}
        actions={<>
          <button type="button" className="ibtn" aria-label="Javoblar" onClick={() => (finished ? go("soon", { title: "Javoblar" }) : tg.haptic("error"))} title={finished ? "Javoblar" : "Unit tugagach ochiladi"}>{finished ? <KeyRound size={22} aria-hidden /> : <Lock size={20} aria-hidden />}</button>
          <button type="button" className="ibtn" aria-label="Saqlangan so'zlar" onClick={() => go("saved")}><Bookmark size={22} aria-hidden /></button>
        </>} />

      <button type="button" className="ub v-voc" aria-expanded={open === "voc"} onClick={() => setOpen(open === "voc" ? null : "voc")}>
        <span className="ub-deco" aria-hidden>{words?.filter((w) => w.img).slice(0, 4).map((w) => <img key={w.ar} src={w.img!} alt="" />)}</span>
        <span className="ub-hd"><span className="ub-badge"><Star size={28} aria-hidden /></span>
          <span className="ub-tt"><Ar className="ub-ar">الْمُفْرَدَاتُ</Ar><span className="ub-uz">Lug'at · {u.words.length} so'z</span></span>
          <span className="ub-chev">{open === "voc" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span></span>
        <span className="ub-pr"><span className="b"><i style={{ width: `${vocPct}%` }} /></span><em>{vocPct}%</em></span>
      </button>
      {open === "voc" && (
        <div className="tray">
          {rounds.map((r, i) => {
            const p = pctOf(r, known);
            return (
              <button key={i} type="button" className="rc" disabled={!words} onClick={() => go("round", { book: bookId, unit: unitN, n: i + 1 })}>
                <b>{i + 1}-round</b><span>{r.length} so'z</span>{p === 100 && <img src={img("medal")} alt="" />}
                <span className="b"><i style={{ width: `${p}%` }} /></span><span className="p">{p}%</span>
              </button>
            );
          })}
        </div>
      )}

      {rules.length > 0 && (
        <div className="vid">
          <button type="button" className="vth" onClick={() => go("theory", { book: bookId, unit: unitN })}>
            {seen && <span className="seen"><Check size={14} aria-hidden />O'qildi</span>}
            {exAr && <span className="vth-ex"><Ar>{exAr}</Ar></span>}
            <span className="pl"><span className="c"><Play size={22} fill="currentColor" aria-hidden /></span>
              <span><small>NAZARIYA · {rules.length} TA QOIDA</small><Ar className="pl-ar">{rules[0].ar || "الْقَوَاعِدُ"}</Ar></span></span>
          </button>
          <button type="button" className="vtest" onClick={() => go(seen ? "test" : "theory", { book: bookId, unit: unitN })}
            aria-label={seen ? "Grammatik test" : "Test nazariyadan keyin ochiladi"}>
            <span><b>Test</b><span>{nq} savol</span></span>
            <span className="c">{seen ? <ArrowRight size={18} aria-hidden /> : <Lock size={16} aria-hidden />}</span>
            <em>{gram}%</em>
          </button>
        </div>
      )}

      {kbKey && (
        <>
          <button type="button" className="ub v-ex" aria-expanded={open === "ex"} onClick={() => setOpen(open === "ex" ? null : "ex")}>
            <span className="ub-deco" aria-hidden><Emo e="📝" size={52} /><Emo e="💬" size={52} /><Emo e="📖" size={52} /></span>
            <span className="ub-hd"><span className="ub-badge"><Star size={28} aria-hidden /></span>
              <span className="ub-tt"><Ar className="ub-ar">التَّدْرِيبَاتُ</Ar><span className="ub-uz">Mashqlar{kb ? ` · ${kb.steps.length} topshiriq` : ""}</span></span>
              <span className="ub-chev">{open === "ex" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span></span>
            {kb && <span className="ub-pr"><span className="b"><i style={{ width: `${exPct}%` }} /></span><em>{exPct}%</em></span>}
          </button>
          {open === "ex" && (
            <div className="tray">
              {!kb && <p className="muted">Yuklanmoqda…</p>}
              {kb?.steps.map((s, si) => {
                const on = kbOpen(kbB, si), b = kbB[si];
                const g = s.items.filter((x) => GRADED.includes(x.type)).length;
                return (
                  <button key={si} type="button" className={`rc kbc ${on ? "" : "lock"}`} aria-disabled={!on}
                    onClick={() => (on ? go("kb", { key: kbKey, si, book: bookId, unit: unitN }) : tg.haptic("error"))}
                    title={on ? s.t : `Avval ${si}-topshiriqni bajaring`}>
                    <b>{si + 1}-topshiriq</b><span className="d">{s.t.split(" · ")[0]} · {g ? `${g} savol` : `${s.items.length} qism`}</span>
                    {on ? <span className="ic"><Emo e={kbIcon(s.k)} size={34} /></span> : <span className="lk"><Lock size={14} aria-hidden /></span>}
                    <span className="b"><i style={{ width: `${b ?? 0}%` }} /></span><span className="p">{on ? `${b ?? 0}%` : "Qulf"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export function RoundScreen({ bookId, unitN, n }: { bookId: string; unitN: number; n: number }) {
  const { back } = useNav();
  const book = useBook(bookId);
  const [all, setAll] = useState<Word[] | null>(null);
  const u = book?.units.find((x) => x.n === unitN);
  useEffect(() => { if (!u) return; let a = true; loadWords(bookId, unitN, u.words).then((w) => a && setAll(w)); return () => { a = false; }; }, [u, bookId, unitN]);
  if (!all) return <main className="screen"><p className="muted pad">Yuklanmoqda…</p></main>;
  const words = all.slice((n - 1) * SIZE, n * SIZE);
  return <Round bookId={bookId} unit={unitN} n={n} words={words} pool={all} onExit={() => back()} />;
}
