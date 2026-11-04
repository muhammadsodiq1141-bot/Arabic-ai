// Vahda so'zlari ro'yxati va so'z kartasi (eski renderWords + "word" ko'rinishi, SOZ-QOIDA-DARS-SPEC §1).
// Karta: tarjima, turkum, fe'l shakllari yoki ko'plik, misollar (so'z belgilangan — eski markSub/markTok aynan), sinonim/antonim, sinonim-antonim mashqi.
// Kirish: vahdadagi Lug'at → "So'zlar ro'yxati". Kartadan orqaga — ro'yxatga (joy saqlanadi).
import { useEffect, useState } from "react";
import { ChevronRight, Equal, EqualNot, Eye, EyeOff, Volume2 } from "lucide-react";
import { say } from "../lib/audio";
import { loadData } from "../lib/data";
import { itemsOf, normAr, picOf, usePics, type Item } from "../lib/practice";
import { knownOf } from "../lib/store";
import { posLabel, type WordCard } from "../lib/words";
import { useNav } from "../state/nav";
import { Ar, ScreenHeader, SectionTitle } from "../ui/kit";
import { toast } from "../ui/Toast";
import { synAntConf } from "./Review";
import { unitLbl, useRBook, type RBook } from "./Rules";

type WF = Record<string, WordCard>;
const wfOf = (wf: WF, ar: string, u: number) => wf[`${ar}#u${u}`] || wf[ar] || null;
const VLAB = ["moziy", "muzoriy", "amr", "masdar"];
const tyLabel = (t?: string) => (t === "boshqa" ? "" : posLabel(t));

function useWf(bookId: string) {
  const [wf, setWf] = useState<WF | null>(null);
  useEffect(() => { let a = true; loadData<WF>(`wf/${bookId}`).then((x) => a && setWf(x)).catch(() => a && setWf({})); return () => { a = false; }; }, [bookId]);
  return wf;
}

/** fe'l: 4 shakl (moziy, muzoriy, amr, masdar); ot: ko'plik */
function Forms({ w, big }: { w: WordCard | null; big?: boolean }) {
  if (!w) return null;
  if (w.v && w.v.length === 4) return <span className={`vgrid ${big ? "big" : ""}`} dir="rtl">{w.v.map((x, i) => <span key={i}><Ar>{x}</Ar><small>{VLAB[i]}</small></span>)}</span>;
  if (w.pl) return <span className={`forms ${big ? "big" : ""}`}>ko'plik: <Ar>{w.pl}</Ar></span>;
  return null;
}

// ===== misollar: so'z gapda belgilanadi (eski markSub / markTok, xatolari bilan aynan — §7.24) =====
type Seg = { t: string; m?: boolean };
const arCore = (s: string) => normAr(s).replace(/^(ال|و|ف|ب|ل)+/, "");
function markTok(sent: string, word: string): Seg[] | null {
  const c = arCore(word.split(/\s+/)[0]);
  if (c.length < 2) return null;
  let hit = false;
  const out = sent.split(/(\s+)/).map((t): Seg => {
    if (hit || /^\s+$/.test(t)) return { t };
    const n = normAr(t);
    if (n.length >= c.length && (arCore(t).startsWith(c.slice(0, Math.max(3, c.length - 1))) || n.includes(c))) { hit = true; return { t, m: true }; }
    return { t };
  });
  return hit ? out : null;
}
function markSub(sent: string, sub?: string): Seg[] | null {
  const i = sub ? sent.indexOf(sub) : -1;
  if (!sub || i < 0) return null;
  return [{ t: sent.slice(0, i) }, { t: sub, m: true }, { t: sent.slice(i + sub.length) }];
}
/** WF misollari (hammasi) + kitob gaplaridan so'z uchraganlari (tarjimasi takrorlanmasa), ko'pi bilan 4 ta */
function examplesFor(book: RBook, wf: WF, ar: string, un: number) {
  const out: { s: Seg[]; tr: string }[] = [];
  for (const e of wfOf(wf, ar, un)?.ex || []) out.push({ s: markSub(e[0], e[2]) || markTok(e[0], ar) || [{ t: e[0] }], tr: e[1] });
  for (const u of book.units) for (const s of book.sent?.[u.n] || []) {
    if (out.length >= 4) break;
    const h = markTok(s[0], ar);
    if (h && !out.some((o) => o.tr === s[1])) out.push({ s: h, tr: s[1] });
  }
  return out.slice(0, 4);
}
/** 1..u vahdalardagi sinonim/antonim juftlari soni (eski synAntPool) */
function synAntCount(book: RBook, wf: WF, un: number) {
  let n = 0;
  for (const u of book.units) if (u.n <= un) for (const [ar] of u.words) { const c = wfOf(wf, ar, u.n); n += (c?.syn?.length || 0) + (c?.ant?.length || 0); }
  return n;
}

export function WordsScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { go } = useNav();
  const book = useRBook(bookId);
  const wf = useWf(bookId);
  usePics();
  const [hide, setHide] = useState(false);
  const [peek, setPeek] = useState<string[]>([]);
  const u = book?.units.find((x) => x.n === unitN);
  if (!book || !u || !wf) return <main className="screen"><ScreenHeader title="So'zlar" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const known = knownOf(bookId, unitN);
  const items = itemsOf(u);
  const row = (it: Item) => {
    const hidden = hide && !peek.includes(it.ar);
    const pic = picOf(it.ar);
    return (
      <div key={`${it.kind}${it.ar}`} className={`wrow ${known[it.ar] ? "known" : ""}`}>
        <button type="button" className="wrow-main" aria-label={hidden ? `${it.ar} — tarjimani ko'rish` : `${it.uz} — batafsil`}
          onClick={() => (hidden ? setPeek([...peek, it.ar]) : go("word", { book: bookId, unit: unitN, ar: it.ar }))}>
          {pic ? <img className="wrow-pic" src={pic} alt="" /> : <span className="wrow-pic ph" aria-hidden><Ar>{it.ar.trim()[0]}</Ar></span>}
          <span className="wrow-tx">
            <Ar className="wrow-ar">{it.ar}</Ar>
            <span className={`wrow-uz ${hidden ? "hid" : ""}`}>{hidden ? "Tarjimani ko'rish" : it.uz}</span>
            {it.hint && !hidden && <span className="chip">o'zb.: {it.hint}</span>}
            {it.kind === "w" && <Forms w={wfOf(wf, it.ar, u.n)} />}
          </span>
          <ChevronRight size={18} className="wrow-go" aria-hidden />
        </button>
        <button type="button" className="say sm" aria-label="Tinglash" onClick={() => void say(it.ar)}><Volume2 size={20} aria-hidden /></button>
      </div>
    );
  };
  const words = items.filter((x) => x.kind === "w"), phr = items.filter((x) => x.kind === "p");
  return (
    <main className="screen">
      <ScreenHeader title={`${unitLbl(u)} · So'zlar`} ar={u.ar} />
      <div className="wl-top">
        <button type="button" className="btn ghost" aria-pressed={hide} onClick={() => { setHide(!hide); setPeek([]); }}>
          {hide ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}{hide ? "Tarjimani ko'rsatish" : "Tarjimani yashirish"}
        </button>
        {hide && <small className="muted">Tarjima yashirilganda, uni ko'rish uchun so'z ustiga bosing.</small>}
      </div>
      <SectionTitle ar="الْمُفْرَدَاتُ" uz={`Yangi so'zlar · ${words.length}`} />
      <div className="wlist">{words.map(row)}</div>
      {phr.length > 0 && <><SectionTitle ar="التَّرَاكِيبُ" uz={`Iboralar · ${phr.length}`} /><div className="wlist">{phr.map(row)}</div></>}
    </main>
  );
}

export function WordScreen({ bookId, unitN, ar }: { bookId: string; unitN: number; ar: string }) {
  const { go, replace } = useNav();
  const book = useRBook(bookId);
  const wf = useWf(bookId);
  usePics();
  if (!book || !wf) return <main className="screen"><ScreenHeader title="So'z" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const u = book.units.find((x) => x.n === unitN) || book.units[0];
  const it: Item = itemsOf(u).find((x) => x.ar === ar) || { ar, uz: "", kind: "w", u: u.n };
  const w = it.kind === "w" ? wfOf(wf, it.ar, u.n) : null;
  const ex = examplesFor(book, wf, it.ar, u.n);
  const hasRel = !!w && !!((w.syn && w.syn.length) || (w.ant && w.ant.length));
  const pic = picOf(it.ar);
  const ty = [tyLabel(w?.t), it.kind === "p" ? "ibora" : "", book.title.replace("Manhaj ", "")].filter(Boolean).join(" · ");
  const synAnt = async () => {
    const start = async (again: boolean) => {
      const conf = await synAntConf(bookId, u.n, () => void start(true)).catch(() => null);
      if (!conf) { toast("Bu vahdada hali sinonim va antonim yo'q"); return; }
      (again ? replace : go)("qs", { conf, n: Date.now() });
    };
    await start(false);
  };
  const rel = (list: string[][] | undefined, empty: string) => (!list || !list.length ? <p className="wc-empty">{empty}</p> : (
    <ul className="wc-rel">{list.map((x, k) => <li key={k}><span><b>{x[1] || ""}</b>{x[2] && <small>{x[2]}</small>}</span><Ar>{x[0]}</Ar></li>)}</ul>
  ));
  return (
    <main className="screen">
      <ScreenHeader title={`${unitLbl(u)} · ${u.uz}`} />
      <section className="card wc-head">
        {pic && <img className="wc-pic" src={pic} alt="" />}
        <Ar className="wc-ar">{it.ar}</Ar>
        {it.uz && <b className="wc-uz">{it.uz}</b>}
        {ty && <span className="wc-ty">{ty}</span>}
        <button type="button" className="say" aria-label="Tinglash" onClick={() => void say(it.ar)}><Volume2 size={22} aria-hidden /></button>
        <Forms w={w} big />
      </section>
      <h2 className="wc-sec">Misollar</h2>
      {ex.length ? (
        <ul className="wc-ex">{ex.map((e, k) => (
          <li key={k}><p className="ar" dir="rtl" lang="ar">{e.s.map((s, j) => (s.m ? <mark key={j} className="hlw">{s.t}</mark> : s.t))}</p><span>{e.tr}</span></li>
        ))}</ul>
      ) : <p className="wc-empty">Bu so'z uchun misollar tez orada qo'shiladi.</p>}
      {it.kind === "w" && (
        <>
          <h2 className="wc-sec syn"><Equal size={16} aria-hidden />Sinonimlar · ma'nodosh</h2>
          {rel(w?.syn, "Bu so'zning keng tarqalgan sinonimi yo'q.")}
          <h2 className="wc-sec ant"><EqualNot size={16} aria-hidden />Antonimlar · zid ma'noli</h2>
          {rel(w?.ant, "Bu so'zning antonimi yo'q.")}
        </>
      )}
      {(hasRel || synAntCount(book, wf, u.n) >= 4) && <button type="button" className="btn primary wide wc-sa" onClick={() => void synAnt()}>Sinonim va antonim mashqi</button>}
    </main>
  );
}
