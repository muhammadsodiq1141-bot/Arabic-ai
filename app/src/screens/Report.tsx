// 11.11.2026 (U1, U4): ustoz uchun «Dars oldidan» hisobot va «4 yo'l» paneli.
// Ma'lumot: groupMembers (har o'quvchining _sum: uk — vahda yodlangan so'zlari, ut — vahda testlari, kb — kitob mashqlari, sm — shu haftaning
// 4 yo'l vaqti, er — xatolar daftari), hwList + hwStatus (oxirgi uy vazifasi), kitob fayli (vahda so'zlari). Eslatma — server «remind» (api 21).
import { useEffect, useMemo, useState } from "react";
import { BellRing, ClipboardList, Presentation, Volume2 } from "lucide-react";
import { api } from "../lib/api";
import { say } from "../lib/audio";
import { loadData } from "../lib/data";
import { loadLex, lookup, type Lex } from "../lib/lex";
import { dayKey, weekId, type Book } from "../lib/progress";
import { store } from "../lib/store";
import { STRANDS, type Strand } from "../lib/strand";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import type { Member } from "./Teacher";

type Hw = { id: number; group_code: string; book: string; unit: number; title: string; due: string; teacher?: boolean };
type HwRow = { n: string; lg: string; done: boolean; progress: Record<string, unknown> | null };
const SK: Strand[] = ["i", "o", "f", "r"];
const SNAME: Record<Strand, string> = { i: "tinglash", o: "gapirish", f: "til shakli", r: "ravonlik" };
const daysAgo = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null);
const nm = (m: Member) => m.full_name || m.name;
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const fmtMin = (sec: number) => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)} soat ${m % 60} daqiqa` : `${m} daqiqa`; };
const OY = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const fmtDay = (d: string) => { const [, m, dd] = d.split("-").map(Number); return `${dd}-${OY[m - 1] || m}`; };
/** o'quvchining shu haftasi: ulushlar (0..1) va jami soniya */
function mixOf(m: Member) {
  const s = m.sum?.sm as Record<Strand, number> | undefined;
  const tot = s ? SK.reduce((a, k) => a + (s[k] || 0), 0) : 0;
  return { tot, sh: Object.fromEntries(SK.map((k) => [k, tot ? (s![k] || 0) / tot : 0])) as Record<Strand, number> };
}
/** guruh: guruhning eng kam yo'li bo'yicha sinfga taklif */
const TIP: Record<Strand, string> = {
  o: "darsda 4/3/2 mashqi yoki rol kartalari — har kim gapirsin",
  i: "darsda vahda matnini birga tinglang (sekin, 0.75×) yoki multfilm qismini ko'ring",
  r: "darsda tez javob o'yini yoki 4/3/2 — bilganini tez ishlatish",
  f: "darsda so'z va qoida takrori — ustoz diktanti",
};

function useGroupData(code: string) {
  const [mem, setMem] = useState<Member[] | null | "err">(null);
  const [hw, setHw] = useState<Hw | null | undefined>(undefined);
  const [rows, setRows] = useState<HwRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    api<{ members: Member[] }>("groupMembers", { code, week: weekId() }).then((r) => alive && setMem(r.members || [])).catch(() => alive && setMem("err"));
    api<{ items: Hw[] }>("hwList").then((r) => {
      const mine = (r.items || []).filter((h) => h.teacher && h.group_code === code);
      const today = dayKey();
      // oxirgi uy vazifasi: muddati kelmaganlarning eng yaqini, bo'lmasa — eng oxirgisi
      const next = mine.filter((h) => h.due >= today).sort((a, b) => a.due.localeCompare(b.due))[0] || mine.sort((a, b) => b.due.localeCompare(a.due))[0] || null;
      if (!alive) return;
      setHw(next);
      if (next) api<{ rows: HwRow[] }>("hwStatus", { id: next.id }).then((x) => alive && setRows(x.rows || [])).catch(() => alive && setRows([]));
    }).catch(() => alive && setHw(null));
    return () => { alive = false; };
  }, [code]);
  return { mem, hw, rows };
}

// ===== U1: dars oldidan =====
export function TeacherReportScreen({ code }: { code: string }) {
  const { go } = useNav();
  const { me } = useSession();
  const { mem, hw, rows } = useGroupData(code);
  const list = mem && mem !== "err" ? mem : [];
  const gTitle = me?.myGroups?.find((g) => g.code === code)?.title || code;
  // kitob: oxirgi vazifaniki, bo'lmasa — o'quvchilarning ko'pchiligi o'qiyotgani
  const book0 = useMemo(() => {
    if (hw?.book) return hw.book;
    const c: Record<string, number> = {};
    for (const m of list) if (m.sum?.book) c[m.sum.book] = (c[m.sum.book] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || "a1";
  }, [hw, list]);
  const [unit, setUnit] = useState<number | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [lex, setLex] = useState<Lex | null>(null); // qiyin so'z boshqa kitobdan bo'lsa — tarjima umumiy lug'atdan
  useEffect(() => { if (book0 !== "a0") loadData<Book>(`books/${book0}`).then(setBook).catch(() => setBook(null)); }, [book0]);
  useEffect(() => { loadLex().then(setLex).catch(() => {}); }, []);
  const u = unit ?? hw?.unit ?? 1;
  const unitObj = book?.units.find((x) => x.n === u);
  const N = list.length;

  // tayyorlik ko'rsatkichlari
  const met = useMemo(() => {
    const words = unitObj?.words.length || 0;
    const onBook = list.filter((m) => m.sum?.book === book0);
    const learned = words ? onBook.filter((m) => ((m.sum?.uk as Record<string, number> | undefined)?.[String(u)] || 0) >= words * 0.8).length : 0;
    const tests = list.map((m) => (m.sum?.book === book0 ? (m.sum?.ut as Record<string, number> | undefined)?.[String(u)] : undefined)).filter((v): v is number => typeof v === "number");
    const kb = list.filter((m) => { const k = m.sum?.kb?.[`${book0}:${u}`]; return !!k && k[0] >= k[1]; }).length;
    const sameHw = !!hw && hw.book === book0 && hw.unit === u;
    const hwDone = sameHw && rows ? rows.filter((r) => r.done).length : null;
    return { learned, tests: tests.length, testAvg: tests.length ? Math.round(tests.reduce((a, b) => a + b, 0) / tests.length) : null, kb, hwDone, sameHw };
  }, [list, unitObj, book0, u, hw, rows]);

  // qiyin so'zlar: xatolar daftari, guruh bo'yicha (nechta o'quvchi)
  const hard = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of list) for (const e of ((m.sum?.er as [string, number, string][] | undefined) || [])) c.set(e[0], (c.get(e[0]) || 0) + 1);
    const uz = new Map<string, string>();
    for (const un of book?.units || []) for (const w of un.words) uz.set(w[0], w[1]);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ar, n]) => ({ ar, n, uz: uz.get(ar) || (lex ? lookup(lex, ar)?.uz : "") || "" }));
  }, [list, book, lex]);

  // kam qatnashganlar: 3+ kun kirmagan yoki vazifani boshlamagan
  const low = useMemo(() => list.map((m) => {
    const d = daysAgo(m.last_seen);
    const r = rows?.find((x) => x.lg && x.lg === m.login);
    const why = d === null ? "hali kirmagan" : d >= 3 ? `${d} kun kirmagan` : hw && r && !r.done && !r.progress ? "vazifa boshlanmagan" : "";
    return { m, why };
  }).filter((x) => x.why), [list, rows, hw]);

  // guruhning eng kam yo'li
  const gsum = useMemo(() => {
    const s: Record<Strand, number> = { i: 0, o: 0, f: 0, r: 0 };
    for (const m of list) { const x = m.sum?.sm as Record<Strand, number> | undefined; if (x) for (const k of SK) s[k] += x[k] || 0; }
    const tot = SK.reduce((a, k) => a + s[k], 0);
    const lowK = tot ? SK.reduce((a, k) => (s[k] < s[a] ? k : a), "i" as Strand) : null;
    return { s, tot, lowK };
  }, [list]);

  if (mem === null || hw === undefined) return <main className="screen"><ScreenHeader title="Dars oldidan" ar="قَبْلَ الدَّرْسِ" /><div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div></main>;
  if (mem === "err") return <main className="screen"><ScreenHeader title="Dars oldidan" ar="قَبْلَ الدَّرْسِ" /><Empty icon={<ClipboardList size={28} />} title="Hisobot yuklanmadi" text="Internetni tekshirib, qayta oching." /></main>;
  const pct = (a: number) => (N ? Math.round((a / N) * 100) : 0);
  return (
    <main className="screen rp">
      <ScreenHeader title="Dars oldidan" ar="قَبْلَ الدَّرْسِ" />
      <section className="rp-unit">
        <span><b>{gTitle} · {u}-vahda</b><small>{hw && hw.unit === u && hw.book === book0 ? `uy vazifasi muddati: ${fmtDay(hw.due)} · ` : ""}{N} o'quvchi</small></span>
        {book && (
          <select aria-label="Vahda" value={u} onChange={(e) => setUnit(Number(e.target.value))}>
            {book.units.map((x) => <option key={x.n} value={x.n}>{x.n}-vahda · {x.uz}</option>)}
          </select>
        )}
      </section>
      {unitObj && <Ar className="rp-uar">{unitObj.ar}</Ar>}
      <div className="rp-mets">
        <Met t="So'zlarni yodlagan" a={met.learned} n={N} p={pct(met.learned)} sub={unitObj ? `${unitObj.words.length} so'zning 80%+` : ""} />
        <Met t="Vahda testi" a={met.tests} n={N} p={pct(met.tests)} sub={met.testAvg !== null ? `o'rtacha ${met.testAvg}%` : ""} />
        <Met t="Kitob mashqlari" a={met.kb} n={N} p={pct(met.kb)} sub="hammasini bajargan" />
        {met.hwDone !== null ? <Met t="Uy vazifasi" a={met.hwDone} n={N} p={pct(met.hwDone)} sub="topshirgan" /> : <div className="rp-met none"><span>Uy vazifasi</span><b>—</b><small>shu vahdaga berilmagan</small></div>}
      </div>

      <section className="card rp-card">
        <b>Eng ko'p adashtirilgan so'zlar</b><small>xatolar daftaridan · guruh bo'yicha</small>
        {hard.length ? hard.map((h, i) => (
          <button key={h.ar} type="button" className="rp-w" onClick={() => void say(h.ar)} aria-label={`${h.uz || h.ar} — tinglash`}>
            <span className="rp-n">{i + 1}</span><Ar className="rp-ar">{h.ar}</Ar><span className="rp-uz">{h.uz}</span><em>{h.n} kishi</em><Volume2 size={16} aria-hidden />
          </button>
        )) : <p className="muted rp-empty">Hali ma'lumot yo'q — o'quvchilar mashq qilgani sari to'ladi.</p>}
      </section>

      {gsum.lowK && gsum.tot >= 30 * 60 && (
        <section className="rp-tip">
          <b>Sinfga taklif</b>
          <span>Bu hafta {SNAME[gsum.lowK]} kam — guruh vaqtining {Math.round((gsum.s[gsum.lowK] / gsum.tot) * 100)}%. Taklif: {TIP[gsum.lowK]}.</span>
          <button type="button" onClick={() => go("class")}><Presentation size={16} aria-hidden />Sinf rejimini ochish</button>
        </section>
      )}

      {/* ro'yxat o'zgarsa (uy vazifasi holati kech yuklanadi) — belgilar yangidan */}
      <Remind key={low.map((x) => x.m.kid).join(",") + (rows ? "+" : "")} code={code} low={low} hw={hw} />

      <button type="button" className="rowbtn" onClick={() => go("t4", { code })}>
        <span className="rp-ico" aria-hidden><i className="s-i" /><i className="s-o" /><i className="s-f" /><i className="s-r" /></span>
        <span><b>4 yo'l · guruh haftasi</b><small>{gsum.tot ? `Jami ${fmtMin(gsum.tot)} · har o'quvchining kam yo'li` : "Bu hafta hali ma'lumot yo'q"}</small></span>
      </button>
    </main>
  );
}

function Met({ t, a, n, p, sub }: { t: string; a: number; n: number; p: number; sub: string }) {
  return (
    <div className="rp-met"><span>{t}</span><b>{a} <small>/ {n}</small></b>
      <span className="rp-bar" aria-hidden><i className={p < 50 ? "lo" : ""} style={{ width: `${p}%` }} /></span>{sub && <small>{sub}</small>}</div>
  );
}

/** kam qatnashganlarga eslatma — Telegram'da ustoz nomidan; har o'quvchiga kuniga 1 marta (shu telefonda belgilanadi) */
function Remind({ code, low, hw }: { code: string; low: { m: Member; why: string }[]; hw: Hw | null }) {
  const key = `f.rmd.${code}`;
  const sent = store.get<Record<string, string>>(key, {});
  const today = dayKey();
  const can = low.filter((x) => sent[x.m.kid] !== today);
  const [sel, setSel] = useState<Set<string>>(() => new Set(can.map((x) => x.m.kid)));
  const [text, setText] = useState(hw ? `${hw.unit}-vahda vazifasini ${fmtDay(hw.due)} gacha bajarib keling. Ilovada sizni kutyapman!` : "Darsga tayyorlanib keling — ilovada sizni kutyapman!");
  const [busy, setBusy] = useState(false);
  const [, setN] = useState(0);
  if (!low.length) return <section className="card rp-card"><b>Kam qatnashgan</b><p className="muted rp-empty">Hamma faol — barakalla!</p></section>;
  const send = async () => {
    const kids = [...sel].filter((k) => sent[k] !== today);
    if (!kids.length) { toast("O'quvchini tanlang"); return; }
    if (text.trim().length < 5) { toast("Eslatma matnini yozing"); return; }
    setBusy(true);
    try {
      const r = await api<{ sent: number }>("remind", { code, kids, text: text.trim() });
      const S = store.get<Record<string, string>>(key, {}); for (const k of kids) S[k] = today; store.set(key, S);
      tg.haptic("success"); toast(`Eslatma yuborildi · ${r.sent} ta o'quvchi`); setN((x) => x + 1);
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
    setBusy(false);
  };
  return (
    <section className="card rp-card">
      <b>Kam qatnashgan · {low.length} kishi</b>
      {low.map(({ m, why }) => {
        const done = sent[m.kid] === today;
        return (
          <label key={m.kid} className={`rp-p${done ? " done" : ""}`}>
            <input type="checkbox" checked={!done && sel.has(m.kid)} disabled={done} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(m.kid)) n.delete(m.kid); else n.add(m.kid); return n; })} />
            <span className="rp-av" aria-hidden>{initials(nm(m))}</span>
            <span className="rp-pt"><b>{nm(m)}</b><small>{done ? "bugun eslatilgan" : why}</small></span>
          </label>
        );
      })}
      {can.length > 0 && (
        <>
          <label htmlFor="rp-txt" className="rp-lbl">Eslatma matni · Telegram'da sizning nomingizdan</label>
          <textarea id="rp-txt" className="fb-ans" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="btn dark wide" disabled={busy || ![...sel].some((k) => sent[k] !== today)} onClick={() => void send()}>
            <BellRing size={18} aria-hidden />{busy ? "Yuborilmoqda…" : `Eslatma yuborish · ${[...sel].filter((k) => sent[k] !== today).length} kishi`}
          </button>
        </>
      )}
    </section>
  );
}

// ===== U4: 4 yo'l =====
export function TeacherStrandsScreen({ code }: { code: string }) {
  const { mem } = useGroupData(code);
  const list = mem && mem !== "err" ? mem : [];
  const g = useMemo(() => {
    const s: Record<Strand, number> = { i: 0, o: 0, f: 0, r: 0 };
    for (const m of list) { const x = m.sum?.sm as Record<Strand, number> | undefined; if (x) for (const k of SK) s[k] += x[k] || 0; }
    return { s, tot: SK.reduce((a, k) => a + s[k], 0) };
  }, [list]);
  const rowsX = useMemo(() => list.map((m) => {
    const { tot, sh } = mixOf(m);
    const lowK = SK.reduce((a, k) => (sh[k] < sh[a] ? k : a), "i" as Strand);
    return { m, tot, sh, lowK, low: sh[lowK] };
  }).sort((a, b) => (a.tot < 60 ? 1 : 0) - (b.tot < 60 ? 1 : 0) || a.low - b.low), [list]);
  return (
    <main className="screen rp">
      <ScreenHeader title="4 yo'l · guruh haftasi" ar="الطُّرُقُ الْأَرْبَعُ" />
      {mem === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div>}
      {mem === "err" && <p className="err">Ma'lumot yuklanmadi. Internetni tekshiring.</p>}
      {mem && mem !== "err" && (
        <>
          <div className="rp-leg">{STRANDS.map((s) => <span key={s.k}><i className={`s-${s.k}`} />{s.t}</span>)}</div>
          <section className="card rp-card">
            <b>Guruh · shu hafta</b>
            {SK.map((k) => {
              const p = g.tot ? Math.round((g.s[k] / g.tot) * 100) : 0;
              return <div key={k} className="rp-sr"><span>{STRANDS.find((s) => s.k === k)!.t}</span><span className="rp-tr"><i className={`s-${k}`} style={{ width: `${p}%` }} /><u style={{ left: "25%" }} /></span><b>{p}%</b></div>;
            })}
            <small>{g.tot ? `Chiziq — maqsad: har yo'lga taxminan teng (25%). Jami ${fmtMin(g.tot)}.` : "Bu hafta hali ma'lumot yo'q — o'quvchilar yangi ilovada ishlaganda to'ladi."}</small>
          </section>
          <section className="card rp-card">
            <b>O'quvchilar · kam yo'l bo'yicha</b>
            {rowsX.map(({ m, tot, sh, lowK, low }) => (
              <div key={m.kid} className="rp-stu">
                <span><b>{nm(m)}</b>{tot < 60 ? <small className="mu">bu hafta yo'q</small> : low >= 0.15 ? <small className="ok">muvozanatli · {fmtMin(tot)}</small> : <small>{SNAME[lowK]} {Math.round(low * 100)}% · {fmtMin(tot)}</small>}</span>
                <span className="rp-mix" aria-label={tot ? SK.map((k) => `${SNAME[k]} ${Math.round(sh[k] * 100)}%`).join(", ") : "ma'lumot yo'q"}>
                  {tot >= 60 && SK.map((k) => <i key={k} className={`s-${k}`} style={{ width: `${sh[k] * 100}%` }} />)}
                </span>
              </div>
            ))}
          </section>
          <p className="muted rp-note">Vaqt ilova ichida hisoblanadi: multfilm va kitob audiosi — tinglash; yakka gapirish, shadowing, javob yozish — gapirish; so'z, qoida, test — til shakli; tez javob o'yinlari — ravonlik.</p>
        </>
      )}
    </main>
  );
}
