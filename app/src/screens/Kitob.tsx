// Mashqlar (uy vazifasining 3-qismi): bitta topshiriq — kitob mashqlari qadami (KB_LESSONS a1:N → steps[si] → items).
// Savollar ketma-ket; har savol ostida "Tushunmadim": tushuntirish → baribir tushunmasa o'tkazib yuboriladi va ustozga xabar boradi.
// 12-partiya (A2): xato javobdan keyin maslahat zinapoyasi — ishora → qoida → javob; maslahat bilan topilgan savol yarim ball.
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, HelpCircle, Mic, Pause, Play, RotateCcw, Send, Square, Star, Volume2, X } from "lucide-react";
import { preloadKitob, say, sayWait, stopSay } from "../lib/audio";
import {
  blobB64, freeOptional, GRADED, HOW, insUz, isAr, kbFlush, kbSaveBest, loadKb, prep, recMime, rightOf, sayAfter, sayAuto, sendSub, tipOf, kbTexts,
  type KbItem, type KbLesson, type KbStep, type Prepared,
} from "../lib/kb";
import { a0Answer, a0HwFor, a0HwState, loadAllA0, revAnswer, revDue, revWrong, type Rev } from "../lib/a0";
import { gain, store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Emo, EmoLead } from "../ui/Emo";
import { Ar } from "../ui/kit";
import { CountUp } from "../ui/CountUp";
import { reactMark, reactReset, reactStepEnd } from "../ui/Reaction";
import { Scale } from "../ui/Scale";
import { Alphabet, Hear, Ladder, LetterItem, Trace } from "./KbA0";
import { GainNote } from "../ui/GainNote";
import { ERR_KIND, HintLadder, noteHint, typeFirst } from "../ui/HintLadder";
import { strandSet } from "../lib/strand";
import { rkOn } from "../lib/reaction";
import { coverage, lookup, RANK, rankFor, useLex, type LexE } from "../lib/lex";
import { CoverBar, PreWords, TapText, WordPop } from "../ui/Lex";

export function KbScreen({ lessonKey, si, unitN, letter }: { lessonKey: string; si: number; unitN: number; letter?: string }) {
  const { back } = useNav();
  const [L, setL] = useState<KbLesson | null | "err" | "empty">(null);
  const [refs, setRefs] = useState<Rev[] | undefined>(undefined);
  useEffect(() => {
    let a = true;
    if (lessonKey === "a0:rev") {
      // A0 xato savollari: muddati kelganlari (12 tagacha), har biri o'z darsidan olinadi
      void loadAllA0().then((all) => {
        if (!a) return;
        const D = revDue(all).slice(0, 12);
        if (!D.length) { setL("empty"); return; }
        const items = D.map((r) => all[Number(r.k.split(":")[1]) - 1]!.steps[r.s].items[r.i]);
        for (const n of new Set(D.map((r) => r.k))) { const x = all[Number(n.split(":")[1]) - 1]; if (x) void preloadKitob(n.replace(":", "/"), x.steps.flatMap(kbTexts).slice(0, 800)); }
        setRefs(D);
        setL({ title: "Takrorlash", uz: "Takrorlash", steps: [{ k: "rev", t: "Takrorlash", items }] });
      });
    } else if (lessonKey === "a0:map") {
      const l = letter || "ب";
      setL({ title: "Harf yozish", uz: "Harf yozish", steps: [{ k: "map", t: "Barmoq bilan yozish", items: [0, 1, 3].map((f) => ({ type: "trace", l, f })) }] });
    } else loadKb(lessonKey).then((x) => a && setL(x)).catch(() => a && setL("err"));
    return () => { a = false; };
  }, [lessonKey, letter]);
  useEffect(() => { void kbFlush(); return () => stopSay(); }, []);
  if (L === "err") return <main className="round"><p className="muted pad">Mashq yuklanmadi. Internetni tekshirib, qayta oching.</p><button type="button" className="btn dark wide" onClick={back}>Orqaga</button></main>;
  if (L === "empty") return <main className="round"><div className="r-done"><Scale size={120} balanced star /><h1>Hozircha takrorlanadigan savol yo'q</h1><p>Xato qilingan savollar ertasi kuni shu yerga qaytadi.</p><button type="button" className="btn primary wide" onClick={back}>Orqaga</button></div></main>;
  if (!L) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  const st = L.steps[si];
  if (!st) return <main className="round"><p className="muted pad">Topshiriq topilmadi.</p><button type="button" className="btn dark wide" onClick={back}>Orqaga</button></main>;
  return <Run L={L} st={st} lessonKey={lessonKey} si={si} unitN={unitN} refs={refs} letter={letter} />;
}

const PRAISE = ["To'g'ri!", "Barakalla!", "Ajoyib!", "Zo'r!"];

function Run({ L, st, lessonKey, si, unitN, refs, letter }: { L: KbLesson; st: KbStep; lessonKey: string; si: number; unitN: number; refs?: Rev[]; letter?: string }) {
  const { back, replace } = useNav();
  const { me } = useSession(); // 17-partiya (A2): darajaga qarab maslahat
  const items = useMemo(() => st.items.map(prep), [st]);
  const n = items.length;
  const graded = items.filter((x) => GRADED.includes(x.type)).length;
  const [i, setI] = useState(st.rule ? -1 : 0);
  const [ok, setOk] = useState(0);
  const [okH, setOkH] = useState(0); // maslahatdan keyin topilganlar (yarim ball)
  const [tries, setTries] = useState(0); // shu savoldagi xato urinishlar
  const [ans, setAns] = useState<boolean | null>(null);
  const [help, setHelp] = useState(false);
  const [freeSent, setFreeSent] = useState<"srv" | "local" | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const skipped = useRef<number[]>([]);
  const title = `${L.title} · ${st.t}`;
  // "12-bet · Asosiy matn" kabi sarlavhada bet raqami emas, nomi ko'rsatiladi
  const parts = st.t.split(" · ");
  const label = /^\d+(-\d+)?-bet$/.test(parts[0]) && parts.length > 1 ? parts.slice(1).join(" · ") : parts[0];
  const a0 = lessonKey.startsWith("a0:");
  const a0n = /^a0:\d+$/.test(lessonKey); // oddiy A0 darsi (takrorlash va harf yozish emas)
  const virt = lessonKey === "a0:rev" || lessonKey === "a0:map";
  const book = lessonKey.split(":")[0];
  const revAdded = useRef(0);

  // kitob audiosi butun dars uchun bir marta so'raladi (server 800 tagacha kalit qabul qiladi)
  useEffect(() => { if (!virt) void preloadKitob(lessonKey.replace(":", "/"), [...new Set(L.steps.flatMap(kbTexts))].slice(0, 800)); }, [L, lessonKey, virt]);
  // "Tushunmadim" xabari: topshiriq tugaganda yoki undan chiqib ketilganda bir marta yuboriladi
  const report = () => {
    const s = skipped.current;
    if (!s.length) return;
    skipped.current = [];
    void sendSub({
      lesson: lessonKey, step: st.k, item: 300 + si, title: "Tushunmadim · " + title,
      text: `Tushunmadim: «${label}» topshirig'ida ${s.length} ta savolni o'tkazib yubordi (${s.map((x) => x + 1).join(", ")}-savol).`,
    }).catch(() => { /* yuborilmadi — keyingi safar */ });
  };
  useEffect(() => () => report(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // 4 yo'l hisobi: o'qish/tinglash matnlari — kiritma, erkin javob — chiqarma, qolgani — til shakli
  useEffect(() => {
    const t = st.items.map((x) => x.type);
    strandSet(t.some((x) => x === "free") ? "o" : t.filter((x) => ["read", "listen1", "hear"].includes(x)).length * 2 >= t.length ? "i" : "f");
  }, [st]);
  const it: Prepared | undefined = items[i];
  useEffect(() => {
    if (!it) return;
    const t = sayAuto(it);
    if (!t) return;
    const h = setTimeout(() => void say(t), 250);
    return () => clearTimeout(h);
  }, [it]);

  const finish = (v: boolean) => {
    if (ans !== null || !it) return;
    setAns(v);
    if (v) (tries ? setOkH : setOk)((o) => o + 1);
    if (tries && !virt) noteHint(`${lessonKey}#${si}`);
    tg.haptic(v ? "success" : "error");
    reactMark(v); // reaksiya stikeri
    const first = v && !tries; // takrorlash va ko'nikma hisobiga faqat birinchi urinish kiradi
    if (a0) {
      a0Answer(it, first); // harf va ko'nikma hisobi
      if (lessonKey === "a0:rev" && refs?.[i] && it.type !== "trace") revAnswer(refs[i], first);
      else if (a0n && !first && it.type !== "trace") { revWrong(lessonKey, si, i); revAdded.current++; }
    }
  };
  const mark = (v: boolean) => {
    if (ans !== null || !it) return;
    // birinchi xato: javob ochilmaydi — maslahat zinapoyasi chiqadi, o'quvchi yana urinadi
    if (!v && !tries && RETRY.has(it.type)) { setTries(1); tg.haptic("error"); return; }
    finish(v);
  };
  const next = () => {
    stopSay();
    setAns(null); setHelp(false); setFreeSent(null); setTries(0);
    if (i + 1 >= n) {
      const p = graded ? Math.min(100, Math.round(((ok + okH * 0.5) / graded) * 100)) : 100;
      if (!virt) kbSaveBest(lessonKey, si, p);
      // harf yozish (xarita) — yulduzcha bermaydi: eski ilovada cheksiz XP yig'ish mumkin edi
      if (lessonKey !== "a0:map") gain("game", stepXp());
      report();
      setPct(p);
      reactStepEnd(p);
    }
    setI(i + 1);
    window.scrollTo(0, 0);
  };
  // 12-partiya (A5): baholanmaydigan (o'qish) qadam — har matn uchun 3 yulduzcha (avval 5 ta qat'iy edi)
  const stepXp = () => (graded ? Math.max(5, ok * 2 + okH) : Math.max(6, n * 3));
  const skip = () => { skipped.current = [...skipped.current, i]; tg.haptic("light"); next(); };

  const head = (
    <>
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={() => { reactReset(); back(); }}><X size={22} aria-hidden />Chiqish</button>
        <b>{virt ? L.title : `${si + 1}-topshiriq · ${label}`}</b>
        <span className="r-count">{Math.max(0, Math.min(i, n))} / {n}</span>
      </header>
      <div className="r-bar"><i style={{ width: `${(Math.max(0, Math.min(i, n)) / n) * 100}%` }} /></div>
    </>
  );

  // Qoida (qadam boshida)
  if (i < 0 && st.rule) {
    return (
      <main className="round kb">
        {head}
        <section className="kb-card kb-rule">
          <Ar className="kb-rh">{st.rule.h}</Ar>
          {st.rule.p.map((p, k) => <p key={k} dangerouslySetInnerHTML={{ __html: p }} />)}
        </section>
        <button type="button" className="btn primary wide kb-next" onClick={() => setI(0)}>Mashqni boshlash</button>
      </main>
    );
  }

  // Yakun
  if (i >= n || !it) {
    const p = pct ?? 0;
    const last = virt || si >= L.steps.length - 1;
    const xp = lessonKey === "a0:map" ? 0 : stepXp();
    return (
      <main className="round kb">
        <div className="r-done">
          {/* tarozi: 70% dan yuqori bo'lsa muvozanatga keladi, past bo'lsa qiyshiq qoladi */}
          <Scale size={150} balanced={p >= 70} star={p >= 70} />
          <h1>{p >= 90 ? "Mukammal!" : p >= 70 ? "Ajoyib!" : p >= 40 ? "Yaxshi, davom eting!" : "Yana bir bor urinib ko'ring"}</h1>
          <span className="kb-big">{p}%</span>
          <p>{label} · {ok + okH} / {graded} to'g'ri{okH ? ` · ${okH} tasi maslahat bilan` : ""}</p>
          {a0n && revAdded.current > 0 && <p className="a0-revnote"><RotateCcw size={16} aria-hidden />{revAdded.current} ta xato savol «Takrorlash»ga qo'shildi — ertaga yana chiqadi.</p>}
          {xp > 0 && <p className="r-earn"><Star size={22} aria-hidden /><CountUp to={xp} />&nbsp;yulduzcha</p>}
          <GainNote />
          {a0n && (() => { const hw = a0HwFor(Number(lessonKey.split(":")[1])); const s = hw ? a0HwState(hw, L) : null;
            return hw && s && s.full && !s.sent ? <button type="button" className="btn primary wide a0-go" onClick={() => replace("hwsend", { id: hw.id })}><Send size={18} aria-hidden />Dars tugadi — ustozga topshirish</button> : null; })()}
          {!last && <button type="button" className="btn primary wide" onClick={() => replace("kb", { key: lessonKey, si: si + 1, book, unit: unitN })}>Keyingi topshiriq: {L.steps[si + 1].t.split(" · ")[0]}</button>}
          <button type="button" className="btn ghost wide" onClick={() => replace("kb", { key: lessonKey, si, book, unit: unitN, l: letter, n: Date.now() })}><RotateCcw size={18} aria-hidden />Qayta ishlash</button>
          <button type="button" className="btn ghost wide" onClick={() => { reactReset(); back(); }}>{virt ? "Orqaga" : a0 ? "Darsga qaytish" : "Vahdaga qaytish"}</button>
        </div>
      </main>
    );
  }

  const done = ans !== null;
  const isGraded = GRADED.includes(it.type);
  // Madina'da erkin javob ixtiyoriy: ustozga yubormasdan ham keyingisiga o'tish mumkin (natijaga ta'sir qilmaydi)
  const optFree = it.type === "free" && freeOptional(lessonKey) && !freeSent;
  const canNext = ["intro", "read", "ladder", "letter", "alphabet"].includes(it.type) ? true : it.type === "free" ? !!freeSent || optFree : done;
  const props = { it, done, ans, mark, tries };
  return (
    <main className="round kb">
      {head}
      <section className="kb-card" key={i}>
        <div className="kb-ins">{it.ins ? <><Ar className="kb-ins-ar">{it.ins}</Ar><span>{insUz(it.ins, it.type)}</span></> : <span>{tipOf(it.type)}</span>}</div>
        {it.type === "intro" && <Intro it={it} />}
        {it.type === "read" && <Read it={it} normKey={`${lessonKey}#${si}.${i}`} lk={lessonKey} />}
        {(it.type === "choose" || it.type === "qa") && <Choose {...props} />}
        {it.type === "listen1" && <Listen1 {...props} />}
        {it.type === "pick" && <Pick {...props} />}
        {it.type === "tf" && <TrueFalse {...props} />}
        {(it.type === "letters" || it.type === "order") && <Build {...props} />}
        {it.type === "match" && <Match {...props} />}
        {it.type === "classify" && <Classify {...props} />}
        {it.type === "free" && <Free it={it} sent={freeSent} onSent={setFreeSent} sub={{ lesson: lessonKey, step: st.k, item: i, title }} />}
        {it.type === "hear" && <Hear {...props} />}
        {it.type === "trace" && <Trace {...props} />}
        {it.type === "ladder" && <Ladder {...props} />}
        {it.type === "letter" && <LetterItem {...props} />}
        {it.type === "alphabet" && <Alphabet />}
        {!["intro", "read", "choose", "qa", "listen1", "pick", "tf", "letters", "order", "match", "classify", "free", "hear", "trace", "ladder", "letter", "alphabet"].includes(it.type) && <p className="muted">Bu turdagi mashq hali yangi ilovada yo'q. Davom etishingiz mumkin.</p>}
      </section>

      {tries > 0 && !done && !help && (
        <HintLadder hint={hintOf(it)} onReveal={() => finish(false)} kind={typeFirst(me?.level) ? ERR_KIND[it.type] : undefined}
          rule={st.rule ? <><Ar className="kb-rh small">{st.rule.h}</Ar>{st.rule.p.map((p, k) => <p key={k} dangerouslySetInnerHTML={{ __html: p }} />)}</> : undefined} />
      )}
      {isGraded && done && <Feedback it={it} good={!!ans} n={i} hinted={tries > 0} rev={a0n && (!ans || tries > 0) && it.type !== "trace"} />}

      {!done && !help && !freeSent && !["intro", "read", "ladder", "letter", "alphabet"].includes(it.type) && (
        <button type="button" className="kb-dunno" onClick={() => { setHelp(true); tg.haptic("light"); }}><HelpCircle size={18} aria-hidden />{tries ? "Baribir tushunmadim" : "Tushunmadim"}</button>
      )}
      {help && !done && (
        <section className="kb-help" aria-live="polite">
          <b>Tushuntirish</b>
          <p><span className="lbl">Topshiriq</span>{insUz(it.ins, it.type) || tipOf(it.type)}</p>
          <p><span className="lbl">Qanday bajariladi</span>{HOW[it.type] || tipOf(it.type)}</p>
          {st.rule && (
            <div className="kb-help-rule">
              <span className="lbl">Qoida</span><Ar className="kb-rh small">{st.rule.h}</Ar>
              {st.rule.p.map((p, k) => <p key={k} dangerouslySetInnerHTML={{ __html: p }} />)}
            </div>
          )}
          <div className="kb-help-act">
            <button type="button" className="btn ghost" onClick={() => setHelp(false)}>Tushundim</button>
            <button type="button" className="btn dark" onClick={skip}>O'tkazib yuborish</button>
          </div>
          <small className="muted">O'tkazib yuborsangiz, ustozingizga bu savolni tushunmaganingiz haqida xabar boradi.</small>
        </section>
      )}

      {canNext && <button type="button" className={`btn wide kb-next ${optFree ? "ghost" : isGraded ? (ans ? "good" : "dark") : "primary"}`} onClick={next}>{i + 1 >= n ? "Natijani ko'rish" : optFree ? "Yubormasdan keyingisiga" : "Davom etish"}</button>}
    </main>
  );
}

// ===== umumiy qismlar =====
type P = { it: Prepared; done: boolean; ans: boolean | null; mark: (v: boolean) => void; tries: number };

/** qayta urinish beriladigan turlar (to'g'ri/noto'g'ri — ikki variantli, qayta urinish javobni ochib qo'yadi; match — o'z hisobi bor) */
const RETRY = new Set(["choose", "qa", "listen1", "pick", "letters", "order", "classify"]);
/** 1-pog'ona: savolning o'zidan olingan ishora */
function hintOf(it: Prepared): ReactNode {
  const many = (it.opts || []).length >= 4;
  switch (it.type) {
    case "letters": return <>So'z shu harf bilan boshlanadi: <Ar className="hl-ar">{(it.letters || [])[0]}</Ar></>;
    case "order": return <>Gapni shu so'zdan boshlab ko'ring: <Ar className="hl-ar">{String(it.ok).split(" ")[0]}</Ar></>;
    case "classify": return "To'g'ri joylangan so'zlar qoldi. Qaytib chiqqan so'zlarni boshqa ustunga qo'ying.";
    case "listen1": return `Karnayni bosib, yana bir marta diqqat bilan tinglang.${many ? " Bitta xato variant olib tashlandi." : ""}`;
    case "pick": return "Karnayni bosib, yana bir marta tinglang va boshqa rasmni tanlang.";
    default: return many ? "Bitta xato variant olib tashlandi. Savolni qayta o'qing." : "Savolni qayta o'qing va boshqa variantni tanlang.";
  }
}

function SayBtn({ t, big }: { t: string; big?: boolean }) {
  return <button type="button" className={`say ${big ? "big" : ""}`} aria-label="Tinglash" onClick={() => void say(t)}><Volume2 size={big ? 30 : 22} aria-hidden /></button>;
}

/** Arabcha va lotincha aralash matn: ichida o'zbekcha so'z bo'lmasa — butunlay arabcha (o'ngdan chapga, katta shrift);
 *  o'zbekcha so'z bo'lsa — chapdan o'ngga, arabcha bo'laklar alohida ajratiladi (masalan «صَعْبٌ» so'zining ziddi qaysi?) */
function Mixed({ text, className = "" }: { text: string; className?: string }) {
  const latin = /[A-Za-zÀ-ɏʻʼ']{3,}/.test(text);
  if (!latin) return <p className={`ar kb-qar ${className}`} dir="rtl" lang="ar">{text}</p>;
  return (
    <p className={`kb-qz ${className}`}>
      {text.split("\n").map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/([؀-ۿ][؀-ۿ\s؟،.…·]*[؀-ۿ؟])/).map((s, k) => (isAr(s) ? <bdi key={k} className="ar" dir="rtl" lang="ar">{s}</bdi> : s))}
        </Fragment>
      ))}
    </p>
  );
}

function Opts({ opts, ok, done, tries, onPick }: { opts: string[]; ok: string; done: boolean; tries: number; onPick: (o: string) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [bad, setBad] = useState<string[]>([]); // xato tanlanganlar (qayta urinishda yopiq)
  // ishora: 4 va undan ko'p variantda yana bitta xato variant o'chiriladi
  const cut = tries && !done && opts.length >= 4 ? opts.find((o) => o !== ok && !bad.includes(o)) : undefined;
  return (
    <div className="r-opts">
      {opts.map((o) => {
        const s = done ? (o === ok ? "ok" : o === pick || bad.includes(o) ? "no" : "dim") : bad.includes(o) ? "no" : o === cut ? "dim" : "";
        return (
          <button key={o} type="button" className={`opt ${s} ${isAr(o) ? "opt-r" : ""}`} disabled={done || bad.includes(o) || o === cut}
            onClick={() => { setPick(o); if (o !== ok) setBad([...bad, o]); onPick(o); }}>
            {isAr(o) ? <Ar className="opt-ar">{o}</Ar> : o}
            <Mark s={s} />
          </button>
        );
      })}
    </div>
  );
}

/** Javob belgisi: to'g'ri/xato faqat rang bilan bildirilmasin */
function Mark({ s }: { s: string }) {
  if (s === "ok") return <Check size={20} strokeWidth={3} className="opt-mark" aria-hidden />;
  if (s === "no") return <X size={20} strokeWidth={3} className="opt-mark" aria-hidden />;
  return null;
}

function Feedback({ it, good, n, rev, hinted }: { it: KbItem; good: boolean; n: number; rev?: boolean; hinted?: boolean }) {
  const r = rightOf(it);
  return (
    <div className={`kb-fb ${good ? "ok" : "bad"}`} role="status">
      <b>{good ? <Check size={18} strokeWidth={3} aria-hidden /> : <X size={18} strokeWidth={3} aria-hidden />}{good ? (hinted ? "To'g'ri — maslahat bilan" : rkOn() ? "To'g'ri!" : PRAISE[n % 4]) : "Bu safar xato"}</b>
      {!good && r && !["match", "classify", "trace"].includes(it.type) && <span>To'g'ri javob: {isAr(r) ? <Ar>{r}</Ar> : r}</span>}
      {it.why && (!good || it.type !== "pick") && <Mixed text={it.why} className="kb-why" />}
      {rev && <span className="kb-rev"><RotateCcw size={14} aria-hidden />Bu savol «Takrorlash»ga qo'shildi — ertaga yana chiqadi</span>}
    </div>
  );
}

// ===== turlar =====
function Intro({ it }: { it: KbItem }) {
  return (
    <>
      {it.title && <b className="kb-ti">{it.title}</b>}
      <ul className="kb-wl">
        {(it.words as string[][] | undefined)?.map((w, k) => (
          <li key={k}><SayBtn t={w[0]} /><Ar className="kb-wa">{w[0]}</Ar><span className="kb-wu"><EmoLead text={w[1] || ""} /></span></li>
        ))}
      </ul>
    </>
  );
}

function Read({ it, normKey, lk }: { it: KbItem; normKey: string; lk: string }) {
  const [playing, setPlaying] = useState(-1);
  const [uz, setUz] = useState(false);
  const run = useRef(0);
  useEffect(() => () => { run.current++; }, []);
  const lines = ((it.lines || []) as (string | string[])[]).map((l) => (Array.isArray(l) ? l : ["", l, ""]));
  const hasUz = lines.some((l) => !!l[2]);
  // 2-paket: so'zni bosib tarjima, «siz bilgan so'zlar» foizi, qiyin matndan oldin 5 ta so'z
  const lex = useLex();
  const [bk, un] = lk.split(":");
  const ctx = RANK[bk] ? { b: bk, u: Number(un) || 1 } : undefined;
  const cov = useMemo(() => (lex && ctx ? coverage(lex, lines.map((l) => l[1]), ctx, rankFor(ctx.b)) : null), [lex, lk, it]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pop, setPop] = useState<{ w: string; e: LexE | null } | null>(null);
  const [pre, setPre] = useState(false);
  const playAll = async () => {
    if (playing >= 0) { run.current++; stopSay(); setPlaying(-1); return; }
    const my = ++run.current;
    for (let k = 0; k < lines.length; k++) {
      if (run.current !== my) return;
      setPlaying(k);
      await sayWait(lines[k][1]);
      await new Promise((r) => setTimeout(r, 350));
    }
    if (run.current === my) setPlaying(-1);
  };
  return (
    <>
      {it.title && <Ar className="kb-ti ar-t">{it.title}</Ar>}
      {cov?.ok && <CoverBar cov={cov} onPre={() => setPre(true)} />}
      {it.norm ? <NormTimer norm={it.norm} k={normKey} /> : null}
      <button type="button" className="btn ghost kb-play" onClick={() => void playAll()}>{playing >= 0 ? <><Pause size={18} aria-hidden />To'xtatish</> : <><Play size={18} aria-hidden />Hammasini tinglash</>}</button>
      <div className="kb-dlg">
        {lines.map((l, k) => (
          <div key={k} className={`kb-ln ${playing === k ? "on" : ""}`}>
            {l[0] && <Ar className="kb-sp">{l[0]}</Ar>}
            <div className="kb-lr">
              <button type="button" className="say sm" aria-label="Gapni tinglash" onClick={() => void say(l[1])}><Volume2 size={18} aria-hidden /></button>
              <Ar className="kb-lt">{lex ? <TapText text={l[1]} onWord={(w) => setPop({ w, e: lookup(lex, w, ctx) })} /> : l[1]}</Ar>
            </div>
            {uz && l[2] && <small>{l[2]}</small>}
          </div>
        ))}
      </div>
      {hasUz && <button type="button" className="kb-link" onClick={() => setUz(!uz)}>{uz ? "Tarjimani yashirish" : "Tarjimani ko'rsatish"}</button>}
      {lex && <p className="kb-tip">So'zni bossangiz — tarjimasi chiqadi.</p>}
      {pop && <WordPop w={pop.w} e={pop.e} onClose={() => setPop(null)} />}
      {pre && cov && <PreWords list={cov.unknown.slice(0, 5)} onClose={() => setPre(false)} />}
    </>
  );
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
/** O'qish normativi: matnni ovoz chiqarib belgilangan vaqtda o'qish. Eng yaxshi vaqt f.rdt da (kalit: dars#qadam.item) */
function NormTimer({ norm, k }: { norm: number; k: string }) {
  const [t0, setT0] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [res, setRes] = useState<number | null>(null);
  const best = store.get<Record<string, number>>("f.rdt", {})[k];
  useEffect(() => {
    if (t0 === null) return;
    const h = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(h);
  }, [t0]);
  const start = () => { stopSay(); setRes(null); setT0(Date.now()); setNow(Date.now()); tg.haptic(); };
  const stop = () => {
    if (t0 === null) return;
    const s = Math.max(1, Math.round((Date.now() - t0) / 1000));
    setT0(null); setRes(s);
    const B = store.get<Record<string, number>>("f.rdt", {});
    if (!B[k] || s < B[k]) { B[k] = s; store.set("f.rdt", B); }
    tg.haptic(s <= norm ? "success" : "light");
  };
  const run = t0 !== null ? Math.floor((now - t0) / 1000) : 0;
  return (
    <div className={`kb-norm ${res !== null ? (res <= norm ? "ok" : "slow") : ""}`} aria-live="polite">
      <div className="kb-norm-h">
        <span><b>Normativ: {mmss(norm)}</b><small>Matnni ovoz chiqarib shu vaqtda o'qing{best ? ` · eng yaxshi: ${mmss(best)}` : ""}</small></span>
        {t0 === null
          ? <button type="button" className="btn primary" onClick={start}><Play size={16} aria-hidden />{res === null ? "Boshlash" : "Qayta"}</button>
          : <button type="button" className="btn dark" onClick={stop}><Square size={14} aria-hidden />To'xtatish</button>}
      </div>
      {t0 !== null && <span className={`kb-norm-t ${run > norm ? "over" : ""}`}>{mmss(run)}</span>}
      {res !== null && <p>{res <= norm ? <><Check size={16} aria-hidden />{mmss(res)} — normativ bajarildi!</> : <>{mmss(res)} — normativdan {res - norm} soniya ko'p. Yana bir bor o'qib ko'ring.</>}</p>}
    </div>
  );
}

function Choose({ it, done, mark, tries }: P) {
  const answer = (o: string) => { mark(o === it.ok); const t = sayAfter(it); if (t) void say(t); };
  return (
    <>
      {it.pic && <div className="kb-pic"><Emo e={it.pic} size={88} /></div>}
      {it.say && <div className="kb-q"><SayBtn t={it.say} big /></div>}
      {it.q && <Mixed text={it.q} />}
      {it.qz && <p className="kb-uz">{it.qz}</p>}
      <Opts opts={it.opts || []} ok={String(it.ok)} done={done} tries={tries} onPick={answer} />
      {done && it.full && <div className="kb-full"><SayBtn t={it.full} /><span><Ar>{it.full}</Ar>{it.fz && <small>{it.fz}</small>}</span></div>}
    </>
  );
}

function Listen1({ it, done, mark, tries }: P) {
  return (
    <>
      <div className="kb-q"><SayBtn t={it.ar || ""} big />{done && <Ar className="kb-qa">{it.ar}</Ar>}</div>
      <Opts opts={it.opts || []} ok={String(it.ok)} done={done} tries={tries} onPick={(o) => { mark(o === it.ok); void say(it.ar || ""); }} />
    </>
  );
}

function Pick({ it, done, mark }: P) {
  const [pick, setPick] = useState<string | null>(null);
  const [bad, setBad] = useState<string[]>([]);
  return (
    <>
      <div className="kb-q"><SayBtn t={it.ar || ""} big />{done && <Ar className="kb-qa">{it.ar}</Ar>}</div>
      <div className="r-opts grid">
        {(it.pics || []).map((p) => {
          const s = done ? (p === it.ok ? "ok" : p === pick || bad.includes(p) ? "no" : "dim") : bad.includes(p) ? "no" : "";
          return <button key={p} type="button" className={`opt ${s}`} disabled={done || bad.includes(p)} aria-label={p}
            onClick={() => { setPick(p); if (p !== it.ok) setBad([...bad, p]); mark(p === it.ok); void say(it.ar || ""); }}><Emo e={p} size={72} /><Mark s={s} /></button>;
        })}
      </div>
    </>
  );
}

function TrueFalse({ it, done, mark }: P) {
  const [pick, setPick] = useState<boolean | null>(null);
  const right = !!it.ok;
  return (
    <>
      <div className="kb-q"><SayBtn t={it.s || ""} /><Ar className="kb-qa">{it.s}</Ar></div>
      {done && it.uz && <p className="kb-uz">{it.uz}</p>}
      <div className="kb-tf">
        {[true, false].map((v) => {
          const s = !done ? "" : v === right ? "ok" : v === pick ? "no" : "dim";
          return (
            <button key={String(v)} type="button" className={`opt ${s}`} disabled={done} onClick={() => { setPick(v); mark(v === right); }}>
              {v ? <Check size={20} aria-hidden /> : <X size={20} aria-hidden />}{v ? "To'g'ri" : "Noto'g'ri"}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** letters — harflardan so'z, order — so'zlardan gap: plitkalarni bosib tartib bilan terish */
function Build({ it, done, ans, mark, tries }: P) {
  const letters = it.type === "letters";
  const tiles: string[] = letters ? (it.tiles as { l: string }[]).map((t) => t.l) : (it.tiles as string[]);
  const need = letters ? (it.letters || []).length : (it.words || []).length;
  const [used, setUsed] = useState<number[]>([]);
  useEffect(() => { if (tries) setUsed([]); }, [tries]); // qayta urinish: plitkalar qaytadi
  const add = (k: number) => {
    if (done) return;
    const u = [...used, k];
    setUsed(u);
    if (u.length === need) {
      const got = u.map((x) => tiles[x]);
      if (letters) mark(got.join("") === (it.letters || []).join(""));
      else { const bj = got.join(" "); mark(bj === it.ok || (it.alt || []).includes(bj)); }
      void say(letters ? it.show || "" : String(it.ok));
    }
  };
  return (
    <>
      {it.pic && <div className="kb-pic"><Emo e={it.pic} size={80} /></div>}
      {it.see && <div className="kb-q"><SayBtn t={it.show || ""} /><Ar className="kb-qa">{it.see}</Ar></div>}
      <p className="kb-uz">{letters ? (it.q || `«${it.uz}» so'zini yasang`) : it.uz}</p>
      <div className={`kb-line ${done ? (ans ? "ok" : "bad") : ""} ${letters ? "join" : ""}`} dir="rtl">
        {used.length ? used.map((x, k) => (
          <button key={k} type="button" className="tile on" disabled={done} onClick={() => setUsed(used.filter((_, j) => j !== k))}><Ar>{tiles[x]}</Ar></button>
        )) : <span className="muted kb-ph">…</span>}
      </div>
      <div className="kb-tiles" dir="rtl">
        {tiles.map((t, k) => (used.includes(k)
          ? <span key={k} className="tile ghost"><Ar>{t}</Ar></span>
          : <button key={k} type="button" className="tile" disabled={done} onClick={() => add(k)}><Ar>{t}</Ar></button>))}
      </div>
      {done && (letters ? <Ar className="kb-qa center">{it.show}</Ar> : !ans && <p className="kb-uz">To'g'ri: <Ar>{String(it.ok)}</Ar></p>)}
    </>
  );
}

function Match({ it, done, mark }: P) {
  const pairs = it.pairs || [];
  const right = it.right || [];
  const [sel, setSel] = useState<number | null>(null);
  const [got, setGot] = useState<number[]>([]); // juftlangan chap so'zlar
  const [used, setUsed] = useState<number[]>([]); // ishlatilgan o'ng so'zlar
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const tapRight = (k: number) => {
    setFlash(null);
    if (sel === null || used.includes(k)) return;
    const P = pairs[sel] as (string | string[])[];
    const b = right[k];
    if (P[1] === b || (Array.isArray(P[2]) && P[2].includes(b))) {
      const g = [...got, sel];
      setGot(g); setUsed([...used, k]); setSel(null); tg.haptic("light");
      if (g.length === pairs.length) mark(miss <= 1);
    } else { setMiss(miss + 1); setFlash(k); tg.haptic("error"); }
  };
  return (
    <>
      {it.q && <p className="kb-uz">{it.q}</p>}
      <div className="kb-match" dir="rtl">
        <div>
          {pairs.map((p, k) => (
            <button key={k} type="button" className={`mt ${got.includes(k) ? "ok" : sel === k ? "sel" : ""}`} disabled={done || got.includes(k)}
              onClick={() => { setSel(k); setFlash(null); void say(p[0]); }}><Ar>{p[0]}</Ar></button>
          ))}
        </div>
        <div>
          {right.map((b, k) => (
            <button key={k} type="button" className={`mt ${used.includes(k) ? "ok" : flash === k ? "no" : ""}`} disabled={done || used.includes(k)} onClick={() => tapRight(k)}>
              {isAr(b) ? <Ar>{b}</Ar> : <span className="mt-l" dir="ltr">{b}</span>}
            </button>
          ))}
        </div>
      </div>
      {done && <p className="kb-uz">{miss ? `Xatolar: ${miss}` : "Barchasi birinchi urinishda to'g'ri!"}</p>}
    </>
  );
}

function Classify({ it, done, ans, mark, tries }: P) {
  const words = (it.words || []) as [string, number][];
  const cols = it.cols || [];
  const [put, setPut] = useState<Record<number, number>>({});
  // qayta urinish: to'g'ri joylanganlar qoladi, xatolari qaytib chiqadi
  useEffect(() => { if (tries) setPut((p) => Object.fromEntries(Object.entries(p).filter(([k, c]) => words[Number(k)][1] === c))); }, [tries]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<number | null>(null);
  const left = (it.order || []).filter((k) => put[k] === undefined);
  const place = (c: number) => { if (sel === null || done) return; setPut({ ...put, [sel]: c }); setSel(null); };
  const unplace = (k: number) => { if (done) return; const p = { ...put }; delete p[k]; setPut(p); };
  return (
    <>
      {it.q && <p className="kb-uz">{it.q}</p>}
      <div className="kb-chips" dir="rtl">
        {left.length ? left.map((k) => (
          <button key={k} type="button" className={`tile ${sel === k ? "on" : ""}`} onClick={() => { setSel(k); void say(words[k][0]); }}><Ar>{words[k][0]}</Ar></button>
        )) : <span className="muted kb-ph">Barcha so'zlar joylandi</span>}
      </div>
      <div className="kb-cols" dir="rtl">
        {cols.map((c, ci) => (
          <div key={ci} className={`kb-col ${sel !== null && !done ? "can" : ""}`}>
            <button type="button" className="kb-colh" disabled={done || sel === null} onClick={() => place(ci)}><Ar>{c}</Ar></button>
            <div className="kb-colw">
              {Object.keys(put).map(Number).filter((k) => put[k] === ci).map((k) => (
                <button key={k} type="button" className={`tile sm ${done ? (words[k][1] === ci ? "ok" : "no") : ""}`} disabled={done} onClick={() => unplace(k)}><Ar>{words[k][0]}</Ar></button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!done && !left.length && <button type="button" className="btn primary wide" onClick={() => mark(Object.keys(put).map(Number).every((k) => words[k][1] === put[k]))}>Tekshirish</button>}
      {done && !ans && <p className="kb-uz">Qizil so'zlar boshqa ustunga tegishli.</p>}
      {!done && left.length > 0 && <p className="kb-tip">{sel === null ? "So'zni bosing, keyin ustunni tanlang." : "Endi ustun nomini bosing."} Joylangan so'zni bossangiz, qaytib chiqadi.</p>}
    </>
  );
}

function Free({ it, sent, onSent, sub }: { it: KbItem; sent: "srv" | "local" | null; onSent: (s: "srv" | "local") => void; sub: { lesson: string; step: string; item: number; title: string } }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [voice, setVoice] = useState<{ blob: Blob; mime: string } | null>(null);
  const send = async () => {
    const v = text.trim();
    if (!voice && v.length < 3) { setErr("Javobingizni yozing yoki ovoz bilan ayting."); return; }
    setBusy(true); setErr("");
    try {
      const extra = voice ? { audio: await blobB64(voice.blob), mime: voice.mime } : {};
      onSent(await sendSub({ ...sub, text: v.slice(0, 1500), ...extra }));
      tg.haptic("success");
    } catch (e) { setErr(e instanceof Error ? e.message : "Yuborilmadi"); }
    setBusy(false);
  };
  return (
    <>
      {it.q && <Mixed text={it.q} />}
      {it.hint && <Ar className="kb-hint">{it.hint}</Ar>}
      {!!it.lines?.length && (
        <ol className="kb-flines">
          {(it.lines as (string | string[])[]).map((l, k) => { const t = Array.isArray(l) ? l[1] : l; return <li key={k}><button type="button" className="kb-lt" onClick={() => void say(t)}><Ar>{t}</Ar></button></li>; })}
        </ol>
      )}
      <textarea className="kb-free" dir="rtl" lang="ar" rows={4} placeholder="Arabcha yozing" value={text} disabled={!!sent || busy} onChange={(e) => setText(e.target.value)} />
      {!sent && <><div className="kb-or"><span>yoki</span></div><VoiceRec value={voice} onChange={setVoice} disabled={busy} /></>}
      {err && <p className="err">{err}</p>}
      {sent && !!it.ans?.length && (
        <details className="kb-model" open>
          <summary>Kitobdagi namuna javob</summary>
          <ol>{it.ans.map((a, k) => <li key={k}><Mixed text={a} /></li>)}</ol>
        </details>
      )}
      {sent
        ? <p className="kb-sent"><Check size={18} aria-hidden />{sent === "local" ? "Saqlandi. Internet ulanganda ustozga yuboriladi." : "Ustozga yuborildi. Baho qo'yilgach, Telegram orqali xabar keladi."}</p>
        : <button type="button" className="btn primary wide" disabled={busy} onClick={() => void send()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : "Ustozga yuborish"}</button>}
    </>
  );
}

/** Ovozli javob: bosib yozish, qayta bosib to'xtatish (2 daqiqagacha), tinglab ko'rish, qayta yozish */
export function VoiceRec({ value, onChange, disabled, label = "Ovoz bilan javob berish", max = 120, priv = "Ovozingizni faqat ustozingiz eshitadi." }: { value: { blob: Blob; mime: string } | null; onChange: (v: { blob: Blob; mime: string } | null) => void; disabled?: boolean; label?: string; max?: number; priv?: string }) {
  const can = typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const [rec, setRec] = useState(false);
  const [sec, setSec] = useState(0);
  const [err, setErr] = useState("");
  const mr = useRef<MediaRecorder | null>(null);
  const tick = useRef<number | undefined>(undefined);
  const url = useMemo(() => (value ? URL.createObjectURL(value.blob) : null), [value]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => { clearInterval(tick.current); if (mr.current?.state === "recording") mr.current.stop(); }, []);
  if (!can) return null;
  const stop = () => { clearInterval(tick.current); if (mr.current?.state === "recording") mr.current.stop(); setRec(false); };
  const start = async () => {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = recMime();
      let r: MediaRecorder;
      try { r = new MediaRecorder(s, m ? { mimeType: m, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }); } catch { r = new MediaRecorder(s); }
      const ch: Blob[] = [];
      const t0 = Date.now();
      r.ondataavailable = (e) => ch.push(e.data);
      r.onstop = () => { s.getTracks().forEach((t) => t.stop()); const mime = r.mimeType || m || "audio/webm"; onChange({ blob: new Blob(ch, { type: mime }), mime }); };
      r.start(); mr.current = r; setRec(true); setSec(0); tg.haptic("medium");
      tick.current = window.setInterval(() => { const s2 = Math.round((Date.now() - t0) / 1000); setSec(s2); if (s2 >= max) stop(); }, 500);
    } catch { setErr("Mikrofonga ruxsat berilmadi."); }
  };
  const fmt = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  return (
    <div className="kb-rec">
      {value && !rec ? (
        <>
          <button type="button" className="btn ghost" onClick={() => url && void new Audio(url).play()}><Play size={18} aria-hidden />Tinglash</button>
          <button type="button" className="btn ghost" disabled={disabled} onClick={() => onChange(null)}><RotateCcw size={18} aria-hidden />Qayta yozish</button>
        </>
      ) : (
        <button type="button" className={`btn ghost kb-recb ${rec ? "on" : ""}`} disabled={disabled} onClick={() => (rec ? stop() : void start())}>
          {rec ? <><Square size={16} aria-hidden />To'xtatish · {fmt}</> : <><Mic size={18} aria-hidden />{label}</>}
        </button>
      )}
      {err && <small className="err">{err}</small>}
      <small className="kb-priv">{priv}</small>
    </div>
  );
}
