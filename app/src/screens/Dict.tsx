// 17-partiya: diktant. K7 (Nation 15, 18, 32, 43-betlar) — o'zi: kitob audiosidan 5 gap, eshitib yozadi, so'zma-so'z solishtiriladi.
// U7 (Nation 15, 39–40-betlar) — ustoz diktanti: ustoz darsda o'qiydi (Sinf rejimi), o'quvchi kodni kiritib yozadi, natija darhol,
// guruhdagi o'quvchi xohlasa ustozga yuboradi (mavjud «subSend» — server o'zgarmaydi).
// Tekshirish harakatsiz (alif shakllari bir xil), ـة va ـه farqlanadi. Matn kitobdagidek, to'g'ri javob to'liq harakat bilan ko'rsatiladi.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Keyboard, PenLine, Play, Send, Snail, Users } from "lucide-react";
import { preloadKitob, say } from "../lib/audio";
import { sendSub } from "../lib/kb";
import { gain, store } from "../lib/store";
import { checkDict, dictCode, dictPicks, parseDictCode, unitTexts, type Line, type WordMark } from "../lib/texts";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { ArKeys } from "../ui/ArKeys";
import { Ar, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

type Res = { marks: WordMark[]; pct: number; exact: boolean };
const keysOn = () => store.get<boolean>("f.arkeys", false);

/** Kirish: o'zi (kitob audiosi) yoki ustoz kodi bilan */
export function DictScreen({ bookId, unitN, mode, code, seed }: { bookId: string; unitN: number; mode?: string; code?: string; seed: number }) {
  if (mode === "self") return <DictRun bookId={bookId} unitN={unitN} seed={seed} teacher={null} />;
  const pc = code ? parseDictCode(code) : null;
  if (mode === "teacher" && pc) return <DictRun bookId={pc.book} unitN={pc.unit} seed={pc.seed} teacher={dictCode(pc.book, pc.unit, pc.seed)} />;
  return <DictStart bookId={bookId} unitN={unitN} />;
}

function DictStart({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { replace } = useNav();
  const [code, setCode] = useState("");
  const ok = !!parseDictCode(code);
  return (
    <main className="screen dict">
      <ScreenHeader title="Diktant" ar="الْإِمْلَاءُ" />
      <button type="button" className="card dict-pick" onClick={() => { tg.haptic(); replace("dict", { book: bookId, unit: unitN, mode: "self", n: Date.now() }); }}>
        <span className="dict-ic" aria-hidden><Play size={22} /></span>
        <span><b>O'zim · kitob audiosidan</b><small>{unitN}-vahda matnlaridan 5 gap. Tinglang, yozing — so'zma-so'z tekshiriladi.</small></span>
        <ChevronRight size={20} aria-hidden />
      </button>
      <form className="card dict-code" onSubmit={(e) => { e.preventDefault(); if (ok) replace("dict", { mode: "teacher", code: code.trim(), n: Date.now() }); }}>
        <span className="dict-ic" aria-hidden><Users size={22} /></span>
        <label htmlFor="dict-c"><b>Ustoz diktanti</b><small>Ustoz darsda aytgan kodni kiriting, masalan A1-3-27</small></label>
        <input id="dict-c" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="A1-3-27" autoComplete="off" inputMode="text" maxLength={12} />
        <button type="submit" className="btn primary wide" disabled={!ok}>Boshlash</button>
      </form>
    </main>
  );
}

function DictRun({ bookId, unitN, seed, teacher }: { bookId: string; unitN: number; seed: number; teacher: string | null }) {
  const { back, replace } = useNav();
  const { me } = useSession();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [k, setK] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [res, setRes] = useState<(Res | null)[]>([]);
  const [keys, setKeys] = useState(keysOn);
  const [sent, setSent] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let a = true;
    unitTexts(bookId, unitN).then((t) => {
      if (!a) return;
      const p = t ? dictPicks(t.lines, teacher ? seed : seed % 997) : [];
      setLines(p); setTyped(p.map(() => "")); setRes(p.map(() => null));
      if (p.length && !teacher) void preloadKitob(`${bookId}/${unitN}`, p.map((l) => l.ar));
    });
    return () => { a = false; };
  }, [bookId, unitN, seed, teacher]);
  const flipKeys = () => { store.set("f.arkeys", !keys); setKeys(!keys); };
  const total = useMemo(() => {
    const r = res.filter(Boolean) as Res[];
    return r.length ? Math.round(r.reduce((a, x) => a + x.pct, 0) / r.length) : 0;
  }, [res]);

  if (!lines) return <main className="screen dict"><ScreenHeader title="Diktant" ar="الْإِمْلَاءُ" /><p className="muted pad">Yuklanmoqda…</p></main>;
  if (!lines.length) return <main className="screen dict"><ScreenHeader title="Diktant" ar="الْإِمْلَاءُ" /><p className="muted pad">Bu vahdada diktant uchun gap topilmadi.</p></main>;

  const setT = (i: number, v: string) => setTyped((t) => t.map((x, j) => (j === i ? v : x)));
  const check = (i: number) => {
    const r = checkDict(lines[i].ar, typed[i]);
    setRes((x) => x.map((y, j) => (j === i ? r : y)));
    tg.haptic(r.pct >= 80 ? "success" : "error");
    void say(lines[i].ar);
  };
  const allDone = res.every(Boolean);
  const finishXp = (R: (Res | null)[] = res) => { const good = R.filter((r) => r && r.pct >= 80).length; gain("dict", Math.max(4, good * 3)); };
  const sendT = async () => {
    try {
      const body = lines.map((_, i) => `${i + 1}) ${res[i]?.pct ?? 0}% — ${typed[i].trim() || "(bo'sh)"}`).join("\n");
      await sendSub({ lesson: `dict:${teacher || dictCode(bookId, unitN, seed % 997)}`, step: "dict", item: 950, title: `Diktant · ${teacher || `${unitN}-vahda`}`,
        text: `Diktant ${teacher || ""}: o'rtacha ${total}%\n${body}` });
      setSent(true); toast("Natija ustozga yuborildi"); tg.haptic("success");
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
  };
  const marksRow = (r: Res) => (
    <p className="dict-marks" dir="rtl" lang="ar">{r.marks.map((m, j) => <span key={j} className={m.ok ? "ok" : "no"}>{m.w}</span>)}</p>
  );
  const keyToggle = (
    <button type="button" className={`kb-link dict-kt ${keys ? "on" : ""}`} aria-pressed={keys} onClick={flipKeys}><Keyboard size={16} aria-hidden />{keys ? "Ekrandagi harflarni yopish" : "Arabcha klaviatura yo'qmi? Ekrandagi harflar"}</button>
  );

  // ===== ustoz diktanti: 5 ta maydon birdaniga, ustoz o'qiydi =====
  if (teacher) {
    return (
      <main className="screen dict">
        <ScreenHeader title={`Diktant · ${teacher}`} ar="الْإِمْلَاءُ" />
        <p className="dict-note"><PenLine size={16} aria-hidden />Ustoz gapni o'qiydi — eshitganingizni yozing. Harakat qo'yish shart emas.</p>
        {lines.map((l, i) => (
          <section key={i} className={`card dict-q ${k === i ? "on" : ""}`}>
            <label htmlFor={`dq-${i}`}><b>{i + 1}-gap</b>{res[i] && <em className={res[i]!.pct >= 80 ? "ok" : "no"}>{res[i]!.pct}%</em>}</label>
            {!allDone ? (
              <textarea id={`dq-${i}`} ref={k === i ? ta : undefined} rows={2} dir="rtl" lang="ar" value={typed[i]} onFocus={() => setK(i)}
                onChange={(e) => setT(i, e.target.value)} placeholder="…" />
            ) : (
              <>{marksRow(res[i]!)}<Ar className="dict-right">{l.ar}</Ar>{l.uz && <small className="dict-uz">{l.uz}</small>}</>
            )}
          </section>
        ))}
        {!allDone && keyToggle}
        {!allDone && keys && <ArKeys target={ta} value={typed[k] || ""} onChange={(v) => setT(k, v)} />}
        {!allDone ? (
          <button type="button" className="btn primary wide" disabled={typed.every((t) => !t.trim())}
            onClick={() => { const R = lines.map((l, i) => checkDict(l.ar, typed[i])); setRes(R); finishXp(R); tg.haptic("success"); window.scrollTo(0, 0); }}>
            <Check size={18} aria-hidden />Tekshirish
          </button>
        ) : (
          <section className="card dict-sum">
            <b>Natija: {total}%</b>
            <p className="muted">Yashil — to'g'ri yozilgan so'z, qizil — xato yoki tushib qolgan.</p>
            {me?.group && !sent && <button type="button" className="btn ghost wide" onClick={() => void sendT()}><Send size={18} aria-hidden />Natijani ustozga yuborish</button>}
            <button type="button" className="btn primary wide" onClick={back}>Tayyor</button>
          </section>
        )}
      </main>
    );
  }

  // ===== o'zi: gapma-gap, kitob audiosi =====
  if (k >= lines.length) {
    return (
      <main className="screen dict">
        <ScreenHeader title="Diktant" ar="الْإِمْلَاءُ" />
        <section className="card dict-sum">
          <b>Diktant tugadi: {total}%</b>
          <p className="muted">{total >= 80 ? "Barakalla! Eshitganingizni deyarli xatosiz yozdingiz." : "Qizil so'zlarga e'tibor bering — ularni yana bir tinglab, yozib ko'ring."}</p>
        </section>
        {lines.map((l, i) => (
          <section key={i} className="card dict-q">
            <div className="dict-h"><b>{i + 1}-gap</b><em className={res[i]!.pct >= 80 ? "ok" : "no"}>{res[i]!.pct}%</em>
              <button type="button" className="dict-play sm" aria-label="Tinglash" onClick={() => void say(l.ar)}><Play size={15} aria-hidden /></button></div>
            {marksRow(res[i]!)}
          </section>
        ))}
        {me?.group && !sent && <button type="button" className="btn ghost wide" onClick={() => void sendT()}><Send size={18} aria-hidden />Natijani ustozga yuborish</button>}
        <button type="button" className="btn primary wide" onClick={() => replace("dict", { book: bookId, unit: unitN, mode: "self", n: Date.now() })}>Yana 5 ta gap</button>
        <button type="button" className="btn ghost wide" onClick={back}>Tayyor</button>
      </main>
    );
  }
  const l = lines[k], r = res[k];
  return (
    <main className="screen dict">
      <ScreenHeader title="Diktant" ar="الْإِمْلَاءُ" />
      <div className="r-bar" role="progressbar" aria-valuenow={k} aria-valuemin={0} aria-valuemax={lines.length} aria-label="Diktant"><i style={{ width: `${(k / lines.length) * 100}%` }} /></div>
      <section className="card dict-one">
        <span className="dict-k">{k + 1} / {lines.length} · {unitN}-vahda</span>
        <div className="dict-btns">
          <button type="button" className="dict-play" aria-label="Gapni tinglash" onClick={() => { tg.haptic(); void say(l.ar); }}><Play size={30} aria-hidden /></button>
          <button type="button" className="dict-slow" onClick={() => { tg.haptic(); void say(l.ar, 0.75); }}><Snail size={18} aria-hidden />Sekin</button>
        </div>
        {!r ? (
          <>
            <textarea ref={ta} rows={3} dir="rtl" lang="ar" value={typed[k]} onChange={(e) => setT(k, e.target.value)} placeholder="Eshitganingizni arabcha yozing…" aria-label="Javob" />
            {keyToggle}
            {keys && <ArKeys target={ta} value={typed[k] || ""} onChange={(v) => setT(k, v)} />}
            <button type="button" className="btn primary wide" disabled={!typed[k].trim()} onClick={() => check(k)}><Check size={18} aria-hidden />Tekshirish</button>
          </>
        ) : (
          <div className={`dict-res ${r.pct >= 80 ? "good" : ""}`} role="status">
            <b>{r.exact ? "To'g'ri!" : r.pct >= 80 ? `Deyarli to'g'ri · ${r.pct}%` : `${r.pct}% — qizil so'zlarni qayta tinglang`}</b>
            {marksRow(r)}
            <Ar className="dict-right">{l.ar}</Ar>
            {l.uz && <small className="dict-uz">{l.uz}</small>}
            <button type="button" className="btn dark wide" onClick={() => { if (k + 1 >= lines.length) finishXp(); setK(k + 1); }}>{k + 1 >= lines.length ? "Natija" : "Keyingi gap"}</button>
          </div>
        )}
      </section>
      <p className="dict-note">Harakat qo'yish shart emas — so'zlar harakatsiz solishtiriladi.</p>
    </main>
  );
}
