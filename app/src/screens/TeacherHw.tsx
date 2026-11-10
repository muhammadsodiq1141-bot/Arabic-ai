// Ustoz: uy vazifalari — berilganlar ro'yxati (necha o'quvchi bajardi), "Kim bajardi?" (server "hwStatus"), o'chirish (ikki bosqich),
// yangi vazifa berish ("hwCreate": guruh, kitob, vahda, muddat, izoh). A0 kursi ham tanlanadi (eski ilovadagi kabi).
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, ClipboardList, FileCode2, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { dayKey } from "../lib/progress";
import { loadData, type BookIndex } from "../lib/data";
import { dueText } from "../lib/next";
import type { Book } from "../lib/progress";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { useTeacherGroup } from "./Teacher";
import { XTeacherCard } from "./XTask";
import type { XTask } from "../lib/xtask";

type Hw = { id: number; group_code: string; book: string; unit: number; title: string; due: string; teacher?: boolean; stats?: { total: number; done: number } };
type Row = { n: string; lg: string; done: boolean; progress: { words?: number; test?: number; rules?: number; grade?: number; avg?: number; auto?: boolean } | null };
type Units = { n: number; uz: string }[];

// kitob vahdalari nomi (A0 — mavzular ro'yxati)
async function unitsOf(book: string): Promise<Units> {
  if (book === "a0") return (await loadData<string[]>("A0_TOPICS")).map((uz, i) => ({ n: i + 1, uz }));
  return (await loadData<Book>(`books/${book}`)).units.map((u) => ({ n: u.n, uz: u.uz || "" }));
}

export function TeacherHwScreen({ code }: { code: string }) {
  const { go } = useNav();
  const [items, setItems] = useState<Hw[] | null | "err">(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [books, setBooks] = useState<BookIndex>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [xs, setXs] = useState<XTask[] | null>(null); // 3-paket 3-qism: qo'shimcha vazifalar
  useEffect(() => {
    let alive = true;
    api<{ items: XTask[] }>("xList").then((r) => alive && setXs((r.items || []).filter((x) => x.teacher && x.group_code === code))).catch(() => alive && setXs([]));
    return () => { alive = false; };
  }, [code]);

  useEffect(() => {
    let alive = true;
    loadData<BookIndex>("books/index").then((b) => alive && setBooks(b)).catch(() => {});
    api<{ items: Hw[] }>("hwList").then(async (r) => {
      const mine = (r.items || []).filter((h) => h.teacher && h.group_code === code).sort((a, b) => b.due.localeCompare(a.due));
      if (!alive) return;
      setItems(mine);
      const nm: Record<string, string> = {};
      for (const b of [...new Set(mine.map((h) => h.book))]) {
        try { for (const u of await unitsOf(b)) nm[`${b}:${u.n}`] = u.uz; } catch { /* */ }
      }
      if (alive) setNames(nm);
    }).catch(() => alive && setItems("err"));
    return () => { alive = false; };
  }, [code]);

  const bookTitle = (id: string) => (id === "a0" ? "A0 · Alifbo" : books.find((b) => b.id === id)?.title || id);
  const list = items && items !== "err" ? items : [];
  return (
    <main className="screen thw">
      <ScreenHeader title="Uy vazifalari" ar="الْوَاجِبَاتُ" actions={<button type="button" className="ibtn" aria-label="Yangi vazifa" onClick={() => go("thwnew", { code })}><Plus size={22} aria-hidden /></button>} />
      {items === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1].map((k) => <span key={k} />)}</div>}
      {items === "err" && <Empty icon={<ClipboardList size={28} />} title="Vazifalar yuklanmadi" text="Internetni tekshirib, ekranni qayta oching." />}
      {items && items !== "err" && !list.length && xs !== null && !xs.length && (
        <div className="empty">
          <span className="empty-ico" aria-hidden><ClipboardList size={28} /></span>
          <h2>Hali vazifa berilmagan</h2>
          <p>Vahdani tanlab, muddatini belgilang — o'quvchilar bosh sahifada ko'radi.</p>
          <button type="button" className="btn primary mk-go" onClick={() => go("thwnew", { code })}><Plus size={18} aria-hidden />Vazifa berish</button>
        </div>
      )}
      {/* 3-paket 3-qism: ustoz o'zi tuzgan vazifa (HTML material, matn/ovoz/surat javob, tanga) */}
      <button type="button" className="rowbtn xadd" onClick={() => go("txnew", { code })}>
        <FileCode2 size={22} aria-hidden /><span><b>Qo'shimcha vazifa berish</b><small>O'zingiz tuzgan topshiriq · HTML material yuklash mumkin</small></span><ChevronRight size={20} aria-hidden />
      </button>
      {!!xs?.length && (
        <>
          <h2 className="t-h">Qo'shimcha vazifalar<small>{xs.length} ta</small></h2>
          <ul className="th-list">{xs.map((x) => <XTeacherCard key={x.id} x={x} onDeleted={() => setXs((l) => (l || []).filter((y) => y.id !== x.id))} />)}</ul>
          {list.length > 0 && <h2 className="t-h">Kitob vazifalari</h2>}
        </>
      )}
      <ul className="th-list">
        {list.map((h) => (
          <HwCard key={h.id} h={h} title={`${bookTitle(h.book)} · ${h.unit}-${h.book === "a0" ? "dars" : "vahda"}`} unitName={names[`${h.book}:${h.unit}`] || ""}
            open={open === h.id} onToggle={() => setOpen(open === h.id ? null : h.id)}
            onDeleted={() => setItems((l) => (l && l !== "err" ? l.filter((x) => x.id !== h.id) : l))} />
        ))}
      </ul>
    </main>
  );
}

function HwCard({ h, title, unitName, open, onToggle, onDeleted }: { h: Hw; title: string; unitName: string; open: boolean; onToggle: () => void; onDeleted: () => void }) {
  const [rows, setRows] = useState<Row[] | null | "err">(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  // 3-paket: topshirgan, lekin baholanmaganlarga ilova bahosi (o'rtacha %) bo'yicha baho va tanga
  const toGrade = rows && rows !== "err" ? rows.filter((r) => r.done && r.progress && !r.progress.grade && Number.isFinite(Number(r.progress.avg))).length : 0;
  const autoGrade = async () => {
    setBusy(true);
    try {
      const r = await api<{ n: number; coins: number }>("hwAutoGrade", { id: h.id });
      tg.haptic("success"); toast(r.n ? `${r.n} ta o'quvchi baholandi · jami ${r.coins} tanga` : "Baholanadigan javob qolmadi");
      setRows(null);
    } catch (e) { toast(e instanceof Error ? e.message : "Baholanmadi"); }
    setBusy(false);
  };
  useEffect(() => {
    if (!open || rows) return;
    api<{ rows: Row[] }>("hwStatus", { id: h.id }).then((r) => setRows(r.rows || [])).catch(() => setRows("err"));
  }, [open, rows, h.id]);
  const st = h.stats || { total: 0, done: 0 };
  const p = st.total ? Math.round((st.done / st.total) * 100) : 0;
  const late = dueText(h.due) === "Muddati o'tdi";
  const del = async () => {
    try { await api("hwDelete", { id: h.id }); tg.haptic("success"); toast("Vazifa o'chirildi"); onDeleted(); }
    catch (e) { toast(e instanceof Error ? e.message : "O'chirilmadi"); }
  };
  return (
    <li className="th-card">
      <div className="th-hd">
        <span className="th-t"><b>{title}</b>{unitName && <span>{unitName}</span>}{h.title && <em>«{h.title}»</em>}</span>
        <span className={`th-due ${late ? "late" : ""}`}>{dueText(h.due)}<small>{h.due.split("-").reverse().slice(0, 2).join(".")}</small></span>
      </div>
      <div className="th-prog">
        <span className="mk-b" role="progressbar" aria-label="Bajarganlar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${p}%` }} /></span>
        <b>{st.done} / {st.total} bajardi</b>
      </div>
      <button type="button" className="th-who" aria-expanded={open} onClick={onToggle}>Kim bajardi?<ChevronDown size={18} aria-hidden /></button>
      {open && (
        <div className="th-rows">
          {rows === null && <p className="muted">Yuklanmoqda…</p>}
          {rows === "err" && <p className="err">Ro'yxat yuklanmadi</p>}
          {rows && rows !== "err" && rows.map((r, i) => (
            <div key={i} className={`th-row ${r.done ? "ok" : ""}`}>
              <span className="th-mark" aria-label={r.done ? "Bajardi" : "Bajarmagan"}>{r.done ? <Check size={16} strokeWidth={3} aria-hidden /> : null}</span>
              <span className="th-n"><b>{r.n}</b><small>{r.lg}</small></span>
              <span className="th-p">{r.progress ? (r.progress.grade ? `Baho: ${r.progress.grade}/5${r.progress.auto ? " (ilova)" : ""}` : Number.isFinite(Number(r.progress.avg)) ? `Topshirdi · ilova ${Math.round(Number(r.progress.avg))}%` : `So'z ${r.progress.words ?? 0}% · test ${r.progress.test ?? 0}% · qoida ${r.progress.rules ?? 0}%`) : "boshlamagan"}</span>
            </div>
          ))}
          {toGrade > 0 && (
            <button type="button" className="btn primary wide th-auto" disabled={busy} onClick={() => void autoGrade()}>
              {busy ? "Baholanmoqda…" : `Ilova bahosi bo'yicha baholash · ${toGrade} ta`}
            </button>
          )}
          {toGrade > 0 && <small className="muted th-auto-n">90%+ → 5, 75%+ → 4, 60%+ → 3, kamroq → 2. Tanga bahoga yarasha tushadi. Yozma yoki ovozli javobni «Javoblar»da o'zingiz baholang.</small>}
          <div className="t-kick">
            {!sure
              ? <button type="button" className="btn ghost bad" onClick={() => setSure(true)}><Trash2 size={18} aria-hidden />Vazifani o'chirish</button>
              : <><span>O'chirilsinmi? O'quvchilar uni endi ko'rmaydi.</span>
                  <button type="button" className="btn ghost" onClick={() => setSure(false)}>Yo'q</button>
                  <button type="button" className="btn bad-fill" onClick={() => void del()}>Ha, o'chirish</button></>}
          </div>
        </div>
      )}
    </li>
  );
}

export function TeacherHwNewScreen({ code }: { code: string }) {
  const { replace } = useNav();
  const { groups } = useTeacherGroup();
  const [group, setGroup] = useState(code || groups[0]?.code || "");
  const [books, setBooks] = useState<BookIndex>([]);
  const [book, setBook] = useState("a1");
  const [units, setUnits] = useState<Units>([]);
  const [unit, setUnit] = useState(1);
  const plus3 = new Date(); plus3.setDate(plus3.getDate() + 3);
  const [due, setDue] = useState(dayKey(plus3));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { loadData<BookIndex>("books/index").then(setBooks).catch(() => {}); }, []);
  useEffect(() => { let a = true; unitsOf(book).then((u) => { if (a) { setUnits(u); setUnit(u[0]?.n || 1); } }).catch(() => {}); return () => { a = false; }; }, [book]);

  const submit = async () => {
    if (!group) { setErr("Guruhni tanlang."); return; }
    if (!due || due < dayKey()) { setErr("Muddat bugundan oldin bo'lmasin."); return; }
    setBusy(true); setErr("");
    try {
      await api("hwCreate", { group, book, unit, due, title: note.trim() });
      tg.haptic("success");
      replace("thw", { code: group });
      setTimeout(() => toast("Vazifa berildi — o'quvchilar bosh sahifada ko'radi"), 60); // ekran almashgach (almashishda eski xabar yopiladi)
    } catch (e) { setErr(e instanceof Error ? e.message : "Saqlanmadi"); setBusy(false); }
  };

  return (
    <main className="screen thwnew">
      <ScreenHeader title="Vazifa berish" ar="وَاجِبٌ جَدِيدٌ" />
      <form className="form card" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {groups.length > 1 && (
          <fieldset className="th-field"><legend>Guruh</legend>
            <div className="chips">{groups.map((g) => <button key={g.code} type="button" className={g.code === group ? "on" : ""} aria-pressed={g.code === group} onClick={() => setGroup(g.code)}>{g.title}</button>)}</div>
          </fieldset>
        )}
        <label>Kitob
          <select value={book} onChange={(e) => setBook(e.target.value)}>
            <option value="a0">A0 · Alifbo (Al-Manhaj)</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <label>{book === "a0" ? "Dars" : "Vahda"}
          <select value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
            {units.map((u) => <option key={u.n} value={u.n}>{u.n} · {u.uz}</option>)}
          </select>
        </label>
        <label>Muddat
          <input type="date" value={due} min={dayKey()} onChange={(e) => setDue(e.target.value)} />
          <small className="th-hint">{due ? dueText(due) : ""}</small>
        </label>
        <label>Izoh (ixtiyoriy)
          <input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: lug'atni yodlang, 2-mashqni yozma bajaring" />
        </label>
        <p className="th-cond">Vazifa bajarilgan hisoblanadi: so'zlar, so'z testi va qoidalar 80% dan yuqori bo'lsa{book === "a0" ? " (A0 da — o'quvchi topshirgach, siz baholaysiz)" : ""}.</p>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="btn primary wide" disabled={busy}>{busy ? "Saqlanmoqda…" : "Vazifani berish"}</button>
      </form>
    </main>
  );
}
