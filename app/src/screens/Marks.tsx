// Baholar: o'quvchining o'z natijalari vahdalar bo'yicha — lug'at, so'z testi, grammatika, mashqlar (telefondagi progressdan).
// 24.11.2026 (api 25, K2): «Vahdalar | Ustoz izohlari» — ustoz bahosi, kuchli tomon, tuzatish, xato turi, ustoz ovozi, o'z javobi va AI dastlabki
// bahosi (server subMine). Ko'ringan yangi izohlar «ko'rildi» deb belgilanadi (subSeen) — pastki menyudagi belgi kamayadi.
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ClipboardCheck, Clock, MessageSquareText, PenLine, Play, Sparkles, ThumbsUp, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import { aiOf, aiShort, autoText, dateUz, fmtSec, marksJump, placeOf, pureAr, splitAiText, useKbTitles, type MySub } from "../lib/subs";
import { MixedText } from "../ui/Mixed";
import { SubVoice } from "../ui/SubVoice";
import { vGet } from "../lib/vdb";
import { toast } from "../ui/Toast";
import { spkAll } from "./Speak";
import { loadData } from "../lib/data";
import { kbBest, kbKeyOf, loadKb } from "../lib/kb";
import { gramPct, pctOf, rulesOf } from "../lib/next";
import { bkKey, hwProgress, localRaw, summarize, type Book } from "../lib/progress";
import { strandTotal } from "../lib/strand";
import { confAll, confAvg } from "../lib/goal";
import { ltmStat } from "../lib/practice";
import { knownOf, store } from "../lib/store";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Empty, SectionTitle } from "../ui/kit";
import { VocabCard } from "./VocabCard";
import { bookOfLevel } from "./Unit";

type Row = { n: number; uz: string; ar: string; voc: number; wt: number; gram: number | null; ex: number | null; done: boolean };

/** ustoz bahosi bor, o'quvchi hali ko'rmagan */
const isNew = (x: MySub) => x.grade !== null && !x.seen_at;

export function Marks() {
  const { me, patch } = useSession();
  const { go, setTab } = useNav();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const [rows, setRows] = useState<Row[] | null>(null);
  // 24.11.2026 (K2): bot xabaridagi «Baholarni ochish» → darhol «Ustoz izohlari»
  const [view, setView] = useState<"units" | "notes">(() => (marksJump.notes ? "notes" : "units"));
  useEffect(() => { marksJump.notes = false; }, []); // bir martalik (initializer ichida o'zgartirilmaydi — StrictMode uni ikki marta chaqiradi)
  const [mine, setMine] = useState<MySub[] | null | "err">(null);
  const [seen, setSeen] = useState<Set<number>>(() => new Set()); // shu safar «ko'rildi» deb yuborilganlar
  const meN = useRef(0);
  meN.current = me?.marksNew || 0;
  useEffect(() => {
    if (view !== "notes" || (mine !== null && mine !== "err")) return;
    let alive = true;
    setMine(null);
    api<{ items: MySub[] }>("subMine").then((r) => {
      if (!alive) return;
      const L = r.items || [];
      const at = (x: MySub) => x.graded_at || x.created_at;
      // yangi baholar birinchi, keyin oxirgi baholangan / yuborilgan
      setMine([...L].sort((a, b) => Number(isNew(b)) - Number(isNew(a)) || at(b).localeCompare(at(a))));
    }).catch(() => alive && setMine("err"));
    return () => { alive = false; };
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const onSeen = useCallback((ids: number[], n: number) => {
    setSeen((s) => new Set([...s, ...ids]));
    patch({ marksNew: Math.max(0, meN.current - n) });
  }, [patch]);
  const nNew = Array.isArray(mine) ? mine.filter((x) => isNew(x) && !seen.has(x.id)).length : me?.marksNew || 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      const book = await loadData<Book>(`books/${bookId}`);
      const raw = localRaw();
      const tests = store.get<Record<string, number>>(bkKey(bookId, "tests"), {});
      const out: Row[] = [];
      for (const u of book.units) {
        const voc = pctOf(u.words, knownOf(bookId, u.n));
        const key = kbKeyOf(bookId, u.n);
        const B = key ? kbBest(key) : {};
        let ex: number | null = null;
        if (key && Object.keys(B).length) {
          const kb = await loadKb(key).catch(() => null);
          if (kb) ex = Math.round(kb.steps.reduce((a, _, i) => a + (B[i] || 0), 0) / kb.steps.length);
        }
        const gram = rulesOf(book, u.n).length ? gramPct(book, u.n) : null;
        const wt = tests[u.n] || 0;
        if (voc || wt || gram || ex) out.push({ n: u.n, uz: u.uz || "", ar: u.ar || "", voc, wt, gram, ex, done: hwProgress(raw, book, u.n).done });
      }
      if (alive) setRows(out);
    })().catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [bookId]);

  return (
    <main className="screen marks">
      <SectionTitle ar="الدَّرَجَاتُ" uz="Baholar" />
      <div className="seg mk-seg" role="tablist" aria-label="Baholar">
        <button type="button" role="tab" aria-selected={view === "units"} className={view === "units" ? "on" : ""} onClick={() => setView("units")}>Vahdalar</button>
        <button type="button" role="tab" aria-selected={view === "notes"} className={view === "notes" ? "on" : ""} onClick={() => setView("notes")}>
          Ustoz izohlari{nNew > 0 && <em aria-label={`${nNew} ta yangi`}>{nNew}</em>}
        </button>
      </div>
      {view === "notes" ? <Notes items={mine} done={seen} onSeen={onSeen} /> : <>
      <Growth />
      <VocabCard />
      {rows === null && <p className="muted pad">Yuklanmoqda…</p>}
      {rows?.length === 0 && (
        <div className="empty">
          <span className="empty-ico" aria-hidden><ClipboardCheck size={28} /></span>
          <h2>Hali natija yo'q</h2>
          <p>Birinchi lug'at roundini bajaring — natijalaringiz shu yerda yig'iladi.</p>
          <button type="button" className="btn primary mk-go" onClick={() => setTab("lessons")}>Darslarga o'tish</button>
        </div>
      )}
      {rows && rows.length > 0 && <p className="mk-note">80% va undan yuqori — o'zlashtirilgan. Vahda to'liq bajarilsa, ustozingiz ko'radi.</p>}
      <ul className="mk-list">
        {rows?.map((r) => (
          <li key={r.n}>
            <button type="button" className="mk-card" onClick={() => go("unit", { book: bookId, unit: r.n })}>
              <span className="mk-hd">
                <span className="mk-t"><b>{r.n}-vahda · {r.uz}</b><Ar className="mk-ar">{r.ar}</Ar></span>
                {r.done ? <span className="mk-st ok"><Check size={14} aria-hidden />Bajarildi</span> : <ChevronRight size={20} aria-hidden className="mk-chev" />}
              </span>
              <span className="mk-grid">
                <Meter label="Lug'at" v={r.voc} />
                <Meter label="So'z testi" v={r.wt} />
                {r.gram !== null && <Meter label="Grammatika" v={r.gram} />}
                {r.ex !== null && <Meter label="Mashqlar" v={r.ex} />}
              </span>
            </button>
          </li>
        ))}
      </ul>
      </>}
    </main>
  );
}

/** 24.11.2026 (K2): «Ustoz izohlari» — ekranda ko'ringan yangi baholar 0,4 soniyadan keyin «ko'rildi» bo'ladi (subSeen, ≤60 ta) */
function Notes({ items, done, onSeen }: { items: MySub[] | null | "err"; done: Set<number>; onSeen: (ids: number[], n: number) => void }) {
  const kbT = useKbTitles(Array.isArray(items) ? items : null);
  const sent = useRef(new Set<number>(done)); // oldinroq (bo'limlar almashguncha) yuborilganlar qayta yuborilmaydi
  const pend = useRef(new Set<number>());
  const timer = useRef<number | undefined>(undefined);
  const cb = useRef(onSeen);
  cb.current = onSeen;
  const flush = useCallback(() => {
    const ids = [...pend.current].slice(0, 60);
    if (!ids.length) return;
    ids.forEach((i) => { pend.current.delete(i); sent.current.add(i); });
    api<{ n?: number }>("subSeen", { ids }).then((r) => cb.current(ids, r.n ?? ids.length)).catch(() => ids.forEach((i) => sent.current.delete(i)));
  }, []);
  const [io] = useState(() => (typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((es, ob) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      ob.unobserve(e.target);
      const id = Number((e.target as HTMLElement).dataset.id);
      if (id && !sent.current.has(id)) pend.current.add(id);
    }
    clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 400);
  }, { threshold: 0.4 })));
  useEffect(() => () => { io?.disconnect(); clearTimeout(timer.current); flush(); }, [io, flush]);
  // IntersectionObserver yo'q (eski brauzer) — ro'yxatdagi hammasi
  useEffect(() => {
    if (io || !Array.isArray(items)) return;
    items.filter(isNew).forEach((x) => { if (!sent.current.has(x.id)) pend.current.add(x.id); });
    flush();
  }, [io, items, flush]);

  if (items === null) return <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div>;
  if (items === "err") return <Empty icon={<MessageSquareText size={28} />} title="Izohlar yuklanmadi" text="Internetni tekshirib, «Vahdalar» va «Ustoz izohlari»ni qayta bosing." />;
  if (!items.length) return <Empty icon={<MessageSquareText size={28} />} title="Hali ustoz izohi yo'q" text="Yozma yoki ovozli javobni ustozga yuborsangiz, bahosi va izohi shu yerda chiqadi." />;
  return (
    <>
      <p className="mk-note">Ustoz bahosi — yakuniy. AI bahosi — dastlabki, ustoz tekshirguncha.</p>
      <ul className="mn-list">
        {items.map((x) => (
          <NoteCard key={x.id} x={x} place={placeOf(x, kbT)}
            obs={(el) => { if (el && io && isNew(x) && !sent.current.has(x.id)) io.observe(el); }} />
        ))}
      </ul>
    </>
  );
}

function NoteCard({ x, place, obs }: { x: MySub; place: string; obs: (el: HTMLLIElement | null) => void }) {
  const ai = aiOf(x);
  const graded = x.grade !== null;
  const fresh = isNew(x);
  const txt = splitAiText(x.text).own; // xulosa: «AI bahosi …» qatori o'quvchining o'z matni emas
  const own = !!txt && !autoText(txt);
  return (
    <li ref={obs} data-id={x.id} className={`mn-card ${fresh ? "new" : ""}`}>
      <div className="mn-hd">
        <span className="mn-t"><b>{place}</b><small>{graded && x.graded_at ? `Baholandi · ${dateUz(x.graded_at)}` : `Yuborildi · ${dateUz(x.created_at)}`}</small></span>
        <span className="mn-st">
          {fresh && <span className="mn-new">Yangi</span>}
          {graded ? <span className={`mn-g ${(x.grade || 0) >= 4 ? "hi" : ""}`}>{x.grade} / 5</span> : <span className="mn-wait"><Clock size={14} aria-hidden />Tekshirilmoqda</span>}
        </span>
      </div>
      {x.praise && <p className="mn-l"><ThumbsUp size={17} aria-hidden /><span><b>Kuchli tomon</b><MixedText text={x.praise} /></span></p>}
      {x.fix && <p className="mn-l fix"><PenLine size={17} aria-hidden /><span><b>Tuzatish</b><MixedText text={x.fix} /></span></p>}
      {!x.praise && !x.fix && x.comment && <p className="mn-c">«<MixedText text={x.comment} />»</p>}
      {!!x.tags?.length && <div className="mn-tags" aria-label="Xato turi">{x.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      {x.t_audio && <SubVoice id={x.id} t label={`Ustoz ovozi${x.t_sec ? ` · ${fmtSec(x.t_sec)}` : ""}`} className="mn-tv" />}
      {ai && <p className="mn-ai"><Sparkles size={14} aria-hidden />{graded ? "Ustoz bahosi — yakuniy · " : ""}AI dastlabki bahosi: {aiShort(ai)}</p>}
      {(own || x.audio) && (
        <details className="mn-mine">
          <summary>Mening javobim</summary>
          {own && (pureAr(txt) ? <Ar className="mn-ar">{txt}</Ar> : <p className="mn-txt"><MixedText text={txt} /></p>)}
          {x.audio && <SubVoice id={x.id} label="Mening ovozim" />}
        </details>
      )}
    </li>
  );
}

function Meter({ label, v }: { label: string; v: number }) {
  return (
    <span className={`mk-m ${v >= 80 ? "good" : ""}`}>
      <span className="mk-l">{label}<em>{v}%</em></span>
      <span className="mk-b" role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${v}%` }} /></span>
    </span>
  );
}

/** 15-partiya (M11): «Mening o'sishim» — jami vaqt, yodlangan so'zlar, seriya va o'ziga ishonch (boshida → hozir) */
function Growth() {
  const { go } = useNav();
  const t = strandTotal();
  const sum = summarize(localRaw());
  const C = confAll();
  const L = ltmStat();
  const h = Math.floor(t.sec / 3600), m = Math.round((t.sec % 3600) / 60);
  // brauzerlar o'zbekcha oy nomini bilmaydi («M11») — o'zimiz yozamiz: «6-noyabr»
  const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const sd = t.since ? new Date(t.since) : null;
  const since = sd ? `${sd.getDate()}-${OY[sd.getMonth()]}` : "";
  return (
    <section className="card gr-card" aria-label="Mening o'sishim">
      <b className="gr-h"><TrendingUp size={18} aria-hidden />Mening o'sishim</b>
      <div className="gr-kv">
        <div><b>{h ? `${h} soat ${m} daq` : `${m} daq`}</b><span>o'qish vaqti{since ? ` · ${since}dan` : ""}</span></div>
        <div><b>{sum.known}</b><span>yodlangan so'z</span></div>
        <div><b>{sum.streak}</b><span>kun ketma-ket</span></div>
        <div>{C.length ? <b>{C.length > 1 ? `${confAvg(C[0])} → ${confAvg(C[C.length - 1])}` : `${confAvg(C[0])}`}</b> : <b>—</b>}<span>o'ziga ishonch / 5</span></div>
      </div>
      {/* 2-paket (N7): 7+ kunlik tanaffusdan keyin to'g'ri eslangan so'zlar ulushi — so'zni haqiqatan eslab qolayotganini ko'rsatadi */}
      <div className="gr-ltm">
        <span><b>Uzoq xotira</b><small>{L.pct === null ? `hali ma'lumot yetarli emas · ${L.n} / 20 takror` : "kamida 7 kunlik tanaffusdan keyin to'g'ri eslangan so'zlar · 30 kun"}</small></span>
        {L.pct !== null && <b className="gr-ltm-v">{L.pct}%</b>}
        {L.pct !== null && <i className="gr-ltm-bar" aria-hidden><i style={{ width: `${L.pct}%` }} /></i>}
      </div>
      <button type="button" className="btn ghost gr-cf" onClick={() => go("goal", { conf: 1 })}>{C.length ? "O'zingizni qayta baholang" : "O'zingizni baholang · 1 daqiqa"}</button>
      <MyVoice />
    </section>
  );
}

/** 16-partiya (K2/M7): «Mening ovozim» — har vahda bo'yicha birinchi va oxirgi yakka gapirish yozuvi (faqat shu telefonda) */
function MyVoice() {
  const S = spkAll();
  const keys = Object.keys(S).sort((a, b) => (S[b].d > S[a].d ? 1 : -1)).slice(0, 4);
  if (!keys.length) return null;
  const play = async (k: string) => {
    const b = await vGet(k);
    if (!b) { toast("Bu yozuv boshqa telefonda qolgan"); return; }
    const u = URL.createObjectURL(b); const au = new Audio(u); au.onended = () => URL.revokeObjectURL(u); void au.play();
  };
  return (
    <div className="mv">
      <b className="mv-h">Mening ovozim</b>
      <ul>{keys.map((k) => {
        const [, un] = k.split(":");
        return (
          <li key={k}><span><b>{un}-vahda</b><small>{S[k].n} marta · oxirgisi {S[k].d.split("-").reverse().slice(0, 2).join(".")}</small></span>
            <button type="button" className="btn ghost sm" onClick={() => void play(`spk-first-${k}`)}><Play size={14} aria-hidden />Birinchi</button>
            <button type="button" className="btn ghost sm" onClick={() => void play(`spk-last-${k}`)}><Play size={14} aria-hidden />Oxirgi</button>
          </li>
        );
      })}</ul>
    </div>
  );
}
