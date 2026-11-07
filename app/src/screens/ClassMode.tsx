// 17-partiya (U7; Nation 15, 39–40-betlar; TMLT 9-bob — sinfda muloqot): ustozning sinf rejimi — darsda telefon yoki proyektorda.
// 1) 4/3/2 taymeri: bitta mavzuni uch marta, har gal yangi sherikka va qisqaroq vaqtda aytish (A0–A1 uchun 2/1.5/1 daqiqa).
// 2) Rol kartalari: vahda dialogidan (kitob matni) — har rolning gaplari o'zbekcha, arabchasi yashirin; juftlikda aytiladi.
// 3) Ustoz diktanti: kod (A1-3-27) — o'quvchilar Mashq → Diktant'da shu kodni kiritadi; gaplar proyektorda yashirin turadi.
// Server o'zgarmaydi; matnlar kitobdagidek (lib/texts.ts).
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Pause, Play, RefreshCw, RotateCcw, SkipForward, Timer, Users, Volume2 } from "lucide-react";
import { preloadKitob, say } from "../lib/audio";
import { kbKeyOf } from "../lib/kb";
import { store } from "../lib/store";
import { dictCode, dictPicks, unitTexts, type Line, type UnitTexts } from "../lib/texts";
import { tg } from "../lib/tg";
import { useSession } from "../state/session";
import { Ar, ScreenHeader } from "../ui/kit";
import { useRBook } from "./Rules";
import { bookOfLevel } from "./Unit";

type Tool = "t432" | "roles" | "dict";
const BOOKS: [string, string][] = [["a1", "Manhaj A1"], ["md1", "Madina 1"], ["md2", "Madina 2"]];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

function beep() {
  try {
    const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
    const Ctx = C.AudioContext || C.webkitAudioContext;
    if (!Ctx) return;
    const c = new Ctx(), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.25, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
    o.start(); o.stop(c.currentTime + 0.6); setTimeout(() => { void c.close(); }, 900);
  } catch { /* ovozsiz */ }
}

export function ClassModeScreen() {
  const { me } = useSession();
  const [tool, setTool] = useState<Tool>(() => store.get<Tool>("f.cm.tool", "t432"));
  const [bookId, setBook] = useState(() => store.get("f.cm.book", kbKeyOf(store.get("a1.book", bookOfLevel(me?.level)), 1) ? store.get("a1.book", "a1") : "a1"));
  const book = useRBook(bookId);
  const [unitN, setUnit] = useState(() => store.get<number>("f.cm.unit", 1));
  const [tx, setTx] = useState<UnitTexts | null | undefined>(undefined);
  useEffect(() => { let a = true; setTx(undefined); unitTexts(bookId, unitN).then((t) => a && setTx(t)); return () => { a = false; }; }, [bookId, unitN]);
  const pickTool = (t: Tool) => { setTool(t); store.set("f.cm.tool", t); tg.haptic(); };
  const u = book?.units.find((x) => x.n === unitN);
  return (
    <main className="screen cm">
      <ScreenHeader title="Sinf rejimi" ar="وَضْعُ الْفَصْلِ" />
      <div className="cm-pick">
        <select value={bookId} aria-label="Kitob" onChange={(e) => { setBook(e.target.value); store.set("f.cm.book", e.target.value); setUnit(1); store.set("f.cm.unit", 1); }}>
          {BOOKS.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
        </select>
        <select value={unitN} aria-label="Vahda" onChange={(e) => { setUnit(Number(e.target.value)); store.set("f.cm.unit", Number(e.target.value)); }}>
          {book?.units.filter((x) => kbKeyOf(bookId, x.n)).map((x) => <option key={x.n} value={x.n}>{x.n}-vahda · {x.uz}</option>)}
        </select>
      </div>
      <div className="seg cm-tools" role="tablist" aria-label="Vosita">
        {([["t432", "4/3/2"], ["roles", "Rol kartalari"], ["dict", "Diktant"]] as [Tool, string][]).map(([t, l]) => (
          <button key={t} type="button" role="tab" aria-selected={tool === t} className={tool === t ? "on" : ""} onClick={() => pickTool(t)}>{l}</button>
        ))}
      </div>
      {!book || tx === undefined ? <p className="muted pad">Yuklanmoqda…</p>
        : tool === "t432" ? <T432 key={`${bookId}:${unitN}`} topic={u?.uz || ""} topicAr={u?.ar} words={(u?.words || []).slice(0, 8)} low={!me?.level || ["A0", "A1"].includes(me.level)} />
        : tool === "roles" ? <Roles key={`${bookId}:${unitN}`} tx={tx} dir={`${bookId}/${unitN}`} />
        : <TDict key={`${bookId}:${unitN}`} tx={tx} bookId={bookId} unitN={unitN} />}
    </main>
  );
}

// ===== 4/3/2 =====
function T432({ topic, topicAr, words, low }: { topic: string; topicAr?: string; words: string[][]; low: boolean }) {
  const [short, setShort] = useState(low);
  const LIM = short ? [120, 90, 60] : [240, 180, 120];
  const [r, setR] = useState(0);
  const [left, setLeft] = useState(LIM[0]);
  const [run, setRun] = useState(false);
  const [phase, setPhase] = useState<"ready" | "run" | "swap" | "done">("ready");
  const end = useRef(0);
  useEffect(() => {
    if (!run) return;
    const h = window.setInterval(() => {
      const s = Math.ceil((end.current - Date.now()) / 1000);
      setLeft(Math.max(0, s));
      if (s <= 0) { setRun(false); beep(); tg.haptic("success"); setPhase(r + 1 < 3 ? "swap" : "done"); }
    }, 250);
    return () => clearInterval(h);
  }, [run, r]);
  const start = () => { end.current = Date.now() + left * 1000; setRun(true); setPhase("run"); tg.haptic(); };
  const pause = () => { setRun(false); };
  const nextR = () => { const n = r + 1; setR(n); setLeft(LIM[n]); setPhase("ready"); };
  const reset = (s = short) => { setRun(false); setR(0); setLeft((s ? [120, 90, 60] : [240, 180, 120])[0]); setPhase("ready"); };
  return (
    <section className="cm-432">
      <div className="card cm-topic">
        <span className="spk-k">Mavzu</span>
        <b>{topic}</b>{topicAr && <Ar className="cm-tar">{topicAr}</Ar>}
        <div className="cm-words">{words.map((w) => <span key={w[0]}><Ar>{w[0]}</Ar><small>{w[1]}</small></span>)}</div>
      </div>
      <ol className="cm-rounds" aria-label="Raundlar">
        {LIM.map((s, k) => <li key={k} className={k < r || phase === "done" ? "dn" : k === r ? "on" : ""}>{k + 1}-sherik · {mmss(s)}</li>)}
      </ol>
      <div className={`cm-clock ${run ? "run" : ""} ${left <= 10 && run ? "end" : ""}`} aria-live="polite">{phase === "done" ? "Tamom" : mmss(left)}</div>
      <p className="cm-say">
        {phase === "swap" ? <>Juftingizni almashtiring. Xuddi shu mavzuni yangi sherigingizga <b>{mmss(LIM[r + 1])}</b> ichida ayting.</>
          : phase === "done" ? "Uch raund tugadi. Kim uchinchi marta ravonroq gapirdi?"
          : r === 0 ? "Juftlikda: biri gapiradi, sherigi tinglaydi va savol beradi. Keyin rollar almashadi." : "Xuddi shu mavzu — endi qisqaroq vaqtda, ravonroq."}
      </p>
      <div className="cm-ctl">
        {phase === "swap" ? <button type="button" className="btn primary" onClick={nextR}><SkipForward size={18} aria-hidden />{r + 2}-raund</button>
          : phase === "done" ? <button type="button" className="btn primary" onClick={() => reset()}><RotateCcw size={18} aria-hidden />Qaytadan</button>
          : run ? <button type="button" className="btn dark" onClick={pause}><Pause size={18} aria-hidden />Pauza</button>
          : <button type="button" className="btn primary" onClick={start}><Play size={18} aria-hidden />{left < LIM[r] ? "Davom etish" : "Boshlash"}</button>}
        {phase !== "done" && <button type="button" className="btn ghost" onClick={() => reset()}><RotateCcw size={18} aria-hidden />Boshidan</button>}
      </div>
      <label className="sh-switch">
        <span><b>Qisqa: 2 · 1.5 · 1 daqiqa</b><small>A0–A1 guruhlari uchun. To'liq usul: 4 · 3 · 2 daqiqa</small></span>
        <input type="checkbox" checked={short} onChange={(e) => { setShort(e.target.checked); reset(e.target.checked); }} />
      </label>
    </section>
  );
}

// ===== rol kartalari =====
function Roles({ tx, dir }: { tx: UnitTexts | null; dir: string }) {
  const D = tx?.dialogs || [];
  const [di, setDi] = useState(0);
  const [showAr, setShowAr] = useState(false);
  const d = D[Math.min(di, D.length - 1)];
  useEffect(() => { if (d) void preloadKitob(dir, d.lines.map((l) => l.ar)); }, [d, dir]);
  if (!d) return <p className="muted pad">Bu vahdada dialog topilmadi.</p>;
  const hasUz = d.lines.some((l) => l.uz);
  return (
    <section className="cm-roles">
      {D.length > 1 && (
        <div className="chips" role="tablist" aria-label="Dialog">
          {D.map((x, k) => <button key={k} type="button" role="tab" aria-selected={k === di} className={k === di ? "on" : ""} onClick={() => setDi(k)}>{x.title || `${k + 1}-dialog`}</button>)}
        </div>
      )}
      <p className="cm-say"><Users size={18} aria-hidden />{hasUz ? "Juftlikda: har kim o'z kartasidagi gaplarni o'zbekchadan arabchaga aytadi. Keyin kartalarni almashtiring." : "Juftlikda: har kim o'z rolini o'qiydi, keyin kitobga qaramasdan aytib ko'radi. Keyin rollarni almashtiring."}</p>
      <div className="cm-cards">
        {d.roles.map((r, ri) => (
          <article key={r} className="card cm-card">
            <header><span className="cm-rl">{String.fromCharCode(65 + ri)}</span><Ar className="cm-rn">{r}</Ar></header>
            <ol>
              {d.lines.map((l, k) => (l.sp === r ? (
                <li key={k}>
                  <span className="cm-n">{k + 1}</span>
                  <span className="cm-ln">
                    {hasUz && l.uz ? <span className="cm-uz">{l.uz}</span> : null}
                    {(showAr || !hasUz || !l.uz) && <Ar className="cm-ar">{l.ar}</Ar>}
                  </span>
                  <button type="button" className="cm-pl" aria-label="Tinglash" onClick={() => void say(l.ar)}><Volume2 size={16} aria-hidden /></button>
                </li>
              ) : null))}
            </ol>
          </article>
        ))}
      </div>
      {hasUz && <button type="button" className="btn ghost wide" onClick={() => setShowAr(!showAr)}>{showAr ? <><EyeOff size={18} aria-hidden />Arabchasini yashirish</> : <><Eye size={18} aria-hidden />Arabchasini ko'rsatish (tekshirish)</>}</button>}
    </section>
  );
}

// ===== ustoz diktanti =====
function TDict({ tx, bookId, unitN }: { tx: UnitTexts | null; bookId: string; unitN: number }) {
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 999));
  const [open, setOpen] = useState<Set<number>>(new Set());
  const lines: Line[] = tx ? dictPicks(tx.lines, seed) : [];
  useEffect(() => { if (lines.length) void preloadKitob(`${bookId}/${unitN}`, lines.map((l) => l.ar)); }, [seed, tx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lines.length) return <p className="muted pad">Bu vahdada diktant uchun gap topilmadi.</p>;
  const code = dictCode(bookId, unitN, seed);
  const flip = (i: number) => setOpen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  return (
    <section className="cm-dict">
      <div className="card cm-code">
        <span className="spk-k">Diktant kodi</span>
        <b className="cm-codev">{code}</b>
        <small>O'quvchilar: Mashq → Diktant → «Ustoz diktanti» → shu kod. Siz o'qiysiz, ular yozadi va natijani darhol ko'radi.</small>
        <button type="button" className="kb-link" onClick={() => { setSeed(1 + Math.floor(Math.random() * 999)); setOpen(new Set()); }}><RefreshCw size={15} aria-hidden />Boshqa 5 gap (yangi kod)</button>
      </div>
      <ol className="cm-dl">
        {lines.map((l, i) => (
          <li key={i} className="card">
            <span className="cm-n">{i + 1}</span>
            <span className="cm-ln">{open.has(i) ? <><Ar className="cm-ar">{l.ar}</Ar>{l.uz && <small className="cm-uz">{l.uz}</small>}</> : <span className="muted">Gap yashirin — proyektorda ko'rinmaydi</span>}</span>
            <button type="button" className="cm-pl" aria-label={open.has(i) ? "Yashirish" : "Ko'rsatish"} onClick={() => flip(i)}>{open.has(i) ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}</button>
            <button type="button" className="cm-pl" aria-label="Kitob ovozini qo'yish" onClick={() => void say(l.ar)}><Volume2 size={16} aria-hidden /></button>
          </li>
        ))}
      </ol>
      <button type="button" className="btn ghost wide" onClick={() => setOpen(open.size === lines.length ? new Set() : new Set(lines.map((_, i) => i)))}>
        {open.size === lines.length ? <><EyeOff size={18} aria-hidden />Hammasini yashirish</> : <><Eye size={18} aria-hidden />Hammasini ko'rsatish (tekshirish uchun)</>}
      </button>
      <p className="cm-say"><Timer size={16} aria-hidden />Har gapni 2 marta, sekin o'qing. O'quvchilar harakatsiz yozishi mumkin — tekshiruv harakatga qaramaydi.</p>
    </section>
  );
}
