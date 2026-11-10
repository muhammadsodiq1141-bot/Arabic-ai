// 3-paket 3-qism (10.11.2026): qo'shimcha vazifa.
// Ustoz: TeacherXNewScreen — sarlavha, topshiriq, HTML material (≤10 MB, «Ko'rish»), javob turlari, muddat, 5 baho uchun tanga, kimga (guruh/tanlanganlar).
// O'quvchi: XTaskScreen — vazifa, materialni ilova ichida ochish (HtmlView: sandbox iframe, keng sahifa eniga moslanadi, test natijasi keladi),
//   javob: matn, ovoz (3 daq), daftar surati (≤3, siqiladi). Server: xUpload, xCreate, xList, xGet, xSubmit, xStatus, xDelete (api 17).
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronDown, Coins, FileCode2, Maximize2, Minimize2, Send, Trash2, Users, X } from "lucide-react";
import { api } from "../lib/api";
import { blobB64 } from "../lib/kb";
import { dueText } from "../lib/next";
import { tg } from "../lib/tg";
import { fmtDay, fmtMb, HTML_MAX, looksHtml, putFile, readResult, shrinkPhoto, wrapHtml, xCoins, type XAnswer, type XMine, type XResult, type XTask } from "../lib/xtask";
import { useNav } from "../state/nav";
import { Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { VoiceRec } from "./Kitob";
import type { Member } from "./Teacher";

const isoDay = (plus: number) => { const t = new Date(); t.setDate(t.getDate() + plus); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
const ANS: [keyof XAnswer, string][] = [["text", "Matn"], ["voice", "Ovoz"], ["photo", "Daftar surati"]];

// ===== HTML ko'rish oynasi: to'liq ekran, qafas (sandbox) — material ilova ma'lumotlariga tegolmaydi =====
export function HtmlView({ html, title, onClose, onResult }: { html: string; title: string; onClose: () => void; onResult?: (r: XResult) => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const fr = useRef<HTMLIFrameElement | null>(null);
  const [cw, setCw] = useState(0), [ch, setCh] = useState(0), [pw, setPw] = useState(0);
  const [fit, setFit] = useState(true);
  const doc = useMemo(() => wrapHtml(html), [html]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const m = () => { setCw(el.clientWidth); setCh(el.clientHeight); };
    m();
    const ro = new ResizeObserver(m); ro.observe(el);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { ro.disconnect(); document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== fr.current?.contentWindow) return;
      const d = e.data as { miyzan?: string; w?: number; vw?: number };
      // o'lcham faqat iframe ekran enida bo'lganda olinadi (kengaytirilgan holatdagi o'lchov hisobga olinmaydi)
      if (d?.miyzan === "olcham" && Number.isFinite(d.w) && Math.abs(Number(d.vw) - (box.current?.clientWidth || 0)) < 3) setPw(Number(d.w));
      const r = readResult(e.data);
      if (r && onResult) { onResult(r); tg.haptic("success"); }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onResult]);
  const wide = pw > cw + 4 && cw > 0;
  const W = wide ? pw : cw, s = wide && fit ? cw / pw : 1;
  return (
    <div className="xv" role="dialog" aria-modal="true" aria-label={title}>
      <div className="xv-bar">
        <b>{title}</b>
        {wide && <button type="button" className="xv-b" onClick={() => setFit(!fit)} aria-label={fit ? "Asl o'lcham" : "Ekranga moslash"}>{fit ? <Maximize2 size={18} aria-hidden /> : <Minimize2 size={18} aria-hidden />}</button>}
        <button type="button" className="xv-x" onClick={onClose}><X size={18} aria-hidden />Yopish</button>
      </div>
      <div className={`xv-box${wide && !fit ? " scroll" : ""}`} ref={box}>
        {cw > 0 && (
          <iframe ref={fr} title={title} srcDoc={doc} sandbox="allow-scripts allow-forms allow-modals allow-popups"
            style={{ width: W, height: s < 1 ? ch / s : ch, transform: s < 1 ? `scale(${s})` : undefined }} />
        )}
      </div>
    </div>
  );
}

/** ombordagi HTML'ni o'qish (1 soatlik havola) */
async function fetchHtml(url: string) {
  const r = await fetch(url).catch(() => null);
  if (!r?.ok) throw new Error("Material ochilmadi. Internetni tekshiring.");
  return r.text();
}

// ===== O'quvchi: vazifa =====
export function XTaskScreen({ id }: { id: number }) {
  const [d, setD] = useState<{ task: XTask; url: string | null; role: string; mine: XMine | null } | null | "err">(null);
  const [view, setView] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<XResult | null>(null);
  const [again, setAgain] = useState(false);
  const load = () => api<{ task: XTask; url: string | null; role: string; mine: XMine | null }>("xGet", { id }).then(setD).catch(() => setD("err"));
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (d === null) return <main className="screen"><ScreenHeader title="Qo'shimcha vazifa" ar="وَاجِبٌ إِضَافِيٌّ" /><div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1].map((k) => <span key={k} />)}</div></main>;
  if (d === "err") return <main className="screen"><ScreenHeader title="Qo'shimcha vazifa" ar="وَاجِبٌ إِضَافِيٌّ" /><Empty icon={<FileCode2 size={28} />} title="Vazifa ochilmadi" text="Internetni tekshirib, qayta oching." /></main>;
  const t = d.task, mine = d.mine, late = dueText(t.due) === "Muddati o'tdi";
  const open = async () => {
    if (!d.url) return;
    setOpening(true);
    try { setView(await fetchHtml(d.url)); } catch (e) { toast(e instanceof Error ? e.message : "Material ochilmadi"); }
    setOpening(false);
  };
  const gotResult = (r: XResult) => { setResult(r); toast(`Natija: ${r.ball} / ${r.jami} — javob bilan ustozga boradi`); };
  return (
    <main className="screen xt">
      <ScreenHeader title="Qo'shimcha vazifa" ar="وَاجِبٌ إِضَافِيٌّ" />
      <section className="xt-hero">
        <small>Ustoz vazifasi · {fmtDay(t.due)} gacha{late ? " · muddati o'tdi" : ""}</small>
        <b>{t.title}</b>
        {t.coins5 > 0 && <span className="xt-coin"><Coins size={15} aria-hidden />5 baho uchun {t.coins5.toLocaleString("ru-RU")} tanga · 4 → {xCoins(t.coins5, 4)} · 3 → {xCoins(t.coins5, 3)}</span>}
      </section>
      {t.body && <section className="card xt-body"><p>{t.body}</p></section>}
      {t.html && (
        <button type="button" className="rowbtn xt-mat" disabled={opening || !d.url} onClick={() => void open()}>
          <span className="xt-ic" aria-hidden>HTML</span>
          <span><b>{opening ? "Ochilmoqda…" : "Materialni ochish"}</b><small>{t.html_name || "material.html"}{t.html_size ? ` · ${fmtMb(t.html_size)}` : ""}</small></span>
        </button>
      )}
      {result && <p className="xt-res"><Check size={16} strokeWidth={3} aria-hidden />Material testi: {result.ball} / {result.jami} — javob bilan yuboriladi</p>}
      {mine && !again ? (
        <section className="card hws-ok">
          <span className="hws-ok-i"><Check size={30} strokeWidth={3} aria-hidden /></span>
          <b>Javob ustozga yuborildi</b>
          {mine.grade ? <><small>Ustoz bahosi</small><span className="hws-g">{mine.grade} / 5</span>{mine.comment && <p>«{mine.comment}»</p>}
            {xCoins(t.coins5, mine.grade) > 0 && <small className="xt-got">+{xCoins(t.coins5, mine.grade).toLocaleString("ru-RU")} tanga</small>}</>
            : <small>Ustozingiz tekshirib, baho qo'yganda Telegram orqali xabar keladi.</small>}
          <button type="button" className="btn ghost wide" onClick={() => setAgain(true)}>Qayta topshirish</button>
        </section>
      ) : (
        <XAnswerForm task={t} late={late} result={result} again={!!mine} onSent={() => { setAgain(false); setResult(null); void load(); }} />
      )}
      {view !== null && <HtmlView html={view} title={t.title} onClose={() => setView(null)} onResult={gotResult} />}
    </main>
  );
}

function XAnswerForm({ task: t, late, result, again, onSent }: { task: XTask; late: boolean; result: XResult | null; again: boolean; onSent: () => void }) {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<{ blob: Blob; mime: string } | null>(null);
  const [pics, setPics] = useState<{ b: Blob; u: string }[]>([]);
  const [busy, setBusy] = useState("");
  const inp = useRef<HTMLInputElement | null>(null);
  useEffect(() => () => pics.forEach((p) => URL.revokeObjectURL(p.u)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const addPics = async (fl: FileList | null) => {
    if (!fl?.length) return;
    const room = 3 - pics.length;
    if (room <= 0) { toast("Ko'pi bilan 3 ta surat"); return; }
    setBusy("Surat tayyorlanmoqda…");
    const out: { b: Blob; u: string }[] = [];
    for (const f of [...fl].slice(0, room)) {
      try { const b = await shrinkPhoto(f); out.push({ b, u: URL.createObjectURL(b) }); } catch (e) { toast(e instanceof Error ? e.message : "Surat ochilmadi"); }
    }
    setPics((p) => [...p, ...out]); setBusy("");
    if (inp.current) inp.current.value = "";
  };
  const empty = !text.trim() && !voice && !pics.length && !result;
  const send = async () => {
    if (empty) { toast("Javob bo'sh — matn yozing, ovoz yozing yoki surat qo'shing"); return; }
    try {
      const paths: string[] = [];
      for (let i = 0; i < pics.length; i++) { setBusy(`Surat yuklanmoqda ${i + 1}/${pics.length}…`); paths.push(await putFile("photo", pics[i].b)); }
      setBusy("Yuborilmoqda…");
      const audio = voice ? await blobB64(voice.blob) : null;
      await api("xSubmit", { id: t.id, text: text.trim(), audio, mime: voice?.mime, photos: paths, result });
      tg.haptic("success"); toast("Ustozingizga yuborildi"); window.scrollTo(0, 0);
      onSent();
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi, qayta urinib ko'ring"); }
    setBusy("");
  };
  return (
    <>
      {again && <p className="pf-note">Qayta topshirsangiz, ustozning oldingi bahosi o'chadi va u qaytadan baholaydi.</p>}
      {late && <p className="pf-note">Muddat o'tgan. Topshirsangiz, ustozga «kechikdi» belgisi bilan ko'rinadi.</p>}
      <h2 className="t-h">Javobingiz<small>{ANS.filter(([k]) => t.answer[k]).map(([, l]) => l.toLowerCase()).join(", ")}</small></h2>
      {t.answer.text && (
        <section className="card form">
          <label htmlFor="xt-text">Matn<textarea id="xt-text" rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Javobingizni yozing" /></label>
        </section>
      )}
      {t.answer.voice && (
        <section className="card hws-voice">
          <b className="lbl">Ovozli javob · 3 daqiqagacha</b>
          <VoiceRec value={voice} onChange={setVoice} disabled={!!busy} label="Ovoz yozish" max={180} />
        </section>
      )}
      {t.answer.photo && (
        <section className="card xt-pics">
          <b className="lbl">Daftar surati · {pics.length}/3</b>
          <div className="xt-grid">
            {pics.map((p, i) => (
              <span key={p.u} className="xt-pic"><img src={p.u} alt={`${i + 1}-surat`} />
                <button type="button" aria-label="Suratni olib tashlash" onClick={() => { URL.revokeObjectURL(p.u); setPics((l) => l.filter((x) => x.u !== p.u)); }}><X size={14} aria-hidden /></button>
              </span>
            ))}
            {pics.length < 3 && (
              <label className="xt-add" htmlFor="xt-file"><Camera size={22} aria-hidden /><span>Surat qo'shish</span>
                <input id="xt-file" ref={inp} type="file" accept="image/*" multiple hidden disabled={!!busy} onChange={(e) => void addPics(e.target.files)} />
              </label>
            )}
          </div>
        </section>
      )}
      <button type="button" className="btn primary wide" disabled={!!busy || empty} onClick={() => void send()}><Send size={18} aria-hidden />{busy || "Ustozga yuborish"}</button>
    </>
  );
}

// ===== Ustoz: yangi qo'shimcha vazifa =====
export function TeacherXNewScreen({ code }: { code: string }) {
  const { back } = useNav();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<{ f: File; text: string } | null>(null);
  const [view, setView] = useState(false);
  const [ans, setAns] = useState<XAnswer>({ text: true, voice: true, photo: true });
  const [due, setDue] = useState(isoDay(3));
  const [c5, setC5] = useState("1000");
  const [pick, setPick] = useState(false);
  const [mem, setMem] = useState<Member[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  useEffect(() => {
    if (!pick || mem) return;
    api<{ members: Member[] }>("groupMembers", { code }).then((r) => setMem(r.members || [])).catch(() => { setMem([]); toast("O'quvchilar yuklanmadi"); });
  }, [pick, mem, code]);
  const choose = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > HTML_MAX) { toast(`Fayl ${fmtMb(f.size)} — 10 MB dan oshmasin`); return; }
    const text = await f.text();
    if (!looksHtml(f.name, text)) { toast("Bu HTML fayl emas (.html bo'lishi kerak)"); return; }
    setFile({ f, text });
  };
  const coins = Math.max(0, Math.min(5000, Math.round(Number(c5.replace(/\s/g, "")) || 0)));
  const send = async () => {
    if (title.trim().length < 2) { toast("Sarlavha yozing"); return; }
    if (!ans.text && !ans.voice && !ans.photo) { toast("Kamida bitta javob turini tanlang"); return; }
    if (pick && !sel.size) { toast("O'quvchilarni tanlang"); return; }
    try {
      let html = null;
      if (file) { setBusy("Material yuklanmoqda…"); html = { path: await putFile("html", file.f, code), name: file.f.name, size: file.f.size }; }
      setBusy("Saqlanmoqda…");
      const r = await api<{ sent: number }>("xCreate", { group: code, title: title.trim(), body: body.trim(), html, answer: ans, coins5: coins, due, kids: pick ? [...sel] : null });
      tg.haptic("success"); toast(`Vazifa berildi · ${r.sent} ta o'quvchiga xabar yuborildi`);
      back();
    } catch (e) { toast(e instanceof Error ? e.message : "Saqlanmadi"); }
    setBusy("");
  };
  return (
    <main className="screen xn">
      <ScreenHeader title="Qo'shimcha vazifa" ar="وَاجِبٌ إِضَافِيٌّ" />
      <section className="card form">
        <label htmlFor="xn-t">Sarlavha<input id="xn-t" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: 4-vahda — so'zlar va harakatlar" /></label>
        <label htmlFor="xn-b">Topshiriq<textarea id="xn-b" rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nima qilish kerakligini yozing" /></label>
      </section>
      <h2 className="t-h">Material<small>HTML · ixtiyoriy · 10 MB gacha</small></h2>
      {file ? (
        <div className="xn-file">
          <span className="xt-ic" aria-hidden>HTML</span>
          <span><b>{file.f.name}</b><small>{fmtMb(file.f.size)} · tekshirildi</small></span>
          <button type="button" className="btn ghost" onClick={() => setView(true)}>Ko'rish</button>
          <button type="button" className="ibtn" aria-label="Faylni olib tashlash" onClick={() => setFile(null)}><Trash2 size={18} aria-hidden /></button>
        </div>
      ) : (
        <label className="xn-pick" htmlFor="xn-file"><FileCode2 size={22} aria-hidden /><span><b>HTML fayl tanlash</b><small>Mashq, test, o'yin yoki tarqatma (.html)</small></span>
          <input id="xn-file" type="file" accept=".html,.htm,text/html" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      )}
      <h2 className="t-h">Javob turi</h2>
      <div className="cc-why" role="group" aria-label="Javob turi">
        {ANS.map(([k, l]) => <button key={k} type="button" aria-pressed={ans[k]} className={ans[k] ? "on" : ""} onClick={() => setAns({ ...ans, [k]: !ans[k] })}>{l}</button>)}
      </div>
      <section className="card form xn-row">
        <label htmlFor="xn-due">Muddat<input id="xn-due" type="date" value={due} min={isoDay(0)} onChange={(e) => setDue(e.target.value)} /></label>
        <label htmlFor="xn-c">5 baho uchun tanga<input id="xn-c" inputMode="numeric" value={c5} onChange={(e) => setC5(e.target.value.replace(/[^\d\s]/g, ""))} /></label>
      </section>
      <div className="cc-why xn-quick">{[500, 1000, 2000].map((v) => <button key={v} type="button" className={coins === v ? "on" : ""} onClick={() => setC5(String(v))}>{v.toLocaleString("ru-RU")}</button>)}</div>
      <p className="muted xn-hint">4 baho → {xCoins(coins, 4).toLocaleString("ru-RU")}, 3 baho → {xCoins(coins, 3).toLocaleString("ru-RU")} tanga. Ko'pi bilan 5 000.</p>
      <h2 className="t-h">Kimga</h2>
      <div className="cc-why" role="radiogroup" aria-label="Kimga">
        <button type="button" role="radio" aria-checked={!pick} className={!pick ? "on" : ""} onClick={() => setPick(false)}><Users size={15} aria-hidden /> Butun guruh</button>
        <button type="button" role="radio" aria-checked={pick} className={pick ? "on" : ""} onClick={() => setPick(true)}>Tanlash{sel.size ? ` · ${sel.size}` : ""}</button>
      </div>
      {pick && (
        <div className="cc-grid xn-mem">
          {mem === null && <p className="muted">Yuklanmoqda…</p>}
          {mem?.map((m) => {
            const on = sel.has(m.kid), nm = m.full_name || m.name;
            return (
              <button key={m.kid} type="button" className={`cc-st${on ? " on" : ""}`} aria-pressed={on} onClick={() => setSel((s) => { const n = new Set(s); if (n.has(m.kid)) n.delete(m.kid); else n.add(m.kid); return n; })}>
                <span className="cc-av" aria-hidden>{nm.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
                <span className="cc-t"><b>{nm}</b><small>{m.level || ""}</small></span>
              </button>
            );
          })}
        </div>
      )}
      <button type="button" className="btn primary wide xn-go" disabled={!!busy} onClick={() => void send()}><Send size={18} aria-hidden />{busy || "Vazifani berish"}</button>
      {view && file && <HtmlView html={file.text} title={file.f.name} onClose={() => setView(false)} onResult={(r) => toast(`Material natija yubordi: ${r.ball} / ${r.jami} — o'quvchida ham shunday ishlaydi`)} />}
    </main>
  );
}

// ===== Ustoz: Uy vazifalari ekranidagi qo'shimcha vazifa kartasi =====
type XRow = { n: string; lg: string; sent: string | null; grade: number | null; late: boolean };
export function XTeacherCard({ x, onDeleted }: { x: XTask; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<XRow[] | null | "err">(null);
  const [sure, setSure] = useState(false);
  useEffect(() => {
    if (!open || rows) return;
    api<{ rows: XRow[] }>("xStatus", { id: x.id }).then((r) => setRows(r.rows || [])).catch(() => setRows("err"));
  }, [open, rows, x.id]);
  const st = x.stats || { total: 0, done: 0 };
  const p = st.total ? Math.round((st.done / st.total) * 100) : 0;
  const del = async () => {
    try { await api("xDelete", { id: x.id }); tg.haptic("success"); toast("Vazifa o'chirildi"); onDeleted(); }
    catch (e) { toast(e instanceof Error ? e.message : "O'chirilmadi"); }
  };
  return (
    <li className="th-card xc">
      <div className="th-hd">
        <span className="th-t"><b>{x.title}</b>
          <span>{x.html ? "HTML material · " : ""}{x.picked ? `${x.picked} ta o'quvchiga` : "butun guruhga"}{x.coins5 ? ` · 5 baho = ${x.coins5.toLocaleString("ru-RU")} tanga` : ""}</span></span>
        <span className={`th-due ${dueText(x.due) === "Muddati o'tdi" ? "late" : ""}`}>{dueText(x.due)}<small>{x.due.split("-").reverse().slice(0, 2).join(".")}</small></span>
      </div>
      <div className="th-prog">
        <span className="mk-b" role="progressbar" aria-label="Topshirganlar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${p}%` }} /></span>
        <b>{st.done} / {st.total} topshirdi</b>
      </div>
      <button type="button" className="th-who" aria-expanded={open} onClick={() => setOpen(!open)}>Kim topshirdi?<ChevronDown size={18} aria-hidden /></button>
      {open && (
        <div className="th-rows">
          {rows === null && <p className="muted">Yuklanmoqda…</p>}
          {rows === "err" && <p className="err">Ro'yxat yuklanmadi</p>}
          {rows && rows !== "err" && rows.map((r, i) => (
            <div key={i} className={`th-row ${r.sent ? "ok" : ""}`}>
              <span className="th-mark" aria-label={r.sent ? "Topshirdi" : "Topshirmagan"}>{r.sent ? <Check size={16} strokeWidth={3} aria-hidden /> : null}</span>
              <span className="th-n"><b>{r.n}</b><small>{r.lg}</small></span>
              <span className="th-p">{r.grade ? `Baho: ${r.grade}/5` : r.sent ? (r.late ? "Topshirdi · kechikdi" : "Topshirdi") : "—"}</span>
            </div>
          ))}
          <div className="t-kick">
            {!sure
              ? <button type="button" className="btn ghost bad" onClick={() => setSure(true)}><Trash2 size={18} aria-hidden />Vazifani o'chirish</button>
              : <><span>O'chirilsinmi? Berilgan baho va tangalar saqlanib qoladi.</span>
                  <button type="button" className="btn ghost" onClick={() => setSure(false)}>Yo'q</button>
                  <button type="button" className="btn bad-fill" onClick={() => void del()}>Ha, o'chirish</button></>}
          </div>
        </div>
      )}
    </li>
  );
}
