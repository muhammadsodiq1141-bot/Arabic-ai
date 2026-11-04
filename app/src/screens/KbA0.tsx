// A0 mashq turlari (A0-SPEC §2): hear — eshitib tanlash, trace — barmoq bilan yozish, ladder — o'qish zinasi,
// letter — harf bilan tanishuv, alphabet — 28 harf. Trace tekshiruvi eski ilovadagi algoritm bilan aynan bir xil
// (600×600, glif 330px markazi 300,320; foydalanuvchi chizig'i 40px; ruxsat hududi glif + 56px kontur; qamrov ≥55%, aniqlik ≥70%).
import { useEffect, useRef, useState, type PointerEvent as RPE, type ReactNode } from "react";
import { Check, Eraser, PenLine, Volume2, X } from "lucide-react";
import { a0Data, a0State, forms, FORM_UZ, FORM_UZ2, info, sound, syl, type Let } from "../lib/a0";
import { say } from "../lib/audio";
import type { Prepared } from "../lib/kb";
import { Ar } from "../ui/kit";

type P = { it: Prepared & { l?: string; f?: number; ltr?: string; rows?: string[][] }; done: boolean; ans: boolean | null; mark: (v: boolean) => void };

export function useLets() {
  const [L, setL] = useState<Let[] | null>(null);
  useEffect(() => { let on = true; void a0Data().then((d) => on && setL(d.LET)).catch(() => {}); return () => { on = false; }; }, []);
  return L;
}

function BigSay({ t }: { t: string }) {
  return <button type="button" className="say big" aria-label="Tinglash" onClick={() => void say(t)}><Volume2 size={30} aria-hidden /></button>;
}

// ===== hear: eshitib, to'g'ri bo'g'in/harfni tanlash =====
export function Hear({ it, done, mark }: P) {
  const [pick, setPick] = useState<string | null>(null);
  const t = it.say || "";
  return (
    <>
      <div className="kb-q"><BigSay t={t} />{done && <Ar className="kb-qa a0-big">{t}</Ar>}</div>
      <div className="r-opts a0-hear">
        {(it.opts || []).map((o) => {
          const s = !done ? "" : o === it.ok ? "ok" : o === pick ? "no" : "dim";
          return (
            <button key={o} type="button" className={`opt opt-r ${s}`} disabled={done} onClick={() => { setPick(o); mark(o === it.ok); void say(t); }}>
              <Ar className="opt-ar">{o}</Ar>
              {s === "ok" && <Check size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
              {s === "no" && <X size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ===== ladder: bo'g'inlar zinasi — bosib tinglash =====
export function Ladder({ it }: P) {
  return (
    <div className="a0-lad">
      {(it.rows || []).map((r, k) => (
        <div key={k} className="a0-lad-r" dir="rtl">
          {r.map((c, j) => <button key={j} type="button" className="a0-lad-c" onClick={() => void say(c)}><Ar>{c}</Ar></button>)}
        </div>
      ))}
    </div>
  );
}

// ===== letter: harf kartasi =====
export function LetterCard({ l, LETS, children }: { l: string; LETS: Let[] | null; children?: ReactNode }) {
  const I = LETS ? info(LETS, l) : null;
  const F = forms(l);
  return (
    <div className="a0-card">
      <Ar className="a0-card-l">{l}</Ar>
      {I && <p className="a0-card-n"><Ar>{I[2]}</Ar> · {I[1]}</p>}
      <div className="a0-forms" dir="rtl">
        {F.map((f, k) => <div key={k}><Ar>{f}</Ar><small>{FORM_UZ[k]}</small></div>)}
      </div>
      <div className="a0-syl" dir="rtl">
        {syl(l).map((s) => <button key={s} type="button" onClick={() => void say(s)} aria-label={`${s} — tinglash`}><Ar>{s}</Ar></button>)}
      </div>
      {children}
    </div>
  );
}
export function LetterItem({ it }: P) {
  const LETS = useLets();
  return <LetterCard l={it.l || "ب"} LETS={LETS} />;
}

// ===== alphabet / harflar to'ri =====
export function A0Grid({ LETS, small, sel, onPick }: { LETS: Let[] | null; small?: boolean; sel?: string; onPick: (l: string) => void }) {
  if (!LETS) return <p className="muted pad">Yuklanmoqda…</p>;
  return (
    <div className={`a0-grid ${small ? "sm" : ""}`} dir="rtl">
      {LETS.map((r) => (
        <button key={r[0]} type="button" className={`a0-c s${a0State(r[0])} ${sel === r[0] ? "sel" : ""}`} aria-label={`${r[1]} harfi`} onClick={() => onPick(r[0])}>
          <Ar>{r[0]}</Ar>
        </button>
      ))}
    </div>
  );
}
export function Alphabet() {
  const LETS = useLets();
  return (
    <>
      <A0Grid LETS={LETS} onPick={(l) => void say(sound(l))} />
      <p className="kb-uz">28 harf. Har birini bosib, tovushini eshiting.</p>
    </>
  );
}

// ===== trace: barmoq bilan yozish =====
const W = 600;
const FONT = (px: number) => `500 ${px}px "Noto Naskh Arabic", "Amiri", serif`;
function glyph(ctx: CanvasRenderingContext2D, g: string, mode: "guide" | "mask" | "wide") {
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "rtl"; ctx.font = FONT(330);
  if (mode === "guide") {
    ctx.fillStyle = "rgba(122,79,0,.16)"; ctx.fillText(g, 300, 320);
    ctx.setLineDash([10, 10]); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(122,79,0,.45)"; ctx.strokeText(g, 300, 320); ctx.setLineDash([]);
  } else if (mode === "mask") {
    ctx.fillStyle = "#000"; ctx.fillText(g, 300, 320);
  } else {
    ctx.fillStyle = "#000"; ctx.strokeStyle = "#000"; ctx.lineWidth = 56; ctx.lineJoin = "round";
    ctx.strokeText(g, 300, 320); ctx.fillText(g, 300, 320);
  }
}
function check(g: string, user: HTMLCanvasElement) {
  const m = document.createElement("canvas"), w = document.createElement("canvas");
  m.width = m.height = w.width = w.height = W;
  glyph(m.getContext("2d")!, g, "mask"); glyph(w.getContext("2d")!, g, "wide");
  const M = m.getContext("2d")!.getImageData(0, 0, W, W).data, Wd = w.getContext("2d")!.getImageData(0, 0, W, W).data, U = user.getContext("2d")!.getImageData(0, 0, W, W).data;
  let gn = 0, gc = 0, us = 0, ui = 0;
  for (let i = 3; i < M.length; i += 16) {
    const inG = M[i] > 128, inU = U[i] > 40;
    if (inG) { gn++; if (inU) gc++; }
    if (inU) { us++; if (Wd[i] > 40) ui++; }
  }
  const cov = gn ? gc / gn : 0, pre = us ? ui / us : 0;
  return { ok: cov >= 0.55 && pre >= 0.7, cov, pre };
}

export function Trace({ it, done, ans, mark }: P) {
  const l = it.l || "ب", f = it.f || 0;
  const g = forms(l)[f];
  const LETS = useLets();
  const cv = useRef<HTMLCanvasElement>(null);
  const user = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({ drawing: false, last: [0, 0] as [number, number] });
  const [n, setN] = useState(0);
  const [ready, setReady] = useState(false);

  const paint = () => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, W);
    glyph(ctx, g, "guide");
    if (user.current) ctx.drawImage(user.current, 0, 0);
  };
  useEffect(() => {
    const u = document.createElement("canvas"); u.width = u.height = W; user.current = u;
    let on = true;
    // shrift yuklanmaguncha chizilmaydi — aks holda yo'riq va tekshiruv har xil shriftda bo'lib qoladi
    const go = () => { if (on) { setReady(true); paint(); } };
    try { void document.fonts.load(FONT(330), g).then(go, go); } catch { go(); }
    return () => { on = false; };
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: RPE): [number, number] => {
    const r = cv.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * W) / r.height];
  };
  const pen = () => {
    const u = user.current!.getContext("2d")!;
    u.lineCap = "round"; u.lineJoin = "round"; u.lineWidth = 40;
    u.strokeStyle = u.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7A4F00";
    return u;
  };
  const down = (e: RPE) => {
    if (done || !ready) return;
    e.preventDefault();
    try { cv.current!.setPointerCapture(e.pointerId); } catch { /* */ }
    st.current.drawing = true; st.current.last = pos(e);
    const u = pen(); u.beginPath(); u.arc(st.current.last[0], st.current.last[1], 20, 0, Math.PI * 2); u.fill();
    setN((x) => x + 1); paint();
  };
  const move = (e: RPE) => {
    if (!st.current.drawing) return;
    const p = pos(e), u = pen();
    u.beginPath(); u.moveTo(st.current.last[0], st.current.last[1]); u.lineTo(p[0], p[1]); u.stroke();
    st.current.last = p; paint();
  };
  const up = () => { st.current.drawing = false; };
  const clear = () => { user.current?.getContext("2d")!.clearRect(0, 0, W, W); setN(0); paint(); };
  const verify = () => { if (!user.current || !n) return; mark(check(g, user.current).ok); };

  return (
    <>
      <p className="kb-uz a0-tr-h">«{LETS ? info(LETS, l)[1] : l}» — {FORM_UZ2[f]} <Ar className="a0-tr-g">{g}</Ar></p>
      <div className={`a0-tr ${done ? (ans ? "ok" : "bad") : ""}`}>
        <canvas ref={cv} width={W} height={W} aria-label={`${g} harfini barmoq bilan chizing`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
        {!ready && <span className="a0-tr-w">Yuklanmoqda…</span>}
      </div>
      {done ? (
        <p className="kb-uz">{ans ? "Ajoyib! Harf to'g'ri chizildi." : "Harf chizig'idan chiqib ketdi yoki to'liq emas. Keyingisida yana urinasiz."}</p>
      ) : (
        <div className="row2 a0-tr-act">
          <button type="button" className="btn ghost" disabled={!n} onClick={clear}><Eraser size={18} aria-hidden />Tozalash</button>
          <button type="button" className="btn primary" disabled={!n} onClick={verify}><PenLine size={18} aria-hidden />Tekshirish</button>
        </div>
      )}
    </>
  );
}
