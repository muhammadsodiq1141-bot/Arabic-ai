// 16-partiya (M7, Nation 24–26, 39–40-betlar; TMLT 9, 11-boblar): yakka gapirish — vahda mavzusida o'z gapi.
// Tayyorgarlik (60 s) → bir mavzuni 3 marta gapirish, har gal vaqt kamayadi (4/3/2 usulining qisqa shakli: 60 → 45 → 30 s).
// Yozuvlar faqat telefonda (lib/vdb.ts): vahda bo'yicha birinchi va oxirgi urinish saqlanadi (o'sish portfeli — «Baholar»).
// Ovoz yozib bo'lmasa yoki hozir gapira olmasa — matn bilan (xavfsiz sukut, A4). Guruhdagi o'quvchi xohlasa ustozga yuboradi.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Mic, PenLine, Play, Send, Square, Volume2 } from "lucide-react";
import { say } from "../lib/audio";
import { blobB64, recMime, sendSub } from "../lib/kb";
import { dayKey } from "../lib/progress";
import { gain, knownOf, store } from "../lib/store";
import { tg } from "../lib/tg";
import { vPut } from "../lib/vdb";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { useRBook } from "./Rules";

const LIM = [60, 45, 30];
export type Spk = Record<string, { n: number; d: string; first: string }>; // "kitob:vahda" → urinishlar soni, oxirgi kun, birinchi kun
export const spkAll = () => store.get<Spk>("f.spk", {});
type Rec = { blob: Blob; mime: string; sec: number; url: string };

export function SpeakScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { back } = useNav();
  const { me } = useSession();
  const book = useRBook(bookId);
  const u = book?.units.find((x) => x.n === unitN);
  const [phase, setPhase] = useState<"prep" | "rec" | "done" | "text">("prep");
  const [left, setLeft] = useState(60);
  const [round, setRound] = useState(0);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const [txt, setTxt] = useState("");
  const [sent, setSent] = useState(false);
  const mr = useRef<MediaRecorder | null>(null);
  const tick = useRef<number | undefined>(undefined);
  const t0 = useRef(0);
  const can = typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const words = useMemo(() => {
    if (!u) return [] as string[][];
    const K = knownOf(bookId, unitN);
    return [...u.words].sort((a, b) => Number(!!K[b[0]]) - Number(!!K[a[0]])).slice(0, 8);
  }, [u, bookId, unitN]);
  const lowLvl = !me?.level || ["A0", "A1"].includes(me.level);

  // tayyorgarlik taymeri
  useEffect(() => {
    if (phase !== "prep") return;
    if (left <= 0) { setPhase("rec"); return; }
    const h = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(h);
  }, [phase, left]);
  useEffect(() => () => { clearInterval(tick.current); if (mr.current?.state === "recording") mr.current.stop(); recs.forEach((r) => URL.revokeObjectURL(r.url)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!book || !u) return <main className="screen"><ScreenHeader title="Yakka gapirish" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const key = `${bookId}:${unitN}`;

  const stop = () => { clearInterval(tick.current); if (mr.current?.state === "recording") mr.current.stop(); setOn(false); };
  const start = async () => {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = recMime();
      let r: MediaRecorder;
      try { r = new MediaRecorder(s, m ? { mimeType: m, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }); } catch { r = new MediaRecorder(s); }
      const ch: Blob[] = [];
      r.ondataavailable = (e) => ch.push(e.data);
      r.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        const mime = r.mimeType || m || "audio/webm";
        const blob = new Blob(ch, { type: mime });
        const sec = Math.max(1, Math.round((Date.now() - t0.current) / 1000));
        setRecs((x) => [...x, { blob, mime, sec, url: URL.createObjectURL(blob) }]);
      };
      r.start(); mr.current = r; t0.current = Date.now(); setOn(true); tg.haptic("medium");
      const lim = LIM[round];
      setLeft(lim);
      tick.current = window.setInterval(() => {
        const s2 = lim - Math.round((Date.now() - t0.current) / 1000);
        setLeft(Math.max(0, s2));
        if (s2 <= 0) stop();
      }, 250);
    } catch { setErr("Mikrofonga ruxsat berilmadi. Matn bilan yozib berishingiz mumkin."); }
  };
  const nextRound = () => {
    if (round + 1 < LIM.length) { setRound(round + 1); setLeft(LIM[round + 1]); return; }
    finish();
  };
  const finish = () => {
    const A = spkAll(), cur = A[key];
    A[key] = { n: (cur?.n || 0) + 1, d: dayKey(), first: cur?.first || dayKey() };
    store.set("f.spk", A);
    const last = recs[recs.length - 1];
    if (last) { if (!cur) void vPut(`spk-first-${key}`, last.blob); void vPut(`spk-last-${key}`, last.blob); }
    gain("speak", 8);
    tg.haptic("success");
    setPhase("done");
  };
  const sendTeacher = async (rec?: Rec, text?: string) => {
    try {
      const extra = rec ? { audio: await blobB64(rec.blob), mime: rec.mime } : {};
      await sendSub({ lesson: `speak:${key}`, step: "speak", item: 900, title: `Yakka gapirish · ${unitN}-vahda · ${u.uz}`,
        text: text || `Yakka gapirish: «${u.uz}» mavzusi, ${recs.length}-urinish (${rec?.sec || 0} s)`, ...extra });
      setSent(true); toast("Ustozingizga yuborildi"); tg.haptic("success");
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
  };

  const topic = (
    <section className="card spk-topic">
      <span className="spk-k">Mavzu</span>
      <b className="spk-t">{u.uz}</b>{u.ar && <Ar className="spk-ar">{u.ar}</Ar>}
      <p>{lowLvl ? "O'zingiz va hayotingiz haqida kamida 3 ta gap ayting." : "Shu mavzuda 1 daqiqa gapiring: o'zingiz, oilangiz, kuningiz haqida."} Mana bu so'zlar yordam beradi:</p>
      <div className="spk-words">{words.map((w) => (
        <button key={w[0]} type="button" onClick={() => void say(w[0])}><Ar>{w[0]}</Ar><small>{w[1]}</small></button>
      ))}</div>
    </section>
  );
  const steps = (
    <ol className="spk-steps" aria-label="Bosqichlar">
      {["Tayyorgarlik", "60 s", "45 s", "30 s"].map((t, k) => {
        const idx = phase === "prep" ? 0 : phase === "done" ? 4 : round + 1;
        return <li key={k} className={k < idx ? "dn" : k === idx ? "on" : ""}>{k < idx ? <Check size={13} strokeWidth={3} aria-hidden /> : null}{t}</li>;
      })}
    </ol>
  );

  if (phase === "done") {
    return (
      <main className="screen spk-s">
        <ScreenHeader title="Yakka gapirish" ar="تَكَلَّمْ" />
        <section className="card spk-done">
          <b>{recs.length ? "Barakalla! Bir mavzuni 3 marta gapirdingiz" : "Barakalla! Gaplaringiz saqlandi"}</b>
          <p className="muted">{recs.length ? "Har safar tezroq va ravonroq bo'ladi — birinchi va oxirgi yozuvni solishtiring." : "Keyingi safar ovoz bilan urinib ko'ring — gapirish mashqi eng tez o'stiradi."}</p>
          <ul className="spk-recs">{recs.map((r, k) => (
            <li key={k}><button type="button" className="spk-play" aria-label={`${k + 1}-urinishni tinglash`} onClick={() => void new Audio(r.url).play()}><Play size={16} aria-hidden /></button>
              <span><b>{k + 1}-urinish</b><small>{r.sec} soniya · {LIM[k]} s ichida</small></span></li>
          ))}</ul>
          <p className="spk-priv">Yozuvlar faqat telefoningizda saqlanadi. «Baholar»da birinchi va oxirgi urinishingiz turadi.</p>
          {me?.group && recs.length > 0 && !sent && <button type="button" className="btn ghost wide" onClick={() => void sendTeacher(recs[recs.length - 1])}><Send size={18} aria-hidden />Oxirgi yozuvni ustozga yuborish</button>}
          <button type="button" className="btn primary wide" onClick={back}>Tayyor</button>
        </section>
      </main>
    );
  }

  if (phase === "text") {
    return (
      <main className="screen spk-s">
        <ScreenHeader title="Yakka gapirish" ar="تَكَلَّمْ" />
        {topic}
        <section className="card spk-text">
          <label htmlFor="spk-t"><b>Gaplaringizni yozing</b><small>Arabcha yozing; bilmagan so'zingizni o'zbekcha qoldiring.</small></label>
          <textarea id="spk-t" rows={5} dir="auto" value={txt} maxLength={800} onChange={(e) => setTxt(e.target.value)} placeholder="أَنَا …" />
          {me?.group && <button type="button" className="btn ghost wide" disabled={txt.trim().length < 5 || sent} onClick={() => void sendTeacher(undefined, `Yakka gapirish (matn): ${txt.trim()}`)}><Send size={18} aria-hidden />Ustozga yuborish</button>}
          <button type="button" className="btn primary wide" disabled={txt.trim().length < 5} onClick={() => { store.set(`f.spkTxt.${key}`, txt.trim()); finish(); }}>Saqlash</button>
        </section>
      </main>
    );
  }

  const cur = recs.length === round + 1; // shu urinish yozib bo'lindi
  return (
    <main className="screen spk-s">
      <ScreenHeader title="Yakka gapirish" ar="تَكَلَّمْ" />
      {steps}
      {topic}
      {phase === "prep" ? (
        <section className="card spk-box">
          <span className="spk-big" aria-live="polite">{left}</span>
          <p>Tayyorlaning: so'zlarni tinglang, birinchi gapingizni o'ylang. Keyin bir mavzuni 3 marta gapirasiz — har gal vaqt kamroq.</p>
          <button type="button" className="btn primary wide" onClick={() => { setPhase("rec"); setLeft(LIM[0]); }}>Tayyorman</button>
        </section>
      ) : (
        <section className="card spk-box">
          <span className="spk-k">{round + 1}-urinish · {LIM[round]} soniya</span>
          <span className={`spk-big ${on ? "rec" : ""}`} aria-live="polite">{on ? left : cur ? <Check size={44} strokeWidth={3} aria-label="Yozildi" /> : LIM[round]}</span>
          <p>{on ? "Gapiring… vaqt tugasa o'zi to'xtaydi" : cur ? (round + 1 < LIM.length ? "Endi xuddi shu narsani qisqaroq vaqtda, ravonroq ayting." : "Uchala urinish yozildi.") : round === 0 ? "Bosing va gapiring. Xato qilishdan qo'rqmang — bu yerda tezlik va ravonlik muhim." : "Xuddi shu mavzu — endi tezroq."}</p>
          {err && <p className="err">{err}</p>}
          {can && !err && !cur && (
            <button type="button" className={`mic spk-mic ${on ? "on" : ""}`} aria-label={on ? "To'xtatish" : "Yozishni boshlash"} onClick={() => (on ? stop() : void start())}>
              {on ? <Square size={32} aria-hidden /> : <Mic size={36} aria-hidden />}
            </button>
          )}
          {cur && !on && (
            <div className="spk-act">
              <button type="button" className="btn ghost" onClick={() => void new Audio(recs[round].url).play()}><Volume2 size={18} aria-hidden />Tinglash</button>
              <button type="button" className="btn primary" onClick={nextRound}>{round + 1 < LIM.length ? `${round + 2}-urinish · ${LIM[round + 1]} s` : "Yakunlash"}</button>
            </div>
          )}
          <p className="spk-priv">Ovozingiz telefoningizda qoladi, hech kimga yuborilmaydi.</p>
          {!on && <button type="button" className="btn ghost wide spk-alt" onClick={() => setPhase("text")}><PenLine size={18} aria-hidden />Hozir gapira olmayman — yozib beraman</button>}
        </section>
      )}
    </main>
  );
}
