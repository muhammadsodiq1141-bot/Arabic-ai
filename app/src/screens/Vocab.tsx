// 11.11.2026 (M3): «So'z boyligim» — kirish, 40 ta savol (javob ko'rsatilmaydi), natija (taxminiy son, bosqichlar, o'sish, adashgan so'zlar → takrorlash).
import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Check, Volume2, X } from "lucide-react";
import { say } from "../lib/audio";
import { learnLater } from "../lib/practice";
import { localRaw, summarize } from "../lib/progress";
import { bandQs, bandShare, BANDS, EVERY_DAYS, estimate, loadBands, STOP_AT, TOTAL_Q, vDue, vHist, vNext, vSave, type VItem, type VQ, type VRes } from "../lib/vocab";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const OYQ = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const fmtDay = (d: string) => { const [, m, dd] = d.split("-").map(Number); return `${dd}-${OY[m - 1] || m}`; };
const fmtN = (n: number) => n.toLocaleString("ru-RU");

type Ans = { band: number; ok: boolean | null; it: VItem };

export function VocabScreen() {
  const { back } = useNav();
  const [bands, setBands] = useState<VItem[][] | null | "err">(null);
  const [stage, setStage] = useState<"intro" | "quiz" | "result">("intro");
  const [qs, setQs] = useState<VQ[]>([]);
  const [qi, setQi] = useState(0);
  const [ans, setAns] = useState<Ans[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [res, setRes] = useState<VRes | null>(null);
  const hist = vHist();
  const last = hist[hist.length - 1] || null;
  const due = vDue();
  useEffect(() => { loadBands().then(setBands).catch(() => setBands("err")); }, []);
  const q = qs[qi];
  // avtomatik o'qish faqat A1–A2 bosqichlarida (ularning ovozi tayyor); qiyinroqlarida — karnay bosilganda
  useEffect(() => { if (stage === "quiz" && q && q.band <= 1) void say(q.it.ar); }, [stage, q]);

  const start = () => {
    if (!bands || bands === "err") return;
    setQs(bandQs(bands, 0)); setQi(0); setAns([]); setPick(null); setStage("quiz"); tg.haptic();
  };
  const finish = (all: Ans[]) => {
    if (!bands || bands === "err") return;
    const shares: (number | null)[] = BANDS.map((_, i) => {
      const a = all.filter((x) => x.band === i);
      return a.length ? bandShare(a.filter((x) => x.ok === true).length, a.filter((x) => x.ok === false).length, a.length) : null;
    });
    const r: VRes = { d: new Date().toISOString().slice(0, 10), n: estimate(bands, shares), s: shares.map((s) => (s === null ? null : Math.round(s * 100) / 100)),
      w: all.filter((x) => x.ok !== true).slice(0, 20).map((x) => [x.it.ar, x.it.b]) };
    vSave(r); setRes(r); setStage("result"); tg.haptic("success");
  };
  const answer = (opt: string | null) => {
    if (!q || pick !== null || !bands || bands === "err") return;
    setPick(opt ?? "");
    const next = [...ans, { band: q.band, ok: opt === null ? null : opt === q.it.uz, it: q.it }];
    setTimeout(() => {
      setAns(next); setPick(null);
      if (qi + 1 < qs.length) { setQi(qi + 1); return; }
      // bosqich tugadi: ulush past bo'lsa — qiyinroqlari so'ralmaydi
      const a = next.filter((x) => x.band === q.band);
      const sh = bandShare(a.filter((x) => x.ok === true).length, a.filter((x) => x.ok === false).length, a.length);
      if (sh < STOP_AT || q.band + 1 >= BANDS.length) { finish(next); return; }
      setQs(bandQs(bands, q.band + 1)); setQi(0);
    }, 260);
  };

  if (stage === "quiz" && q) {
    const done = ans.length;
    return (
      <main className="screen vs">
        <ScreenHeader title="So'z boyligim" ar="حَصِيلَتِي اللُّغَوِيَّةُ" />
        <div className="vs-qbar"><span>{done + 1} / {TOTAL_Q}</span><span className="vs-tr" aria-hidden><i style={{ width: `${((done + 1) / TOTAL_Q) * 100}%` }} /></span><span>{q.band + 1}-bosqich</span></div>
        <section className="vs-word">
          <Ar className="vs-ar">{q.it.ar}</Ar>
          <button type="button" className="vs-spk" aria-label="Tinglash" onClick={() => void say(q.it.ar)}><Volume2 size={22} aria-hidden /></button>
          <small>ma'nosini tanlang</small>
        </section>
        <div className="vs-opts" role="group" aria-label="Ma'nosi">
          {q.opts.map((o) => <button key={o} type="button" className={pick === o ? "on" : ""} disabled={pick !== null} onClick={() => answer(o)}>{o}</button>)}
          <button type="button" className={`dk${pick === "" ? " on" : ""}`} disabled={pick !== null} onClick={() => answer(null)}>Bilmayman</button>
        </div>
        <button type="button" className="kb-link vs-exit" onClick={() => { setStage("intro"); setAns([]); }}><X size={15} aria-hidden />To'xtatish (natija saqlanmaydi)</button>
      </main>
    );
  }

  if (stage === "result" || (stage === "intro" && !due && last)) {
    const r = stage === "result" ? res! : last!;
    // r — oxirgi saqlangan natija; oldingisi — tarixdagi undan oldingi
    return <Result r={r} prev={vHist().slice(-2, -1)[0] || null} fresh={stage === "result"} onBack={back} />;
  }

  return (
    <main className="screen vs">
      <ScreenHeader title="So'z boyligim" ar="حَصِيلَتِي اللُّغَوِيَّةُ" />
      <section className="vs-intro">
        <b>Qancha so'z bilasiz?</b>
        <p>Har bosqichdan bir nechta so'z chiqadi — ma'nosini tanlang. Bilmasangiz «Bilmayman» bosing: taxmin qilish natijani pasaytiradi.</p>
      </section>
      <div className="vs-facts"><div><b>{TOTAL_Q}</b><span>so'zgacha</span></div><div><b>~5</b><span>daqiqa</span></div><div><b>{BANDS.length}</b><span>bosqich A1–C1</span></div></div>
      {last && <section className="card vs-last"><b>Oxirgi natija</b><small>{fmtDay(last.d)}: ≈ {fmtN(last.n)} so'z. Har {EVERY_DAYS} kunda qayta o'lchanadi.</small></section>}
      <p className="muted vs-note">Natija Miyzan lug'atidagi so'zlar bo'yicha (Manhaj A1–C1, Madina, yordamchi so'zlar){bands && bands !== "err" ? ` — ${fmtN(bands.reduce((a, b) => a + b.length, 0))} ta so'z` : ""}.</p>
      {bands === "err" ? <Empty icon={<BookOpenCheck size={28} />} title="Lug'at yuklanmadi" text="Internetni tekshirib, qayta oching." />
        : <button type="button" className="btn primary wide" disabled={!bands} onClick={start}>{bands ? "Boshlash" : "Tayyorlanmoqda…"}</button>}
    </main>
  );
}

function Result({ r, prev, fresh, onBack }: { r: VRes; prev: VRes | null; fresh: boolean; onBack: () => void }) {
  const hist = vHist().slice(-6);
  const known = useMemo(() => summarize(localRaw()).known, []);
  const [added, setAdded] = useState(false);
  const next = vNext();
  const max = Math.max(1, ...hist.map((h) => h.n));
  const missed = (r.w || []).filter(([, b]) => b !== "core");
  const addAll = () => {
    const by: Record<string, string[]> = {};
    for (const [ar, b] of missed) (by[b] = by[b] || []).push(ar);
    for (const [b, ars] of Object.entries(by)) learnLater(b, ars);
    setAdded(true); tg.haptic("success"); toast(`${missed.length} ta so'z takrorlashga qo'shildi`);
  };
  return (
    <main className="screen vs">
      <ScreenHeader title="So'z boyligim" ar="حَصِيلَتِي اللُّغَوِيَّةُ" />
      <section className="vs-big">
        <small>Siz taxminan</small><b>{fmtN(r.n)}</b>
        <small>so'z bilasiz{prev ? ` · oldingi o'lchovga nisbatan ${r.n - prev.n >= 0 ? "+" : ""}${fmtN(r.n - prev.n)}` : ""}</small>
      </section>
      <section className="card vs-card">
        <b>Bosqichlar bo'yicha</b>
        {BANDS.map((bd, i) => {
          const s = r.s[i];
          return <div key={bd.lbl} className={`vs-band${s === null ? " skip" : ""}`}><span>{i + 1} · {bd.lbl}</span><span className="vs-tr" aria-hidden>{s !== null && <i style={{ width: `${Math.round(s * 100)}%` }} />}</span><b>{s === null ? "—" : `${Math.round(s * 100)}%`}</b></div>;
        })}
        {r.s.some((s) => s === null) && <small>«—» — oldingi bosqich qiyin bo'lgani uchun so'ralmadi.</small>}
      </section>
      {hist.length > 1 && (
        <section className="card vs-card">
          <b>O'sish</b>
          <div className="vs-chart">{hist.map((h, i) => <div key={i} className={i === hist.length - 1 ? "now" : ""}><span>{fmtN(h.n)}</span><i style={{ height: `${Math.max(6, (h.n / max) * 64)}px` }} /><small>{Number(h.d.slice(8))}-{OYQ[Number(h.d.slice(5, 7)) - 1]}</small></div>)}</div>
        </section>
      )}
      <section className="card vs-card">
        <small>{next ? `Keyingi o'lchov: ${fmtDay(next)}. ` : ""}Ilovada yodlagan so'zlaringiz: {fmtN(known)}.</small>
      </section>
      {fresh && missed.length > 0 && (
        <section className="card vs-card">
          <b>Adashgan yoki bilmagan so'zlar · {missed.length}</b>
          <div className="vs-miss">{missed.slice(0, 12).map(([ar]) => <button key={ar} type="button" onClick={() => void say(ar)}><Ar>{ar}</Ar></button>)}</div>
          <button type="button" className="btn ghost wide" disabled={added} onClick={addAll}>{added ? <><Check size={18} aria-hidden />Takrorlashga qo'shildi</> : "Hammasini takrorlashga qo'shish"}</button>
        </section>
      )}
      <button type="button" className="btn primary wide" onClick={onBack}>Tayyor</button>
    </main>
  );
}
