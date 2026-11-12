// Uy vazifasi — bitta unit (vahda): Lug'at (10 so'zli roundlar), Nazariya (video yoki qoida matni + test), Mashqlar.
// Pastda doim "Davom etish: <keyingi qadam>" tugmasi; keyingi qadam kartasi oltin halqa bilan belgilanadi; qulf sababini aytadi.
// Shuningdek "Darslar" bo'limi: joriy kitobning barcha vahdalari (uy vazifasi berilgani belgilanadi).
// 13-partiya (A8): qat'iy tartib (lib/order.ts) — roundlar ketma-ket, mashqlar 1-qism → nazariya → test → mashqlar 2-qism;
// «Bilaman — sinab ko'raman» (so'z testi 90%+); guruhsiz o'quvchida keyingi vahda joriysining majburiy qismi tugagach ochiladi.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, BookOpenText, Check, ChevronDown, ChevronRight, ChevronUp, CloudDownload, GraduationCap, KeyRound, Library, List, Lock, Ruler } from "lucide-react";
import { isLite, offOf, onWifi, saveUnit, type OffUnit } from "../lib/lite";
import { preloadKitob } from "../lib/audio";
import { loadData } from "../lib/data";
import { GRADED, isReadStep, kbBest, kbKeyOf, loadKb, type KbLesson, type KbStep } from "../lib/kb";
import { frontierOf, unitGate } from "../lib/order";
import { dueText, gramPct, nextStep, pctOf, ROUND, rulesOf, theoryKey } from "../lib/next";
import { hwProgress, localRaw, type Book } from "../lib/progress";
import { itemsOf } from "../lib/practice";
import { report } from "../lib/report";
import { knownOf, store, syncNow } from "../lib/store";
import { twGet, twSteps } from "../lib/textwork";
import { tg } from "../lib/tg";
import { loadWords, type Word } from "../lib/words";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Emo } from "../ui/Emo";
import { Ar, ScreenHeader, SectionTitle } from "../ui/kit";
import { Scale } from "../ui/Scale";
import { toast } from "../ui/Toast";
import { DrillHub } from "./Madina";
import { HelpButton, useCoach } from "./Onboard";
import { ruleStats, type RBook } from "./Rules";
import { Round } from "./Round";
import { spkAll } from "./Speak";

// topshiriq turi (qadam kaliti) bo'yicha belgi
const kbIcon = (k: string) => (/^(lugat|mufradat|tarakib)/.test(k) ? "📚" : /^(lmashq|tadrib)/.test(k) ? "🧩" : /^(oqish|matn|qiroat)/.test(k) ? "📖"
  : /^(suhbat|muhadatha|tinglash)/.test(k) ? "💬" : /^(qoida|qawaid)/.test(k) ? "🧑‍🏫" : /^(yozish|kitaba)/.test(k) ? "✏️" : "🎯");
export const bookOfLevel = (lvl?: string | null) => ({ A0: "a1", A1: "a1", A2: "a2", B1: "b1", B2: "b2", C1: "c1" } as Record<string, string>)[lvl || ""] || "a1";

function useBook(id: string) {
  const [b, setB] = useState<Book | null>(null);
  useEffect(() => { let a = true; loadData<Book>(`books/${id}`).then((x) => a && setB(x)).catch(() => {}); return () => { a = false; }; }, [id]);
  return b;
}

type HwItem = { book: string; unit: number; due: string; teacher?: boolean; mine?: { done?: boolean } | null };

export function Lessons() {
  const { me } = useSession();
  const { go } = useNav();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const book = useBook(bookId);
  // ustoz bergan vazifalar (bosh sahifa yuklagan kesh f.hw)
  const hw = store.get<HwItem[]>("f.hw", []).filter((h) => !h.teacher && !h.mine?.done && h.book === bookId);
  const rs = book ? ruleStats(book as RBook) : null;
  // guruhsiz o'quvchi: boshlangan vahdalar ochiq, keyingisi — oxirgi boshlanganining majburiy qismi tugagach (yoki «Bilaman» sinovi)
  const free = !me?.group;
  const front = book ? frontierOf(book) : 1;
  const [frontDone, setFrontDone] = useState<boolean | null>(null);
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!book || !free) return;
    let a = true;
    const k = kbKeyOf(book.id, front);
    (k ? loadKb(k).catch(() => null) : Promise.resolve(null)).then((kb) => a && setFrontDone(unitGate(book, front, kb).coreDone));
    return () => { a = false; };
  }, [book, free, front]);
  const assignedU = new Set(store.get<HwItem[]>("f.hw", []).filter((h) => !h.teacher && h.book === bookId).map((h) => h.unit));
  const unitOpen = (n: number) => !free || n <= front || assignedU.has(n) || (n === front + 1 && !!frontDone);
  return (
    <main className="screen">
      <SectionTitle ar="الدُّرُوسُ" uz={book ? `Darslar · ${book.title}` : "Darslar"}
        right={<button type="button" className="sect-btn" onClick={() => go("books")}><Library size={18} aria-hidden />Kitoblar</button>} />
      {!book && <p className="muted pad">Yuklanmoqda…</p>}
      {book && rs && rs.all.length > 0 && (
        <button type="button" className="rrow" onClick={() => go("rules", { book: book.id })}>
          <span className="un"><Ruler size={20} aria-hidden /></span>
          <span className="ut"><b>Qoidalar</b><span className="ut-hw rr-sub">{rs.done} / {rs.all.length} o'zlashtirildi</span></span>
          <ArrowRight size={20} className="rr-go" aria-hidden />
        </button>
      )}
      {ask && book && (
        <section className="card uto" aria-live="polite">
          <b>{front}-vahdani bilasizmi?</b>
          <p>10 ta so'zdan iborat sinov. 90% va undan yuqori bo'lsa, {front}-vahda o'tkaziladi va {front + 1}-vahda ochiladi.</p>
          <div className="uto-act">
            <button type="button" className="btn ghost" onClick={() => setAsk(false)}>Yopish</button>
            <button type="button" className="btn primary" onClick={() => { setAsk(false); go("wtest", { book: book.id, unit: front, to: "unit" }); }}><GraduationCap size={18} aria-hidden />Sinab ko'raman</button>
          </div>
        </section>
      )}
      <div className="ulist">
        {book?.units.map((u) => {
          const p = pctOf(u.words, knownOf(book.id, u.n));
          const h = hw.find((x) => x.unit === u.n);
          const on = unitOpen(u.n);
          return (
            <button key={u.n} type="button" className={`urow ${h ? "hw-on" : ""} ${on ? "" : "lk"}`} aria-disabled={!on}
              onClick={() => (on ? go("unit", { book: book.id, unit: u.n }) : u.n === front + 1 ? (tg.haptic("light"), setAsk(true), window.scrollTo(0, 0))
                : (tg.haptic("error"), toast(`Avval ${front + 1}-vahdani oching`)))}>
              <span className="un">{on ? u.n : <Lock size={17} aria-label="Yopiq" />}</span>
              <span className="ut">
                <b>{u.uz}</b>{u.ar && <Ar className="ut-ar">{u.ar}</Ar>}
                {h && <span className="ut-hw">Uy vazifasi · {dueText(h.due)}</span>}
                {!on && <span className="ut-lk">{u.n === front + 1 ? `${front}-vahda tugagach ochiladi · yoki «Bilaman» sinovi` : "Yopiq"}</span>}
              </span>
              <span className="up"><span className="b" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label="Yodlangan so'zlar"><i style={{ width: `${p}%` }} /></span><em>{p}%</em></span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

export function UnitScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { go } = useNav();
  const { me } = useSession();
  // «Javoblar» (kitob mashqlari kaliti) — faqat ustoz va admin uchun; o'quvchi ko'rmaydi (vazifa ustozga yuboriladi va baholanadi)
  const staff = !!(me?.teacher || me?.admin || me?.myGroups?.length);
  const book = useBook(bookId);
  const u = book?.units.find((x) => x.n === unitN);
  const [words, setWords] = useState<Word[] | null>(null);
  const [open, setOpen] = useState<"voc" | "ex1" | "ex" | "rd" | null>(null);
  const kbKey = kbKeyOf(bookId, unitN);
  const [kb, setKb] = useState<KbLesson | null>(null);
  useEffect(() => { if (!kbKey) return; let a = true; loadKb(kbKey).then((x) => a && setKb(x)).catch(() => {}); return () => { a = false; }; }, [kbKey]);
  useEffect(() => {
    if (!u) return;
    let a = true;
    loadWords(bookId, unitN, u.words).then((w) => a && setWords(w));
    void preloadKitob(`${bookId}/${unitN}`, u.words.map((w) => w[0]));
    return () => { a = false; };
  }, [u, bookId, unitN]);

  const next = book ? nextStep(book, unitN, kb) : null;
  // keyingi qadam joylashgan bo'lim o'zi ochiladi (mashqlar ro'yxati yuklangach)
  const nextKind = next?.kind;
  const ready = !!book && (!kbKey || !!kb);
  const [celebrate, setCelebrate] = useState(false);
  useCoach("vahda", ready && !celebrate);
  const inited = useRef(false);
  useEffect(() => {
    if (!ready || inited.current) return;
    inited.current = true;
    const nsi = Number(next?.params?.si);
    const sp = book && kb ? unitGate(book, unitN, kb).split : 0;
    const rd = nextKind === "kb" && bookId.startsWith("md") && !!kb?.steps[nsi] && isReadStep(kb.steps[nsi]);
    setOpen(nextKind === "kb" ? (nsi < sp ? "ex1" : rd ? "rd" : "ex") : nextKind === "done" ? (kbKey ? "ex" : "voc") : "voc");
  }, [ready, nextKind, kbKey]);
  // vahda endigina to'liq bajarilgan bo'lsa (shart: so'zlar, so'z testi, qoidalar ≥80%) — bir martalik tabrik, natija darhol serverga
  useEffect(() => {
    if (!ready || !book || store.get(`f.cele.${bookId}.${unitN}`, 0)) return;
    if (hwProgress(localRaw(), book, unitN).done) {
      setCelebrate(true); void syncNow(); tg.haptic("success");
      const bu = book.units.find((x) => x.n === unitN), kk = knownOf(bookId, unitN);
      if (bu) { const all = itemsOf(bu as Parameters<typeof itemsOf>[0]); report("boʻlim tugadi", bu.uz || "", all.filter((x) => kk[x.ar]).length, all.length, true, unitN); }
    }
  }, [ready, book, bookId, unitN]);

  if (!book || !u || !next) return <main className="screen"><ScreenHeader title="Uy vazifasi" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const known = knownOf(bookId, unitN);
  const rounds: string[][][] = [];
  for (let i = 0; i < u.words.length; i += ROUND) rounds.push(u.words.slice(i, i + ROUND));
  const vocPct = pctOf(u.words, known);
  const rules = rulesOf(book, unitN) as { t?: string; ar?: string; html?: string; quiz?: unknown[] }[];
  const seen = !!store.get(theoryKey(bookId, unitN), 0);
  // nazariya kartasida birinchi qoidaning birinchi misoli (qoida matnidagi .ex bloki)
  const exAr = /class=["']ex["'][^>]*>\s*<div>\s*<span class=["']ar["']>([^<]+)</.exec(rules[0]?.html || "")?.[1] || "";
  const nq = rules.reduce((a, r) => a + (r.quiz?.length || 0), 0);
  const gram = gramPct(book, unitN);
  const kbB = kbKey ? kbBest(kbKey) : {};
  const g = unitGate(book, unitN, kb);
  // Madina: o'qish matnlari alohida "O'qish" bo'limida (qadam raqamlari o'zgarmaydi — natijalar shu tartibga bog'langan)
  const md = bookId.startsWith("md");
  const allIdx = kb ? kb.steps.map((_, i) => i) : [];
  const preIdx = allIdx.filter((i) => i < g.split); // nazariyadan oldingi qism
  const postIdx = allIdx.filter((i) => i >= g.split);
  const rdIdx = md && kb ? postIdx.filter((i) => isReadStep(kb.steps[i])) : [];
  const exIdx = postIdx.filter((i) => !rdIdx.includes(i));
  const preRead = md && preIdx.length > 0; // Madina'da 1-qism — asosiy matn
  const spoke = spkAll()[`${bookId}:${unitN}`]?.n || 0;
  const avg = (ix: number[]) => (ix.length ? Math.round(ix.reduce((a, i) => a + (kbB[i] || 0), 0) / ix.length) : 0);
  const exPct = avg(exIdx), rdPct = avg(rdIdx), prePct = avg(preIdx);
  const stepRow = (s: KbStep, si: number, read: boolean) => {
    const on = g.stepOpen(si), b = kbB[si], why = g.stepWhy(si);
    const gq = s.items.filter((x) => GRADED.includes(x.type)).length;
    const name = read ? s.t.split(" · ").slice(1).join(" · ") || s.t : s.t.split(" · ")[0];
    const d = read ? (s.d || `${s.items.length} matn`) : `${name} · ${gq ? `${gq} savol` : `${s.items.length} qism`}`;
    return (
      <button key={si} type="button" className={`vp-row kbc ${read ? "rdc" : ""} ${on ? "" : "lock"} ${isNext("kb", si) ? "next" : ""}`} aria-disabled={!on}
        aria-label={on ? undefined : `${si + 1}-topshiriq — ${why}`}
        onClick={() => (on ? go("kb", { key: kbKey, si, book: bookId, unit: unitN }) : lockMsg(why))}>
        <span className="vp-ic">{on ? <Emo e={read ? "📖" : kbIcon(s.k)} size={26} /> : <Lock size={15} aria-hidden />}</span>
        <span className="vp-rt"><b>{read ? name : `${si + 1}-topshiriq`}</b><small>{on ? d : why}</small></span>
        {on && <span className="vp-p">{b ?? 0}%</span>}
        <span className="vp-bar"><i style={{ width: `${b ?? 0}%` }} /></span>
      </button>
    );
  };
  // 11.11.2026 (17b): «Matn bilan ishlash» — vahda matni bilan zanjir (Tingla → O'qi ×3 → Ayt); birinchi mashq blokining boshida (A0 dan tashqari)
  const twRow = (first?: number) => {
    if (bookId === "a0" || first === undefined) return null;
    const on = g.stepOpen(first), why = g.stepWhy(first), T = twGet(bookId, unitN);
    const n = twSteps(T), pct = Math.round((n / 3) * 100);
    return (
      <button key="tw" type="button" className={`vp-row kbc twc ${on ? "" : "lock"}`} aria-disabled={!on} aria-label={on ? undefined : `Matn bilan ishlash — ${why}`}
        onClick={() => (on ? go("mtext", { book: bookId, unit: unitN }) : lockMsg(why))}>
        <span className="vp-ic">{on ? <BookOpenText size={22} aria-hidden /> : <Lock size={15} aria-hidden />}</span>
        <span className="vp-rt"><b>Matn bilan ishlash</b><small>{on ? (n === 3 ? "Bajarildi · qayta o'qib tezlikni oshiring" : "Tingla → 3 marta o'qi → o'zing ayt") : why}</small></span>
        {on && <span className="vp-p">{pct}%</span>}
        <span className="vp-bar"><i style={{ width: `${pct}%` }} /></span>
      </button>
    );
  };
  const celeKey = `f.cele.${bookId}.${unitN}`;
  const assigned = store.get<HwItem[]>("f.hw", []).some((h) => !h.teacher && h.book === bookId && h.unit === unitN);
  const isNext = (kind: string, k?: number) => next.kind === kind && (k === undefined || next.params.n === k || next.params.si === k);
  const lockMsg = (m: string) => { tg.haptic("error"); toast(m); };
  let num = 0; // tik yo'ldagi bosqich tartib raqami (chizish tartibida)
  const N = (done: boolean, lock = false) => { num++; return <span className="vp-n" aria-hidden>{done ? <Check size={16} strokeWidth={3} /> : lock ? <Lock size={14} /> : num}</span>; };

  return (
    <main className="screen unit has-cta">
      <ScreenHeader title={`${(u as { lbl?: string }).lbl || `${unitN}-vahda`} · ${u.uz}`} ar={u.ar}
        actions={<>
          <HelpButton k="vahda" />
          {/* 2-paket: kitob mashqlari kaliti — faqat ustoz/admin va mashqi bor vahdada */}
          {kbKey && staff && (
            <button type="button" className="hdr-lbl" aria-label="Javoblar — ustoz uchun kalit" onClick={() => go("answers", { book: bookId, unit: unitN })}>
              <KeyRound size={17} aria-hidden />Javoblar
            </button>
          )}
          <button type="button" className="ibtn" aria-label="Saqlangan so'zlar" onClick={() => go("saved")}><Bookmark size={22} aria-hidden /></button>
        </>} />

      {/* 16-partiya (K3): vahda boshida maqsad — nima o'rganiladi (TMLT, 2-bob: aniq maqsad va tuzilma) */}
      <section className="vgoal" aria-label="Vahda maqsadi">
        <b>Bu vahdadan keyin siz:</b>
        <ul>
          <li>«{u.uz}» mavzusidagi {u.words.length} ta so'zni bilasiz</li>
          {rules.length > 0 && <li>{rules.slice(0, 2).map((r) => r.t).filter(Boolean).join(" va ")} — qoidasini ishlata olasiz</li>}
          <li>Shu mavzuda o'zingiz 3 ta gap ayta olasiz</li>
        </ul>
      </section>

      {(isLite() || !!offOf(bookId, unitN)) && <OffRow bookId={bookId} unitN={unitN} words={[...u.words, ...(u.phrases || [])].map((w) => w[0])} />}

      <ol className="vpath" aria-label="Vahda bosqichlari">
        <li className={`vp vp-voc ${vocPct >= 100 ? "dn" : ""} ${next.kind === "round" ? "on" : ""}`}>
          {N(vocPct >= 100)}
          <div className="vp-c">
            <div className="vp-h"><span className="vp-t"><b>Lug'at</b><Ar className="vp-ar">الْمُفْرَدَاتُ</Ar></span><em className="vp-pct">{vocPct}%</em></div>
            <small className="vp-sub">{u.words.length} so'z · {rounds.length} round</small>
            <div className="vp-rows">
              {rounds.map((r, i) => {
                const p = pctOf(r, known), ro = g.roundOpen(i + 1);
                return (
                  <button key={i} type="button" className={`vp-row ${ro ? "" : "lock"} ${isNext("round", i + 1) ? "next" : ""}`} disabled={!words} aria-disabled={!ro}
                    onClick={() => (ro ? go("round", { book: bookId, unit: unitN, n: i + 1 }) : lockMsg(`Avval ${i}-roundni tugating`))}>
                    <span className="vp-ic">{!ro ? <Lock size={15} aria-hidden /> : p === 100 ? <Check size={16} strokeWidth={3} aria-hidden /> : i + 1}</span>
                    <span className="vp-rt"><b>{i + 1}-round</b><small>{ro ? `${r.length} so'z` : `Avval ${i}-roundni tugating`}</small></span>
                    {ro && <span className="vp-p">{p}%</span>}<span className="vp-bar"><i style={{ width: `${p}%` }} /></span>
                  </button>
                );
              })}
              {!g.vocDone && (
                <button type="button" className="vp-row vp-to" onClick={() => go("wtest", { book: bookId, unit: unitN, to: "voc" })}>
                  <span className="vp-ic"><GraduationCap size={17} aria-hidden /></span>
                  <span className="vp-rt"><b>Bilaman — sinab ko'raman</b><small>10 ta so'z · 90% — lug'at o'tadi</small></span>
                  <ChevronRight size={18} className="vp-go" aria-hidden />
                </button>
              )}
              <button type="button" className="vp-row wl-rc" onClick={() => go("words", { book: bookId, unit: unitN })}>
                <span className="vp-ic"><List size={17} aria-hidden /></span>
                <span className="vp-rt"><b>So'zlar ro'yxati</b><small>{u.words.length + (u.phrases?.length || 0)} ta{(u.tw?.length || 0) + (u.xw?.length || 0) ? ` + ${(u.tw?.length || 0) + (u.xw?.length || 0)} qo'shimcha` : " · misollar, sinonimlar"}</small></span>
                <ChevronRight size={18} className="vp-go" aria-hidden />
              </button>
            </div>
          </div>
        </li>

        {kb && preIdx.length > 0 && (
          <li className={`vp vp-pre ${preIdx.every((i) => kbB[i] !== undefined) ? "dn" : ""} ${next.kind === "kb" && preIdx.includes(Number(next.params.si)) ? "on" : ""} ${g.vocDone ? "" : "lk"}`}>
            {N(preIdx.every((i) => kbB[i] !== undefined), !g.vocDone)}
            <div className="vp-c">
              <button type="button" className="vp-hb v-ex v-pre" aria-expanded={open === "ex1"} onClick={() => setOpen(open === "ex1" ? null : "ex1")}>
                <span className="vp-t"><b>{preRead ? "Asosiy matn" : "Mashqlar · 1-qism"}</b><Ar className="vp-ar">{preRead ? "النَّصُّ" : "التَّدْرِيبَاتُ"}</Ar></span><em className="vp-pct">{prePct}%</em>
                {open === "ex1" ? <ChevronUp size={18} className="vp-go" aria-hidden /> : <ChevronDown size={18} className="vp-go" aria-hidden />}
              </button>
              <small className="vp-sub">{g.vocDone ? `${preIdx.length} topshiriq · nazariyadan oldin` : "Lug'at tugagach ochiladi"}</small>
              {open === "ex1" && <div className="vp-rows">{twRow(preIdx[0])}{preIdx.map((si) => stepRow(kb.steps[si], si, md && isReadStep(kb.steps[si])))}</div>}
            </div>
          </li>
        )}

        {rules.length > 0 && (
          <li className={`vp vp-theory ${seen ? "dn" : ""} ${next.kind === "theory" ? "on" : ""} ${g.theoryOpen ? "" : "lk"}`}>
            {N(seen, !g.theoryOpen)}
            <button type="button" className={`vp-c vp-main ${isNext("theory") ? "next" : ""}`} aria-disabled={!g.theoryOpen}
              onClick={() => (g.theoryOpen ? go("theory", { book: bookId, unit: unitN }) : lockMsg(g.theoryWhy))}>
              <span className="vp-h"><span className="vp-t"><b>Nazariya</b><Ar className="vp-ar">الْقَوَاعِدُ</Ar></span>{g.theoryOpen ? <ChevronRight size={18} className="vp-go" aria-hidden /> : <Lock size={16} className="vp-go" aria-hidden />}</span>
              <small className="vp-sub">{rules.length} ta qoida · {seen ? "o'qildi" : g.theoryOpen ? "o'qilmagan" : g.theoryWhy}</small>
              <Ar className="vp-ex">{exAr || rules[0].ar || ""}</Ar>
              <small className="vp-names">{rules.map((r) => r.t).filter(Boolean).join(" · ")}</small>
            </button>
          </li>
        )}

        {rules.length > 0 && (
          <li className={`vp vp-test ${gram >= 80 ? "dn" : ""} ${next.kind === "test" ? "on" : ""} ${seen ? "" : "lk"}`}>
            {N(gram >= 80, !seen)}
            <button type="button" className={`vp-c vp-main ${isNext("test") ? "next" : ""}`}
              onClick={() => (seen ? go("test", { book: bookId, unit: unitN }) : lockMsg("Test nazariyani o'qigach ochiladi"))}
              aria-label={seen ? `Grammatik test, ${gram}%` : "Grammatik test — nazariyani o'qigach ochiladi"}>
              <span className="vp-h"><span className="vp-t"><b>Grammatik test</b></span>{seen ? <em className="vp-pct">{gram}%</em> : <Lock size={16} className="vp-go" aria-hidden />}</span>
              <small className="vp-sub">{nq} savol · {seen ? "80% va undan yuqori — o'zlashtirildi" : "Nazariyani o'qigach ochiladi"}</small>
            </button>
          </li>
        )}

        {kbKey && rdIdx.length > 0 && kb && (
          <li className={`vp ${rdPct >= 100 ? "dn" : ""} ${next.kind === "kb" && rdIdx.includes(Number(next.params.si)) ? "on" : ""}`}>
            {N(rdPct >= 100)}
            <div className="vp-c">
              <button type="button" className="vp-hb v-ex v-rd" aria-expanded={open === "rd"} onClick={() => setOpen(open === "rd" ? null : "rd")}>
                <span className="vp-t"><b>O'qish</b><Ar className="vp-ar">الْقِرَاءَةُ</Ar></span><em className="vp-pct">{rdPct}%</em>
                {open === "rd" ? <ChevronUp size={18} className="vp-go" aria-hidden /> : <ChevronDown size={18} className="vp-go" aria-hidden />}
              </button>
              <small className="vp-sub">{rdIdx.length} matn · o'qish tezligi o'lchanadi</small>
              {open === "rd" && <div className="vp-rows">{rdIdx.map((si) => stepRow(kb.steps[si], si, true))}</div>}
            </div>
          </li>
        )}

        {kbKey && (!kb || exIdx.length > 0) && (
          <li className={`vp ${kb && exPct >= 100 ? "dn" : ""} ${next.kind === "kb" && exIdx.includes(Number(next.params.si)) ? "on" : ""} ${!kb || g.testDone ? "" : "lk"}`}>
            {N(!!kb && exPct >= 100, !!kb && !g.testDone)}
            <div className="vp-c">
              <button type="button" className="vp-hb v-ex" aria-expanded={open === "ex"} onClick={() => setOpen(open === "ex" ? null : "ex")}>
                <span className="vp-t"><b>{preIdx.length && !preRead ? "Mashqlar · 2-qism" : "Mashqlar"}</b><Ar className="vp-ar">التَّدْرِيبَاتُ</Ar></span>{kb && <em className="vp-pct">{exPct}%</em>}
                {open === "ex" ? <ChevronUp size={18} className="vp-go" aria-hidden /> : <ChevronDown size={18} className="vp-go" aria-hidden />}
              </button>
              <small className="vp-sub">{!kb ? "Yuklanmoqda…" : !g.testDone && g.hasRules ? "Grammatik testdan keyin ochiladi" : `${exIdx.length} topshiriq · ${exIdx.filter((i) => kbB[i] !== undefined).length}/${exIdx.length} bajarildi · ketma-ket ochiladi`}</small>
              {open === "ex" && kb && <div className="vp-rows">{!preIdx.length && twRow(exIdx[0])}{exIdx.map((si) => stepRow(kb.steps[si], si, false))}</div>}
            </div>
          </li>
        )}

        {/* 16-partiya (M7): o'z gapi — lug'at tugagach; vahda yakunini to'smaydi */}
        <li className={`vp vp-speak ${spoke ? "dn" : ""} ${g.vocDone ? "" : "lk"}`}>
          {N(spoke > 0, !g.vocDone)}
          <button type="button" className="vp-c vp-main v-spk" aria-disabled={!g.vocDone}
            onClick={() => (g.vocDone ? go("speak", { book: bookId, unit: unitN, n: Date.now() }) : lockMsg("Gapirish lug'at tugagach ochiladi"))}>
            <span className="vp-h"><span className="vp-t"><b>Gapirish</b><Ar className="vp-ar">الْكَلَامُ</Ar></span>{g.vocDone ? <ChevronRight size={18} className="vp-go" aria-hidden /> : <Lock size={16} className="vp-go" aria-hidden />}</span>
            <small className="vp-sub">{g.vocDone ? (spoke ? `${spoke} marta gapirildi · yana urinib ko'ring` : "Mavzu bo'yicha o'z gapingiz · 60 → 45 → 30 soniya") : "Lug'at tugagach ochiladi"}</small>
          </button>
        </li>

        {bookId.startsWith("md") && !!(u as { mem?: unknown }).mem && (
          <li className="vp">
            {N(false)}
            <button type="button" className="vp-c vp-main v-mem" onClick={() => go("mem", { book: bookId, unit: unitN })}>
              <span className="vp-h"><span className="vp-t"><b>Yodlash</b><Ar className="vp-ar">الْحِفْظُ</Ar></span><ChevronRight size={18} className="vp-go" aria-hidden /></span>
              <small className="vp-sub">Beton usuli · so'zlarning {vocPct}% i yodlangan</small>
            </button>
          </li>
        )}
      </ol>
      {bookId === "md1" && unitN === 1 && <DrillHub dkey="md1:1" />}

      {celebrate && <HwDone assigned={assigned} onClose={() => { store.set(celeKey, Date.now()); setCelebrate(false); }} />}

      <div className="ucta">
        {next.kind === "done" ? (
          <p className="ucta-done"><Check size={20} aria-hidden />Vahda bajarildi — natijalaringiz ustozga ko'rinadi</p>
        ) : (
          <button type="button" className="btn primary wide ucta-btn" onClick={() => go(next.view, next.params)}>
            <span><b>Davom etish: {next.label}</b><small>{next.sub}</small></span><ArrowRight size={22} aria-hidden />
          </button>
        )}
      </div>
    </main>
  );
}

/** 17-partiya (A6): vahdani oldindan yuklab olish — so'z va mashq ovozlari internetsiz ishlaydi */
function OffRow({ bookId, unitN, words }: { bookId: string; unitN: number; words: string[] }) {
  const [st, setSt] = useState<OffUnit | null>(() => offOf(bookId, unitN));
  const [prog, setProg] = useState<[number, number] | null>(null);
  const wifi = onWifi();
  const run = async () => {
    if (prog) return;
    tg.haptic();
    setProg([0, 1]);
    try { const r = await saveUnit(bookId, unitN, words, (d, a) => setProg([d, a])); setSt(r); tg.haptic("success"); toast("Vahda yuklab olindi — ovozlar internetsiz ishlaydi"); }
    catch (e) { toast(e instanceof Error ? e.message : "Yuklab bo'lmadi"); }
    setProg(null);
  };
  const mb = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
  return (
    <button type="button" className={`off-row ${st ? "dn" : ""}`} disabled={!!prog} onClick={() => void run()}>
      <span className="off-ic" aria-hidden>{st && !prog ? <Check size={18} strokeWidth={3} /> : <CloudDownload size={18} />}</span>
      <span className="off-t">
        <b>{prog ? `Yuklanmoqda… ${prog[0]} / ${prog[1]}` : st ? "Vahda yuklab olingan" : "Vahdani yuklab olish"}</b>
        <small>{prog ? "Ilovani yopmang" : st ? `${st.n} ta ovoz · ${mb(st.kb)} · internetsiz ishlaydi · yangilash uchun bosing` : wifi === false ? "Hozir mobil internet — Wi-Fi'da yuklab olish tavsiya etiladi" : "Wi-Fi'da bir marta yuklang — keyin ovozlar trafik sarflamaydi"}</small>
        {prog && <span className="vp-bar off-bar"><i style={{ width: `${Math.round((prog[0] / Math.max(1, prog[1])) * 100)}%` }} /></span>}
      </span>
    </button>
  );
}

/** Vahda to'liq bajarilganda bir marta chiqadigan ekran: tarozi muvozanatga keladi */
function HwDone({ assigned, onClose }: { assigned: boolean; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div className="hwdone" role="dialog" aria-modal="true" aria-labelledby="hwdone-t">
      <Scale size={200} />
      <h1 id="hwdone-t">{assigned ? "Uy vazifasi bajarildi" : "Vahda o'zlashtirildi"}</h1>
      <p>{assigned ? "Lug'at, test va qoidalar 80% dan yuqori. Natijangiz ustozingizga yuborildi." : "Lug'at, test va qoidalar 80% dan yuqori. Barakalla!"}</p>
      <button ref={btn} type="button" className="btn primary wide" onClick={onClose}>Davom etish</button>
    </div>
  );
}

export function RoundScreen({ bookId, unitN, n }: { bookId: string; unitN: number; n: number }) {
  const { back, replace } = useNav();
  const book = useBook(bookId);
  const [all, setAll] = useState<Word[] | null>(null);
  const u = book?.units.find((x) => x.n === unitN);
  useEffect(() => { if (!u) return; let a = true; loadWords(bookId, unitN, u.words).then((w) => a && setAll(w)); return () => { a = false; }; }, [u, bookId, unitN]);
  if (!all) return <main className="screen"><p className="muted pad">Yuklanmoqda…</p></main>;
  const words = all.slice((n - 1) * ROUND, n * ROUND);
  const more = all.length > n * ROUND;
  return <Round bookId={bookId} unit={unitN} n={n} words={words} pool={all} onExit={() => back()}
    onNextRound={more ? () => replace("round", { book: bookId, unit: unitN, n: n + 1 }) : undefined} />;
}
