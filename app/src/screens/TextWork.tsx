// 11.11.2026 (17b: K1 + K3): «Matn bilan ishlash» — vahdaning asosiy matni bilan zanjir: maqsad → Tingla (kitobning asl audiosi, karaoke)
// → O'qi ×3 (so'z/daqiqa, xato sanalmaydi) → Ayt (o'zi o'qib yozib oladi, xohlasa ustozga). Tanlov: matndagi so'zlar bilan o'z gaplari.
// Audio — faqat kitob ombori (asl audio); yo'q gapga sun'iy ovoz qo'yilmaydi. So'z ichidagi vaqt — harf soniga mutanosib (taxminiy).
// 12.11.2026: karaoke joriy gapga ergashadi; tinglash tugagach ekranda qoladi; so'z oynasida «Gapni tinglash» va gap tarjimasi;
// tezlik matn bo'yicha, fonda taymer to'xtaydi, ishonib bo'lmas tezlik saqlanmaydi; yozib olish matn uzunligiga qarab; ball (gain);
// «Ayt»da asl ovoz bilan solishtirish; audio yo'qligining sababi (guruh / internet) aytiladi.
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, Check, Headphones, Mic, Pause, Play, RotateCcw, Send, Timer, Volume2, X } from "lucide-react";
import { blobB64, sendSub } from "../lib/kb";
import { clean, kitobUrls, say, sha1, TTS_BASE } from "../lib/audio";
import { loadData } from "../lib/data";
import { loadLex, lookup, nk, type Lex } from "../lib/lex";
import type { Book } from "../lib/progress";
import { savedHas as isSaved, toggleSaved } from "../lib/saved";
import { gain } from "../lib/store";
import { strandSet } from "../lib/strand";
import { twAddRead, twGet, twOf, twReads, twSet, WPM_MAX, type TwProg } from "../lib/textwork";
import { unitTexts, wordsOf, type Line } from "../lib/texts";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { VoiceRec } from "./Kitob";

type Prog = TwProg;
const HAR = /[ً-ْٰـ]/g;
const PUN = /[.,،؛؟!?:«»"()]/g;
const tokens = (ar: string) => clean(ar).split(/\s+/).filter(Boolean);
const weight = (w: string) => Math.max(1, w.replace(HAR, "").replace(/[.,،؛؟!?:«»"()—–-]/g, "").length) + 1;
type Group = { key: string; title: string; lines: Line[] };
type Aud = { keys: string[]; urls: Record<string, string> };
const READ = /^(oqish|qiroat|matn)/;
type Mode = "chain" | "listen" | "read" | "say" | "own";

/** audio yo'q bo'lsa — sababi: internet, guruh (kitob audiosi faqat ustoz guruhidagilarga) yoki hali qo'shilmagan */
function useNoAudioWhy() {
  const { me } = useSession();
  if (typeof navigator !== "undefined" && !navigator.onLine) return "Internet yo'q — ovoz yuklanmadi.";
  if (me && !me.group && !me.admin && !me.teacher) return "Kitobning asl audiosi ustoz guruhidagi o'quvchilarga ochiq.";
  return "Bu matnning asl kitob ovozi hali qo'shilmagan.";
}

/** gaplarni ketma-ket ijro etish (ovozi borlarini); karaoke uchun joriy gap va so'z */
function usePlayer(g: Group, aud: Aud, onEnd?: () => void) {
  const [cur, setCur] = useState(-1);
  const [wi, setWi] = useState(-1);
  const [play, setPlay] = useState(false);
  const [rate, setRateS] = useState(0.75);
  const rateRef = useRef(0.75); // keyingi gapga o'tganda ham tanlangan tezlik saqlansin
  const a = useRef<HTMLAudioElement | null>(null);
  const raf = useRef(0);
  const curRef = useRef(-1);
  const only = useRef(false);
  // 12.11.2026 (foydalanuvchi qarori): avval kitobning asl ovozi, bo'lmasa — Hamed ovozi (tts ombori, oldindan yaratilgan)
  const has = (i: number) => !!aud.keys[i];
  const src = (i: number) => aud.urls[aud.keys[i]] || TTS_BASE + aud.keys[i] + ".mp3";
  const W = useMemo(() => g.lines.map((l) => { const ws = tokens(l.ar).map(weight); const t = ws.reduce((x, y) => x + y, 0); let c = 0; return ws.map((w) => (c += w) / t); }), [g]);
  useEffect(() => () => { cancelAnimationFrame(raf.current); a.current?.pause(); }, []);
  const tick = () => {
    const el = a.current;
    if (el && el.duration) {
      const f = Math.min(1, Math.max(0, (el.currentTime - 0.1) / Math.max(0.3, el.duration - 0.4))); // kesishda boshi/oxiridagi sukut
      const arr = W[curRef.current] || [];
      let k = arr.findIndex((x) => f <= x); if (k < 0) k = arr.length - 1;
      setWi(k);
    }
    raf.current = requestAnimationFrame(tick);
  };
  const stopAll = () => { a.current?.pause(); setPlay(false); setCur(-1); setWi(-1); curRef.current = -1; cancelAnimationFrame(raf.current); };
  /** i-gapdan boshlab; one — faqat shu gap */
  const playFrom = (i: number, one = false) => {
    only.current = one;
    let j = i;
    while (j < g.lines.length && !has(j)) j++;
    if (j >= g.lines.length || (one && j !== i)) { stopAll(); if (!one && i > 0) onEnd?.(); return; }
    if (!a.current) a.current = new Audio();
    const el = a.current;
    el.src = src(j); el.playbackRate = rateRef.current; el.defaultPlaybackRate = rateRef.current;
    el.onended = () => (only.current ? stopAll() : playFrom(j + 1));
    el.onerror = () => (only.current ? stopAll() : playFrom(j + 1)); // ovoz fayli hali yo'q — keyingi gapga
    curRef.current = j; setCur(j); setWi(-1); setPlay(true);
    el.play().catch(() => { setPlay(false); toast("Ovoz ochilmadi — internetni tekshiring"); });
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(tick);
  };
  const toggle = () => {
    if (play) { a.current?.pause(); setPlay(false); cancelAnimationFrame(raf.current); return; }
    if (a.current && cur >= 0 && a.current.src) { a.current.play().then(() => { setPlay(true); raf.current = requestAnimationFrame(tick); }).catch(() => {}); return; }
    playFrom(0);
  };
  const setRate = (r: number) => { setRateS(r); rateRef.current = r; if (a.current) { a.current.playbackRate = r; a.current.defaultPlaybackRate = r; } };
  return { cur, wi, play, rate, has, kitob: (i: number) => !!aud.urls[aud.keys[i]], any: aud.keys.length > 0, playFrom, toggle, setRate, stopAll };
}

// qadamlar — alohida yo'nalish (m): Telegram «orqaga» tugmasi zanjirga qaytaradi, ekrandan chiqib ketmaydi
export function TextWorkScreen({ bookId, unitN, m = "chain", gi: gp = 0 }: { bookId: string; unitN: number; m?: string; gi?: number }) {
  const { go, back } = useNav();
  const [groups, setGroups] = useState<Group[] | null | "none">(null);
  const [topic, setTopic] = useState("");
  const mode: Mode = (["listen", "read", "say", "own"] as const).find((x) => x === m) || "chain";
  const setMode = (x: Mode) => (x === "chain" ? back() : go("mtext", { book: bookId, unit: unitN, m: x, g: gi }));
  // matn tanlovi — shu ekranning o'zida (tarixga yozilmaydi); qadamga o'tganda yo'nalishga qo'shiladi
  const [gi, setGi] = useState(gp);
  useEffect(() => { if (m !== "chain") setGi(gp); }, [m, gp]);
  const [prog, setProg] = useState<Prog>(() => twGet(bookId, unitN));
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const why = useNoAudioWhy();
  useEffect(() => {
    let alive = true;
    unitTexts(bookId, unitN).then((t) => {
      if (!alive) return;
      if (!t || !t.lines.length) { setGroups("none"); return; }
      // 12.11.2026: faqat o'qish matnlari (oqish/qiroat/matn qadamlari); savollar, misollar, iboralar, qoida misollari va mashqlar — tab emas
      const own = t.lines.filter((l) => READ.test(l.step));
      const by = new Map<string, Group>();
      for (const l of own.length ? own : t.lines) { const k = l.title || l.step; if (!by.has(k)) by.set(k, { key: k, title: l.title, lines: [] }); by.get(k)!.lines.push(l); }
      setGroups([...by.values()]);
    });
    loadData<Book>(`books/${bookId}`).then((b) => alive && setTopic(b.units.find((u) => u.n === unitN)?.uz || "")).catch(() => {});
    return () => { alive = false; };
  }, [bookId, unitN]);
  const g = groups && groups !== "none" ? groups[gi] || groups[0] : null;
  // kitob audiosi: har gap — sha1(matn) (faqat guruh o'quvchilariga ochiq)
  useEffect(() => {
    if (!g) return;
    let alive = true;
    setUrls(null);
    Promise.all(g.lines.map((l) => sha1(clean(l.ar)))).then((ks) => { if (alive) setKeys(ks); });
    kitobUrls("", g.lines.map((l) => l.ar)).then((u) => alive && setUrls(u)).catch(() => alive && setUrls({}));
    return () => { alive = false; };
  }, [g]);
  const save = (p: Prog) => { setProg(p); twSet(bookId, unitN, p); };
  // 4 yo'l: tinglash — i, qayta o'qish (tezlik) — r, aytish va o'z gaplari — o
  useEffect(() => { strandSet(mode === "read" ? "r" : mode === "say" || mode === "own" ? "o" : "i"); }, [mode]);
  const nWords = useMemo(() => (g ? g.lines.reduce((a, l) => a + wordsOf(l.ar).length, 0) : 0), [g]);
  const withAudio = urls ? keys.filter((k) => urls[k]).length : 0;
  const aud: Aud = { keys, urls: urls || {} };

  if (groups === null) return <main className="screen"><ScreenHeader title={`${unitN}-vahda · Matn`} ar="الْعَمَلُ مَعَ النَّصِّ" /><div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div></main>;
  if (groups === "none" || !g) return <main className="screen"><ScreenHeader title={`${unitN}-vahda · Matn`} ar="الْعَمَلُ مَعَ النَّصِّ" /><Empty icon={<BookOpenText size={28} />} title="Bu vahdada matn yo'q" text="Matn bilan ishlash kitob matni bor vahdalarda ochiladi." /></main>;

  const listened = () => { if (!prog.l) gain("mtext", 5); save({ ...prog, l: prog.l + 1 }); tg.haptic("success"); };
  if (mode === "listen") return <Listen g={g} aud={aud} loading={urls === null} why={why} onBack={() => setMode("chain")} onDone={listened} onNext={() => setMode("read")} />;
  if (mode === "read") return <ReadTimes g={g} n={nWords} cap={WPM_MAX[bookId] || 200} prog={prog} onSave={(wpm) => { save(twAddRead(prog, g.key, wpm)); gain("mtext", 3); }} onBack={() => setMode("chain")} />;
  if (mode === "say") return <Say bookId={bookId} unitN={unitN} g={g} n={nWords} aud={aud} onBack={() => setMode("chain")} onSent={() => { if (!prog.s) gain("mtext", 8); save({ ...prog, s: Date.now() }); setMode("chain"); }} />;
  if (mode === "own") return <Own bookId={bookId} unitN={unitN} onBack={() => setMode("chain")} onSent={() => { if (!prog.w) gain("mtext", 5); save({ ...prog, w: Date.now() }); setMode("chain"); }} />;

  const reads = twReads(prog), mine = twOf(prog, g.key);
  const step = prog.l < 1 ? 0 : reads < 3 ? 1 : !prog.s ? 2 : 3;
  return (
    <main className="screen tw">
      <ScreenHeader title={`${unitN}-vahda · Matn`} ar="الْعَمَلُ مَعَ النَّصِّ" />
      <section className="tw-goal"><b>Maqsad</b><span>Bu vahdadan keyin siz {topic ? `«${topic}» mavzusida` : "shu mavzuda"} 3–4 gap aytib bera olasiz.</span></section>
      {groups.length > 1 && (
        <div className="chips" role="tablist" aria-label="Matn">
          {groups.map((x, i) => <button key={x.key} type="button" role="tab" aria-selected={i === gi} className={i === gi ? "on" : ""} onClick={() => setGi(i)}>{x.title ? <Ar>{x.title}</Ar> : `${i + 1}-matn`}</button>)}
        </div>
      )}
      <ol className="tw-chain">
        <li className={`${prog.l ? "dn" : ""}${step === 0 ? " now" : ""}`}><button type="button" onClick={() => setMode("listen")}>
          <i aria-hidden>{prog.l ? <Check size={14} strokeWidth={3} /> : 1}</i>
          <span><b>Tingla</b><small>{urls === null ? "kitob audiosi tekshirilmoqda…" : `${withAudio === g.lines.length ? "kitob ovozi bilan kuzating" : withAudio ? `kitob ovozi ${withAudio}/${g.lines.length} gap, qolgani Hamed ovozida` : "Hamed ovozi bilan kuzating"}${prog.l ? ` · ${prog.l} marta` : ""}`}</small></span>
          <Headphones size={18} aria-hidden /></button></li>
        <li className={`${reads >= 3 ? "dn" : ""}${step === 1 ? " now" : ""}`}><button type="button" onClick={() => setMode("read")}>
          <i aria-hidden>{reads >= 3 ? <Check size={14} strokeWidth={3} /> : 2}</i>
          <span><b>O'qi — 3 marta</b><small>{mine.length ? `shu matn: ${Math.min(mine.length, 3)}/3 · oxirgisi ${mine[mine.length - 1]} so'z/daqiqa` : `${nWords} so'z · bitta matnni 3 marta · xato sanalmaydi`}</small></span>
          <Timer size={18} aria-hidden /></button></li>
        <li className={`${prog.s ? "dn" : ""}${step === 2 ? " now" : ""}`}><button type="button" onClick={() => setMode("say")}>
          <i aria-hidden>{prog.s ? <Check size={14} strokeWidth={3} /> : 3}</i>
          <span><b>Ayt</b><small>{prog.s ? "bajarildi" : "o'zingiz o'qib yozib oling · asl ovoz bilan solishtiring"}</small></span>
          <Mic size={18} aria-hidden /></button></li>
      </ol>
      {mine.length > 1 && <Bars v={mine.slice(-3)} />}
      <button type="button" className="rowbtn tw-own" onClick={() => setMode("own")}>
        <BookOpenText size={22} aria-hidden /><span><b>Qo'shimcha · o'z gaplaringiz</b><small>{prog.w ? "bajarildi" : "Matndagi 5 ta so'z bilan o'z gaplaringizni yozing (ixtiyoriy)"}</small></span>
      </button>
    </main>
  );
}

function Bars({ v }: { v: number[] }) {
  const max = Math.max(...v, 1), up = v[0] ? Math.round(((v[v.length - 1] - v[0]) / v[0]) * 100) : 0;
  return (
    <section className="card tw-bars">
      <b>Shu matn · tezlik, so'z/daqiqa</b>
      <div className="tw-chart">{v.map((x, i) => <div key={i} className={i === v.length - 1 ? "now" : ""}><span>{x}</span><i style={{ height: `${Math.max(8, (x / max) * 64)}px` }} /><small>{i + 1}-marta</small></div>)}</div>
      {up > 0 && <span className="tw-up">+{up}% tezroq — barakalla!</span>}
    </section>
  );
}

// ===== Tingla: karaoke =====
function Listen({ g, aud, loading, why, onBack, onDone, onNext }: { g: Group; aud: Aud; loading: boolean; why: string; onBack: () => void; onDone: () => void; onNext: () => void }) {
  const [fin, setFin] = useState(false);
  const [pop, setPop] = useState<{ ar: string; uz: string; base: string; line: number; lineUz: string } | null>(null);
  const [lex, setLex] = useState<Lex | null>(null);
  const P = usePlayer(g, aud, () => { setFin(true); onDone(); });
  const refs = useRef<(HTMLParagraphElement | null)[]>([]);
  useEffect(() => { loadLex().then(setLex).catch(() => {}); }, []);
  // joriy gap ekrandan chiqib ketsa — o'rtaga suriladi (pastdagi boshqaruv paneli ham hisobga olinadi)
  useEffect(() => {
    const el = P.cur >= 0 ? refs.current[P.cur] : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight - 120) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [P.cur]);
  const word = (ws: string[], k: number, li: number) => {
    const w = ws[k].replace(PUN, "");
    // avval ibora (مِنْ فَضْلِكَ، قِطَارُ الْأَنْفَاقِ) — oldingi yoki keyingi so'z bilan, keyin so'zning o'zi
    let e = lex && k > 0 ? lookup(lex, `${ws[k - 1]} ${ws[k]}`) : null;
    if (!e && lex && k + 1 < ws.length) e = lookup(lex, `${ws[k]} ${ws[k + 1]}`);
    if (!e && lex) e = lookup(lex, ws[k]);
    setPop({ ar: w, uz: e?.uz || "", base: e && nk(e.ar.split(/\s*\/\s*/)[0]) !== nk(w) ? e.ar : "", line: li, lineUz: g.lines[li].uz || "" }); tg.haptic();
  };
  return (
    <main className="screen tw">
      <ScreenHeader title="Tingla" ar="الِاسْتِمَاعُ" onBack={onBack} />
      {!loading && aud.keys.length > 0 && !aud.keys.some((k) => aud.urls[k]) && <p className="pf-note">{why} Matnni Hamed ovozi o'qiydi. So'zni bossangiz, tarjimasi chiqadi.</p>}
      <section className="tw-text" dir="rtl">
        {g.lines.map((l, i) => {
          const ws = tokens(l.ar);
          return (
            <p key={i} ref={(el) => { refs.current[i] = el; }} className={i === P.cur ? "cur" : ""} onClick={() => P.has(i) && P.playFrom(i)}>
              {l.sp && <span className="tw-sp">{l.sp}</span>}
              {ws.map((w, k) => (
                <span key={k}><button type="button" className={`tw-w${i === P.cur ? (k < P.wi ? " dn" : k === P.wi ? " hit" : "") : ""}`} onClick={(e) => { e.stopPropagation(); word(ws, k, i); }}>{w}</button>{" "}</span>
              ))}
              {!P.kitob(i) && aud.keys.some((k) => aud.urls[k]) && <small className="tw-na" dir="ltr">Hamed ovozi</small>}
            </p>
          );
        })}
      </section>
      {fin && (
        <section className="card tw-fin">
          <b><Check size={18} strokeWidth={3} aria-hidden />Tinglash bajarildi</b>
          <div>
            {P.any && <button type="button" className="btn ghost" onClick={() => { setFin(false); P.playFrom(0); }}><RotateCcw size={18} aria-hidden />Qayta tinglash</button>}
            <button type="button" className="btn primary" onClick={onNext}>O'qishga o'tish</button>
          </div>
        </section>
      )}
      {P.any && (
        <div className="tw-ctrl">
          <button type="button" className="tw-play" aria-label={P.play ? "To'xtatish" : "Tinglash"} onClick={() => { setFin(false); P.toggle(); }}>{P.play ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}</button>
          <div className="seg small tw-spd" role="radiogroup" aria-label="Tezlik">
            {[0.75, 1].map((r) => <button key={r} type="button" role="radio" aria-checked={P.rate === r} className={P.rate === r ? "on" : ""} onClick={() => P.setRate(r)}>{r === 1 ? "1×" : "0.75×"}</button>)}
          </div>
          <button type="button" className="ibtn" aria-label="Boshidan" onClick={() => { setFin(false); P.playFrom(0); }}><RotateCcw size={18} aria-hidden /></button>
          <small>{P.cur >= 0 ? `${P.cur + 1} / ${g.lines.length} gap` : `${g.lines.length} gap`}</small>
        </div>
      )}
      {!loading && !P.any && !fin && <button type="button" className="btn primary wide" onClick={() => { setFin(true); onDone(); }}>O'qib chiqdim</button>}
      {pop && (
        <div className="tw-pop" role="dialog" aria-label={pop.ar}>
          <div className="tw-prow">
            <button type="button" className="tw-pspk" aria-label="So'zni tinglash" onClick={() => void say(pop.ar)}><Volume2 size={18} aria-hidden /></button>
            <Ar className="tw-par">{pop.ar}</Ar>
            <span className="tw-puz">{pop.uz || (pop.lineUz ? "so'z lug'atda yo'q" : "lug'atda topilmadi")}</span>
            {pop.uz && <button type="button" className={`tw-psv${isSaved(pop.ar) ? " on" : ""}`} onClick={() => { toggleSaved(pop.ar, pop.uz); setPop({ ...pop }); tg.haptic("success"); }}>{isSaved(pop.ar) ? <><Check size={15} strokeWidth={3} aria-hidden />Saqlandi</> : "Saqlash"}</button>}
            <button type="button" className="ibtn" aria-label="Yopish" onClick={() => setPop(null)}><X size={16} aria-hidden /></button>
          </div>
          {pop.base && <span className="tw-pbase">Lug'atdagi shakli: <Ar>{pop.base}</Ar></span>}
          {(pop.lineUz || P.has(pop.line)) && (
            <div className="tw-pline">
              {pop.lineUz && <span><em>Gap:</em> {pop.lineUz}</span>}
              {P.has(pop.line) && <button type="button" className="btn ghost" onClick={() => { setFin(false); P.playFrom(pop.line, true); }}><Play size={16} aria-hidden />Gapni tinglash</button>}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

// ===== O'qi ×3: tezlik =====
function ReadTimes({ g, n, cap, prog, onSave, onBack }: { g: Group; n: number; cap: number; prog: Prog; onSave: (wpm: number) => void; onBack: () => void }) {
  // faqat ekran ochiq turgan vaqt sanaladi: ilova fonga o'tsa (qo'ng'iroq, boshqa ilova) taymer to'xtaydi
  const [run, setRun] = useState(false);
  const acc = useRef(0), since = useRef(0);
  const [, setTick] = useState(0);
  const [res, setRes] = useState<number | null>(null);
  useEffect(() => {
    if (!run) return;
    const h = setInterval(() => setTick((x) => x + 1), 250);
    const vis = () => {
      if (document.visibilityState === "hidden") { if (since.current) { acc.current += Date.now() - since.current; since.current = 0; } }
      else if (!since.current) since.current = Date.now();
    };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(h); document.removeEventListener("visibilitychange", vis); };
  }, [run]);
  const ms = () => acc.current + (since.current ? Date.now() - since.current : 0);
  const start = () => { setRes(null); acc.current = 0; since.current = Date.now(); setRun(true); tg.haptic(); };
  const stop = () => {
    const sec = ms() / 1000;
    setRun(false); since.current = 0;
    if (sec < 3) { toast("Juda tez — matnni oxirigacha o'qing"); return; }
    const wpm = Math.round(n / (sec / 60));
    if (wpm > cap) { toast("Juda tez chiqdi — matnni ovoz chiqarib, oxirigacha o'qing. Bu urinish saqlanmadi."); return; }
    setRes(wpm); onSave(wpm); tg.haptic("success");
  };
  const sec = run ? Math.floor(ms() / 1000) : 0;
  const mine = twOf(prog, g.key), tries = mine.length;
  return (
    <main className="screen tw">
      <ScreenHeader title="O'qi — 3 marta" ar="الْقِرَاءَةُ" onBack={onBack} />
      <p className="pf-note">Shu matnni ovoz chiqarib o'qing. Boshlaganda «Boshladim», tugaganda «Tugatdim» bosing. Xato sanalmaydi — faqat tezlik.</p>
      <section className={`tw-text big${run ? " run" : ""}`} dir="rtl">
        {g.lines.map((l, i) => <p key={i}>{l.sp && <span className="tw-sp">{l.sp}</span>}{clean(l.ar)}</p>)}
      </section>
      <div className="tw-timer">
        {run ? <><b>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</b><button type="button" className="btn good wide" onClick={stop}>Tugatdim</button></>
          : <button type="button" className="btn primary wide" onClick={start}>{tries >= 3 ? "Yana o'qish" : `Boshladim · ${tries + 1}-marta`}</button>}
      </div>
      {res !== null && <p className="tw-res"><b>{res}</b> so'z/daqiqa · {n} so'z</p>}
      {mine.length > 1 && <Bars v={mine.slice(-3)} />}
    </main>
  );
}

// ===== Ayt: o'zi o'qib yozib oladi =====
function Say({ bookId, unitN, g, n, aud, onBack, onSent }: { bookId: string; unitN: number; g: Group; n: number; aud: Aud; onBack: () => void; onSent: () => void }) {
  const { me } = useSession();
  const [voice, setVoice] = useState<{ blob: Blob; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const P = usePlayer(g, aud);
  // yozib olish chegarasi — matn uzunligiga qarab (sekin o'quvchi ~35 so'z/daqiqa + zaxira), 3–7 daqiqa
  const max = Math.min(420, Math.max(180, Math.ceil((n / 35) * 60) + 30));
  const send = async () => {
    if (!voice) return;
    setBusy(true);
    try {
      const audio = await blobB64(voice.blob);
      await sendSub({ lesson: `read:${bookId}:${unitN}`, step: "read", item: 0, text: "🎙 Matnni o'qish", title: `Matnni o'qish · ${unitN}-vahda`, audio, mime: voice.mime });
      tg.haptic("success"); toast("Ustozingizga yuborildi"); onSent();
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi, qayta urinib ko'ring"); }
    setBusy(false);
  };
  return (
    <main className="screen tw">
      <ScreenHeader title="Ayt" ar="الْكَلَامُ" onBack={onBack} />
      <p className="pf-note">Matnni o'zingiz ovoz chiqarib o'qing va yozib oling. So'ng o'z ovozingizni kitobning asl ovozi bilan solishtiring{me?.group ? " — xohlasangiz ustozga yuboring" : ""}.</p>
      <section className="tw-text big" dir="rtl">{g.lines.map((l, i) => <p key={i} className={i === P.cur ? "cur" : ""}>{l.sp && <span className="tw-sp">{l.sp}</span>}{clean(l.ar)}</p>)}</section>
      <section className="card hws-voice">
        <VoiceRec value={voice} onChange={setVoice} disabled={busy} label="O'qib yozib olish" max={max} priv={me?.group ? "Ovozingizni faqat ustozingiz eshitadi." : "Ovozingiz faqat shu telefonda qoladi."} />
        {P.any && <button type="button" className="btn ghost wide tw-orig" onClick={P.toggle}>{P.play ? <><Pause size={18} aria-hidden />To'xtatish</> : <><Headphones size={18} aria-hidden />Asl ovozni tinglash</>}</button>}
      </section>
      {me?.group && <button type="button" className="btn primary wide" disabled={!voice || busy} onClick={() => void send()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : "Ustozga yuborish"}</button>}
      <button type="button" className={`btn ${me?.group ? "ghost" : "primary"} wide tw-skip`} disabled={!voice || busy} onClick={onSent}>{me?.group ? "Yubormasdan tugatish" : "Tugatdim"}</button>
    </main>
  );
}

// ===== Tanlov: o'z gaplari =====
function Own({ bookId, unitN, onBack, onSent }: { bookId: string; unitN: number; onBack: () => void; onSent: () => void }) {
  const { me } = useSession();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (text.trim().length < 5) { toast("Gaplaringizni yozing"); return; }
    if (!me?.group) { tg.haptic("success"); toast("Barakalla!"); onSent(); return; }
    setBusy(true);
    try {
      await sendSub({ lesson: `read:${bookId}:${unitN}`, step: "read", item: 1, text: text.trim().slice(0, 1500), title: `O'z gaplari · ${unitN}-vahda` });
      tg.haptic("success"); toast("Ustozingizga yuborildi"); onSent();
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
    setBusy(false);
  };
  return (
    <main className="screen tw">
      <ScreenHeader title="O'z gaplaringiz" ar="جُمَلِي" onBack={onBack} />
      <p className="pf-note">Matndagi 5 ta so'zni tanlab, ular bilan o'z gaplaringizni arabcha yozing.{me?.group ? " Ustozingiz tekshiradi." : ""}</p>
      <section className="card form"><label htmlFor="tw-own">Gaplaringiz<textarea id="tw-own" rows={5} dir="auto" maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} /></label></section>
      <button type="button" className="btn primary wide" disabled={busy || text.trim().length < 5} onClick={() => void send()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : me?.group ? "Ustozga yuborish" : "Tugatdim"}</button>
    </main>
  );
}
