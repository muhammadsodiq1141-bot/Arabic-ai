// Mashqlar (uy vazifasining 3-qismi): bitta topshiriq — kitob mashqlari qadami (KB_LESSONS a1:N → steps[si] → items).
// Savollar ketma-ket; har savol ostida "Tushunmadim": tushuntirish → baribir tushunmasa o'tkazib yuboriladi va ustozga xabar boradi.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, HelpCircle, Mic, Pause, Play, RotateCcw, Send, Square, Star, Volume2, X } from "lucide-react";
import { preloadKitob, say, sayWait, stopSay } from "../lib/audio";
import {
  blobB64, GRADED, HOW, insUz, isAr, kbFlush, kbSaveBest, loadKb, prep, recMime, rightOf, sayAfter, sayAuto, sendSub, tipOf, kbTexts,
  type KbItem, type KbLesson, type KbStep, type Prepared,
} from "../lib/kb";
import { gain } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { Emo, EmoLead } from "../ui/Emo";
import { Ar } from "../ui/kit";

export function KbScreen({ lessonKey, si, unitN }: { lessonKey: string; si: number; unitN: number }) {
  const { back } = useNav();
  const [L, setL] = useState<KbLesson | null | "err">(null);
  useEffect(() => { let a = true; loadKb(lessonKey).then((x) => a && setL(x)).catch(() => a && setL("err")); return () => { a = false; }; }, [lessonKey]);
  useEffect(() => { void kbFlush(); return () => stopSay(); }, []);
  if (L === "err") return <main className="round"><p className="muted pad">Mashq yuklanmadi. Internetni tekshirib, qayta oching.</p><button type="button" className="btn dark wide" onClick={back}>Orqaga</button></main>;
  if (!L) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  const st = L.steps[si];
  if (!st) return <main className="round"><p className="muted pad">Topshiriq topilmadi.</p><button type="button" className="btn dark wide" onClick={back}>Orqaga</button></main>;
  return <Run L={L} st={st} lessonKey={lessonKey} si={si} unitN={unitN} />;
}

const PRAISE = ["To'g'ri!", "Barakalla!", "Ajoyib!", "Zo'r!"];

function Run({ L, st, lessonKey, si, unitN }: { L: KbLesson; st: KbStep; lessonKey: string; si: number; unitN: number }) {
  const { back, replace } = useNav();
  const items = useMemo(() => st.items.map(prep), [st]);
  const n = items.length;
  const graded = items.filter((x) => GRADED.includes(x.type)).length;
  const [i, setI] = useState(st.rule ? -1 : 0);
  const [ok, setOk] = useState(0);
  const [ans, setAns] = useState<boolean | null>(null);
  const [help, setHelp] = useState(false);
  const [freeSent, setFreeSent] = useState<"srv" | "local" | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const skipped = useRef<number[]>([]);
  const title = `${L.title} · ${st.t}`;
  const label = st.t.split(" · ")[0];

  useEffect(() => { void preloadKitob(`a1/${unitN}`, kbTexts(st)); }, [st, unitN]);
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

  const it: Prepared | undefined = items[i];
  useEffect(() => {
    if (!it) return;
    const t = sayAuto(it);
    if (!t) return;
    const h = setTimeout(() => void say(t), 250);
    return () => clearTimeout(h);
  }, [it]);

  const mark = (v: boolean) => {
    if (ans !== null || !it) return;
    setAns(v);
    if (v) setOk((o) => o + 1);
    tg.haptic(v ? "success" : "error");
  };
  const next = () => {
    stopSay();
    setAns(null); setHelp(false); setFreeSent(null);
    if (i + 1 >= n) {
      const p = graded ? Math.min(100, Math.round((ok / graded) * 100)) : 100;
      kbSaveBest(lessonKey, si, p);
      gain("game", Math.max(5, ok * 2));
      report();
      setPct(p);
    }
    setI(i + 1);
    window.scrollTo(0, 0);
  };
  const skip = () => { skipped.current = [...skipped.current, i]; tg.haptic("light"); next(); };

  const head = (
    <>
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>{si + 1}-topshiriq · {label}</b>
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
          <span className="kb-k">QOIDA · {label}</span>
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
    const stars = p >= 90 ? 3 : p >= 70 ? 2 : p >= 40 ? 1 : 0;
    const last = si >= L.steps.length - 1;
    return (
      <main className="round kb">
        <div className="r-done">
          <div className="kb-stars" aria-label={`${stars} yulduz`}>{[1, 2, 3].map((k) => <Star key={k} size={44} className={k <= stars ? "on" : ""} aria-hidden />)}</div>
          <h1>{p >= 90 ? "Mukammal!" : p >= 70 ? "Ajoyib!" : p >= 40 ? "Yaxshi, davom eting!" : "Yana bir bor urinib ko'ring"}</h1>
          <span className="kb-big">{p}%</span>
          <p>{label} · {ok} / {graded} to'g'ri</p>
          {!last && <button type="button" className="btn primary wide" onClick={() => replace("kb", { key: lessonKey, si: si + 1, book: "a1", unit: unitN })}>Keyingi topshiriq: {L.steps[si + 1].t.split(" · ")[0]}</button>}
          <button type="button" className="btn ghost wide" onClick={() => replace("kb", { key: lessonKey, si, book: "a1", unit: unitN, n: Date.now() })}><RotateCcw size={18} aria-hidden />Qayta ishlash</button>
          <button type="button" className="btn ghost wide" onClick={back}>Vahdaga qaytish</button>
        </div>
      </main>
    );
  }

  const done = ans !== null;
  const isGraded = GRADED.includes(it.type);
  const canNext = it.type === "intro" || it.type === "read" ? true : it.type === "free" ? !!freeSent : done;
  const props = { it, done, ans, mark };
  return (
    <main className="round kb">
      {head}
      <section className="kb-card" key={i}>
        <div className="kb-ins">{it.ins ? <><Ar className="kb-ins-ar">{it.ins}</Ar><span>{insUz(it.ins, it.type)}</span></> : <span>{tipOf(it.type)}</span>}</div>
        {it.type === "intro" && <Intro it={it} />}
        {it.type === "read" && <Read it={it} />}
        {(it.type === "choose" || it.type === "qa") && <Choose {...props} />}
        {it.type === "listen1" && <Listen1 {...props} />}
        {it.type === "pick" && <Pick {...props} />}
        {it.type === "tf" && <TrueFalse {...props} />}
        {(it.type === "letters" || it.type === "order") && <Build {...props} />}
        {it.type === "match" && <Match {...props} />}
        {it.type === "classify" && <Classify {...props} />}
        {it.type === "free" && <Free it={it} sent={freeSent} onSent={setFreeSent} sub={{ lesson: lessonKey, step: st.k, item: i, title }} />}
        {!["intro", "read", "choose", "qa", "listen1", "pick", "tf", "letters", "order", "match", "classify", "free"].includes(it.type) && <p className="muted">Bu turdagi mashq hali yangi ilovada yo'q. Davom etishingiz mumkin.</p>}
      </section>

      {isGraded && done && <Feedback it={it} good={!!ans} n={i} />}

      {!done && !help && !freeSent && it.type !== "intro" && it.type !== "read" && (
        <button type="button" className="kb-dunno" onClick={() => { setHelp(true); tg.haptic("light"); }}><HelpCircle size={18} aria-hidden />Tushunmadim</button>
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

      {canNext && <button type="button" className={`btn wide kb-next ${isGraded ? (ans ? "good" : "dark") : "primary"}`} onClick={next}>{i + 1 >= n ? "Natijani ko'rish" : "Davom etish"}</button>}
    </main>
  );
}

// ===== umumiy qismlar =====
type P = { it: Prepared; done: boolean; ans: boolean | null; mark: (v: boolean) => void };

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

function Opts({ opts, ok, done, onPick }: { opts: string[]; ok: string; done: boolean; onPick: (o: string) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  return (
    <div className="r-opts">
      {opts.map((o) => {
        const s = !done ? "" : o === ok ? "ok" : o === pick ? "no" : "dim";
        return (
          <button key={o} type="button" className={`opt ${s} ${isAr(o) ? "opt-r" : ""}`} disabled={done} onClick={() => { setPick(o); onPick(o); }}>
            {isAr(o) ? <Ar className="opt-ar">{o}</Ar> : o}
          </button>
        );
      })}
    </div>
  );
}

function Feedback({ it, good, n }: { it: KbItem; good: boolean; n: number }) {
  const r = rightOf(it);
  return (
    <div className={`kb-fb ${good ? "ok" : "bad"}`} role="status">
      <b>{good ? PRAISE[n % 4] : "Xato"}</b>
      {!good && r && !["match", "classify"].includes(it.type) && <span>To'g'ri javob: {isAr(r) ? <Ar>{r}</Ar> : r}</span>}
      {it.why && (!good || it.type !== "pick") && <Mixed text={it.why} className="kb-why" />}
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

function Read({ it }: { it: KbItem }) {
  const [playing, setPlaying] = useState(-1);
  const [uz, setUz] = useState(false);
  const run = useRef(0);
  useEffect(() => () => { run.current++; }, []);
  const lines = it.lines || [];
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
      <button type="button" className="btn ghost kb-play" onClick={() => void playAll()}>{playing >= 0 ? <><Pause size={18} aria-hidden />To'xtatish</> : <><Play size={18} aria-hidden />Hammasini tinglash</>}</button>
      <div className="kb-dlg">
        {lines.map((l, k) => (
          <div key={k} className={`kb-ln ${playing === k ? "on" : ""}`}>
            {l[0] && <Ar className="kb-sp">{l[0]}</Ar>}
            <button type="button" className="kb-lt" onClick={() => void say(l[1])}><Ar>{l[1]}</Ar></button>
            {uz && l[2] && <small>{l[2]}</small>}
          </div>
        ))}
      </div>
      <button type="button" className="kb-link" onClick={() => setUz(!uz)}>{uz ? "Tarjimani yashirish" : "Tarjimani ko'rsatish"}</button>
    </>
  );
}

function Choose({ it, done, mark }: P) {
  const answer = (o: string) => { mark(o === it.ok); const t = sayAfter(it); if (t) void say(t); };
  return (
    <>
      {it.pic && <div className="kb-pic"><Emo e={it.pic} size={88} /></div>}
      {it.say && <div className="kb-q"><SayBtn t={it.say} big /></div>}
      {it.q && <Mixed text={it.q} />}
      {it.qz && <p className="kb-uz">{it.qz}</p>}
      <Opts opts={it.opts || []} ok={String(it.ok)} done={done} onPick={answer} />
      {done && it.full && <div className="kb-full"><SayBtn t={it.full} /><span><Ar>{it.full}</Ar>{it.fz && <small>{it.fz}</small>}</span></div>}
    </>
  );
}

function Listen1({ it, done, mark }: P) {
  return (
    <>
      <div className="kb-q"><SayBtn t={it.ar || ""} big />{done && <Ar className="kb-qa">{it.ar}</Ar>}</div>
      <Opts opts={it.opts || []} ok={String(it.ok)} done={done} onPick={(o) => { mark(o === it.ok); void say(it.ar || ""); }} />
    </>
  );
}

function Pick({ it, done, mark }: P) {
  const [pick, setPick] = useState<string | null>(null);
  return (
    <>
      <div className="kb-q"><SayBtn t={it.ar || ""} big />{done && <Ar className="kb-qa">{it.ar}</Ar>}</div>
      <div className="r-opts grid">
        {(it.pics || []).map((p) => {
          const s = !done ? "" : p === it.ok ? "ok" : p === pick ? "no" : "dim";
          return <button key={p} type="button" className={`opt ${s}`} disabled={done} onClick={() => { setPick(p); mark(p === it.ok); void say(it.ar || ""); }}><Emo e={p} size={72} /></button>;
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
function Build({ it, done, ans, mark }: P) {
  const letters = it.type === "letters";
  const tiles: string[] = letters ? (it.tiles as { l: string }[]).map((t) => t.l) : (it.tiles as string[]);
  const need = letters ? (it.letters || []).length : (it.words || []).length;
  const [used, setUsed] = useState<number[]>([]);
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

function Classify({ it, done, ans, mark }: P) {
  const words = (it.words || []) as [string, number][];
  const cols = it.cols || [];
  const [put, setPut] = useState<Record<number, number>>({});
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
      <textarea className="kb-free" dir="rtl" lang="ar" rows={4} placeholder="Arabcha yozing…" value={text} disabled={!!sent || busy} onChange={(e) => setText(e.target.value)} />
      {!sent && <><div className="kb-or"><span>yoki</span></div><VoiceRec value={voice} onChange={setVoice} disabled={busy} /></>}
      {err && <p className="err">{err}</p>}
      {sent
        ? <p className="kb-sent"><Check size={18} aria-hidden />{sent === "local" ? "Saqlandi. Internet ulanganda ustozga yuboriladi." : "Ustozga yuborildi. Baho qo'yilgach, Telegram orqali xabar keladi."}</p>
        : <button type="button" className="btn primary wide" disabled={busy} onClick={() => void send()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : "Ustozga yuborish"}</button>}
    </>
  );
}

/** Ovozli javob: bosib yozish, qayta bosib to'xtatish (2 daqiqagacha), tinglab ko'rish, qayta yozish */
function VoiceRec({ value, onChange, disabled }: { value: { blob: Blob; mime: string } | null; onChange: (v: { blob: Blob; mime: string } | null) => void; disabled?: boolean }) {
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
      tick.current = window.setInterval(() => { const s2 = Math.round((Date.now() - t0) / 1000); setSec(s2); if (s2 >= 120) stop(); }, 500);
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
          {rec ? <><Square size={16} aria-hidden />To'xtatish · {fmt}</> : <><Mic size={18} aria-hidden />Ovoz bilan javob berish</>}
        </button>
      )}
      {err && <small className="err">{err}</small>}
    </div>
  );
}
