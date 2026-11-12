// 11.11.2026 (17b: K1 + K3): «Matn bilan ishlash» — vahdaning asosiy matni bilan zanjir: maqsad → Tingla (kitobning asl audiosi, karaoke)
// → O'qi ×3 (so'z/daqiqa, xato sanalmaydi) → Ayt (o'zi o'qib yozib oladi, xohlasa ustozga). Tanlov: matndagi so'zlar bilan o'z gaplari.
// Audio — faqat kitob ombori (asl audio); yo'q gapga sun'iy ovoz qo'yilmaydi. So'z ichidagi vaqt — harf soniga mutanosib (taxminiy).
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, Check, Headphones, Mic, Pause, Play, RotateCcw, Send, Timer, Volume2, X } from "lucide-react";
import { blobB64, sendSub } from "../lib/kb";
import { clean, kitobUrls, say, sha1 } from "../lib/audio";
import { loadData } from "../lib/data";
import { loadLex, lookup, type Lex } from "../lib/lex";
import type { Book } from "../lib/progress";
import { savedHas as isSaved, toggleSaved } from "../lib/saved";
import { strandSet } from "../lib/strand";
import { twGet, twSet, type TwProg } from "../lib/textwork";
import { unitTexts, wordsOf, type Line } from "../lib/texts";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { VoiceRec } from "./Kitob";

type Prog = TwProg;
const HAR = /[ً-ْٰـ]/g;
const tokens = (ar: string) => clean(ar).split(/\s+/).filter(Boolean);
const weight = (w: string) => Math.max(1, w.replace(HAR, "").replace(/[.,،؛؟!?:«»"()—–-]/g, "").length) + 1;
type Group = { key: string; title: string; lines: Line[] };
const READ = /^(oqish|qiroat|matn)/;
type Mode = "chain" | "listen" | "read" | "say" | "own";

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

  if (groups === null) return <main className="screen"><ScreenHeader title={`${unitN}-vahda · Matn`} ar="الْعَمَلُ مَعَ النَّصِّ" /><div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div></main>;
  if (groups === "none" || !g) return <main className="screen"><ScreenHeader title={`${unitN}-vahda · Matn`} ar="الْعَمَلُ مَعَ النَّصِّ" /><Empty icon={<BookOpenText size={28} />} title="Bu vahdada matn yo'q" text="Matn bilan ishlash kitob matni bor vahdalarda ochiladi." /></main>;

  if (mode === "listen") return <Listen g={g} keys={keys} urls={urls || {}} onBack={() => setMode("chain")} onDone={() => { save({ ...prog, l: prog.l + 1 }); setMode("chain"); toast("Tinglash bajarildi — endi o'qing"); }} />;
  if (mode === "read") return <ReadTimes g={g} n={nWords} prog={prog} onSave={(wpm) => save({ ...prog, r: [...prog.r, wpm].slice(-12) })} onBack={() => setMode("chain")} />;
  if (mode === "say") return <Say bookId={bookId} unitN={unitN} g={g} onBack={() => setMode("chain")} onSent={() => { save({ ...prog, s: Date.now() }); setMode("chain"); }} />;
  if (mode === "own") return <Own bookId={bookId} unitN={unitN} onBack={() => setMode("chain")} onSent={() => { save({ ...prog, w: Date.now() }); setMode("chain"); }} />;

  const reads = prog.r.length;
  const step = prog.l < 1 ? 0 : reads < 3 ? 1 : !prog.s ? 2 : 3;
  const last = prog.r.slice(-3);
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
          <span><b>Tingla</b><small>{urls === null ? "kitob audiosi tekshirilmoqda…" : withAudio ? `kitob audiosi bilan kuzating · ${withAudio}/${g.lines.length} gap${prog.l ? ` · ${prog.l} marta` : ""}` : "bu matnning kitob ovozi hali yo'q — matnni o'qib chiqing"}</small></span>
          <Headphones size={18} aria-hidden /></button></li>
        <li className={`${reads >= 3 ? "dn" : ""}${step === 1 ? " now" : ""}`}><button type="button" onClick={() => setMode("read")}>
          <i aria-hidden>{reads >= 3 ? <Check size={14} strokeWidth={3} /> : 2}</i>
          <span><b>O'qi — 3 marta</b><small>{reads ? `${Math.min(reads, 3)}/3 · oxirgisi ${prog.r[reads - 1]} so'z/daqiqa` : `${nWords} so'z · vaqt o'lchanadi, xato sanalmaydi`}</small></span>
          <Timer size={18} aria-hidden /></button></li>
        <li className={`${prog.s ? "dn" : ""}${step === 2 ? " now" : ""}`}><button type="button" onClick={() => setMode("say")}>
          <i aria-hidden>{prog.s ? <Check size={14} strokeWidth={3} /> : 3}</i>
          <span><b>Ayt</b><small>{prog.s ? "ustozga yuborildi" : "o'zingiz o'qib yozib oling · ustozga yuborish ixtiyoriy"}</small></span>
          <Mic size={18} aria-hidden /></button></li>
      </ol>
      {last.length > 1 && <Bars v={last} />}
      <button type="button" className="rowbtn tw-own" onClick={() => setMode("own")}>
        <BookOpenText size={22} aria-hidden /><span><b>Qo'shimcha · o'z gaplaringiz</b><small>{prog.w ? "ustozga yuborildi" : "Matndagi 5 ta so'z bilan o'z gaplaringizni yozing (ixtiyoriy)"}</small></span>
      </button>
    </main>
  );
}

function Bars({ v }: { v: number[] }) {
  const max = Math.max(...v, 1), up = v[0] ? Math.round(((v[v.length - 1] - v[0]) / v[0]) * 100) : 0;
  return (
    <section className="card tw-bars">
      <b>Tezlik · so'z/daqiqa</b>
      <div className="tw-chart">{v.map((x, i) => <div key={i} className={i === v.length - 1 ? "now" : ""}><span>{x}</span><i style={{ height: `${Math.max(8, (x / max) * 64)}px` }} /><small>{i + 1}-marta</small></div>)}</div>
      {up > 0 && <span className="tw-up">+{up}% tezroq — barakalla!</span>}
    </section>
  );
}

// ===== Tingla: karaoke =====
function Listen({ g, keys, urls, onBack, onDone }: { g: Group; keys: string[]; urls: Record<string, string>; onBack: () => void; onDone: () => void }) {
  const [cur, setCur] = useState(-1);
  const [wi, setWi] = useState(-1);
  const [play, setPlay] = useState(false);
  const [rate, setRate] = useState(0.75);
  const [pop, setPop] = useState<{ ar: string; uz: string } | null>(null);
  const [lex, setLex] = useState<Lex | null>(null);
  const a = useRef<HTMLAudioElement | null>(null);
  const raf = useRef(0);
  const has = (i: number) => !!urls[keys[i]];
  const W = useMemo(() => g.lines.map((l) => { const ws = tokens(l.ar).map(weight); const t = ws.reduce((x, y) => x + y, 0); let c = 0; return ws.map((w) => (c += w) / t); }), [g]);
  useEffect(() => { loadLex().then(setLex).catch(() => {}); return () => { cancelAnimationFrame(raf.current); a.current?.pause(); }; }, []);
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
  const curRef = useRef(-1);
  const playFrom = (i: number) => {
    let j = i;
    while (j < g.lines.length && !has(j)) j++;
    if (j >= g.lines.length) { setPlay(false); setCur(-1); setWi(-1); curRef.current = -1; if (i > 0) onDone(); return; }
    if (!a.current) a.current = new Audio();
    const el = a.current;
    el.src = urls[keys[j]]; el.playbackRate = rate; el.defaultPlaybackRate = rate;
    el.onended = () => playFrom(j + 1);
    curRef.current = j; setCur(j); setWi(-1); setPlay(true);
    el.play().catch(() => { setPlay(false); toast("Ovoz ochilmadi — internetni tekshiring"); });
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(tick);
  };
  const toggle = () => {
    if (play) { a.current?.pause(); setPlay(false); cancelAnimationFrame(raf.current); return; }
    if (a.current && cur >= 0 && a.current.src) { a.current.play().then(() => { setPlay(true); raf.current = requestAnimationFrame(tick); }).catch(() => {}); return; }
    playFrom(0);
  };
  const setR = (r: number) => { setRate(r); if (a.current) { a.current.playbackRate = r; a.current.defaultPlaybackRate = r; } };
  const word = (w: string) => {
    const e = lex ? lookup(lex, w) : null;
    setPop({ ar: w.replace(/[.,،؛؟!?:«»"()]/g, ""), uz: e?.uz || "" }); tg.haptic();
  };
  const any = keys.some((k) => urls[k]);
  return (
    <main className="screen tw">
      <ScreenHeader title="Tingla" ar="الِاسْتِمَاعُ" onBack={onBack} />
      {!any && <p className="pf-note">Bu matnning kitob ovozi hali yo'q. Matnni o'qib chiqing — so'zni bossangiz, tarjimasi chiqadi.</p>}
      <section className="tw-text" dir="rtl">
        {g.lines.map((l, i) => {
          const ws = tokens(l.ar);
          return (
            <p key={i} className={i === cur ? "cur" : ""} onClick={() => has(i) && playFrom(i)}>
              {l.sp && <span className="tw-sp">{l.sp}</span>}
              {ws.map((w, k) => (
                <span key={k}><button type="button" className={`tw-w${i === cur ? (k < wi ? " dn" : k === wi ? " hit" : "") : ""}`} onClick={(e) => { e.stopPropagation(); word(w); }}>{w}</button>{" "}</span>
              ))}
              {!has(i) && any && <small className="tw-na" dir="ltr">kitob ovozi hali yo'q</small>}
            </p>
          );
        })}
      </section>
      <div className="tw-ctrl">
        <button type="button" className="tw-play" aria-label={play ? "To'xtatish" : "Tinglash"} disabled={!any} onClick={toggle}>{play ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}</button>
        <div className="seg small tw-spd" role="radiogroup" aria-label="Tezlik">
          {[0.75, 1].map((r) => <button key={r} type="button" role="radio" aria-checked={rate === r} className={rate === r ? "on" : ""} onClick={() => setR(r)}>{r === 1 ? "1×" : "0.75×"}</button>)}
        </div>
        <button type="button" className="ibtn" aria-label="Boshidan" disabled={!any} onClick={() => playFrom(0)}><RotateCcw size={18} aria-hidden /></button>
        <small>{cur >= 0 ? `${cur + 1} / ${g.lines.length} gap` : `${g.lines.length} gap`}</small>
      </div>
      {!any && <button type="button" className="btn ghost wide" onClick={onDone}>O'qib chiqdim</button>}
      {pop && (
        <div className="tw-pop" role="dialog" aria-label={pop.ar}>
          <button type="button" className="tw-pspk" aria-label="Tinglash" onClick={() => void say(pop.ar)}><Volume2 size={18} aria-hidden /></button>
          <Ar className="tw-par">{pop.ar}</Ar>
          <span className="tw-puz">{pop.uz || "lug'atda topilmadi"}</span>
          {pop.uz && <button type="button" className={`tw-psv${isSaved(pop.ar) ? " on" : ""}`} onClick={() => { toggleSaved(pop.ar, pop.uz); setPop({ ...pop }); tg.haptic("success"); }}>{isSaved(pop.ar) ? <><Check size={15} strokeWidth={3} aria-hidden />Saqlandi</> : "Saqlash"}</button>}
          <button type="button" className="ibtn" aria-label="Yopish" onClick={() => setPop(null)}><X size={16} aria-hidden /></button>
        </div>
      )}
    </main>
  );
}

// ===== O'qi ×3: tezlik =====
function ReadTimes({ g, n, prog, onSave, onBack }: { g: Group; n: number; prog: Prog; onSave: (wpm: number) => void; onBack: () => void }) {
  const [t0, setT0] = useState(0);
  const [now, setNow] = useState(0);
  const [res, setRes] = useState<number | null>(null);
  useEffect(() => { if (!t0) return; const h = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(h); }, [t0]);
  const start = () => { setRes(null); setT0(Date.now()); setNow(Date.now()); tg.haptic(); };
  const stop = () => {
    const sec = (Date.now() - t0) / 1000;
    setT0(0);
    if (sec < 3) { toast("Juda tez — matnni oxirigacha o'qing"); return; }
    const wpm = Math.round(n / (sec / 60));
    setRes(wpm); onSave(wpm); tg.haptic("success");
  };
  const sec = t0 ? Math.floor((now - t0) / 1000) : 0;
  const tries = prog.r.length;
  return (
    <main className="screen tw">
      <ScreenHeader title="O'qi — 3 marta" ar="الْقِرَاءَةُ" onBack={onBack} />
      <p className="pf-note">Matnni ovoz chiqarib o'qing. Boshlaganda «Boshladim», tugaganda «Tugatdim» bosing. Xato sanalmaydi — faqat tezlik.</p>
      <section className={`tw-text big${t0 ? " run" : ""}`} dir="rtl">
        {g.lines.map((l, i) => <p key={i}>{l.sp && <span className="tw-sp">{l.sp}</span>}{clean(l.ar)}</p>)}
      </section>
      <div className="tw-timer">
        {t0 ? <><b>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</b><button type="button" className="btn good wide" onClick={stop}>Tugatdim</button></>
          : <button type="button" className="btn primary wide" onClick={start}>{tries >= 3 ? "Yana o'qish" : `Boshladim · ${tries + 1}-marta`}</button>}
      </div>
      {res !== null && <p className="tw-res"><b>{res}</b> so'z/daqiqa · {n} so'z</p>}
      {prog.r.length > 1 && <Bars v={prog.r.slice(-3)} />}
    </main>
  );
}

// ===== Ayt: o'zi o'qib yozib oladi =====
function Say({ bookId, unitN, g, onBack, onSent }: { bookId: string; unitN: number; g: Group; onBack: () => void; onSent: () => void }) {
  const { me } = useSession();
  const [voice, setVoice] = useState<{ blob: Blob; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
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
      <p className="pf-note">Matnni o'zingiz ovoz chiqarib o'qing va yozib oling. Tinglab ko'ring{me?.group ? " — xohlasangiz ustozga yuboring" : " va kitob audiosi bilan solishtiring"}.</p>
      <section className="tw-text big" dir="rtl">{g.lines.map((l, i) => <p key={i}>{l.sp && <span className="tw-sp">{l.sp}</span>}{clean(l.ar)}</p>)}</section>
      <section className="card hws-voice"><VoiceRec value={voice} onChange={setVoice} disabled={busy} label="O'qib yozib olish" max={180} /></section>
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
