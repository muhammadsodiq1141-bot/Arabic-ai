// Ustoz: tekshiriladigan javoblar — erkin javoblar (matn yoki ovoz), uy va qo'shimcha vazifalar (server "subList", "subGrade"; o'quvchiga Telegram'da
// xabar boradi). "Tushunmadim" xabarlari (item 300–499) alohida bo'limda, baho qo'yilmaydi.
// 24.11.2026 (api 25, U2 «tez baholash»): accordion kartalar (bittasi ochiq), barcha kitoblar uchun joy nomi, AI bloki va «AI taklifi: N/5»
// (faqat ko'rsatiladi), xato turi (2 tagacha), «1 + 1» — kuchli tomon va bitta tuzatish (tayyor iboralar), baho 1–5, ovozli izoh (60 soniyagacha),
// «Yuborish va keyingisi» — baho yuborilgach keyingi kutayotgan javob ochiladi.
// 24.11.2026 (api 27, U3 «fokusli tuzatish»): «Qayta yozishni so'rash» — baho o'rniga (bitta tuzatish yoki ovozli izoh bilan); uy / qo'shimcha
// vazifada va 3-urinishda yo'q. So'ralganlari «Tekshirilgan»da «O'quvchida» belgisi bilan; qayta yozilgani yana «Kutmoqda»ga — «N-urinish» va
// «Oldingi urinish» bilan.
import { useEffect, useState } from "react";
import { ChevronDown, Clock, HelpCircle, PenLine, RotateCcw, Send, Sparkles, ThumbsUp, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import { blobB64 } from "../lib/kb";
import {
  addPhrase, ago, aiLine, aiOf, aiSuggest, autoText, FIX_O, FIX_W, fmtSec, isAsked, isDunno, isOral, MAX_TAGS, NOTE_MAX, placeOf, PRAISE_O, PRAISE_W, pureAr,
  REDO_MAX, redoWhy, splitAiText, TAGS_O, TAGS_W, useKbTitles, type TSub,
} from "../lib/subs";
import { tg } from "../lib/tg";
import { Ar, Empty, ScreenHeader } from "../ui/kit";
import { MixedText } from "../ui/Mixed";
import { SubVoice } from "../ui/SubVoice";
import { toast } from "../ui/Toast";
import { Tries } from "../ui/Tries";
import { xCoins } from "../lib/xtask";
import { VoiceRec, type Rec } from "./Kitob";

type Tab = "wait" | "done" | "dunno";
const VOICE_MAX = 1_200_000; // server chegarasi (1,2 MB)

export function TeacherSubsScreen({ code }: { code: string }) {
  const [items, setItems] = useState<TSub[] | null | "err">(null);
  const [tab, setTab] = useState<Tab>("wait");
  const [open, setOpen] = useState<number | null>(null);
  const [cg, setCg] = useState<Record<string, number> | null>(null); // 3-paket: baho → tanga jadvali

  useEffect(() => {
    let alive = true;
    api<{ items: TSub[]; coinGrade?: Record<string, number> | null }>("subList", { code }).then((r) => {
      if (!alive) return;
      const L = r.items || [];
      setItems(L); setCg(r.coinGrade || null);
      setOpen(L.find((x) => !isDunno(x) && x.grade === null && !isAsked(x))?.id ?? null); // birinchi kutayotgan javob ochiq
    }).catch(() => alive && setItems("err"));
    return () => { alive = false; };
  }, [code]);

  const list = items && items !== "err" ? items : [];
  const kbT = useKbTitles(items && items !== "err" ? items : null); // «a2:3» → «A2 · 3-vahda · Yozish»
  // ustozni kutmoqda: baho yo'q va qayta yozish so'ralmagan; tekshirilgan: baho bor yoki o'quvchi qayta yozmoqda (27-versiya)
  const wait = list.filter((x) => !isDunno(x) && x.grade === null && !isAsked(x));
  const done = list.filter((x) => !isDunno(x) && (x.grade !== null || isAsked(x)));
  const dunno = list.filter(isDunno);
  const shown = tab === "wait" ? wait : tab === "done" ? done : dunno;

  const focus = (id: number) => window.setTimeout(() => document.getElementById(`ts-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 60);
  const toggle = (id: number) => { const on = open === id; setOpen(on ? null : id); if (!on) focus(id); };
  const pickTab = (t: Tab) => { setTab(t); setOpen(t === "wait" ? wait[0]?.id ?? null : null); };
  // baho yuborildi: ro'yxatda yangilanadi; «Kutmoqda»da keyingi kutayotgan javob ochiladi (oxirgisi bo'lsa — boshidagisi)
  const graded = (id: number, patch: Partial<TSub>) => {
    const i = wait.findIndex((x) => x.id === id);
    const rest = wait.filter((x) => x.id !== id);
    const nxt = i >= 0 ? rest[i] || rest[0] : undefined;
    setItems((l) => (l && l !== "err" ? l.map((x) => (x.id === id ? { ...x, ...patch } : x)) : l));
    if (tab === "wait") { setOpen(nxt?.id ?? null); if (nxt) focus(nxt.id); }
  };

  return (
    <main className="screen tsubs">
      <ScreenHeader title="Javoblar" ar="الْإِجَابَاتُ" />
      <div className="seg" role="tablist" aria-label="Javoblar">
        {([["wait", "Kutmoqda", wait.length], ["done", "Tekshirilgan", 0], ["dunno", "Tushunmadim", dunno.length]] as const).map(([id, l, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => pickTab(id)}>{l}{n > 0 && <em>{n}</em>}</button>
        ))}
      </div>
      {items === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div>}
      {items === "err" && <Empty icon={<Send size={28} />} title="Javoblar yuklanmadi" text="Internetni tekshirib, ekranni qayta oching." />}
      {items && items !== "err" && !shown.length && (
        <Empty icon={tab === "dunno" ? <HelpCircle size={28} /> : <Send size={28} />}
          title={tab === "wait" ? "Hamma javob tekshirilgan" : tab === "done" ? "Hali tekshirilgan javob yo'q" : "Tushunmadim xabari yo'q"}
          text={tab === "dunno" ? "O'quvchi mashqni tushunmay o'tkazib yuborsa, shu yerda ko'rinadi." : "O'quvchilar yangi javob yuborganda shu yerda paydo bo'ladi."} />
      )}
      <ul className="ts-list">
        {shown.map((x) => isDunno(x)
          ? <DunnoCard key={x.id} x={x} place={placeOf(x, kbT)} />
          : <SubCard key={x.id} x={x} place={placeOf(x, kbT)} open={open === x.id} onToggle={() => toggle(x.id)} onGraded={graded}
              next={tab === "wait" && wait.length > 1}
              cg={x.step === "hw" ? cg : x.xt ? { 5: xCoins(x.xt.coins5, 5), 4: xCoins(x.xt.coins5, 4), 3: xCoins(x.xt.coins5, 3) } : null} />)}
      </ul>
    </main>
  );
}

/** javob matni: faqat arabcha — o'ngdan chapga; savol-javob yoki o'zbekcha — chapdan o'ngga */
function Answer({ text }: { text: string }) {
  if (!text || autoText(text)) return null;
  return pureAr(text) ? <Ar className="ts-text">{text}</Ar> : <p className="ts-plain"><MixedText text={text} /></p>;
}

function DunnoCard({ x, place }: { x: TSub; place: string }) {
  return (
    <li className="ts-card dunno">
      <div className="ts-hd"><b>{x.name}</b><small>{x.login} · {ago(x.created_at)}</small></div>
      <span className="ts-lesson"><HelpCircle size={14} aria-hidden /> Tushunmadim · {place.replace(/^Tushunmadim · /, "")}</span>
      <p className="ts-plain">{x.text}</p>
    </li>
  );
}

function SubCard({ x, place, open, onToggle, onGraded, next, cg }: {
  x: TSub; place: string; open: boolean; onToggle: () => void; onGraded: (id: number, p: Partial<TSub>) => void; next: boolean; cg: Record<string, number> | null;
}) {
  const oral = isOral(x);
  const ai = aiOf(x), sug = aiSuggest(ai);
  const body = splitAiText(x.text); // xulosa: «AI bahosi …» — o'quvchi matni emas, AI blokida ko'rsatiladi
  const TAGS = oral ? TAGS_O : TAGS_W, PR = oral ? PRAISE_O : PRAISE_W, FX = oral ? FIX_O : FIX_W;
  const [big, setBig] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(x.grade);
  const [tags, setTags] = useState<string[]>(x.tags || []);
  const [praise, setPraise] = useState(x.praise || "");
  const [fix, setFix] = useState(x.fix || "");
  const [rec, setRec] = useState<Rec | null>(null);
  const [delV, setDelV] = useState(false);
  const asked = isAsked(x), n = x.attempt || 1, why = redoWhy(x); // 27-versiya: qayta yozish
  const [edit, setEdit] = useState(x.grade === null && !asked);
  const [busy, setBusy] = useState(false);
  const bid = `ts-b-${x.id}`;

  const tag = (t: string) => {
    if (tags.includes(t)) { setTags(tags.filter((y) => y !== t)); return; }
    if (tags.length >= MAX_TAGS) { tg.haptic("error"); toast(`Ko'pi bilan ${MAX_TAGS} ta xato turi — avval bittasini olib tashlang`); return; }
    setTags([...tags, t]); tg.haptic();
  };
  const reset = () => { setGrade(x.grade); setTags(x.tags || []); setPraise(x.praise || ""); setFix(x.fix || ""); setRec(null); setDelV(false); setEdit(false); };
  // 27-versiya (U3): baho o'rniga — qayta yozishni so'rash (Q3: baho oxirgi urinishga). Bitta tuzatish yoki ovozli izoh kerak
  const askRedo = async () => {
    if (why) { toast(why); return; }
    const p = praise.trim(), f = fix.trim();
    if (!f && !rec && !(x.t_audio && !delV)) { tg.haptic("error"); toast("Avval «Bitta tuzatish»ni yozing yoki ovozli izoh qoldiring"); return; }
    if (rec && rec.blob.size > VOICE_MAX) { toast("Ovozli izoh juda katta — qisqaroq yozing"); return; }
    setBusy(true);
    try {
      const sec = rec ? Math.max(1, Math.min(60, rec.sec || 1)) : null;
      const r = await api<{ t_audio?: boolean }>("subGrade", {
        id: x.id, redo: true, tags, praise: p, fix: f, comment: "",
        ...(rec ? { audio: await blobB64(rec.blob), mime: rec.mime, t_sec: sec } : delV ? { voice: "del" } : {}),
      });
      tg.haptic("success");
      toast(`Qayta yozish so'raldi (${n + 1}-urinish) — o'quvchiga Telegram'da xabar boradi`);
      onGraded(x.id, {
        grade: null, redo: "asked", tags: tags.length ? tags : null, praise: p || null, fix: f || null, comment: [p, f].filter(Boolean).join(" · ") || null,
        t_audio: rec ? r.t_audio ?? true : delV ? false : x.t_audio, t_sec: rec ? sec : delV ? null : x.t_sec,
      });
      setRec(null); setDelV(false); setEdit(false);
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
    setBusy(false);
  };
  const save = async () => {
    if (!grade) { toast("Avval bahoni tanlang (1–5)"); return; }
    if (rec && rec.blob.size > VOICE_MAX) { toast("Ovozli izoh juda katta — qisqaroq yozing"); return; }
    setBusy(true);
    try {
      const p = praise.trim(), f = fix.trim();
      const sec = rec ? Math.max(1, Math.min(60, rec.sec || 1)) : null;
      const r = await api<{ coins?: number; t_audio?: boolean }>("subGrade", {
        id: x.id, grade, tags, praise: p, fix: f,
        comment: !p && !f ? x.comment || "" : "", // eski (faqat izohli) baho qayta qo'yilsa izoh saqlanadi
        ...(rec ? { audio: await blobB64(rec.blob), mime: rec.mime, t_sec: sec } : delV ? { voice: "del" } : {}),
      });
      tg.haptic("success");
      toast(r.coins ? `Baho yuborildi · o'quvchiga +${r.coins} tanga` : "Baho yuborildi — o'quvchiga Telegram'da xabar boradi");
      onGraded(x.id, {
        grade, redo: null, tags: tags.length ? tags : null, praise: p || null, fix: f || null, comment: p || f ? [p, f].filter(Boolean).join(" · ") : x.comment,
        t_audio: rec ? r.t_audio ?? true : delV ? false : x.t_audio, t_sec: rec ? sec : delV ? null : x.t_sec,
      });
      setRec(null); setDelV(false); setEdit(false);
    } catch (e) { toast(e instanceof Error ? e.message : "Saqlanmadi"); }
    setBusy(false);
  };

  return (
    <li className={`ts-card acc ${open ? "open" : ""}`} id={`ts-${x.id}`}>
      <button type="button" className="ts-head" aria-expanded={open} aria-controls={bid} onClick={onToggle}>
        <span className="ts-hd"><b>{x.name}</b><small>{place} · {ago(x.created_at)}</small></span>
        <span className="ts-pills">
          {n > 1 && <span className="ts-try">{n}-urinish</span>}
          {x.grade !== null ? <span className="ts-g">{x.grade}/5</span> : asked ? <span className="ts-asked">O'quvchida</span> : sug ? <span className="ts-aip" title="AI taklifi">AI {sug}/5</span> : null}
        </span>
        <ChevronDown className="ts-chev" size={20} aria-hidden />
      </button>
      {open && (
        <div className="ts-body" id={bid}>
          {x.xt?.late && <span className="ts-late"><Clock size={13} aria-hidden />Muddatdan keyin topshirildi</span>}
          {x.result && <span className="ts-res">Material testi: {x.result.ball} / {x.result.jami}</span>}
          <Answer text={body.own} />
          {x.audio && <SubVoice id={x.id} label="Ovozni tinglash" className="ts-voice" />}
          {!!x.pics?.length && (
            <div className="ts-pics">{x.pics.map((u, i) => <button key={u} type="button" aria-label={`${i + 1}-surat — kattalashtirish`} onClick={() => setBig(u)}><img src={u} alt="" loading="lazy" /></button>)}</div>
          )}
          {big && (
            <div className="ts-big" role="dialog" aria-modal="true" aria-label="Daftar surati" onClick={() => setBig(null)}>
              <img src={big} alt="Daftar surati" /><button type="button" className="xv-x" onClick={() => setBig(null)}><X size={18} aria-hidden />Yopish</button>
            </div>
          )}
          {!!x.tries?.length && <Tries id={x.id} tries={x.tries} />}
          {ai && <p className="ts-ai"><Sparkles size={16} aria-hidden /><span>{aiLine(ai)}{(ai.fb || body.fb) && <small>{ai.fb || body.fb}</small>}</span></p>}
          {edit ? (
            <div className="ts-grade">
              <div className="cc-lbl">Xato turi<small>{tags.length} / {MAX_TAGS}</small></div>
              <div className="ts-tags" role="group" aria-label={`Xato turi, ${MAX_TAGS} tagacha`}>
                {TAGS.map((t) => <button key={t} type="button" aria-pressed={tags.includes(t)} className={tags.includes(t) ? "on" : ""} onClick={() => tag(t)}>{t}</button>)}
              </div>
              <label className="cc-lbl" htmlFor={`ts-p-${x.id}`}>Kuchli tomon</label>
              <input id={`ts-p-${x.id}`} className="ts-cmt" value={praise} maxLength={NOTE_MAX} onChange={(e) => setPraise(e.target.value)} placeholder="Nima yaxshi chiqdi?" />
              <div className="ts-ph" role="group" aria-label="Kuchli tomon — tayyor iboralar">
                {PR.map((ph) => <button key={ph} type="button" onClick={() => setPraise(addPhrase(praise, ph, PR))}>{ph}</button>)}
              </div>
              <label className="cc-lbl" htmlFor={`ts-f-${x.id}`}>Bitta tuzatish</label>
              <input id={`ts-f-${x.id}`} className="ts-cmt" value={fix} maxLength={NOTE_MAX} onChange={(e) => setFix(e.target.value)} placeholder="Eng muhim bitta xato" />
              <div className="ts-ph" role="group" aria-label="Bitta tuzatish — tayyor iboralar">
                {FX.map((ph) => <button key={ph} type="button" onClick={() => setFix(addPhrase(fix, ph, FX))}>{ph}</button>)}
              </div>
              <div className="cc-lbl">Baho{sug && <small className="ts-sug">AI taklifi: {sug}/5</small>}</div>
              <div className="ts-stars" role="radiogroup" aria-label="Baho">
                {[1, 2, 3, 4, 5].map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={grade === g} className={`${grade === g ? "on" : ""} ${sug === g ? "sug" : ""}`} onClick={() => setGrade(g)}>{g}</button>
                ))}
              </div>
              {cg && <small className="ts-coins">{x.xt ? "Qo'shimcha vazifa" : "Uy vazifasi"}: {[5, 4, 3].map((g) => `${g} → ${cg[String(g)] ?? 0}`).join(" · ")} tanga{grade && cg[String(grade)] ? ` — tanlangan: +${cg[String(grade)]}` : ""}</small>}
              <div className="ts-tv">
                {x.t_audio && !delV && !rec ? (
                  <div className="ts-tv-have">
                    <SubVoice id={x.id} t label={`Izohingiz${x.t_sec ? ` · ${fmtSec(x.t_sec)}` : ""}`} />
                    <button type="button" className="btn ghost" onClick={() => setDelV(true)}><Trash2 size={18} aria-hidden />O'chirish</button>
                  </div>
                ) : (
                  <VoiceRec value={rec} onChange={setRec} disabled={busy} label="Ovozli izoh · 60 soniyagacha" max={60}
                    priv={delV ? "Oldingi ovozli izoh o'chiriladi." : "O'quvchi izohni ilovada va Telegram'da eshitadi."} />
                )}
              </div>
              <button type="button" className="btn primary wide ts-send" disabled={busy || !grade} onClick={() => void save()}>
                <Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : next ? "Yuborish va keyingisi" : x.grade === null && !asked ? "Yuborish" : "Saqlash"}
              </button>
              <button type="button" className="btn ghost wide ts-redo" disabled={busy || !!why} onClick={() => void askRedo()}>
                <RotateCcw size={18} aria-hidden />{asked ? "Qayta yozish so'rovini yangilash" : "Qayta yozishni so'rash"}
              </button>
              <small className="ts-redo-why">{why || `Baho qo'yilmaydi: o'quvchi «Bitta tuzatish» bo'yicha qayta yozadi — ${n + 1}-urinish (${REDO_MAX} tagacha).`}</small>
              {(x.grade !== null || asked) && <button type="button" className="kb-link" onClick={reset}>Bekor qilish</button>}
            </div>
          ) : (
            <div className="ts-done">
              <div className="ts-done-r">
                {asked ? <span className="ts-asked">O'quvchida · {n + 1}-urinish kutilmoqda</span> : <span className="ts-g">{x.grade}/5</span>}
                {x.tags?.map((t) => <span key={t} className="ts-tag">{t}</span>)}
              </div>
              {x.praise && <p className="ts-pf"><ThumbsUp size={16} aria-hidden /><span><MixedText text={x.praise} /></span></p>}
              {x.fix && <p className="ts-pf fix"><PenLine size={16} aria-hidden /><span><MixedText text={x.fix} /></span></p>}
              {!x.praise && !x.fix && x.comment && <span className="ts-c">«<MixedText text={x.comment} />»</span>}
              {x.t_audio && <SubVoice id={x.id} t label={`Izohingiz${x.t_sec ? ` · ${fmtSec(x.t_sec)}` : ""}`} className="ts-voice" />}
              <button type="button" className="kb-link" onClick={() => setEdit(true)}>{asked ? "Baho qo'yish yoki izohni o'zgartirish" : "O'zgartirish"}</button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
