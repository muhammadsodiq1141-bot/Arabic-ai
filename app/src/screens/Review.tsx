// Takrorlash: Xatolar daftari (f.err), Sokin takrorlash (SRS, 5 so'z), Siz bilasiz (KNOWN_WORDS, f.kw), Sinonim va antonim (WF).
// Mantiq va kalitlar eski ilova bilan bir xil (MASHQ-SPEC §1.10, §4–§6).
import { useEffect, useMemo, useState } from "react";
import { Check, Moon, RotateCcw, Sparkles, Volume2, X } from "lucide-react";
import { say } from "../lib/audio";
import { loadData } from "../lib/data";
import { allItems, dayNum, normAr, srsOf, srsSet, type Err, type Item, type PBook } from "../lib/practice";
import { dayKey, hash } from "../lib/progress";
import { gain, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle, strip, type WordCard } from "../lib/words";
import { useNav } from "../state/nav";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import type { QConf, QItem } from "./Quiz";

const BOOK_IDS = ["a1", "a2", "b1", "b2", "c1", "md1", "md2"];
const loadBook = (id: string) => loadData<PBook>(`books/${id}`);

// ===== Xatolar daftari =====
export function ErrorsScreen() {
  const { go } = useNav();
  const [E] = useState(() => store.get<Err>("f.err", {}));
  const list = Object.values(E).sort((a, b) => b.n - a.n).slice(0, 40);
  const [tr, setTr] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = [...new Set(list.map((e) => e.b).filter((b) => BOOK_IDS.includes(b)))];
    Promise.all(ids.map((id) => loadBook(id).catch(() => null))).then((bs) => {
      const m: Record<string, string> = {};
      for (const b of bs) if (b) for (const it of allItems(b)) { const k = strip(it.ar); if (!m[k]) m[k] = it.uz; }
      setTr(m);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const start = async () => {
    const top = list.slice(0, 10);
    const books = await Promise.all([...new Set(top.map((e) => e.b))].filter((b) => BOOK_IDS.includes(b)).map((id) => loadBook(id).catch(() => null)));
    const all = books.flatMap((b) => (b ? allItems(b).map((x) => ({ ...x, b: b.id })) : []));
    const items = top.map((e) => all.find((x) => strip(x.ar) === strip(e.ar))).filter(Boolean) as (Item & { b: string })[];
    if (!items.length) return;
    const distr = all.filter((x) => x.b === items[0].b);
    const qs: QItem[] = items.map((it) => {
      const ds = shuffle(distr.filter((x) => x.uz !== it.uz)).slice(0, 3);
      const opts = shuffle([it, ...ds]);
      return { q: it.ar, qAr: true, hint: "Tarjimasini tanlang", opts: opts.map((x) => x.uz), ans: opts.indexOf(it), it: { ar: it.ar, b: it.b } };
    });
    const conf: QConf = {
      title: "Xatolar ustida ishlash", items: qs,
      onEnd: (score) => { gain("fc", score * 2); return { title: "Xatolar ustida ishladingiz", sub: "Har to'g'ri javob so'zni daftardan bir qadam chiqaradi.", xp: score * 2 }; },
    };
    go("qs", { conf });
  };
  return (
    <main className="screen">
      <ScreenHeader title="Xatolar daftari" ar="دَفْتَرُ الْأَخْطَاءِ" />
      {list.length === 0 ? (
        <Empty icon={<Sparkles size={28} />} title="Xatolar yo'q — zo'r!" text="Mashq qilganda noto'g'ri topilgan so'zlar shu yerga tushadi va keyin alohida takrorlanadi." />
      ) : (
        <>
          <section className="card er-head">
            <b>{Object.keys(E).length} ta so'z takrorlashni kutyapti</b>
            <span>To'g'ri topilgan so'z ro'yxatdan o'zi chiqib ketadi</span>
            <button type="button" className="btn primary wide" onClick={() => void start()}><RotateCcw size={18} aria-hidden />Xatolar ustida ishlash · {Math.min(10, list.length)} ta savol</button>
          </section>
          <ul className="slist">
            {list.map((e) => (
              <li key={e.ar} className="srow">
                <button type="button" className="say" aria-label="Tinglash" onClick={() => void say(e.ar)}><Volume2 size={22} aria-hidden /></button>
                <span className="st"><Ar className="st-ar">{e.ar}</Ar><span>{tr[strip(e.ar)] || ""}</span></span>
                <span className="er-n" aria-label={`${e.n} marta xato`}><X size={14} aria-hidden />{e.n}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

// ===== Sokin takrorlash (uyqudan oldin 5 so'z) =====
export function NightScreen({ bookId }: { bookId: string }) {
  const { back } = useNav();
  const [items, setItems] = useState<Item[] | null>(null);
  const [book, setBook] = useState<PBook | null>(null);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [ok, setOk] = useState(0);
  const [fin, setFin] = useState(false);
  useEffect(() => {
    loadBook(bookId).then((b) => {
      setBook(b);
      const all = allItems(b), S = srsOf(b.id), now = dayNum();
      const seen = all.filter((x) => S[x.ar]);
      const pool = seen.length >= 5 ? seen : all;
      const due = all.filter((x) => S[x.ar] && S[x.ar].d <= now);
      const uniq: Item[] = [];
      for (const x of shuffle([...due, ...shuffle(pool)])) if (!uniq.some((y) => y.ar === x.ar)) { uniq.push(x); if (uniq.length >= 5) break; }
      setItems(uniq);
    }).catch(() => setItems([]));
  }, [bookId]);
  const mark = (good: boolean) => {
    if (!book || !items) return;
    srsSet(book, items[i].ar, good);
    const nok = ok + (good ? 1 : 0);
    setOk(nok); setShow(false);
    if (i + 1 >= items.length) { store.set("f.night", store.get("f.night", 0) + 1); gain("fc", 10); setFin(true); tg.haptic("success"); }
    else setI(i + 1);
  };
  return (
    <main className="round night">
      <header className="r-top">
        <button type="button" className="r-close" aria-label="Chiqish" onClick={back}><X size={22} aria-hidden />Chiqish</button>
        <b>Sokin takrorlash</b>
        <span className="r-count">{items ? `${Math.min(i + 1, items.length)} / ${items.length}` : ""}</span>
      </header>
      {!items && <p className="pad">Yuklanmoqda…</p>}
      {items && !items.length && <p className="pad">Takrorlash uchun so'z yo'q.</p>}
      {items && items.length > 0 && !fin && (
        <section className="nt-card">
          <Moon size={30} aria-hidden className="nt-moon" />
          <span className="nt-l">Uyqudan oldin takrorlash</span>
          <Ar className="nt-ar">{items[i].ar}</Ar>
          {!show ? (
            <button type="button" className="btn ghost wide" onClick={() => { setShow(true); void say(items[i].ar); }}>Tarjimasini ko'rish</button>
          ) : (
            <>
              <b className="nt-uz">{items[i].uz}</b>
              <div className="r-cmp two">
                <button type="button" className="btn ghost" onClick={() => mark(false)}>Yana ko'ray</button>
                <button type="button" className="btn primary" onClick={() => mark(true)}><Check size={18} aria-hidden />Esladim</button>
              </div>
            </>
          )}
        </section>
      )}
      {fin && items && (
        <div className="r-done">
          <Moon size={56} aria-hidden className="nt-moon" />
          <h1>Xayrli tun</h1>
          <p>{ok} / {items.length} so'z esda. Ertaga ular yanada mustahkam bo'ladi.</p>
          <button type="button" className="btn primary wide" onClick={back}>Yopish</button>
        </div>
      )}
    </main>
  );
}

// ===== Siz bilasiz (o'zbek tilidagi arabcha so'zlar) =====
type KW = [string, string, string];
export function KnownWordsScreen() {
  const { go, replace } = useNav();
  const [K, setK] = useState<KW[] | null>(null);
  useEffect(() => { loadData<KW[]>("KNOWN_WORDS").then(setK).catch(() => setK([])); }, []);
  const kw = store.get<Record<string, number>>("f.kw", {});
  const today = useMemo(() => {
    if (!K || !K.length) return [];
    const start = (hash(dayKey()) * 7) % K.length;
    return Array.from({ length: 12 }, (_, i) => K[(start + i) % K.length]);
  }, [K]);
  if (!K) return <main className="screen"><ScreenHeader title="Siz bilasiz" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const got = Object.keys(kw).length;
  // again=true — test ekrani yangisi bilan almashtiriladi (ustiga qo'shilmaydi)
  const play = (again = false) => {
    const pick: KW[] = [];
    for (const x of shuffle([...today, ...shuffle(K).slice(0, 10)])) if (!pick.some((y) => y[0] === x[0])) { pick.push(x); if (pick.length >= 10) break; }
    const items: QItem[] = pick.map((x) => {
      const ds = shuffle(K.filter((y) => y[1] !== x[1])).slice(0, 3);
      const opts = shuffle([x, ...ds]);
      return { q: x[0], hint: "Bu so'zning arabcha asli qaysi?", opts: opts.map((o) => o[1]), optsAr: true, ans: opts.indexOf(x) };
    });
    const conf: QConf = {
      title: "Tanish so'zlar", items, track: false,
      onOk: (it) => { const m = store.get<Record<string, number>>("f.kw", {}); m[it.q] = 1; store.set("f.kw", m); },
      onEnd: (score) => {
        gain("fc", score * 2);
        return { title: "Ajoyib!", sub: `Siz ${Object.keys(store.get("f.kw", {})).length} ta tanish so'zni arabchada taniysiz.`, xp: score * 2, again: () => play(true), againLabel: "Yana o'ynash" };
      },
    };
    (again ? replace : go)("qs", { conf, n: Date.now() });
  };
  return (
    <main className="screen kw">
      <ScreenHeader title="Siz allaqachon bilasiz!" ar="أَنْتَ تَعْرِفُ" />
      <section className="kw-hero">
        <span className="kw-n">{K.length}</span>
        <p>O'zbek tiliga arab tilidan kirgan so'z — kundalik hayotda ishlatasiz. Endi ularning arabcha shaklini taniymiz. Siz {got} tasini arabchada tanidingiz.</p>
        <span className="mk-b" role="progressbar" aria-label="Tanilgan so'zlar" aria-valuenow={got} aria-valuemin={0} aria-valuemax={K.length}><i style={{ width: `${(got / K.length) * 100}%` }} /></span>
      </section>
      <h2 className="t-h">Bugungi 12 ta tanish so'z <small>{today.filter((x) => kw[x[0]]).length}/12</small></h2>
      <ul className="kw-grid">
        {today.map((x) => (
          <li key={x[0]} className={kw[x[0]] ? "ok" : ""}>
            <b>{x[0]}</b><Ar className="kw-ar">{x[1]}</Ar>{x[2] && <small>{x[2]}</small>}
          </li>
        ))}
      </ul>
      <button type="button" className="btn primary wide kw-play" onClick={() => play()}>Tanish so'zlar o'yini · 10 savol</button>
    </main>
  );
}

// ===== Sinonim va antonim — savollar (eski synAntPool + variantlar) =====
export async function synAntConf(bookId: string, unit: number, again: () => void): Promise<QConf | null> {
  const [book, wf] = await Promise.all([loadBook(bookId), loadData<Record<string, WordCard>>(`wf/${bookId}`).catch(() => ({} as Record<string, WordCard>))]);
  type R = { k: "syn" | "ant"; ar: string; uz: string; u: number; a: string[] };
  const rel: R[] = [];
  const wfOf = (ar: string, n: number) => wf[`${ar}#u${n}`] || wf[ar];
  for (const u of book.units.filter((x) => x.n <= unit)) for (const [ar, uz] of u.words) {
    if (/×/.test(ar)) continue; // "كَثِيرٌ × قَلِيلٌ" kabi juft-yozuv — o'zi savol bo'lmaydi
    const c = wfOf(ar, u.n);
    if (!c) continue;
    for (const a of (c.syn || []) as string[][]) rel.push({ k: "syn", ar, uz, u: u.n, a });
    for (const a of (c.ant || []) as string[][]) rel.push({ k: "ant", ar, uz, u: u.n, a });
  }
  if (!rel.length) return null;
  const own = shuffle(rel.filter((r) => r.u === unit)), rest = shuffle(rel.filter((r) => r.u !== unit));
  const sel: R[] = [];
  for (const r of [...own, ...rest]) if (sel.length < 10 && !sel.some((s) => s.ar === r.ar)) sel.push(r);
  for (const r of [...own, ...rest]) if (sel.length < 10 && !sel.includes(r)) sel.push(r);
  const words = book.units.flatMap((u) => u.words.map(([ar, uz]) => ({ ar, uz, t: wfOf(ar, u.n)?.t })))
    .filter((w) => !/[×(]|بِـ/.test(w.ar));
  const items: QItem[] = sel.map((r) => {
    const c = wfOf(r.ar, r.u);
    const same = ((r.k === "syn" ? c?.syn : c?.ant) || []) as string[][];
    const other = ((r.k === "syn" ? c?.ant : c?.syn) || []) as string[][];
    const bad = new Set([normAr(r.ar), normAr(r.a[0]), ...same.map((x) => normAr(x[0]))]);
    const opts: string[] = [r.a[0]];
    const used = new Set([normAr(r.a[0])]);
    const add = (ar: string) => { const n = normAr(ar); if (opts.length < 4 && !bad.has(n) && !used.has(n)) { used.add(n); opts.push(ar); } };
    if (other[0]) add(other[0][0]);
    const t = c?.t;
    for (const w of shuffle(words.filter((w) => t && w.t === t))) add(w.ar);
    for (const w of shuffle(words)) add(w.ar);
    const sh = shuffle(opts);
    return {
      q: r.ar, qAr: true, optsAr: true, opts: sh, ans: sh.indexOf(r.a[0]),
      hint: `«${r.uz}» so'zining ${r.k === "syn" ? "SINONIMINI" : "ANTONIMINI"} toping`,
      why: r.k === "syn" ? `${r.ar} va ${r.a[0]} — ma'nodosh: «${r.uz}» ≈ «${r.a[1]}».` : `${r.ar} «${r.uz}» ≠ ${r.a[0]} «${r.a[1]}».`,
    };
  });
  return {
    title: "Sinonim va antonim", items, track: false, auto: false,
    onEnd: (score) => { gain("game", score * 2); return { title: "Sinonim va antonim", sub: "Ma'nodosh va zid so'zlar lug'atingizni boyitadi.", xp: score * 2, again, againLabel: "Yana o'ynash" }; },
  };
}
