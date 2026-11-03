// Shadowing: multfilm iboralarini tinglab, ortidan takrorlash.
// Oqim — ibora 2 marta yangraydi, so'ng navbat sizda (sanoq bilan avtomatik keyingisiga o'tadi);
// Solishtirish — 1 · Tinglang, 2 · Takrorlang (ovoz yoziladi), 3 · Solishtiring (asl va sizning ovozingiz).
// Kunlik mashq (Mashq bo'limidan): 10 ibora, eski ilova bilan bir xil f.shd, har ibora gain("fc", 3).
import { Fragment, useEffect, useReducer, useRef } from "react";
import { Mic, Play, RotateCcw, SkipForward, X } from "lucide-react";
import { fmtT, kLag, kPaint, multLevel, shEnd, shKey, shMore, shPicks, SHSP, shRate, shToday, videoUrl, type Mult, type ShItem } from "../lib/mult";
import { gain, store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar } from "../ui/kit";
import { CountUp } from "../ui/CountUp";
import { Scale } from "../ui/Scale";
import { toast } from "../ui/Toast";
import { LagRow, useMults } from "./Mult";

type Phase = "idle" | "play" | "play2" | "turn" | "rec" | "compare";
type Mode = "flow" | "card";
type St = { k: number; mode: Mode; auto: boolean; phase: Phase; rate: number; left: number; rec: { url: string; dur: number } | null; rep: Record<string, number>; t0: number; sec: number };

const recMime = () => ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"]
  .find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });

export function ShadowScreen({ items, mode, daily }: { items: ShItem[]; mode: Mode; daily: boolean }) {
  const { back, replace } = useNav();
  const { me } = useSession();
  const ms = useMults();
  const S = useRef<St>({ k: 0, mode, auto: true, phase: "idle", rate: shRate(), left: 0, rec: null, rep: {}, t0: Date.now(), sec: 0 });
  const [, force] = useReducer((x: number) => x + 1, 0);
  const vid = useRef<HTMLVideoElement>(null);
  const ph = useRef<HTMLSpanElement>(null);
  const tm = useRef(0);
  const raf = useRef(0);
  const alive = useRef(true);
  const msR = useRef<Mult[] | null>(null);
  msR.current = ms;
  const R = useRef<{ mr: MediaRecorder | null; stream: MediaStream | null; chunks: Blob[]; s0: number; auto: number; aud: HTMLAudioElement | null }>({ mr: null, stream: null, chunks: [], s0: 0, auto: 0, aud: null });

  const cur = () => {
    const it = items[S.current.k];
    const m = it && msR.current?.find((x) => x.id === it.m);
    return m && m.cues[it.i] ? { m, c: m.cues[it.i], it } : null;
  };
  const clearT = () => clearInterval(tm.current);
  const pauseV = () => { try { vid.current?.pause(); } catch { /* */ } };
  const stopRec = () => { clearTimeout(R.current.auto); try { if (R.current.mr?.state === "recording") R.current.mr.stop(); } catch { /* */ } };
  const release = () => { try { R.current.stream?.getTracks().forEach((t) => t.stop()); } catch { /* */ } R.current.stream = null; };

  // iborani ovoz bilan birga bo'yash
  const kara = () => {
    cancelAnimationFrame(raf.current);
    const step = () => {
      const x = cur(); if (!x || !alive.current) return;
      const p = S.current.phase;
      if (p === "play" || p === "play2") { kPaint(ph.current, x.c, vid.current?.currentTime ?? 0); raf.current = requestAnimationFrame(step); }
      else kPaint(ph.current, x.c, x.c.e + 2 + kLag());
    };
    raf.current = requestAnimationFrame(step);
  };

  const playSeg = (rate?: number, second = false) => {
    const x = cur(), el = vid.current;
    if (!x || !el || !alive.current) return;
    stopRec(); clearT();
    const st = S.current;
    st.phase = second ? "play2" : "play"; st.rate = rate || shRate();
    force(); kara();
    try { el.playbackRate = st.rate; el.currentTime = Math.max(0, x.c.s - 0.05); void el.play().catch(() => {}); } catch { /* */ }
    tm.current = window.setInterval(() => {
      if (!alive.current) { clearT(); return; }
      if (el.currentTime >= shEnd(x.c) + kLag() + 0.1 || el.ended) {
        pauseV(); clearT();
        if (!second) {
          const cc = x.c;
          setTimeout(() => { if (alive.current && S.current.phase === "play" && cur()?.c === cc) playSeg(S.current.rate, true); }, 500);
        } else turn();
      }
    }, 40);
  };

  const turn = () => {
    const x = cur(); if (!x) return;
    const st = S.current;
    st.phase = "turn";
    st.left = Math.max(2, Math.ceil(((shEnd(x.c) - x.c.s) / Math.min(1, st.rate || 1)) * 1.5));
    force(); kara();
    if (st.mode === "flow" && st.auto) {
      clearT();
      tm.current = window.setInterval(() => {
        if (S.current.phase !== "turn") { clearT(); return; }
        S.current.left--; force();
        if (S.current.left <= 0) { clearT(); next(true); }
      }, 1000);
    }
  };

  const next = (auto: boolean) => {
    const st = S.current;
    stopRec(); clearT(); pauseV();
    const x = cur();
    if (x && daily) {
      const D = shToday(), key = shKey(x.it);
      if (!D.done.includes(key)) D.done.push(key);
      D.rep[key] = st.rep[key] || 0;
      store.set("f.shd", D);
      gain("fc", 3);
    }
    st.k++;
    if (st.rec) URL.revokeObjectURL(st.rec.url);
    st.rec = null; st.phase = "idle";
    if (st.k >= items.length) {
      st.sec = Math.round((Date.now() - st.t0) / 1000);
      if (daily) { const D = shToday(); D.sec = (D.sec || 0) + st.sec; store.set("f.shd", D); }
      release(); tg.haptic("success"); force(); return;
    }
    force();
    if (auto || st.mode === "flow") setTimeout(() => playSeg(), 80);
  };

  const playMine = () => {
    const st = S.current; if (!st.rec) return;
    try { R.current.aud?.pause(); } catch { /* */ }
    const a = new Audio(st.rec.url); R.current.aud = a;
    void a.play().catch(() => {});
  };

  const rec = async () => {
    const st = S.current;
    if (st.phase === "rec") { stopRec(); return; }
    pauseV(); clearT();
    try { R.current.aud?.pause(); } catch { /* */ }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function" || typeof MediaRecorder === "undefined") { toast("Bu telefonda ovoz yozib bo'lmaydi — tinglab, ovoz chiqarib takrorlang"); return; }
    let stream = R.current.stream;
    try {
      if (!stream || !stream.getTracks().some((t) => t.readyState === "live")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 } })
          .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
        R.current.stream = stream;
      }
    } catch { toast("Mikrofonga ruxsat berilmadi. Telegram sozlamalarida ruxsat bering"); return; }
    if (!alive.current) { release(); return; }
    const r = R.current;
    const mime = recMime();
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(stream, { audioBitsPerSecond: 128000, ...(mime ? { mimeType: mime } : {}) }); } catch { mr = new MediaRecorder(stream); }
    r.mr = mr; r.chunks = []; r.s0 = Date.now();
    mr.ondataavailable = (e) => { if (e.data?.size) r.chunks.push(e.data); };
    mr.onstop = () => {
      if (!alive.current) return;
      const b = new Blob(r.chunks, { type: mr.mimeType || "audio/webm" });
      if (S.current.rec) URL.revokeObjectURL(S.current.rec.url);
      S.current.rec = { url: URL.createObjectURL(b), dur: (Date.now() - r.s0) / 1000 };
      S.current.phase = "compare"; force(); playMine();
    };
    mr.start();
    st.phase = "rec"; force(); tg.haptic();
    const x = cur();
    const lim = x ? Math.max(2.5, ((shEnd(x.c) - x.c.s) / Math.min(1, st.rate || 1)) * 1.6 + 1.2) : 6;
    r.auto = window.setTimeout(() => { if (S.current.phase === "rec") stopRec(); }, Math.min(15, lim) * 1000);
  };

  const replay = () => { const x = cur(); if (!x) return; const k = shKey(x.it); S.current.rep[k] = (S.current.rep[k] || 0) + 1; tg.haptic(); playSeg(); };
  const setMode = (md: Mode) => {
    if (S.current.mode === md) return;
    stopRec(); clearT(); pauseV();
    Object.assign(S.current, { mode: md, phase: "idle" });
    force();
    if (md === "flow") setTimeout(() => playSeg(), 300);
  };
  const setRate = (r: number) => {
    store.set("f.shrate", r);
    S.current.rate = r;
    if (S.current.phase === "play" || S.current.phase === "play2") { try { if (vid.current) vid.current.playbackRate = r; } catch { /* */ } }
    force();
  };

  // boshlanishi: oqim rejimida (kunlik emas) darhol yangraydi; chiqishda hammasi to'xtaydi
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearInterval(tm.current); cancelAnimationFrame(raf.current);
      clearTimeout(R.current.auto);
      try { if (R.current.mr?.state === "recording") R.current.mr.stop(); } catch { /* */ }
      try { R.current.stream?.getTracks().forEach((t) => t.stop()); } catch { /* */ }
      try { R.current.aud?.pause(); } catch { /* */ }
      if (S.current.rec) URL.revokeObjectURL(S.current.rec.url);
    };
  }, []);
  useEffect(() => {
    if (!ms) return;
    if (S.current.mode === "flow" && !daily) { const h = setTimeout(() => playSeg(), 300); return () => clearTimeout(h); }
  }, [ms]); // eslint-disable-line react-hooks/exhaustive-deps

  const st = S.current;
  const n = items.length;
  if (!ms) return <main className="round"><p className="muted pad">Yuklanmoqda…</p></main>;

  // ===== yakun =====
  if (st.k >= n) {
    const reps = Object.entries(st.rep).filter((r) => r[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const xp = daily ? n * 3 : 0;
    const more = () => {
      const lv = multLevel(ms, me?.level, store.get<string>("a1.book", ""));
      replace("shadow", { items: shMore(ms, lv), mode: "card", daily: true, n: Date.now() });
    };
    return (
      <main className="round">
        <div className="r-done">
          <Scale size={130} balanced star />
          <Ar className="sh-bravo">أَحْسَنْتَ!</Ar>
          <h1>{daily ? "Bugungi shadowing bajarildi" : "Takrorlash yakunlandi"}</h1>
          <p>{n} ta iborani ovoz chiqarib takrorladingiz · {fmtT(st.sec)}</p>
          {xp > 0 && <p className="r-earn"><CountUp to={xp} />&nbsp;yulduzcha</p>}
          {reps.length > 0 && (
            <section className="card sh-reps">
              <b>Ko'p qayta eshitilgan iboralar</b>
              {reps.map(([k, c]) => {
                const [mid, i] = k.split(":"); const m = ms.find((x) => x.id === mid);
                return m ? <div key={k}><small>{c} marta</small><Ar>{m.cues[Number(i)].ar}</Ar></div> : null;
              })}
            </section>
          )}
          {daily && <button type="button" className="btn primary wide" onClick={more}>Yana 10 ta ibora</button>}
          <button type="button" className={`btn ${daily ? "ghost" : "primary"} wide`} onClick={back}>{daily ? "Mashqqa qaytish" : "Multfilmga qaytish"}</button>
        </div>
      </main>
    );
  }

  const x = cur();
  if (!x) return <main className="round"><p className="muted pad">Ibora topilmadi.</p><button type="button" className="btn dark wide" onClick={back}>Orqaga</button></main>;
  const { m, c } = x;
  const p = st.phase;
  const playing = p === "play" || p === "play2";
  const words = c.ar.split(/\s+/);
  const phrase = (
    <div className="shcard">
      <span key={st.k} ref={ph} className={`ar shph ${playing ? "" : "idle"}`} dir="rtl" lang="ar">
        {words.map((w, k) => <Fragment key={k}>{k > 0 && " "}<span className="kw">{w}</span></Fragment>)}
      </span>
      <span className="sh-uz">{c.uz}</span>
      {daily && <small className="muted">{m.title} · {fmtT(c.s)}</small>}
    </div>
  );
  const speedRow = (
    <div className="seg small mspeed" role="group" aria-label="Tezlik">
      {SHSP.map((r) => <button key={r} type="button" className={r === st.rate ? "on" : ""} aria-pressed={r === st.rate} onClick={() => setRate(r)}>{r}x</button>)}
    </div>
  );

  return (
    <main className="round shadow">
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>Shadowing</b>
        <span className="r-count">{st.k + 1} / {n}</span>
      </header>
      <div className="r-bar" role="progressbar" aria-valuenow={st.k} aria-valuemin={0} aria-valuemax={n} aria-label="Shadowing"><i style={{ width: `${(st.k / n) * 100}%` }} /></div>
      {!daily && (
        <div className="seg small" role="group" aria-label="Rejim">
          <button type="button" className={st.mode === "flow" ? "on" : ""} aria-pressed={st.mode === "flow"} onClick={() => setMode("flow")}>Oqim</button>
          <button type="button" className={st.mode === "card" ? "on" : ""} aria-pressed={st.mode === "card"} onClick={() => setMode("card")}>Solishtirish</button>
        </div>
      )}
      <div className={`mplayer ${st.mode === "card" ? "small" : ""}`}>
        <video ref={vid} src={videoUrl(m)} playsInline preload="auto"
          onLoadedMetadata={(e) => { if (S.current.phase === "idle") { const y = cur(); if (y) e.currentTarget.currentTime = y.c.s; } }} />
      </div>

      {st.mode === "flow" ? (
        <>
          <div className="shturn" aria-live="polite">
            {p === "play2" ? <><span className="shring on2"><Mic size={20} aria-hidden /></span><b>Navbat sizda — ovoz bilan birga ayting!</b></>
              : p === "turn" || p === "rec" ? <><span className="shring">{st.auto && p === "turn" && st.left > 0 ? st.left : <Mic size={20} aria-hidden />}</span><b>Endi o'zingiz ayting</b></>
              : p === "play" ? <b className="muted">1-marta · tinglang…</b>
              : <b className="muted">Boshlash uchun «Qayta» ni bosing</b>}
          </div>
          {phrase}
          <div className="shbtns">
            <button type="button" onClick={replay}><RotateCcw size={20} aria-hidden />Qayta</button>
            <button type="button" className={p === "rec" ? "on" : ""} onClick={() => void rec()}><Mic size={20} aria-hidden />{p === "rec" ? "To'xtatish" : "Yozish"}</button>
            <button type="button" onClick={() => next(false)}><SkipForward size={20} aria-hidden />Keyingi</button>
          </div>
          {st.rec && (
            <div className="shrow">
              <button type="button" className="shplay" onClick={playMine} aria-label="Ovozimni tinglash"><Play size={16} aria-hidden /></button>
              <span><b>Sizning ovozingiz</b> · {st.rec.dur.toFixed(1)} s</span>
            </div>
          )}
          {speedRow}
          <label className="sh-switch">
            <span><b>Avtomatik davom etish</b><small>Pauza = ibora uzunligi × 1.5</small></span>
            <input type="checkbox" checked={st.auto} onChange={(e) => { st.auto = e.target.checked; force(); }} />
          </label>
        </>
      ) : (
        <>
          <div className="shsteps" aria-hidden>
            <span className={p === "idle" || p === "play" ? "on" : ""}>1 · Tinglang</span>
            <span className={p === "play2" || p === "turn" || p === "rec" ? "on" : ""}>2 · Takrorlang</span>
            <span className={p === "compare" ? "on" : ""}>3 · Solishtiring</span>
          </div>
          {phrase}
          <div className="shrow">
            <button type="button" className="shplay dark" onClick={replay} aria-label="Asl ovozni tinglash"><Play size={16} aria-hidden /></button>
            <span><b>Asl</b> · {(c.e - c.s).toFixed(1)} s</span>
          </div>
          <div className="shrow">
            <button type="button" className="shplay" onClick={playMine} disabled={!st.rec} aria-label="Ovozimni tinglash"><Play size={16} aria-hidden /></button>
            <span><b>Siz</b> · {st.rec ? `${st.rec.dur.toFixed(1)} s` : "hali yozilmagan"}</span>
          </div>
          <div className="shmic">
            <span aria-hidden />
            <button type="button" className={`shbig ${p === "rec" ? "on" : ""}`} onClick={() => void rec()} aria-label={p === "rec" ? "Yozishni to'xtatish" : "Ovoz yozish"}>
              {p === "rec" ? <span className="sq" /> : <Mic size={30} aria-hidden />}
            </button>
            <button type="button" className="shsm" onClick={() => next(false)} aria-label="Keyingi ibora"><SkipForward size={22} aria-hidden /></button>
          </div>
          <p className="sh-hint" aria-live="polite">
            {p === "play2" ? <b>Navbat sizda — ovoz bilan birga ayting!</b>
              : p === "rec" ? "Yozilmoqda… o'zi to'xtaydi va ovozingizni eshittiradi"
              : st.rec ? "Ovozingiz eshittirildi. «Asl» bilan solishtiring yoki qayta yozing"
              : "Avval «Asl» ni tinglang, so'ng mikrofonni bosib takrorlang"}
          </p>
          {speedRow}
        </>
      )}
      <LagRow />
    </main>
  );
}

/** Mashq bo'limi uchun: bugungi iboralar (bajarilmaganlari) va hisob */
export function shDaily(ms: Mult[], level?: string | null) {
  const lv = multLevel(ms, level, store.get<string>("a1.book", ""));
  const P = shPicks(ms, lv);
  const D = shToday();
  const done = P.filter((x) => D.done.includes(shKey(x))).length;
  const left = P.filter((x) => !D.done.includes(shKey(x)));
  return { picks: P, done, items: left.length ? left : P };
}
