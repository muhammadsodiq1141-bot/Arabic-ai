// Multfilmlar: daraja bo'yicha ro'yxat → video (karaoke subtitr, gapma-gap boshqaruv, tezlik), lug'at, test.
// Eski ilova bilan bir xil kalitlar: f.mdone (test natijasi %), f.mspeed, f.klag. Videolar repo ildizidagi .mp4 fayllar.
import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { AudioLines, Check, ChevronRight, Clapperboard, Mic, Minus, Pause, PauseCircle, Play, Plus, Repeat, RotateCcw, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { say } from "../lib/audio";
import { loadData } from "../lib/data";
import { kLag, kPaint, lastAt, loadMults, mDone, MLV, mSpeed, setKLag, setMDone, shOk, SPEEDS, TYL, VLAB, mediaUrl, setMSeen, vocFor, fmtT, type Mult, type MultIdx, type MVoc } from "../lib/mult";
import { isLite, onWifi, setLite } from "../lib/lite";
import { coverage, covLabel, lookup, RANK, rankFor, useLex } from "../lib/lex";
import { WordPop } from "../ui/Lex";
import { normAr } from "../lib/practice";
import { gain, store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import { HelpButton, useCoach } from "./Onboard";
import { toast } from "../ui/Toast";
import type { QConf, QItem } from "./Quiz";

type Tab = "video" | "vocab" | "quiz";
// ekranlar orasida eslab qolinadi (testdan yoki so'zdan qaytganda o'sha bo'lim ochiladi)
const TABS: Record<string, Tab> = {};
let LVL: string | null = null;

/** 1-paket: bosh sahifa uchun yengil ro'yxat (MULT_INDEX, rasmsiz) */
export function useMultIndex() {
  const [ms, setMs] = useState<MultIdx[] | null>(null);
  useEffect(() => { let on = true; void loadData<MultIdx[]>("MULT_INDEX").then((x) => on && setMs(x)).catch(() => on && setMs([])); return () => { on = false; }; }, []);
  return ms;
}

export function useMults() {
  const [ms, setMs] = useState<Mult[] | null>(null);
  useEffect(() => { let on = true; void loadMults().then((x) => on && setMs(x)); return () => { on = false; }; }, []);
  return ms;
}

// ===== Ro'yxat =====
export function MultsScreen() {
  const { me } = useSession();
  const { go } = useNav();
  const ms = useMults();
  const [lvl, setLvl] = useState(() => {
    if (LVL) return LVL;
    const L0 = String(me?.level || "").toLowerCase(), bk = store.get<string>("a1.book", "");
    return MLV.some((x) => x[0] === L0) ? L0 : MLV.some((x) => x[0] === bk) ? bk : "a1";
  });
  const pick = (l: string) => { LVL = l; setLvl(l); tg.haptic(); };
  const D = mDone();
  const list = (ms || []).filter((m) => m.level === lvl);
  // 2-paket: har multfilm uchun «siz bilgan so'zlar» foizi (subtitrdagi so'zlar umumiy lug'atda)
  const lex = useLex();
  const cov = useMemo(() => {
    const o: Record<string, string> = {};
    if (!lex) return o;
    for (const m of list) {
      const c = coverage(lex, m.cues.map((x) => x.ar), RANK[m.level] ? { b: m.level, u: 99 } : undefined, rankFor(m.level), 0.4);
      if (c.ok) o[m.id] = `~${c.pct}% so'zni bilasiz · ${covLabel(c.pct)}`;
    }
    return o;
  }, [lex, ms, lvl]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <main className="screen">
      <ScreenHeader title="Multfilmlar" ar="رُسُومٌ مُتَحَرِّكَةٌ" actions={<HelpButton k="mults" />} />
      <div className="seg small" role="group" aria-label="Daraja">
        {MLV.map(([id, t]) => <button key={id} type="button" className={lvl === id ? "on" : ""} aria-pressed={lvl === id} onClick={() => pick(id)}>{t}</button>)}
      </div>
      {!ms ? <p className="muted pad">Yuklanmoqda…</p> : list.length === 0 ? (
        <Empty icon={<Clapperboard size={28} />} title="Bu darajada hali multfilm yo'q" text="Yangi multfilmlar shu yerga qo'shiladi. Boshqa darajani ham ko'rib chiqing." />
      ) : (
        <div className="mlist">
          {list.map((m) => (
            <button key={m.id} type="button" className="mcard" onClick={() => go("mult", { id: m.id })}>
              <span className="m-thumb">
                {m.thumb ? <img src={m.thumb} alt="" /> : <Ar>{m.titleAr || ""}</Ar>}
                <i>{fmtT(m.dur || 0)}</i>
              </span>
              <span className="m-meta">
                <b>{m.title}</b>
                {m.sub && <small>{m.sub}</small>}
                {cov[m.id] && <small className="m-cov">{cov[m.id]}</small>}
                <span className={`m-pill ${D[m.id] !== undefined ? "done" : ""}`}>
                  {D[m.id] !== undefined ? <><Check size={14} strokeWidth={3} aria-hidden />Ko'rildi · test {D[m.id]}%</> : `${(m.vocab || []).length} ta yangi so'z`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

// ===== Bitta multfilm =====
export function MultScreen({ id }: { id: string }) {
  const ms = useMults();
  const m = ms?.find((x) => x.id === id);
  const [tab, setTabS] = useState<Tab>(TABS[id] || "video");
  useEffect(() => { if (m) setMSeen(m.id); }, [m]);
  const setTab = (t: Tab) => { TABS[id] = t; setTabS(t); window.scrollTo(0, 0); tg.haptic(); };
  useCoach("mult", !!m && tab === "video");
  if (!ms) return <main className="screen"><ScreenHeader title="Multfilm" /><p className="muted pad">Yuklanmoqda…</p></main>;
  if (!m) return <main className="screen"><ScreenHeader title="Multfilm" /><p className="muted pad">Multfilm topilmadi.</p></main>;
  const tabs: [Tab, string][] = [["video", "Video"], ["vocab", `Lug'at · ${(m.vocab || []).length}`], ["quiz", "Test"]];
  return (
    <main className="screen mult">
      <ScreenHeader title={m.title} ar={m.titleAr} actions={<HelpButton k="mult" />} />
      <p className="m-info">{m.level.toUpperCase()} · {fmtT(m.dur || 0)}{m.sub ? ` · ${m.sub}` : ""}</p>
      <div className="seg small" role="tablist" aria-label="Bo'lim">
        {tabs.map(([t, l]) => <button key={t} type="button" role="tab" className={tab === t ? "on" : ""} aria-selected={tab === t} onClick={() => setTab(t)}>{l}</button>)}
      </div>
      {tab === "video" && <MultVideo m={m} />}
      {tab === "vocab" && <MultVocab m={m} />}
      {tab === "quiz" && <MultQuiz m={m} />}
    </main>
  );
}

/** Yozuv ovozdan oldinda/ortda qolsa — karaoke kechikishini qo'lda surish */
export function LagRow() {
  const [v, setV] = useState(kLag);
  return (
    <div className="klag">
      <span>Yozuv ovozdan oldinda bo'lsa <b>+</b>, ortda qolsa <b>−</b></span>
      <div>
        <button type="button" aria-label="Yozuvni tezlatish" onClick={() => setV(setKLag(-0.1))}><Minus size={18} aria-hidden /></button>
        <b>{v >= 0 ? "+" : ""}{v.toFixed(2)} s</b>
        <button type="button" aria-label="Yozuvni kechiktirish" onClick={() => setV(setKLag(0.1))}><Plus size={18} aria-hidden /></button>
      </div>
    </div>
  );
}

function scrollToLine(l: Element) {
  const st = document.querySelector(".mstick");
  const off = st ? st.getBoundingClientRect().bottom : 0;
  const r = l.getBoundingClientRect(), H = window.innerHeight;
  if (r.top < off + 8 || r.bottom > H - 8 || Math.abs(r.top - off - (H - off) / 3) > 40) {
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - off - Math.max(12, (H - off - r.height) / 3)), behavior: "smooth" });
  }
}

function MultVideo({ m }: { m: Mult }) {
  const { go } = useNav();
  const v = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [sp, setSp] = useState(mSpeed);
  const [loop, setLoop] = useState(false);
  const [ar, setAr] = useState(true);
  const [uz, setUz] = useState(true);
  // 2-paket: subtitr «yopiq» — gap xira, bosganda ochiladi; «har gapdan keyin to'xtash»
  const [hid, setHid] = useState(false);
  const [stop, setStopS] = useState(() => store.get<boolean>("f.mstop", false));
  const stopOn = useRef(stop);
  stopOn.current = stop;
  const stopDone = useRef(-1), prevI = useRef(-1);
  const lex = useLex();
  const [bad, setBad] = useState(false);
  const [pop, setPop] = useState<{ w: string; i: number } | null>(null);
  const [lite, setLiteS] = useState(isLite); // 17-partiya (A6): faqat audio + matn
  const flipLite = () => {
    const el = v.current, t = el?.currentTime || 0, was = !!el && !el.paused;
    setLite(!lite); setLiteS(!lite); setBad(false); tg.haptic();
    // manba almashganda joy saqlanadi
    requestAnimationFrame(() => { const e2 = v.current; if (!e2) return; const go2 = () => { e2.currentTime = t; e2.playbackRate = mSpeed(); if (was) void e2.play().catch(() => {}); }; if (e2.readyState >= 1) go2(); else e2.addEventListener("loadedmetadata", go2, { once: true }); });
  };
  const loopI = useRef(-1);
  const loopOn = useRef(false);
  loopOn.current = loop;
  const userScroll = useRef(0);

  // har kadrda: joriy gap, karaoke, aylana (DOM'da to'g'ridan-to'g'ri — React qayta chizmaydi)
  useEffect(() => {
    const touch = () => { userScroll.current = Date.now(); };
    window.addEventListener("touchmove", touch, { passive: true });
    window.addEventListener("wheel", touch, { passive: true });
    let raf = 0, last = -2;
    const tick = () => {
      const el = v.current, b = box.current;
      if (el && b) {
        const t = el.currentTime, lag = kLag();
        if (loopOn.current && loopI.current >= 0) {
          const c = m.cues[loopI.current];
          if (t >= Math.max(c.e, c.x || c.e) + 0.2 + lag || t < c.s - 1.5) el.currentTime = c.s;
        }
        const i = lastAt(m, t - lag);
        // har gapdan keyin to'xtash: gap tugaganda (yoki keyingisi boshlanganda) pauza — bir gapda bir marta
        if (stopOn.current && !loopOn.current && !el.paused && i >= 0 && stopDone.current !== i) {
          const c = m.cues[i], pi = prevI.current;
          if (t - lag >= c.e + 0.1) { el.pause(); stopDone.current = i; }
          else if (pi >= 0 && pi < i && stopDone.current !== pi) { el.pause(); el.currentTime = c.s - 0.05; stopDone.current = pi; }
        }
        prevI.current = i;
        if (i !== last) {
          b.querySelectorAll(".mline.on").forEach((x) => { x.classList.remove("on"); x.querySelectorAll(".kw").forEach((k) => k.classList.remove("sd", "cur")); });
          last = i;
          const l = i >= 0 ? b.querySelector(`[data-i="${i}"]`) : null;
          if (l) { l.classList.add("on"); if (Date.now() - userScroll.current > 2500) scrollToLine(l); }
        }
        if (i >= 0) kPaint(b.querySelector(`[data-i="${i}"]`), m.cues[i], t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("touchmove", touch); window.removeEventListener("wheel", touch); };
  }, [m]);

  const seek = (t: number) => { const el = v.current; if (!el) return; stopDone.current = -1; prevI.current = -1; el.currentTime = Math.max(0, t); void el.play().catch(() => {}); };
  const flipStop = () => { const on = !stop; store.set("f.mstop", on); setStopS(on); stopDone.current = -1; tg.haptic(); if (on) toast("Video har gapdan keyin to'xtaydi"); };
  const ctl = (k: "play" | "loop" | "again" | "prev" | "next") => {
    const el = v.current; if (!el) return;
    tg.haptic();
    const t = el.currentTime;
    let i = lastAt(m, t);
    if (k === "play") { if (!el.paused && !el.ended) el.pause(); else void el.play().catch(() => {}); return; }
    if (k === "loop") { const on = !loop; setLoop(on); loopI.current = Math.max(0, i); if (on) toast("Shu gap qayta-qayta aylanadi"); return; }
    if (k === "again") i = Math.max(0, i);
    else if (k === "prev") i = i >= 0 && t - m.cues[i].s > 1.2 ? i : Math.max(0, i - 1);
    else i = Math.min(m.cues.length - 1, i + 1);
    loopI.current = i; userScroll.current = 0; seek(m.cues[i].s - 0.05);
  };
  const speed = (s: number) => { store.set("f.mspeed", s); setSp(s); if (v.current) v.current.playbackRate = s; };
  // gapni bosish → o'sha joydan; to'xtatilganda so'zni bosish → tarjimasi
  const lineClick = (e: MouseEvent, i: number) => {
    const el = v.current;
    // yopiq subtitr: avval gap ochiladi (sinf DOM'da — karaoke «on» sinfi kabi, React qayta chizmaydi)
    const ln = e.currentTarget as HTMLElement;
    if (hid && !ln.classList.contains("rv")) { ln.classList.add("rv"); return; }
    const w = (e.target as HTMLElement).closest(".kw")?.getAttribute("data-w");
    if (w && el && el.paused) { setPop({ w, i: vocFor(m, w) }); return; }
    loopI.current = i; userScroll.current = 0; seek(m.cues[i].s - 0.05);
  };
  const shadow = () => {
    const el = v.current;
    const i0 = Math.max(0, el ? lastAt(m, el.currentTime) : 0);
    const items = m.cues.map((c, i) => ({ c, i })).filter(({ c, i }) => i >= i0 && shOk(c)).map(({ i }) => ({ m: m.id, i }));
    el?.pause();
    if (items.length) go("shadow", { items, mode: "flow", n: Date.now() });
  };
  const V = pop && pop.i >= 0 ? m.vocab?.[pop.i] : null;

  return (
    <>
      <div className="mstick">
        <div className={`mplayer ${lite ? "lite" : ""}`}>
          <video ref={v} src={mediaUrl(m, lite)} poster={lite ? m.thumb : undefined} playsInline controls={!lite} preload={lite || onWifi() !== true ? "metadata" : "auto"}
            onLoadedMetadata={(e) => { e.currentTarget.playbackRate = mSpeed(); }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); if (mDone()[m.id] === undefined) toast("Zo'r! Endi lug'at va testni ko'ring"); }}
            onError={() => setBad(true)} />
        </div>
        {bad && <p className="err">{lite ? "Audio" : "Video"} yuklanmadi. Internetni tekshirib, sahifani qayta oching.</p>}
        <button type="button" className={`m-lite ${lite ? "on" : ""}`} aria-pressed={lite} onClick={flipLite}>
          <AudioLines size={16} aria-hidden />{lite ? "Faqat audio · trafik 7 baravar kam" : "Faqat audio + matn (trafik tejash)"}
        </button>
        <div className="mbar">
          <button type="button" onClick={() => ctl("prev")} aria-label="Oldingi gap"><SkipBack size={20} aria-hidden /><span>Oldingi</span></button>
          <button type="button" onClick={() => ctl("again")} aria-label="Gapni qayta"><RotateCcw size={20} aria-hidden /><span>Qayta</span></button>
          <button type="button" className="mbig" onClick={() => ctl("play")} aria-label={playing ? "Pauza" : "Ijro"}>{playing ? <Pause size={26} aria-hidden /> : <Play size={26} aria-hidden />}</button>
          <button type="button" onClick={() => ctl("next")} aria-label="Keyingi gap"><SkipForward size={20} aria-hidden /><span>Keyingi</span></button>
          <button type="button" className={loop ? "on" : ""} aria-pressed={loop} onClick={() => ctl("loop")} aria-label="Aylana — gapni takrorlab turish"><Repeat size={20} aria-hidden /><span>Aylana</span></button>
        </div>
        <div className="seg small mspeed" role="group" aria-label="Tezlik">
          {SPEEDS.map((s) => <button key={s} type="button" className={s === sp ? "on" : ""} aria-pressed={s === sp} onClick={() => speed(s)}>{s}x</button>)}
        </div>
      </div>

      <button type="button" className="btn primary wide m-sh" onClick={shadow}><Mic size={18} aria-hidden />Takrorlash rejimi (shadowing)</button>
      <div className="seg small m-tog" role="group" aria-label="Subtitr">
        <button type="button" className={ar ? "on" : ""} aria-pressed={ar} onClick={() => setAr(!ar)}>Arabcha</button>
        <button type="button" className={uz ? "on" : ""} aria-pressed={uz} onClick={() => setUz(!uz)}>O'zbekcha</button>
        <button type="button" className={hid ? "on" : ""} aria-pressed={hid} onClick={() => { setHid(!hid); box.current?.querySelectorAll(".mline.rv").forEach((x) => x.classList.remove("rv")); }}>Yopiq</button>
      </div>
      <button type="button" className={`m-lite m-stop ${stop ? "on" : ""}`} aria-pressed={stop} onClick={flipStop}>
        <PauseCircle size={16} aria-hidden />Har gapdan keyin to'xtash
      </button>
      <p className="m-hint">{hid ? "Subtitr yopiq: avval eshitib tushunishga urining, keyin gapni bosib oching." : "Gapni bossangiz — video o'sha joydan boshlanadi. Video to'xtab turganda so'zni bossangiz — tarjimasi chiqadi."}</p>

      <div ref={box} className={`mtrans ${ar ? "" : "noar"} ${uz ? "" : "nouz"} ${hid ? "hid" : ""}`}>
        {m.cues.map((c, i) => (
          <div key={i} className="mline" data-i={i} role="button" tabIndex={0} onClick={(e) => lineClick(e, i)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loopI.current = i; seek(c.s - 0.05); } }}>
            <span className="mnum">{i + 1}</span>
            <div>
              <span className="ar" dir="rtl" lang="ar">{c.ar.split(/\s+/).map((w, k) => <Fragment key={k}>{k > 0 && " "}<span className="kw" data-w={w}>{w}</span></Fragment>)}</span>
              <span className="uz">{c.uz}</span>
            </div>
          </div>
        ))}
      </div>
      <LagRow />

      {/* multfilm lug'atida yo'q so'z — umumiy lug'atdan (2-paket) */}
      {pop && !V && lex && <WordPop w={pop.w.replace(/[،؟!.:«»]/g, "")} e={lookup(lex, pop.w, RANK[m.level] ? { b: m.level, u: 99 } : undefined)} onClose={() => setPop(null)} />}
      {pop && (V || !lex) && (
        <div className="mpop" role="dialog" aria-modal="true" aria-label="So'z tarjimasi" onClick={(e) => { if (e.target === e.currentTarget) setPop(null); }}>
          <div className="mpopc">
            <Ar className="mp-w">{pop.w.replace(/[،؟!.:«»]/g, "")}</Ar>
            {V ? (
              <>
                <b>{V.uz}</b>
                <Ar className="mp-ar">{V.ar}</Ar>
                <div className="row2">
                  <button type="button" className="btn ghost" onClick={() => setPop(null)}>Yopish</button>
                  <button type="button" className="btn primary" onClick={() => { setPop(null); go("mvoc", { id: m.id, i: pop.i }); }}>Batafsil</button>
                </div>
              </>
            ) : (
              <>
                <span className="muted">Bu so'z multfilm lug'atida yo'q.</span>
                <button type="button" className="btn ghost wide" onClick={() => setPop(null)}>Yopish</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Forms({ v, big }: { v: MVoc; big?: boolean }) {
  if (v.v && v.v.length === 4) {
    return (
      <span className={`vgrid ${big ? "big" : ""}`}>
        {v.v.map((x, k) => <span key={k}><Ar>{x}</Ar><small>{VLAB[k]}</small></span>)}
      </span>
    );
  }
  if (v.pl) return <span className="forms">ko'plik: <Ar>{v.pl}</Ar></span>;
  return null;
}

function MultVocab({ m }: { m: Mult }) {
  const { go } = useNav();
  return (
    <ul className="slist">
      {(m.vocab || []).map((v, i) => (
        <li key={i}>
          <button type="button" className="srow mv" onClick={() => go("mvoc", { id: m.id, i })}>
            <span className="st"><Ar className="st-ar">{v.ar}</Ar><span>{v.uz}</span><Forms v={v} /></span>
            <ChevronRight size={20} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

const arCore = (s: string) => normAr(s).replace(/^(ال|و|ف|ب|ل)+/, "");
/** Misol gapda so'zni ajratib ko'rsatish: avval belgilangan shakl (hl), bo'lmasa o'zak bo'yicha */
function Marked({ sent, v }: { sent: string; v: MVoc }) {
  if (v.hl) {
    const i = sent.indexOf(v.hl);
    if (i >= 0) return <>{sent.slice(0, i)}<mark className="hlw">{v.hl}</mark>{sent.slice(i + v.hl.length)}</>;
  }
  const c = arCore(v.ar.split(/\s+/)[0]);
  if (c.length >= 2) {
    const toks = sent.split(/(\s+)/);
    const j = toks.findIndex((t) => { if (/^\s+$/.test(t)) return false; const n = normAr(t); return n.length >= c.length && (arCore(t).startsWith(c.slice(0, Math.max(3, c.length - 1))) || n.includes(c)); });
    if (j >= 0) return <>{toks.slice(0, j).join("")}<mark className="hlw">{toks[j]}</mark>{toks.slice(j + 1).join("")}</>;
  }
  return <>{sent}</>;
}

export function MultVocScreen({ id, i }: { id: string; i: number }) {
  const ms = useMults();
  const m = ms?.find((x) => x.id === id);
  const v = m?.vocab?.[i];
  if (!ms) return <main className="screen"><ScreenHeader title="So'z" /><p className="muted pad">Yuklanmoqda…</p></main>;
  if (!m || !v) return <main className="screen"><ScreenHeader title="So'z" /><p className="muted pad">So'z topilmadi.</p></main>;
  return (
    <main className="screen">
      <ScreenHeader title="So'z" />
      <section className="card wd-card">
        <Ar className="wd-ar">{v.ar}</Ar>
        <b className="wd-uz">{v.uz}</b>
        {v.t && TYL[v.t] && <span className="wd-ty">{TYL[v.t]}</span>}
        <button type="button" className="say" aria-label="Tinglash" onClick={() => void say(v.ar)}><Volume2 size={22} aria-hidden /></button>
        <Forms v={v} big />
      </section>
      {v.ex?.[0] && (
        <>
          <h2 className="t-h">Multfilmda</h2>
          <section className="card wd-ex">
            <p className="ar" dir="rtl" lang="ar"><Marked sent={v.ex[0]} v={v} /></p>
            {v.ex[1] && <p className="wd-tr">{v.ex[1]}</p>}
          </section>
        </>
      )}
      <p className="m-from">{m.title}</p>
    </main>
  );
}

function MultQuiz({ m }: { m: Mult }) {
  const { go } = useNav();
  const best = mDone()[m.id];
  const n = (m.quiz || []).length;
  const start = () => {
    const items: QItem[] = (m.quiz || []).map((q) => ({ q: q.q, opts: q.opts, ans: q.ans, why: q.why }));
    const conf: QConf = {
      title: `${m.title} · test`, items, track: false, auto: false,
      onEnd: (score, total) => {
        setMDone(m.id, Math.round((score / Math.max(1, total)) * 100));
        gain("game", score * 3);
        return { title: "Multfilm testi", sub: "Lug'atni takrorlab, videoni yana bir bor tomosha qiling.", xp: score * 3, backLabel: "Multfilmga qaytish" };
      },
    };
    go("qs", { conf, n: Date.now() });
  };
  return (
    <section className="card m-quiz">
      <b>Multfilm bo'yicha test</b>
      <span>{n} ta savol · lug'at va mazmun</span>
      {best !== undefined && <span className="m-pill done"><Check size={14} strokeWidth={3} aria-hidden />Eng yaxshi natija: {best}%</span>}
      <button type="button" className="btn primary wide" disabled={!n} onClick={start}>Testni boshlash</button>
    </section>
  );
}
