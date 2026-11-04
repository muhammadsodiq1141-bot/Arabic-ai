// Madina kitoblari: «Yodlash» (Beton usuli: tanish so'zlar → guruh va mini-hikoya → o'zak oilalari → eslatmalar → Beton mashq)
// va Madina 1 · 1-vahda «Darslik mashqlari» (DR_LESSONS: 3 mashg'ulot, 7 xil generator). Eski ilova bilan bir xil kalitlar:
// Beton natijasi saqlanmaydi (faqat XP, f.err, f.acc), darslik — f.dr.md1:1 {sessiya: eng yaxshi %} (YODLASH-HAFTA-SHAHAR-SPEC §1–§2).
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Play, RotateCcw, Volume2, X } from "lucide-react";
import { say } from "../lib/audio";
import { loadData } from "../lib/data";
import { itemsOf, type PBook } from "../lib/practice";
import { gain, knownOf, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle } from "../lib/words";
import { useNav } from "../state/nav";
import { CountUp } from "../ui/CountUp";
import { Emo } from "../ui/Emo";
import { Ar, ScreenHeader } from "../ui/kit";
import { MixedText } from "../ui/Mixed";
import { reactMark } from "../ui/Reaction";
import { Scale } from "../ui/Scale";
import type { QConf, QItem } from "./Quiz";

type Mem = { groups?: { t: string; w: string[]; st?: { ar: string; uz: string } }[]; roots?: { r: string; m: string; w: [string, string][] }[]; mn?: Record<string, string> };
type MUnit = PBook["units"][number] & { lbl?: string; mem?: Mem };

export function useMadina(bookId: string, unitN: number) {
  const [u, setU] = useState<MUnit | null>(null);
  useEffect(() => { let on = true; void loadData<PBook>(`books/${bookId}`).then((b) => on && setU((b.units.find((x) => x.n === unitN) as MUnit) || null)).catch(() => {}); return () => { on = false; }; }, [bookId, unitN]);
  return u;
}
export const unitLabel = (u: { n: number; lbl?: string }) => u.lbl || `${u.n}-vahda`;

// ===== hikoyada guruh so'zlarini belgilash (eski memMark — aynan) =====
const canon = (s: string) => s.replace(/([ً-ِْ])ّ/g, "ّ$1");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escH = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function memMark(ar: string, list: string[]) {
  let h = canon(escH(ar));
  for (const w of [...list.map(canon)].sort((a, b) => b.length - a.length)) {
    const bare = w.replace(/^ال[َ-ْ]?/, "").replace(/[ً-ْ]+$/, "");
    if (!bare) continue;
    const ch = [...bare];
    const pat = esc(ch[0]) + "ّ?" + ch.slice(1).map(esc).join("") + "[ً-ْ]*";
    const re = new RegExp("(^|[^<ء-يً-ْ])((?:[وفبلك][َِ])?(?:ال[ْ]?|ل[ْ]?)?" + pat + "(?:[ء-ي][ً-ْ]*)*)");
    h = h.replace(re, (_m, p1, p2) => p1 + '<mark class="hlw">' + p2 + "</mark>");
  }
  return h;
}

/** Beton mashq: har so'z ikki yo'nalishda (ar→uz, keyin uz→ar), xatolar oxirida bir marta qaytadi */
export function betonConf(bookId: string, u: MUnit): QConf {
  const it = itemsOf(u);
  const ref = (x: { ar: string }) => ({ ar: x.ar, b: bookId });
  const q1: QItem[] = shuffle(it).map((x) => {
    const sh = shuffle([x, ...shuffle(it.filter((y) => y.uz !== x.uz)).slice(0, 3)]);
    return { q: x.ar, qAr: true, opts: sh.map((y) => y.uz), ans: sh.indexOf(x), it: ref(x) };
  });
  // uz→ar: tarjimasi bir xil so'zlar (masalan ikki «qizlar») chalg'ituvchi bo'lmaydi
  const q2: QItem[] = shuffle(it).map((x) => {
    const sh = shuffle([x, ...shuffle(it.filter((y) => y.ar !== x.ar && y.uz !== x.uz)).slice(0, 3)]);
    return { q: x.uz, opts: sh.map((y) => y.ar), optsAr: true, ans: sh.indexOf(x), it: ref(x) };
  });
  return {
    title: `Beton mashq · ${unitLabel(u)}`, items: [...q1, ...q2], repeatWrong: true,
    onEnd: (score, n) => {
      gain("fc", score);
      return { title: "Beton mashq tugadi", xp: score, backLabel: "Yodlashga qaytish",
        sub: score < n ? "Xato qilingan so'zlar «Xatolar daftari»ga tushdi — Mashq bo'limida takrorlaysiz." : "Hamma so'z ikki yo'nalishda ham to'g'ri topildi!" };
    },
  };
}

// ===== Yodlash sahifasi =====
export function MemScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { go } = useNav();
  const u = useMadina(bookId, unitN);
  if (!u) return <main className="screen"><ScreenHeader title="Yodlash" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const m = u.mem || {}, it = itemsOf(u), k = knownOf(bookId, unitN);
  const byAr = Object.fromEntries(it.map((x) => [x.ar, x]));
  const kn = it.filter((x) => k[x.ar]).length;
  const cog = it.filter((x) => x.hint);
  const mn = Object.entries(m.mn || {});
  let no = 0;
  return (
    <main className="screen">
      <ScreenHeader title={`${unitLabel(u)} · Yodlash`} ar="الْحِفْظُ" />
      <section className="mem-hero">
        <span><b>Beton usuli · {it.length} ta so'z</b><small>Tanishlarini toping → guruh va hikoya → o'zak oilasi → eslatmalar → Beton mashq</small></span>
        <span className="mem-ring" aria-label={`${kn} / ${it.length} so'z yodlangan`}><b>{kn}</b><small>/{it.length}</small></span>
      </section>

      {cog.length > 0 && (
        <>
          <h2 className="t-h">{++no} · Siz buni allaqachon bilasiz</h2>
          <p className="pf-hint mem-note">Bu so'zlar o'zbek tilida ham bor — ularni yodlash shart emas, faqat tanib oling.</p>
          <div className="mem-chips">
            {cog.map((x) => <button key={x.ar} type="button" className="mem-chip" onClick={() => void say(x.ar)}><Ar>{x.ar}</Ar><small>≈ <b>{x.hint}</b></small></button>)}
          </div>
        </>
      )}

      {!!m.groups?.length && (
        <>
          <h2 className="t-h">{++no} · Guruh va mini-hikoya</h2>
          <p className="pf-hint mem-note">So'zlar bitta manzara ichida yaxshi eslab qolinadi. Hikoyani ovoz chiqarib 2 marta o'qing.</p>
          {m.groups.map((g, gi) => (
            <section key={gi} className="card mem-g">
              <div className="mem-g-h"><b>{g.t}</b><span className="m-pill">{g.w.length} so'z</span></div>
              <div className="mem-ws" dir="rtl">
                {g.w.map((a) => <button key={a} type="button" className={`mem-w ${k[a] ? "kn" : ""}`} onClick={() => void say(a)}><Ar>{a}</Ar><small>{byAr[a]?.uz || ""}</small></button>)}
              </div>
              {g.st && (
                <div className="mem-story">
                  <button type="button" className="say" aria-label="Hikoyani tinglash" onClick={() => void say(g.st!.ar)}><Volume2 size={22} aria-hidden /></button>
                  <div>
                    <p className="ar" dir="rtl" lang="ar" dangerouslySetInnerHTML={{ __html: memMark(g.st.ar, g.w) }} />
                    <small>{g.st.uz}</small>
                  </div>
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {!!m.roots?.length && (
        <>
          <h2 className="t-h">{++no} · O'zak oilalari</h2>
          <p className="pf-hint mem-note">Bitta o'zakni bilsangiz — butun oilani bilasiz. Qalin yozilganlari shu darsdan.</p>
          <div className="mem-roots">
            {m.roots.map((r) => (
              <section key={r.r} className="card mem-root">
                <Ar className="mem-r">{r.r}</Ar><small>{r.m}</small>
                <ul>{r.w.map(([a, z]) => <li key={a} className={byAr[a] ? "cur" : ""}><Ar>{a}</Ar><span>{z}</span></li>)}</ul>
              </section>
            ))}
          </div>
        </>
      )}

      {mn.length > 0 && (
        <>
          <h2 className="t-h">{++no} · Eslatma-bog'lagichlar</h2>
          <p className="pf-hint mem-note">Qiyin so'zlar uchun kulgili bog'lanish — miyada «ilmoq» bo'lib qoladi.</p>
          {mn.map(([a, t]) => (
            <section key={a} className="card mem-mn"><Ar>{a}</Ar><span><b>{byAr[a]?.uz || ""}</b><small>{t}</small></span></section>
          ))}
        </>
      )}

      <section className="card mem-beton">
        <b>{++no} · Beton mashq</b>
        <small>Har bir so'z ikki yo'nalishda chiqadi: arabcha → o'zbekcha, keyin o'zbekcha → arabcha. Xato qilganingiz oxirida yana qaytadi.</small>
        <button type="button" className="btn primary wide" onClick={() => { tg.haptic(); go("qs", { conf: betonConf(bookId, u), n: Date.now() }); }}>
          <Play size={18} aria-hidden />Boshlash · {it.length * 2} savol
        </button>
      </section>
    </main>
  );
}

// ===== Darslik mashqlari (Madina 1 · 1-vahda) =====
type DrSession = { t: string; d: string; rule: { h: string; p: string[] }; plan: [string, number][] };
type DrLesson = { title: string; book: string; sessions: DrSession[] };
const HDA = "هَٰذَا";
const DR_N: [string, string, string][] = [["بَيْتٌ", "uy", "🏠"], ["بَابٌ", "eshik", "🚪"], ["كِتَابٌ", "kitob", "📕"], ["قَلَمٌ", "qalam", "✏️"], ["مِفْتَاحٌ", "kalit", "🔑"],
  ["كُرْسِيٌّ", "kursi", "🪑"], ["سَرِيرٌ", "yotoq", "🛏️"], ["نَجْمٌ", "yulduz", "⭐"], ["قَمِيصٌ", "ko'ylak", "👕"], ["كَلْبٌ", "it", "🐕"],
  ["قِطٌّ", "mushuk", "🐈"], ["حِصَانٌ", "ot", "🐎"], ["جَمَلٌ", "tuya", "🐪"], ["دِيكٌ", "xo'roz", "🐓"], ["حَجَرٌ", "tosh", "🪨"], ["مَتْجَرٌ", "do'kon", "🏬"]];
const DR_P: [string, string, string][] = [["طَبِيبٌ", "shifokor", "🧑‍⚕️"], ["وَلَدٌ", "bola", "👦"], ["طَالِبٌ", "talaba", "🧑‍🎓"], ["رَجُلٌ", "erkak kishi", "👨"],
  ["تَاجِرٌ", "savdogar", "🧑‍💼"], ["مُدَرِّسٌ", "o'qituvchi", "🧑‍🏫"]];
const TIP: Record<string, string> = { look: "Rasmga qarang va tinglang", what: "Rasmdagi narsani toping", who: "Qaysi savol to'g'ri?",
  yesno: "Savolga to'g'ri javob bering", build: "So'zlarni bosib, gap tuzing", listen: "Eshiting va rasmni toping", tanwin: "So'zning to'g'ri oxirini tanlang" };
type DrItem = { type: string; pic?: string; ar?: string; uz?: string; q?: string | null; ok?: string; opts?: string[]; pics?: string[]; why?: string; tiles?: string[]; need?: number };

const pick = <T,>(a: T[], n: number, not: T[] = []) => shuffle(a.filter((x) => !not.includes(x))).slice(0, n);
const S = (w: string) => `${HDA} ${w}.`;
function gen(type: string, n: number): DrItem[] {
  const all = DR_N.concat(DR_P);
  return Array.from({ length: n }, () => {
    if (type === "look") { const [w] = pick(all, 1); return { type, pic: w[2], ar: S(w[0]), uz: `Bu — ${w[1]}` }; }
    if (type === "what") { const [w] = pick(DR_N, 1); const o = pick(DR_N, 2, [w]); return { type, pic: w[2], q: `مَا ${HDA}؟`, ok: S(w[0]), opts: shuffle([w, ...o].map((x) => S(x[0]))) }; }
    if (type === "who") {
      const p = Math.random() < 0.5; const [w] = pick(p ? DR_P : DR_N, 1);
      return { type, pic: w[2], ok: p ? `مَنْ ${HDA}؟` : `مَا ${HDA}؟`, opts: shuffle([`مَا ${HDA}؟`, `مَنْ ${HDA}؟`]),
        why: p ? "Bu odam — «kim?» deb so'raymiz." : "Bu narsa yoki hayvon — «nima?» deb so'raymiz." };
    }
    if (type === "yesno") {
      const pool = Math.random() < 0.35 ? DR_P : DR_N; const [w] = pick(pool, 1); const yes = Math.random() < 0.5;
      const asked = yes ? w : pick(pool, 1, [w])[0];
      const ok = yes ? `نَعَمْ، ${S(w[0])}` : `لَا، ${S(w[0])}`;
      const bad = yes ? `لَا، ${S(pick(pool, 1, [w])[0][0])}` : `نَعَمْ، ${S(asked[0])}`;
      return { type, pic: w[2], q: `أَ${HDA} ${asked[0]}؟`, ok, opts: shuffle([ok, bad]) };
    }
    if (type === "build") {
      const pool = Math.random() < 0.5 ? DR_P : DR_N; const [w] = pick(pool, 1); const neg = Math.random() < 0.5;
      const words = neg ? ["لَا،", HDA, `${w[0]}.`] : [HDA, `${w[0]}.`];
      const extra = `${pick(pool, 1, [w])[0][0]}.`;
      return { type, pic: w[2], ok: words.join(" "), tiles: shuffle([...words, extra]), need: words.length,
        q: neg ? `Savol: «Bu ${pick(pool, 1, [w])[0][1]}mi?» — Yo'q deb javob bering` : null };
    }
    if (type === "listen") { const [w] = pick(all, 1); const o = pick(all, 3, [w]); return { type, ar: S(w[0]), ok: w[2], pics: shuffle([w, ...o]).map((x) => x[2]) }; }
    // tanwin
    const [w] = pick(DR_N.filter((x) => !/ّ/.test(x[0])), 1); const base = w[0].replace(/ٌ$/, "");
    return { type, pic: w[2], q: `${HDA} …`, ok: w[0], opts: shuffle([w[0], base + "ُ", base + "َ"]), why: "هَٰذَا dan keyin noaniq ot ـٌ (tanvin) bilan tugaydi." };
  });
}
export const drBest = (key: string) => store.get<Record<string, number>>(`f.dr.${key}`, {});

export function DrillHub({ dkey }: { dkey: string }) {
  const { go } = useNav();
  const [L, setL] = useState<DrLesson | null>(null);
  useEffect(() => { void loadData<Record<string, DrLesson>>("DR_LESSONS").then((d) => setL(d[dkey] || null)).catch(() => {}); }, [dkey]);
  if (!L) return null;
  const B = drBest(dkey);
  return (
    <section className="card dr-hub">
      <div className="dr-hub-h"><b>Darslik mashqlari</b><small>{L.book}</small></div>
      <b className="dr-hub-t"><MixedText text={L.title} /></b>
      {L.sessions.map((s, i) => (
        <button key={i} type="button" className={`a0l-row ${(B[i] ?? -1) >= 80 ? "done" : ""}`} onClick={() => go("darslik", { key: dkey, si: i })}>
          <span className="a0l-dot">{(B[i] ?? -1) >= 80 ? <Check size={16} strokeWidth={3} aria-hidden /> : i + 1}</span>
          <span className="a0l-t"><b>{s.t}</b><small className="muted"><MixedText text={s.d} /> · 3–4 daq</small></span>
          <em>{B[i] !== undefined ? `${B[i]}%` : <ArrowRight size={18} aria-hidden />}</em>
        </button>
      ))}
      <small className="muted">Kitobdagi darsni o'qing, keyin shu yerda mustahkamlang. Mashqlar har safar yangicha tuziladi.</small>
    </section>
  );
}

export function DrillScreen({ dkey, si }: { dkey: string; si: number }) {
  const { back, replace } = useNav();
  const [L, setL] = useState<DrLesson | null>(null);
  useEffect(() => { void loadData<Record<string, DrLesson>>("DR_LESSONS").then((d) => setL(d[dkey] || null)).catch(() => {}); }, [dkey]);
  const ses = L?.sessions[si];
  const items = useMemo(() => (ses ? ses.plan.flatMap(([t, n]) => gen(t, n)) : []), [ses]);
  const [i, setI] = useState(-1);
  const [ok, setOk] = useState(0);
  const [ans, setAns] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [pc, setPc] = useState<number | null>(null);
  const it = items[i];
  useEffect(() => { if (it && (it.type === "look" || it.type === "listen") && it.ar) { const h = setTimeout(() => void say(it.ar!), 250); return () => clearTimeout(h); } }, [it]);
  if (!L || !ses) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;
  const n = items.length;
  const graded = items.filter((x) => x.type !== "look").length;

  const answer = (o: string) => {
    if (ans !== null || !it) return;
    const v = o === it.ok; setPicked(o); setAns(v); if (v) setOk((x) => x + 1);
    tg.haptic(v ? "success" : "error");
    reactMark(v); // reaksiya stikeri (eskida faqat variantli javobda — gap tuzish drAnswer'dan o'tmasdi)
    void say(it.type === "listen" ? it.ar || "" : String(it.ok).replace(/…/g, ""));
  };
  const tap = (k: number) => {
    if (ans !== null || !it?.tiles) return;
    const b = built.includes(k) ? built.filter((x) => x !== k) : [...built, k];
    setBuilt(b);
    if (b.length === it.need) {
      const v = b.map((x) => it.tiles![x]).join(" ") === it.ok;
      setAns(v); if (v) setOk((x) => x + 1); tg.haptic(v ? "success" : "error"); void say(it.ok || "");
    }
  };
  const next = () => {
    setAns(null); setPicked(null); setBuilt([]);
    if (i + 1 >= n) {
      const p = Math.round((ok / Math.max(1, graded)) * 100);
      const B = drBest(dkey);
      if (B[si] === undefined || p > B[si]) { B[si] = p; store.set(`f.dr.${dkey}`, B); }
      gain("game", Math.max(5, ok * 2));
      setPc(p);
    }
    setI(i + 1); window.scrollTo(0, 0);
  };

  const head = (
    <>
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>{ses.t}</b>
        <span className="r-count">{Math.max(0, Math.min(i, n))} / {n}</span>
      </header>
      <div className="r-bar"><i style={{ width: `${(Math.max(0, Math.min(i, n)) / n) * 100}%` }} /></div>
    </>
  );
  if (i < 0) {
    return (
      <main className="round kb">
        {head}
        <section className="kb-card kb-rule">
          <div className="kb-rh"><MixedText text={ses.rule.h} /></div>
          {ses.rule.p.map((p, k) => <p key={k} dangerouslySetInnerHTML={{ __html: p }} />)}
          <small className="muted">{L.book}</small>
        </section>
        <button type="button" className="btn primary wide kb-next" onClick={() => setI(0)}>Mashqni boshlash</button>
      </main>
    );
  }
  if (i >= n || !it) {
    const p = pc ?? 0, last = si >= L.sessions.length - 1;
    return (
      <main className="round kb">
        <div className="r-done">
          <Scale size={140} balanced={p >= 70} star={p >= 80} />
          <h1>{p >= 80 ? "Ajoyib!" : p >= 50 ? "Yaxshi!" : "Yana bir bor urinib ko'ring"}</h1>
          <span className="kb-big">{p}%</span>
          <p>{ses.t} yakunlandi · {ok} / {graded} to'g'ri</p>
          <p className="r-earn"><CountUp to={Math.max(5, ok * 2)} />&nbsp;yulduzcha</p>
          {!last && <button type="button" className="btn primary wide" onClick={() => replace("darslik", { key: dkey, si: si + 1 })}>Keyingi mashg'ulot: {L.sessions[si + 1].t}</button>}
          <button type="button" className="btn ghost wide" onClick={() => replace("darslik", { key: dkey, si, n: Date.now() })}><RotateCcw size={18} aria-hidden />Qayta ishlash</button>
          <button type="button" className="btn ghost wide" onClick={back}>Darsga qaytish</button>
        </div>
      </main>
    );
  }
  const done = ans !== null;
  const canNext = it.type === "look" || done;
  const cls = (o: string) => (!done ? "" : o === it.ok ? "ok" : o === picked ? "no" : "dim");
  return (
    <main className="round kb">
      {head}
      <section className="kb-card dr-card" key={i}>
        <div className="kb-ins"><span>{TIP[it.type]}</span></div>
        {it.pic && it.type !== "listen" && <div className="kb-pic"><Emo e={it.pic} size={96} /></div>}
        {it.type === "look" && (
          <>
            <button type="button" className="dr-look" onClick={() => void say(it.ar || "")}><Ar>{it.ar}</Ar><Volume2 size={22} aria-hidden /></button>
            <p className="kb-uz">{it.uz}</p>
          </>
        )}
        {it.type === "listen" && (
          <>
            <div className="kb-q"><button type="button" className="say big" aria-label="Tinglash" onClick={() => void say(it.ar || "")}><Volume2 size={30} aria-hidden /></button>{done && <Ar className="kb-qa">{it.ar}</Ar>}</div>
            <div className="r-opts grid">
              {it.pics!.map((p) => <button key={p} type="button" className={`opt ${cls(p)}`} disabled={done} onClick={() => answer(p)}><Emo e={p} size={64} /></button>)}
            </div>
          </>
        )}
        {it.type === "build" && (
          <>
            {it.q && <p className="kb-uz">{it.q}</p>}
            <div className="dr-line" dir="rtl">{built.length ? built.map((k) => <button key={k} type="button" className="dr-tile on" disabled={done} onClick={() => tap(k)}><Ar>{it.tiles![k]}</Ar></button>) : <span className="muted">…</span>}</div>
            <div className="dr-tiles" dir="rtl">{it.tiles!.map((t, k) => <button key={k} type="button" className={`dr-tile ${built.includes(k) ? "used" : ""}`} disabled={done || built.includes(k)} onClick={() => tap(k)}><Ar>{t}</Ar></button>)}</div>
            {done && !ans && <p className="kb-uz">To'g'ri: <Ar>{it.ok}</Ar></p>}
          </>
        )}
        {["what", "who", "yesno", "tanwin"].includes(it.type) && (
          <>
            {it.q && <Ar className="dr-q">{it.q}</Ar>}
            <div className="r-opts">
              {it.opts!.map((o) => (
                <button key={o} type="button" className={`opt opt-r ${cls(o)}`} disabled={done} onClick={() => answer(o)}>
                  <Ar className="opt-ar">{o}</Ar>
                  {cls(o) === "ok" && <Check size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
                  {cls(o) === "no" && <X size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
                </button>
              ))}
            </div>
            {done && it.why && <p className="kb-uz"><MixedText text={it.why} /></p>}
          </>
        )}
      </section>
      {canNext && <button type="button" className={`btn wide kb-next ${it.type === "look" ? "primary" : ans ? "good" : "dark"}`} onClick={next}>{i + 1 >= n ? "Natijani ko'rish" : "Davom etish"}</button>}
    </main>
  );
}
