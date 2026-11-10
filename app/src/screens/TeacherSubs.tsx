// Ustoz: tekshiriladigan javoblar — erkin javoblar (matn yoki ovoz) va A0 vazifalari. Baho 1–5 + izoh (server "subGrade";
// o'quvchiga Telegram'da xabar boradi). "Tushunmadim" xabarlari (item ≥ 300) alohida bo'limda, baho qo'yilmaydi.
import { useEffect, useRef, useState } from "react";
import { Clock, HelpCircle, Pause, Play, Send, X } from "lucide-react";
import { api } from "../lib/api";
import { isAr, loadKb } from "../lib/kb";
import { tg } from "../lib/tg";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { xCoins } from "../lib/xtask";

type Sub = { id: number; lesson: string; step: string; item: number; text: string; created_at: string; grade: number | null; comment: string | null; audio: boolean; name: string; login: string;
  pics?: string[]; result?: { ball: number; jami: number } | null; xt?: { title: string; coins5: number; due: string; late: boolean } }; // 3-paket 3-qism: qo'shimcha vazifa
/** «Tushunmadim» xabari: mashq bandi 300 dan katta (uy va qo'shimcha vazifada item = vazifa raqami) */
const isDunno = (x: Sub) => x.item >= 300 && x.step !== "hw" && x.step !== "x";
type Tab = "wait" | "done" | "dunno";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4);
  return m < 60 ? `${Math.max(1, m)} daqiqa oldin` : m < 1440 ? `${Math.round(m / 60)} soat oldin` : `${Math.round(m / 1440)} kun oldin`;
};

export function TeacherSubsScreen({ code }: { code: string }) {
  const [items, setItems] = useState<Sub[] | null | "err">(null);
  const [tab, setTab] = useState<Tab>("wait");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [cg, setCg] = useState<Record<string, number> | null>(null); // 3-paket: baho → tanga jadvali

  useEffect(() => {
    let alive = true;
    api<{ items: Sub[]; coinGrade?: Record<string, number> | null }>("subList", { code }).then((r) => { if (!alive) return; setItems(r.items || []); setCg(r.coinGrade || null); }).catch(() => alive && setItems("err"));
    return () => { alive = false; };
  }, [code]);
  // dars va qadam nomlari (a1:4 · suhbat → "4-vahda · Suhbat")
  useEffect(() => {
    if (!items || items === "err") return;
    const keys = [...new Set(items.map((x) => x.lesson).filter((l) => /^(a0|a1):\d+$/.test(l)))];
    Promise.all(keys.map((k) => loadKb(k).then((L) => [k, L] as const).catch(() => null))).then((res) => {
      const t: Record<string, string> = {};
      for (const r of res) {
        if (!r) continue;
        const [k, L] = r;
        const head = k.startsWith("a0:") ? `A0 · ${k.slice(3)}-dars` : `${k.slice(3)}-vahda`;
        for (const s of L.steps) t[`${k}|${s.k}`] = `${head} · ${s.t.split(" · ")[0]}`;
        t[`${k}|hw`] = `${head} · uy vazifasi`;
      }
      setTitles(t);
    });
  }, [items]);

  const list = items && items !== "err" ? items : [];
  const wait = list.filter((x) => !isDunno(x) && x.grade === null);
  const done = list.filter((x) => !isDunno(x) && x.grade !== null);
  const dunno = list.filter(isDunno);
  const shown = tab === "wait" ? wait : tab === "done" ? done : dunno;
  const graded = (id: number, grade: number, comment: string) => setItems((l) => (l && l !== "err" ? l.map((x) => (x.id === id ? { ...x, grade, comment } : x)) : l));

  return (
    <main className="screen tsubs">
      <ScreenHeader title="Javoblar" ar="الْإِجَابَاتُ" />
      <div className="seg" role="tablist" aria-label="Javoblar">
        {([["wait", "Kutmoqda", wait.length], ["done", "Baholangan", 0], ["dunno", "Tushunmadim", dunno.length]] as const).map(([id, l, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{l}{n > 0 && <em>{n}</em>}</button>
        ))}
      </div>
      {items === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div>}
      {items === "err" && <Empty icon={<Send size={28} />} title="Javoblar yuklanmadi" text="Internetni tekshirib, ekranni qayta oching." />}
      {items && items !== "err" && !shown.length && (
        <Empty icon={tab === "dunno" ? <HelpCircle size={28} /> : <Send size={28} />}
          title={tab === "wait" ? "Hamma javob baholangan" : tab === "done" ? "Hali baho qo'yilmagan" : "Tushunmadim xabari yo'q"}
          text={tab === "dunno" ? "O'quvchi mashqni tushunmay o'tkazib yuborsa, shu yerda ko'rinadi." : "O'quvchilar yangi javob yuborganda shu yerda paydo bo'ladi."} />
      )}
      <ul className="ts-list">
        {shown.map((x) => <SubCard key={x.id} x={x} title={x.xt ? `Qo'shimcha vazifa · ${x.xt.title}` : titles[`${x.lesson}|${x.step}`] || x.lesson} onGraded={graded}
          cg={x.step === "hw" ? cg : x.xt ? { 5: xCoins(x.xt.coins5, 5), 4: xCoins(x.xt.coins5, 4), 3: xCoins(x.xt.coins5, 3) } : null} />)}
      </ul>
    </main>
  );
}

function SubCard({ x, title, onGraded, cg }: { x: Sub; title: string; onGraded: (id: number, g: number, c: string) => void; cg: Record<string, number> | null }) {
  const dunno = isDunno(x);
  const [big, setBig] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(x.grade);
  const [comment, setComment] = useState(x.comment || "");
  const [edit, setEdit] = useState(x.grade === null);
  const [busy, setBusy] = useState(false);
  const voiceOnly = /^(🎙|📷|🧩)/.test(x.text); // avtomatik yozuv (matnsiz javob) — ko'rsatilmaydi
  const save = async () => {
    if (!grade) { toast("Avval bahoni tanlang (1–5)"); return; }
    setBusy(true);
    try {
      const r = await api<{ coins?: number }>("subGrade", { id: x.id, grade, comment: comment.trim() });
      tg.haptic("success"); toast(r.coins ? `Baho yuborildi · o'quvchiga +${r.coins} tanga` : "Baho yuborildi — o'quvchiga Telegram'da xabar boradi");
      onGraded(x.id, grade, comment.trim()); setEdit(false);
    } catch (e) { toast(e instanceof Error ? e.message : "Saqlanmadi"); }
    setBusy(false);
  };
  return (
    <li className={`ts-card ${dunno ? "dunno" : ""}`}>
      <div className="ts-hd"><b>{x.name}</b><small>{x.login} · {ago(x.created_at)}</small></div>
      <span className="ts-lesson">{dunno ? <><HelpCircle size={14} aria-hidden /> Tushunmadim · </> : null}{title}</span>
      {x.xt?.late && <span className="ts-late"><Clock size={13} aria-hidden />Muddatdan keyin topshirildi</span>}
      {x.result && <span className="ts-res">Material testi: {x.result.ball} / {x.result.jami}</span>}
      {!voiceOnly && (isAr(x.text) && !dunno ? <Ar className="ts-text">{x.text}</Ar> : <p className="ts-plain">{x.text}</p>)}
      {x.audio && <Voice id={x.id} />}
      {!!x.pics?.length && (
        <div className="ts-pics">{x.pics.map((u, i) => <button key={u} type="button" aria-label={`${i + 1}-surat — kattalashtirish`} onClick={() => setBig(u)}><img src={u} alt="" loading="lazy" /></button>)}</div>
      )}
      {big && (
        <div className="ts-big" role="dialog" aria-modal="true" aria-label="Daftar surati" onClick={() => setBig(null)}>
          <img src={big} alt="Daftar surati" /><button type="button" className="xv-x" onClick={() => setBig(null)}><X size={18} aria-hidden />Yopish</button>
        </div>
      )}
      {!dunno && (edit ? (
        <div className="ts-grade">
          <div className="ts-stars" role="radiogroup" aria-label="Baho">
            {[1, 2, 3, 4, 5].map((g) => (
              <button key={g} type="button" role="radio" aria-checked={grade === g} className={grade === g ? "on" : ""} onClick={() => setGrade(g)}>{g}</button>
            ))}
          </div>
          {cg && <small className="ts-coins">{x.xt ? "Qo'shimcha vazifa" : "Uy vazifasi"}: {[5, 4, 3].map((g) => `${g} → ${cg[String(g)] ?? 0}`).join(" · ")} tanga{grade && cg[String(grade)] ? ` — tanlangan: +${cg[String(grade)]}` : ""}</small>}
          <input className="ts-cmt" value={comment} maxLength={300} onChange={(e) => setComment(e.target.value)} placeholder="Izoh (ixtiyoriy): masalan, «harakatlarga e'tibor bering»" />
          <button type="button" className="btn primary wide" disabled={busy || !grade} onClick={() => void save()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : "Bahoni yuborish"}</button>
        </div>
      ) : (
        <div className="ts-done">
          <span className="ts-g">{grade}/5</span>{comment && <span className="ts-c">«{comment}»</span>}
          <button type="button" className="kb-link" onClick={() => setEdit(true)}>O'zgartirish</button>
        </div>
      ))}
    </li>
  );
}

/** O'quvchi ovozini tinglash (server 1 soatlik havola beradi) */
function Voice({ id }: { id: number }) {
  const [st, setSt] = useState<"idle" | "load" | "play">("idle");
  const a = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { a.current?.pause(); }, []);
  const toggle = async () => {
    if (st === "play") { a.current?.pause(); setSt("idle"); return; }
    setSt("load");
    try {
      const r = await api<{ url: string }>("subAudio", { id });
      const el = new Audio(r.url);
      a.current = el;
      el.onended = () => setSt("idle");
      await el.play(); setSt("play");
    } catch (e) { setSt("idle"); toast(e instanceof Error ? e.message : "Ovoz ochilmadi"); }
  };
  return (
    <button type="button" className="btn ghost ts-voice" onClick={() => void toggle()} disabled={st === "load"}>
      {st === "play" ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}{st === "load" ? "Yuklanmoqda…" : st === "play" ? "To'xtatish" : "Ovozni tinglash"}
    </button>
  );
}
