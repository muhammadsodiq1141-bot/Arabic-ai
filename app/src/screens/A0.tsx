// A0 · Alifbo kursi ekranlari (A0-SPEC §1): a0 — bosh sahifa (harflar xaritasi, takrorlash, 13 dars yo'li), a0d — dars sahifasi
// (kitob betlari, qulfsiz), a0map — harflar xaritasi va harf kartasi (barmoq bilan yozish), a0grow — "Mening o'sishim"
// (ko'nikmalar radari, o'qish tezligi, birinchi/oxirgi ovoz), hwsend — A0 uy vazifasini ustozga topshirish (hwSubmit).
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, Clock, Grid3x3, Lock, MessageCircle, Mic, PenLine, Play, RotateCcw, Send, TrendingUp } from "lucide-react";
import {
  a0Counts, a0Data, a0Done, a0Hist, a0HwAll, a0HwFor, a0HwState, a0Key, a0L, a0Rev, a0State, addSpeed, fmtDate, loadA0, loadAllA0, revDue, sound,
  stepParts, voiceGet, voicePut, type Hw,
} from "../lib/a0";
import { api } from "../lib/api";
import { say } from "../lib/audio";
import { blobB64, kbBest, type KbLesson } from "../lib/kb";
import { dayKey } from "../lib/progress";
import { store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { Ar, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { VoiceRec } from "./Kitob";
import { A0Grid, LetterCard, useLets } from "./KbA0";

function useTopics() {
  const [T, setT] = useState<string[]>([]);
  useEffect(() => { let on = true; void a0Data().then((d) => on && setT(d.TOPICS)).catch(() => {}); return () => { on = false; }; }, []);
  return T;
}
function useAll() {
  const [all, setAll] = useState<(KbLesson | null)[] | null>(null);
  useEffect(() => { let on = true; void loadAllA0().then((x) => on && setAll(x)); return () => { on = false; }; }, []);
  return all;
}
const shown = (h: Hw, L: KbLesson | null) => { const s = a0HwState(h, L); return !s.grade || h.due >= dayKey(); };

// ===== kirish kartasi (bosh sahifa, mashq, kitoblar) =====
export function A0Entry() {
  const { go } = useNav();
  const LETS = useLets();
  const all = useAll();
  const C = LETS ? a0Counts(LETS) : { g: 0, y: 0 };
  const d = all ? all.filter((L, k) => L && a0Done(k + 1) >= L.steps.length).length : 0;
  return (
    <button type="button" className="a0-entry" onClick={() => go("a0")}>
      <span className="a0-entry-t"><b>A0 · Alifbo yo'li</b><span>{d} / 13 dars · {C.g} / 28 harf o'zlashtirildi</span></span>
      <span className="a0-entry-l" dir="rtl" aria-hidden>{(LETS || []).slice(0, 14).map((r) => <i key={r[0]} className={`s${a0State(r[0])}`}>{r[0]}</i>)}</span>
      <span className="a0-entry-go">Davom etish <ArrowRight size={16} aria-hidden /></span>
    </button>
  );
}

// ===== takrorlash kartasi =====
function RevCard({ all }: { all: (KbLesson | null)[] | null }) {
  const { go } = useNav();
  const R = a0Rev();
  if (!R.length) return null;
  const n = all ? revDue(all).length : R.filter((r) => r.due <= Date.now()).length;
  return (
    <button type="button" className={`rowbtn a0-rev ${n ? "" : "idle"}`} onClick={() => (n ? go("kb", { key: "a0:rev", si: 0, book: "a0", unit: 0 }) : toast("Hozircha takrorlanadigan savol yo'q"))}>
      <RotateCcw size={24} aria-hidden />
      <span><b>Takrorlash</b><small>{n ? `${n} ta savol bugun qaytadi` : `Bugungi takrorlash bajarildi · ${R.length} ta savol navbatda`}</small></span>
      {n > 0 && <em className="t-badge">{n}</em>}
    </button>
  );
}

// ===== A0 uy vazifasi kartasi =====
export function A0HwCard({ h, L, topic }: { h: Hw; L: KbLesson | null; topic: string }) {
  const { go } = useNav();
  const s = a0HwState(h, L);
  const pill = s.grade ? <span className="m-pill done">Baho: {s.grade}/5</span>
    : s.sent ? <span className="m-pill done"><Check size={13} strokeWidth={3} aria-hidden />Topshirildi</span>
    : s.late ? <span className="m-pill late">Muddati o'tdi</span>
    : <span className="m-pill"><Clock size={13} aria-hidden />{fmtDate(h.due)} gacha</span>;
  return (
    <section className={`card a0-hw ${s.sent ? "sent" : ""}`}>
      <div className="a0-hw-top">{pill}<small>Ustoz vazifasi</small></div>
      <b>{h.unit}-dars · {topic}</b>
      {h.title && <small className="muted">«{h.title}»</small>}
      <div className="a0-hw-pr"><span className="lt-bar"><i className="ok" style={{ width: `${s.tot ? (s.done / s.tot) * 100 : 0}%` }} /></span><small>{s.done} / {s.tot} qadam{s.done ? ` · ${s.avg}%` : ""}</small></div>
      {s.grade && s.comment && <p className="a0-hw-c"><MessageCircle size={14} aria-hidden />«{s.comment}»</p>}
      {s.sent ? <button type="button" className="btn ghost wide" onClick={() => go("hwsend", { id: h.id })}>Natijani ko'rish</button>
        : s.full ? <button type="button" className="btn primary wide a0-go" onClick={() => go("hwsend", { id: h.id })}><Send size={18} aria-hidden />Ustozga topshirish</button>
        : <button type="button" className="btn primary wide" onClick={() => go("a0d", { n: h.unit })}>{s.done ? "Davom etish" : "Boshlash"}</button>}
    </section>
  );
}

// ===== a0: bosh sahifa =====
export function A0Home() {
  const { go } = useNav();
  const LETS = useLets();
  const all = useAll();
  const T = useTopics();
  const C = LETS ? a0Counts(LETS) : { g: 0, y: 0 };
  const hws = a0HwAll().filter((h) => shown(h, all?.[h.unit - 1] ?? null)).slice(0, 2);
  return (
    <main className="screen">
      <ScreenHeader title="A0 · Alifbo" ar="الْحُرُوفُ الْهِجَائِيَّةُ" />
      {hws.map((h) => <A0HwCard key={h.id} h={h} L={all?.[h.unit - 1] ?? null} topic={T[h.unit - 1] || ""} />)}
      <section className="card a0-hero">
        <div className="a0-hero-h"><b>Harflar xaritasi</b><span>{C.g} / 28</span></div>
        <A0Grid LETS={LETS} small onPick={(l) => { void say(sound(l)); go("a0map", { l }); }} />
        <div className="a0-leg"><span><i className="s0" />boshlanmagan</span><span><i className="s1" />o'rganilmoqda</span><span><i className="s2" />o'zlashtirildi</span></div>
        <div className="row2">
          <button type="button" className="btn ghost" onClick={() => go("a0map")}><Grid3x3 size={18} aria-hidden />Harflarni ko'rish</button>
          <button type="button" className="btn primary" onClick={() => go("a0grow")}><TrendingUp size={18} aria-hidden />Mening o'sishim</button>
        </div>
      </section>
      <RevCard all={all} />
      <h2 className="t-h">Darslar<small>13 ta</small></h2>
      <ol className="a0-path">
        {Array.from({ length: 13 }, (_, k) => {
          const n = k + 1, L = all?.[k] || null, d = a0Done(n), tot = L?.steps.length || 0;
          const st = !L ? "" : d >= tot ? "done" : d ? "now" : "";
          return (
            <li key={n}>
              <button type="button" className={`a0-p ${st}`} onClick={() => go("a0d", { n })}>
                <span className="a0-p-n">{st === "done" ? <Check size={18} strokeWidth={3} aria-hidden /> : n}</span>
                <span className="a0-p-t"><b>{n}-dars</b><small>{T[k] || ""}</small></span>
                <em>{L ? `${d}/${tot}` : "…"}</em>
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

// ===== a0d: dars sahifasi =====
export function A0Lesson({ n }: { n: number }) {
  const { go } = useNav();
  const [L, setL] = useState<KbLesson | null | "err">(null);
  const all = useAll();
  const T = useTopics();
  useEffect(() => { let on = true; loadA0(n).then((x) => on && setL(x)).catch(() => on && setL("err")); return () => { on = false; }; }, [n]);
  if (L === "err") return <main className="screen"><ScreenHeader title={`${n}-dars`} /><p className="muted pad">Dars yuklanmadi. Internetni tekshiring.</p></main>;
  if (!L) return <main className="screen"><ScreenHeader title={`${n}-dars`} /><p className="muted pad">Yuklanmoqda…</p></main>;
  const B = kbBest(a0Key(n)), tot = L.steps.length;
  const done = L.steps.filter((_, i) => B[i] !== undefined).length;
  const avg = done ? Math.round(L.steps.reduce((a, _, i) => a + (B[i] || 0), 0) / done) : 0;
  let next = L.steps.findIndex((_, i) => B[i] === undefined);
  if (next < 0) next = L.steps.findIndex((_, i) => B[i] < 80);
  const items = L.steps.reduce((a, s) => a + s.items.length, 0);
  const open = (si: number) => go("kb", { key: a0Key(n), si, book: "a0", unit: n });
  const hw = a0HwFor(n);
  return (
    <main className="screen">
      <ScreenHeader title={`${n}-dars`} ar={L.steps[0]?.ar} />
      <section className="a0l-hero">
        <small>{n}-dars · {(L as KbLesson & { book?: string }).book || "Al-Manhaj"}</small>
        <b>{L.uz}</b>
        <div className="a0l-pr"><span className="b"><i style={{ width: `${(done / tot) * 100}%` }} /></span><span>{done} / {tot}</span></div>
        <div className="a0l-st"><div><b>{tot}</b><span>qadam</span></div><div><b>{done ? `${avg}%` : "—"}</b><span>o'rtacha</span></div><div><b>{items}</b><span>mashq</span></div></div>
        <button type="button" className="btn primary wide a0l-cta" onClick={() => open(next < 0 ? 0 : next)}>
          <span><b>{next < 0 ? "Darsni qayta ko'rish" : done ? "Davom etish" : "Boshlash"}</b>{next >= 0 && <small>{L.steps[next].t}</small>}</span><ArrowRight size={20} aria-hidden />
        </button>
      </section>
      {hw && <A0HwCard h={hw} L={L} topic={T[n - 1] || ""} />}
      <RevCard all={all} />
      <h2 className="t-h">Kitob betlari<small>kitobdagi tartibda</small></h2>
      <ol className="a0l-path">
        {L.steps.map((s, i) => {
          const b = B[i];
          const st = b === undefined ? (i === next ? "now" : "") : b >= 80 ? "done" : "weak";
          const [pg, nm] = stepParts(s);
          return (
            <li key={i}>
              <button type="button" className={`a0l-row ${st}`} onClick={() => open(i)}>
                <span className="a0l-dot">{st === "done" ? <Check size={16} strokeWidth={3} aria-hidden /> : st === "weak" ? <AlertCircle size={16} aria-hidden /> : i + 1}</span>
                <span className="a0l-t">{pg && <small>{pg}</small>}<b>{nm}</b>{s.ar && <Ar>{s.ar}</Ar>}<small className="muted">{s.d ? `${s.d} · ` : ""}{s.items.length} ta mashq</small></span>
                <em>{b !== undefined ? `${b}%` : i === next ? <ArrowRight size={18} aria-hidden /> : ""}</em>
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

// ===== a0map: harflar xaritasi =====
let SEL = "ب";
export function A0Map({ l }: { l?: string }) {
  const { go } = useNav();
  const LETS = useLets();
  const [sel, setSel] = useState(() => { if (l) SEL = l; return SEL; });
  const pick = (x: string) => { SEL = x; setSel(x); void say(sound(x)); tg.haptic(); };
  const x = a0L()[sel === "أ" ? "ا" : sel] || { c: 0, w: 0, t: 0 };
  return (
    <main className="screen">
      <ScreenHeader title="Harflar xaritasi" ar="الْحُرُوفُ" />
      <A0Grid LETS={LETS} sel={sel} onPick={pick} />
      <div className="a0-leg"><span><i className="s0" />boshlanmagan</span><span><i className="s1" />o'rganilmoqda</span><span><i className="s2" />o'zlashtirildi</span></div>
      <LetterCard l={sel} LETS={LETS}>
        <p className="a0-card-st">To'g'ri javoblar: {x.c} · xatolar: {x.w} · yozilgan: {x.t ? <Check size={14} strokeWidth={3} aria-label="ha" /> : "—"}</p>
        <button type="button" className="btn primary wide" onClick={() => go("kb", { key: "a0:map", si: 0, book: "a0", unit: 0, l: sel })}><PenLine size={18} aria-hidden />Barmoq bilan yozish</button>
      </LetterCard>
    </main>
  );
}

// ===== a0grow: Mening o'sishim =====
const AX: [string, string][] = [["oqish", "O'qish"], ["yozish", "Yozish"], ["tinglash", "Tinglash"], ["lugat", "Lug'at"]];
function Radar() {
  const K = store.get<Record<string, { c: number; n: number }>>("f.a0.sk", {});
  const val = (k: string) => (K[k]?.n ? K[k].c / K[k].n : 0);
  const c = 80, R = 58;
  const P = (i: number, r: number) => [c + Math.cos(-Math.PI / 2 + (i * Math.PI) / 2) * r, c + Math.sin(-Math.PI / 2 + (i * Math.PI) / 2) * r];
  const poly = (f: (i: number) => number) => AX.map((_, i) => P(i, f(i)).map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <svg className="a0-radar" viewBox="-36 -2 232 166" role="img" aria-label={`Ko'nikmalar: ${AX.map(([k, n]) => `${n} ${Math.round(val(k) * 100)}%`).join(", ")}`}>
      {[1, 0.66, 0.33].map((m) => <polygon key={m} points={poly(() => R * m)} className="grid" />)}
      <polygon points={poly((i) => Math.max(0.06, val(AX[i][0])) * R)} className="val" />
      {AX.map(([k, nm], i) => { const [x, y] = P(i, R + 14); return <text key={k} x={x} y={y + 4} textAnchor="middle">{nm} {Math.round(val(k) * 100)}%</text>; })}
    </svg>
  );
}
function Chart({ H }: { H: { d: string; v: number }[] }) {
  if (!H.length) return <p className="muted pad">Hali o'lchanmagan. Birinchi o'lchovni hozir qiling!</p>;
  const max = Math.max(30, ...H.map((h) => h.v));
  const pts = H.map((h, i) => [H.length === 1 ? 160 : 16 + (i * 288) / (H.length - 1), 120 - 12 - (h.v / max) * 90]);
  return (
    <svg className="a0-chart" viewBox="0 0 320 120" role="img" aria-label={`O'qish tezligi: ${H.map((h) => h.v).join(", ")} bo'g'in/daqiqa`}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} />
      {pts.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={4.5} /><text x={x} y={y - 9} textAnchor="middle">{H[i].v}</text></g>)}
    </svg>
  );
}
function Speed({ onDone }: { onDone: () => void }) {
  const [SP, setSP] = useState<string[]>([]);
  const [st, setSt] = useState<"idle" | "wait" | "run">("idle");
  const t0 = useRef(0);
  const rec = useRef<{ mr: MediaRecorder | null; s: MediaStream | null; ch: Blob[] }>({ mr: null, s: null, ch: [] });
  useEffect(() => { void a0Data().then((d) => setSP(d.SPEED)); }, []);
  const release = () => { try { rec.current.s?.getTracks().forEach((t) => t.stop()); } catch { /* */ } rec.current.s = null; };
  useEffect(() => () => { try { if (rec.current.mr?.state === "recording") rec.current.mr.stop(); } catch { /* */ } release(); }, []);
  const start = async () => {
    setSt("wait");
    // vaqt mikrofon ruxsatidan KEYIN boshlanadi (eski ilovada ruxsat oynasi ham vaqtga qo'shilardi)
    if (typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(s);
        rec.current = { mr, s, ch: [] };
        mr.ondataavailable = (e) => { if (e.data.size) rec.current.ch.push(e.data); };
        mr.start();
      } catch { /* ovozsiz o'lchanadi */ }
    }
    t0.current = Date.now(); setSt("run"); tg.haptic();
  };
  const stop = () => {
    const sec = (Date.now() - t0.current) / 1000;
    const mr = rec.current.mr;
    if (mr && mr.state === "recording") {
      mr.onstop = () => {
        const b = new Blob(rec.current.ch, { type: mr.mimeType || "audio/webm" });
        void voiceGet("first").then((f) => { if (!f) void voicePut("first", b); void voicePut("last", b); });
        release();
      };
      mr.stop();
    } else release();
    rec.current.mr = null;
    setSt("idle");
    if (sec < 3) { toast("Juda tez bo'ldi — bo'g'inlarni ovoz chiqarib, bittalab o'qing"); return; }
    const v = Math.round((SP.length / sec) * 60);
    addSpeed(v); tg.haptic("success");
    toast(`Natija: daqiqasiga ${v} bo'g'in`);
    onDone();
  };
  if (st === "run") {
    return (
      <div className="a0-sp run">
        <Ar className="a0-sp-t">{SP.join(" · ")}</Ar>
        <button type="button" className="btn primary wide" onClick={stop}><Check size={18} aria-hidden />O'qib bo'ldim</button>
      </div>
    );
  }
  return (
    <div className="a0-sp">
      <p>«O'lchashni boshlash»ni bosing, {SP.length || 11} ta bo'g'inni ovoz chiqarib o'qing va «O'qib bo'ldim»ni bosing. Ovozingiz ham yoziladi — keyin solishtirasiz.</p>
      <button type="button" className="btn primary wide" disabled={st === "wait" || !SP.length} onClick={() => void start()}><Play size={18} aria-hidden />{st === "wait" ? "Mikrofon…" : "O'lchashni boshlash"}</button>
    </div>
  );
}
export function A0Grow() {
  const LETS = useLets();
  const [, setN] = useState(0);
  const H = a0Hist(), first = H[0], last = H[H.length - 1];
  const C = LETS ? a0Counts(LETS) : { g: 0, y: 0 };
  const wk = Object.keys(a0L()).length;
  const play = async (k: "first" | "last") => {
    const b = await voiceGet(k);
    if (!b) { toast(k === "first" ? "Hali ovoz yozilmagan — o'lchashni boshlang" : "Hali ovoz yo'q"); return; }
    void new Audio(URL.createObjectURL(b)).play().catch(() => {});
  };
  return (
    <main className="screen">
      <ScreenHeader title="Mening o'sishim" ar="تَقَدُّمِي" />
      <section className="ad-stats a0-gstats">
        <div><b>{C.g}</b><span>harf o'zlashtirildi</span></div>
        <div><b>{last ? last.v : "—"}</b><span>bo'g'in/daqiqa</span></div>
        <div><b>{H.length > 1 ? `${last.v >= first.v ? "+" : ""}${Math.round(((last.v - first.v) / Math.max(1, first.v)) * 100)}%` : "—"}</b><span>tezlik o'sishi</span></div>
      </section>
      <section className="card"><b className="lbl">Ko'nikmalar</b><Radar /></section>
      <section className="card"><b className="lbl">O'qish tezligi</b><Chart H={H} /><Speed onDone={() => setN((x) => x + 1)} /></section>
      <section className="card a0-voices">
        <b className="lbl">Birinchi va oxirgi ovozim</b>
        <small className="muted">Ovozlar faqat shu telefonda saqlanadi.</small>
        <div className="row2">
          <button type="button" className="btn ghost" onClick={() => void play("first")}><Play size={16} aria-hidden />Birinchi ovozim</button>
          <button type="button" className="btn ghost" onClick={() => void play("last")}><Play size={16} aria-hidden />Oxirgi ovozim</button>
        </div>
      </section>
      <section className="card">
        <b className="lbl">Harflar</b>
        <A0Grid LETS={LETS} small onPick={(l) => void say(sound(l))} />
        <small className="muted">{wk} ta harf bilan ishlangan · {C.g} tasi o'zlashtirilgan</small>
      </section>
    </main>
  );
}

// ===== hwsend: A0 vazifasini ustozga topshirish =====
export function HwSend({ id }: { id: number }) {
  const { go } = useNav();
  const T = useTopics();
  const h = store.get<Hw[]>("f.hw", []).find((x) => x.id === id);
  const [L, setL] = useState<KbLesson | null>(null);
  const [again, setAgain] = useState(false);
  const [note, setNote] = useState("");
  const [voice, setVoice] = useState<{ blob: Blob; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setN] = useState(0);
  useEffect(() => { if (h) void loadA0(h.unit).then(setL).catch(() => {}); }, [h?.unit]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!h) return <main className="screen"><ScreenHeader title="Vazifa" /><p className="muted pad">Vazifa topilmadi.</p></main>;
  const s = a0HwState(h, L);
  const B = kbBest(a0Key(h.unit));
  const next = L ? L.steps.findIndex((_, i) => B[i] === undefined) : -1;
  const rd = L?.steps.flatMap((x) => x.items).find((x) => x.type === "read");
  const revN = a0Rev().filter((r) => r.k === a0Key(h.unit)).length;
  const topic = T[h.unit - 1] || "";
  const chips = L && (
    <div className="hws-chips">
      {L.steps.map((st, i) => { const b = B[i]; return <span key={i} className={b === undefined ? "" : b >= 80 ? "ok" : "mid"}><b>{stepParts(st)[0] || "Nazorat"}</b>{b === undefined ? "—" : `${b}%`}</span>; })}
    </div>
  );
  const submit = async () => {
    if (!L || busy) return;
    setBusy(true);
    try {
      const audio = voice ? await blobB64(voice.blob) : null;
      await api("hwSubmit", { id: h.id, title: `${h.unit}-dars · ${topic}`, summary: { done: s.done, tot: s.tot, avg: s.avg, steps: L.steps.map((_, i) => (B[i] === undefined ? null : B[i])) }, note: note.trim().slice(0, 500), audio, mime: voice?.mime || "" });
      const S = store.get<Record<string, number>>("f.hwsent", {}); S[h.id] = Date.now(); store.set("f.hwsent", S);
      store.set("f.hw", store.get<Hw[]>("f.hw", []).map((x) => (x.id === h.id ? { ...x, mine: { ...(x.mine || {}), done: true, progress: { done: s.done, tot: s.tot, avg: s.avg } } } : x)));
      setAgain(false); setVoice(null); setNote(""); setN((x) => x + 1);
      tg.haptic("success"); toast("Ustozingizga yuborildi"); window.scrollTo(0, 0);
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi, qayta urinib ko'ring"); }
    setBusy(false);
  };
  const s2 = a0HwState(store.get<Hw[]>("f.hw", []).find((x) => x.id === id) || h, L);
  return (
    <main className="screen">
      <ScreenHeader title={`${h.unit}-dars · vazifa`} />
      <section className="a0l-hero">
        <small>Ustoz vazifasi · {fmtDate(h.due)} gacha</small>
        <b>{h.unit}-dars · {topic}</b>
        <div className="a0l-pr"><span className="b"><i style={{ width: `${s.tot ? (s.done / s.tot) * 100 : 0}%` }} /></span><span>{s.done} / {s.tot}</span></div>
        <div className="a0l-st two"><div><b>{s.done ? `${s.avg}%` : "—"}</b><span>o'rtacha natija</span></div><div><b>{revN}</b><span>xato takrorlashda</span></div></div>
      </section>
      {s2.sent && !again ? (
        <>
          <section className="card hws-ok">
            <span className="hws-ok-i"><Check size={30} strokeWidth={3} aria-hidden /></span>
            <b>Vazifa ustozga yuborildi</b>
            {s2.grade ? <><small>Ustoz bahosi</small><span className="hws-g">{s2.grade} / 5</span>{s2.comment && <p>«{s2.comment}»</p>}</>
              : <small>Ustozingiz tekshirib, baho qo'yganda Telegram orqali xabar keladi.</small>}
            <button type="button" className="btn ghost wide" onClick={() => setAgain(true)}><RotateCcw size={16} aria-hidden />Qayta topshirish</button>
          </section>
          {chips}
        </>
      ) : (
        <>
          {s2.sent && <p className="pf-note">Qayta topshirsangiz, ustozning oldingi bahosi o'chadi va u qaytadan baholaydi.</p>}
          {L && !s.full && (
            <section className="card hws-warn">
              <b>Yana {s.tot - s.done} ta qadam qoldi</b>
              <small>To'liq bajarsangiz, ustozingiz aniqroq baho beradi.</small>
              {next >= 0 && <button type="button" className="btn ghost wide" onClick={() => go("kb", { key: a0Key(h.unit), si: next, book: "a0", unit: h.unit })}>Davom etish: {L.steps[next].t}</button>}
            </section>
          )}
          <h2 className="t-h">Natijalaringiz<small>har bir bet</small></h2>
          {chips || <p className="muted pad">Yuklanmoqda…</p>}
          <section className="card hws-voice">
            <b className="lbl"><Mic size={16} aria-hidden /> Ovozli topshiriq · ixtiyoriy</b>
            <small className="muted">Quyidagi matnni ovoz chiqarib o'qing. Ustozingiz talaffuzingizni eshitib, maslahat beradi.</small>
            {rd && <div className="hws-rd">{((rd.lines || []) as (string | string[])[]).map((x, k) => <Ar key={k}>{Array.isArray(x) ? x[1] : x}</Ar>)}</div>}
            <VoiceRec value={voice} onChange={setVoice} disabled={busy} label="O'qib, yozib oling" />
          </section>
          <section className="card form">
            <label>Ustozga xabar (ixtiyoriy)<textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: 23-bet qiyin bo'ldi" /></label>
            <small className="muted"><Lock size={12} aria-hidden /> Natija, ovoz va xabar faqat ustozingizga boradi.</small>
          </section>
          <button type="button" className="btn primary wide" disabled={busy || !L} onClick={() => void submit()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : "Ustozga yuborish"}</button>
        </>
      )}
    </main>
  );
}

