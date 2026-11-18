// Lug'at roundi (10 so'z): 1) tanishish → 2) tarjimani topish → 3) talaffuz → 4) rasmni topish.
// Xato javobda to'g'risi ko'rsatiladi va so'z round oxirida qayta so'raladi. Rasmi yo'q so'zda 4-bosqich "eshitib topish".
// Round tugaganda so'zlar eski ilova formatida "yodlangan" deb belgilanadi, so'z testi natijasi (aniqlik %) va XP yoziladi.
// 12-partiya (A3): round so'zlari takrorlash jadvaliga tushadi (shu kuni 3 soatdan keyin, keyin 1–3–7 kun); tarjima bosqichida
// variantlar darhol ko'rinmaydi — avval eslab ko'rish; talaffuz bosqichini «Hozir gapira olmayman» bilan o'tkazish mumkin (A4).
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Check, HelpCircle, Mic, MicOff, Play, RotateCcw, Square, Star, Volume2, X } from "lucide-react";
import { say } from "../lib/audio";
import { aiSay, isFail } from "../lib/ai";
import { savedHas, toggleSaved } from "../lib/saved";
import { learnLater } from "../lib/practice";
import { gain, markKnown, setTest } from "../lib/store";
import { tg } from "../lib/tg";
import { posLabel, shuffle, type Word } from "../lib/words";
import { isNightHour } from "../state/theme";
import { Ar } from "../ui/kit";
import { CountUp } from "../ui/CountUp";
import { Scale } from "../ui/Scale";
import { GainNote } from "../ui/GainNote";

// 18.11.2026 (foydalanuvchi): 4-bosqich «Rasm / eshitib topish» o'rniga pufakcha o'yini — round so'zlari + oldingi vahdalar so'zlari aralash
type Stage = "learn" | "tr" | "pr" | "bub" | "done";
const STAGES: { id: Stage; title: string; hint: string }[] = [
  { id: "learn", title: "Tanishish", hint: "So'zlarni diqqat bilan o'rganing" },
  { id: "tr", title: "Tarjima", hint: "To'g'ri tarjimani tanlang" },
  { id: "pr", title: "Talaffuz", hint: "So'zni ovoz chiqarib ayting — ilova tekshiradi" },
  { id: "bub", title: "Pufakchalar", hint: "O'zbekcha so'zning arabchasini ushlang" },
];

export function Round({ bookId, unit, n, words, pool, review = [], onExit, onNextRound }: { bookId: string; unit: number; n: number; words: Word[]; pool: Word[]; review?: Word[]; onExit: (done: boolean) => void; onNextRound?: () => void }) {
  const [stage, setStage] = useState<Stage>("learn");
  const [queue, setQueue] = useState<Word[]>(words);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState(0);
  const [, force] = useState(0);
  const cur = queue[pos];
  const si = STAGES.findIndex((s) => s.id === stage);
  const base = words.length; // xato bo'lsa navbat uzayadi, lekin hisoblagich so'zlar soni bo'yicha qoladi

  const startStage = (s: Stage) => {
    setStage(s); setPicked(null); setPos(0);
    setQueue(s === "learn" || s === "pr" ? words : shuffle(words));
  };
  const next = () => {
    setPicked(null);
    if (pos + 1 < queue.length) { setPos(pos + 1); return; }
    if (stage === "learn") startStage("tr");
    else if (stage === "tr") startStage("pr");
    else if (stage === "pr") startStage("bub");
    else finish();
  };
  const [bub, setBub] = useState<[number, number]>([0, 0]); // pufakcha: ushlangan / jami
  const requeue = () => setQueue((q) => [...q, q[pos]]);

  const finish = () => {
    let fresh = 0;
    for (const w of words) if (markKnown(bookId, unit, w.ar)) fresh++;
    learnLater(bookId, words.map((w) => w.ar));
    // so'z testi natijasi (eski ilova {BK}tests formatida, eng yaxshisi saqlanadi): har so'z 2 marta tekshiriladi — tarjima va pufakcha
    const asked = 2 * words.length;
    setTest(bookId, unit, Math.max(0, Math.round(((asked - mistakes) / asked) * 100)));
    gain("fc", fresh + 5);
    setEarned(fresh + 5);
    tg.haptic("success");
    setStage("done");
  };

  // kechasi (21:00–06:00) o'z-o'zidan ovoz chalinmaydi — uyda uxlayotganlar bo'lishi mumkin; karnay tugmasi ishlaydi
  useEffect(() => { if (cur && !isNightHour() && (stage === "learn" || stage === "pr")) void say(cur.ar); }, [cur, stage]);

  if (stage === "done") {
    return (
      <main className="round">
        {/* yakun lahzasi: tarozi muvozanatga keladi, olingan yulduzcha sanab ko'rsatiladi, o'rganilgan so'zlar va keyingi round */}
        <div className="r-done">
          <Scale size={156} />
          <h1>{n}-round tugadi</h1>
          <p className="r-earn"><Star size={22} aria-hidden /><CountUp to={earned} />&nbsp;yulduzcha</p>
          <GainNote />
          <p>{mistakes === 0 ? "Xatosiz o'tdingiz — zo'r natija!" : mistakes <= 3 ? `${mistakes} ta xatoni tuzatdingiz — yaxshi natija.` : `${mistakes} ta xato ustida ishladingiz — so'zlar endi mustahkamroq.`}</p>
          <ul className="r-learned" aria-label="O'rganilgan so'zlar">{words.map((w) => <li key={w.ar}><Ar>{w.ar}</Ar></li>)}</ul>
          {onNextRound
            ? <><button type="button" className="btn primary wide" onClick={onNextRound}>{n + 1}-roundni boshlash</button>
                <button type="button" className="btn ghost wide" onClick={() => onExit(true)}>Vahdaga qaytish</button></>
            : <button type="button" className="btn primary wide" onClick={() => onExit(true)}>Vahdaga qaytish</button>}
        </div>
      </main>
    );
  }

  return (
    <main className="round">
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={() => onExit(false)}><X size={22} aria-hidden />Chiqish</button>
        <b>{n}-round · {STAGES[si].title}</b>
        {/* hisoblagich so'zlar soni bo'yicha turadi; xato so'z qayta so'ralganda "takror" belgisi chiqadi */}
        <span className="r-count">{stage === "bub" ? `${bub[0]} / ${bub[1]}` : pos >= base ? <span className="r-tag">takror</span> : `${pos + 1} / ${base}`}</span>
      </header>
      <div className="r-steps" aria-hidden>{STAGES.map((s, i) => <i key={s.id} className={i < si ? "ok" : i === si ? "now" : ""} />)}</div>
      <div className="r-bar" role="progressbar" aria-label={`${STAGES[si].title} bosqichi`} aria-valuemin={0} aria-valuemax={base} aria-valuenow={Math.min(pos, base)}>
        <i style={{ width: `${(Math.min(pos + (picked ? 1 : 0), base) / base) * 100}%` }} />
      </div>
      <p className="r-hint">{STAGES[si].hint}</p>

      {stage === "learn" && <Learn w={cur} onNext={next} onSave={() => { toggleSaved(cur.ar, cur.uz); tg.haptic("light"); force((x) => x + 1); }} />}
      {stage === "tr" && <Choice key={`tr${pos}${cur.ar}`} w={cur} pool={pool} mode="tr" picked={picked}
        onPick={(ok, v) => { setPicked(v); if (ok) { tg.haptic("light"); setTimeout(next, 650); } else { tg.haptic("error"); setMistakes((m) => m + 1); requeue(); } }} onNext={next} />}
      {stage === "pr" && <Pronounce key={`pr${pos}${cur.ar}`} w={cur} onOk={next} onRetry={() => { setQueue((q) => [...q, q[pos]]); setPicked(null); setPos(pos + 1); }}
        onSkipAll={() => { tg.haptic("light"); startStage("bub"); }} />}
      {stage === "bub" && <RoundBubble words={words} review={review} pool={pool} onProg={(a, b) => setBub([a, b])} onMiss={() => setMistakes((m) => m + 1)} onDone={finish} />}
    </main>
  );
}

function WordHead({ w, hideImg }: { w: Word; hideImg?: boolean }) {
  return (
    <>
      <div className="r-img">{hideImg ? <HelpCircle size={72} className="r-q" aria-hidden /> : w.img ? <img src={w.img} alt="" /> : <Ar className="r-big">{w.ar}</Ar>}</div>
      <div className="r-word">
        {/* rasmsiz so'zda arabcha so'z yuqoridagi katta kartada turadi — ikki marta yozilmaydi */}
        <div>{(hideImg || w.img) && <Ar className="r-ar">{w.ar}</Ar>}{w.card?.t && <span className="r-pos">{posLabel(w.card.t)}</span>}</div>
        <button type="button" className="say" aria-label="Tinglash" onClick={() => void say(w.ar)}><Volume2 size={22} aria-hidden /></button>
      </div>
    </>
  );
}

function Learn({ w, onNext, onSave }: { w: Word; onNext: () => void; onSave: () => void }) {
  const ex = w.card?.ex?.[0];
  const saved = savedHas(w.ar);
  return (
    <>
      <WordHead w={w} />
      <section className="r-card">
        <div className="r-tr"><b>{w.uz}</b>
          <button type="button" className="mark" aria-pressed={saved} aria-label="Saqlanganlarga qo'shish" onClick={onSave}>{saved ? <BookmarkCheck size={22} aria-hidden /> : <Bookmark size={22} aria-hidden />}</button>
        </div>
        {w.hint && <small className="muted">Talaffuz: {w.hint}</small>}
        {ex && (
          <div className="r-ex">
            <span className="lbl">Misol</span>
            <Ar className="r-exar">{ex[0]}</Ar>
            <p>{ex[1]}</p>
          </div>
        )}
      </section>
      <button type="button" className="btn dark wide r-next" onClick={onNext}>Keyingisi</button>
    </>
  );
}

function Choice({ w, pool, mode, picked, onPick, onNext }: { w: Word; pool: Word[]; mode: "tr" | "pic" | "ear"; picked: string | null; onPick: (ok: boolean, v: string) => void; onNext: () => void }) {
  const opts = useMemo(() => {
    const others = shuffle(pool.filter((x) => x.ar !== w.ar && (mode !== "pic" || x.img) && (mode !== "tr" || x.uz !== w.uz)));
    const val = (x: Word) => (mode === "tr" ? x.uz : mode === "pic" ? x.img! : x.ar);
    const seen = new Set([val(w)]);
    const pick: Word[] = [];
    for (const o of others) { if (pick.length >= 3) break; if (!seen.has(val(o))) { seen.add(val(o)); pick.push(o); } }
    return shuffle([w, ...pick]).map((x) => ({ v: val(x), ok: x.ar === w.ar, w: x }));
  }, [w, pool, mode]);
  const wrong = picked !== null && !opts.find((o) => o.v === picked)?.ok;
  // 18.11.2026 (foydalanuvchi): «Avval ma'nosini eslab ko'ring» olib tashlandi — variantlar darhol ko'rinadi
  return (
    <>
      {mode === "ear"
        ? <div className="r-ear"><button type="button" className="ear" onClick={() => void say(w.ar)} aria-label="Qayta eshitish"><Volume2 size={44} aria-hidden /></button><span>Bosib, qayta eshiting</span></div>
        : <WordHead w={w} hideImg /> /* tarjima va rasm bosqichida so'z rasmi yashiriladi — javob oldindan ko'rinmasin */}
      {<div className={`r-opts ${mode === "pic" ? "grid" : ""}`}>
        {opts.map((o) => {
          const st = picked === null ? "" : o.ok ? "ok" : o.v === picked ? "no" : "dim";
          return (
            <button key={o.v} type="button" className={`opt ${st} ${mode === "ear" ? "opt-r" : ""}`} disabled={picked !== null} onClick={() => onPick(o.ok, o.v)}
              aria-label={mode === "pic" ? o.w.uz : undefined}>
              {mode === "pic" ? <img src={o.v} alt="" /> : mode === "ear" ? <Ar className="opt-ar">{o.v}</Ar> : o.v}
              {st === "ok" && <Check size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
              {st === "no" && <X size={20} strokeWidth={3} className="opt-mark" aria-hidden />}
            </button>
          );
        })}
      </div>}
      {wrong && (
        <div className="r-fix" role="status">
          <p>To'g'ri javob: <b>{mode === "pic" ? w.uz : mode === "ear" ? w.ar : w.uz}</b>. Bu so'z round oxirida yana so'raladi.</p>
          <button type="button" className="btn dark wide" onClick={onNext}>Davom etish</button>
        </div>
      )}
    </>
  );
}

function Pronounce({ w, onOk, onRetry, onSkipAll }: { w: Word; onOk: () => void; onRetry: () => void; onSkipAll: () => void }) {
  const can = typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const [rec, setRec] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(false); // mikrofon ruxsati so'ralmoqda
  // 18.11.2026 (foydalanuvchi): talaffuzni ilova o'zi tekshiradi (server aiSay). AI ishlamasa — eskidek o'zini o'zi baholash
  const [chk, setChk] = useState<"idle" | "wait" | "ok" | "no" | "off">("idle");
  const [tip, setTip] = useState("");
  const [tries, setTries] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const live = useRef(true);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  // ekrandan chiqilganda yozuv va mikrofon o'chiriladi
  useEffect(() => { live.current = true; return () => { live.current = false; clearTimeout(timer.current); if (mr.current?.state === "recording") mr.current.stop(); }; }, []);

  const check = async (b: Blob) => {
    setChk("wait"); setTip("");
    const r = await aiSay(b, w.ar);
    if (!live.current) return;
    if (isFail(r)) { setChk("off"); setTip(r.limit ? "Bugungi avtomatik tekshiruv chegarasi tugadi." : "Avtomatik tekshiruv hozir ishlamadi."); return; }
    if (r.pass) { setChk("ok"); tg.haptic("success"); window.setTimeout(() => { if (live.current) onOk(); }, 1100); return; }
    const t = tries + 1;
    setTries(t); setChk("no"); setTip(r.tip); tg.haptic("error");
    if (t >= 2) window.setTimeout(() => { if (live.current) onRetry(); }, 2200); // so'z round oxirida yana so'raladi
  };
  // Bir bosish — yozish, ikkinchi bosish — to'xtatish (5 soniyada o'zi to'xtaydi). Ushlab turish shart emas:
  // birinchi marta ruxsat oynasi chiqqanda barmoq qo'yib yuborilsa ham yozuv buzilmaydi.
  const stop = () => { clearTimeout(timer.current); if (mr.current?.state === "recording") mr.current.stop(); setRec(false); };
  const start = async () => {
    setErr(""); setWait(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(s);
      chunks.current = [];
      m.ondataavailable = (e) => chunks.current.push(e.data);
      m.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: m.mimeType });
        setUrl(URL.createObjectURL(b));
        if (chk !== "off") void check(b);
      };
      m.start(); mr.current = m; setRec(true); setChk((c) => (c === "off" ? c : "idle")); tg.haptic("medium");
      timer.current = window.setTimeout(stop, 5000);
    } catch { setErr("Mikrofonga ruxsat berilmadi. So'zni ovoz chiqarib ayting va o'zingiz baholang."); }
    setWait(false);
  };
  const self = !can || !!err || chk === "off"; // o'zini o'zi baholash (mikrofon yo'q yoki AI ishlamadi)

  return (
    <>
      <WordHead w={w} />
      <section className="r-mic">
        {can && !err ? (
          <>
            <span className="muted">{rec ? "Gapiring… tugatgach yana bosing" : wait ? "Mikrofonga ruxsat bering" : chk === "wait" ? "Tekshirilmoqda…" : chk === "no" ? "Yana bir bor tinglang va ayting" : url && self ? "O'z ovozingizni namuna bilan solishtiring" : "Bosing va so'zni ayting"}</span>
            <button type="button" className={`mic ${rec ? "on" : ""}`} aria-label={rec ? "To'xtatish" : "Yozish"} disabled={wait || chk === "wait" || chk === "ok" || (chk === "no" && tries >= 2)}
              onClick={() => (rec ? stop() : void start())}>
              {rec ? <Square size={34} aria-hidden /> : <Mic size={38} aria-hidden />}
            </button>
            {chk === "ok" && <p className="r-ai ok" role="status"><Check size={18} strokeWidth={3} aria-hidden />To'g'ri aytdingiz!</p>}
            {chk === "no" && <p className="r-ai no" role="status"><X size={18} strokeWidth={3} aria-hidden />{tries >= 2 ? "Bu so'z round oxirida yana so'raladi." : tip || "Biroz boshqacha eshitildi."}</p>}
            {chk === "off" && tip && <p className="r-ai off" role="status">{tip} O'zingiz solishtirib baholang.</p>}
            {url && (chk === "no" || self) && (
              <div className="r-cmp">
                <button type="button" className="btn ghost" onClick={() => void new Audio(url).play()}><Play size={18} aria-hidden />Mening ovozim</button>
                <button type="button" className="btn ghost" onClick={() => void say(w.ar)}><Volume2 size={18} aria-hidden />Namuna</button>
              </div>
            )}
          </>
        ) : <p className="muted">{err || "Bu telefonda ovoz yozib bo'lmaydi. So'zni ovoz chiqarib ayting va o'zingiz baholang."}</p>}
      </section>
      {self && (
        <div className="r-cmp two">
          <button type="button" className="btn ghost" onClick={onRetry}><RotateCcw size={18} aria-hidden />Keyinroq qaytaman</button>
          <button type="button" className="btn good" disabled={rec} onClick={onOk}><Check size={18} aria-hidden />To'g'ri aytdim</button>
        </div>
      )}
      <p className="r-priv">{self ? "Ovozingiz telefoningizda qoladi, hech kimga yuborilmaydi." : "Ovozingiz faqat tekshirish uchun yuboriladi va saqlanmaydi."}</p>
      <button type="button" className="btn ghost wide r-quiet" onClick={onSkipAll}><MicOff size={18} aria-hidden />Hozir gapira olmayman — keyingi bosqich</button>
    </>
  );
}

// 18.11.2026 (foydalanuvchi): round oxirida pufakcha o'yini — round so'zlari + oldingi vahdalar so'zlari aralash.
// Tepada o'zbekcha so'z, pastdan 4 ta arabcha pufakcha: to'g'risini ushlang. Xato bosilgan yoki uchib ketgan so'z navbat oxirida yana chiqadi;
// hammasi ushlanganda round tugaydi. Pufakchalar ushlangan sari tezlashadi.
const BUB_C = ["b1", "b2", "b3", "b4"];
function RoundBubble({ words, review, pool, onProg, onMiss, onDone }: { words: Word[]; review: Word[]; pool: Word[]; onProg: (caught: number, total: number) => void; onMiss: () => void; onDone: () => void }) {
  useEffect(() => { tg.swipes(false); return () => tg.swipes(true); }, []);
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const all = useMemo(() => [...words, ...review], [words, review]);
  const opts = useMemo(() => [...pool, ...review], [pool, review]); // chalg'ituvchi variantlar
  const [queue, setQueue] = useState<Word[]>(() => shuffle(all));
  const [k, setK] = useState(0);
  const [caught, setCaught] = useState(0);
  const [popped, setPopped] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [rid, setRid] = useState(0);
  const it = queue[k];
  useEffect(() => { onProg(caught, all.length); }, [caught, all.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const round = useMemo(() => {
    if (!it) return null;
    const others = shuffle(opts.filter((x) => x.ar !== it.ar && x.uz !== it.uz)).slice(0, 3);
    return { o: shuffle([it, ...others]), dur: Math.max(4.2, 7.5 - caught * 0.18) * (reduce ? 1.6 : 1), delays: [0, 1, 2, 3].map(() => Math.random() * 0.9) };
  }, [it, rid]); // eslint-disable-line react-hooks/exhaustive-deps
  const advance = (miss: boolean) => {
    setPopped(null); setGone([]); setRid((r) => r + 1);
    if (miss) { onMiss(); setQueue((q) => [...q, q[k]]); setK(k + 1); return; }
    if (k + 1 >= queue.length) { onDone(); return; }
    setK(k + 1);
  };
  if (!it || !round) return null;
  return (
    <>
      <p className="g-target">Arabchasini ushlang: <b>{it.uz}</b></p>
      <div className="bub-arena" key={`${k}-${rid}`}>
        {round.o.map((o, j) => !gone.includes(o.ar) && (
          <button key={o.ar} type="button" className={`bub ${BUB_C[j]} ${popped === o.ar ? "pop" : ""}`}
            style={{ left: `${4 + j * 24}%`, animationDuration: `${round.dur}s`, animationDelay: `${round.delays[j]}s` }}
            onAnimationEnd={(e) => { if (e.animationName === "bub-up" && o.ar === it.ar && !popped) advance(true); }}
            onClick={() => {
              if (popped) return;
              if (o.ar === it.ar) {
                setPopped(o.ar); tg.haptic("light"); setCaught((c) => c + 1);
                if (!isNightHour()) void say(it.ar);
                window.setTimeout(() => advance(false), 420);
              } else { tg.haptic("error"); setGone((g) => [...g, o.ar]); window.setTimeout(() => advance(true), 300); }
            }}>
            <Ar>{o.ar}</Ar>
          </button>
        ))}
      </div>
    </>
  );
}
