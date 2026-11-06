// Baholar: o'quvchining o'z natijalari vahdalar bo'yicha — lug'at, so'z testi, grammatika, mashqlar (telefondagi progressdan).
// Ustoz bahosi (erkin javoblar) keyingi navbatda qo'shiladi.
import { useEffect, useState } from "react";
import { Check, ChevronRight, ClipboardCheck, TrendingUp } from "lucide-react";
import { loadData } from "../lib/data";
import { kbBest, kbKeyOf, loadKb } from "../lib/kb";
import { gramPct, pctOf, rulesOf } from "../lib/next";
import { bkKey, hwProgress, localRaw, summarize, type Book } from "../lib/progress";
import { strandTotal } from "../lib/strand";
import { confAll, confAvg } from "../lib/goal";
import { knownOf, store } from "../lib/store";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, SectionTitle } from "../ui/kit";
import { bookOfLevel } from "./Unit";

type Row = { n: number; uz: string; ar: string; voc: number; wt: number; gram: number | null; ex: number | null; done: boolean };

export function Marks() {
  const { me } = useSession();
  const { go, setTab } = useNav();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const [rows, setRows] = useState<Row[] | null>(null);

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
      <Growth />
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
    </main>
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
  const h = Math.floor(t.sec / 3600), m = Math.round((t.sec % 3600) / 60);
  const since = t.since ? new Date(t.since).toLocaleDateString("uz-UZ", { day: "numeric", month: "long" }) : "";
  return (
    <section className="card gr-card" aria-label="Mening o'sishim">
      <b className="gr-h"><TrendingUp size={18} aria-hidden />Mening o'sishim</b>
      <div className="gr-kv">
        <div><b>{h ? `${h} soat ${m} daq` : `${m} daq`}</b><span>o'qish vaqti{since ? ` · ${since}dan` : ""}</span></div>
        <div><b>{sum.known}</b><span>yodlangan so'z</span></div>
        <div><b>{sum.streak}</b><span>kun ketma-ket</span></div>
        <div>{C.length ? <b>{C.length > 1 ? `${confAvg(C[0])} → ${confAvg(C[C.length - 1])}` : `${confAvg(C[0])}`}</b> : <b>—</b>}<span>o'ziga ishonch / 5</span></div>
      </div>
      <button type="button" className="btn ghost gr-cf" onClick={() => go("goal", { conf: 1 })}>{C.length ? "O'zingizni qayta baholang" : "O'zingizni baholang · 1 daqiqa"}</button>
    </section>
  );
}
