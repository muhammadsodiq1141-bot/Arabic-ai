// Bosh sahifa (shablon tuzilishi, Mezon ranglari). Haqiqiy ma'lumot: progress (eski ilova formati), uy vazifasi (hwList),
// guruh reytingi (leaderboard), kun so'zi (DAY_WORDS). Hali tayyor bo'lmagan bo'limlar bitta sokin "Tez orada" ro'yxatida (bosilmaydi).
import { useEffect, useState } from "react";
import { ArrowUpRight, Gift, GraduationCap, Headphones, MessageCircle, Search, Star, Target, TrendingUp, Trophy } from "lucide-react";
import { a0Data, a0HwState, type Hw as A0Hw } from "../lib/a0";
import { api } from "../lib/api";
import { img, loadData, type BookIndex, type DayWord } from "../lib/data";
import { hash, dayKey, hwProgress, localRaw, summarize, weekId, type Book, type Raw, type Summary } from "../lib/progress";
import { kbFlush, kbKeyOf, loadKb } from "../lib/kb";
import { dueText, nextStep } from "../lib/next";
import { savedAll } from "../lib/saved";
import { bootSync, store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Avatar, SectionTitle } from "../ui/kit";
import { applyFreeze } from "../lib/motiv";
import { claimRef } from "../lib/ref";
import { goalOf } from "../lib/goal";
import { toast } from "../ui/Toast";
import { A0Entry } from "./A0";
import { bookOfLevel } from "./Unit";
import { TodayCard } from "./Lesson";
import { TasksCard } from "./Motiv";
import { HelpButton, IntroOverlay, setCoachBlocked, useCoach } from "./Onboard";
import { ensureWeek, introDone, WeekCard } from "./Week";

type Hw = { id: number; book: string; unit: number; title: string; due: string; mine: { done?: boolean } | null; teacher?: boolean };
type HwCard = { book: string; title: string; unitAr: string; unitN: number; pct: number; due: string; next: string } | null | "none" | "nogroup";

export function Home() {
  const { me } = useSession();
  const { go, setTab } = useNav();
  const [sum, setSum] = useState<Summary | null>(null);
  const [hw, setHw] = useState<HwCard>(null);
  const [rank, setRank] = useState<{ n: number; scope: "group" | "all" } | null | "none">(null);
  const [word, setWord] = useState<DayWord | null>(null);
  const [books, setBooks] = useState<BookIndex | null>(null);
  const [intro, setIntro] = useState(false);
  const name = me?.full_name || me?.name || "O'quvchi";

  useEffect(() => {
    if (!me) return;
    let alive = true;
    (async () => {
      await bootSync(me);
      if (ensureWeek() && alive) { setCoachBlocked(true); setIntro(true); } // yangi o'quvchi: tanishuv, keyin birinchi hafta yo'li
      // muzlatish (kuniga bir marta) va unvon/nishon tabrigi — server ma'lumoti tiklangandan keyin
      if (applyFreeze()) window.setTimeout(() => toast("Muzlatish ishlatildi — ketma-ketlik saqlandi"), 800);
      // 14-partiya: do'stni taklif qilish — tasdiqlangan do'stlar uchun tanga
      void claimRef(me).then((m) => { if (m && alive) window.setTimeout(() => toast(m), 1400); });
      window.dispatchEvent(new Event("mezon:check"));
      void kbFlush(); // internetsiz yozilgan javoblar (f.kbq) — eski ilovadagi kabi ochilganda yuboriladi
      const raw = localRaw();
      if (!alive) return;
      setSum(summarize(raw));
      void loadHomework(raw);
    })();
    loadData<DayWord[]>("DAY_WORDS").then((w) => alive && setWord(w.length ? w[hash(dayKey()) % w.length] : null)).catch(() => {});
    loadData<BookIndex>("books/index").then((b) => alive && setBooks(b)).catch(() => {});
    api<{ me: { rank: number } | null; noGroup?: boolean }>("leaderboard", { week: weekId(), scope: me.group ? "group" : "all" })
      .then((r) => alive && setRank(r.me ? { n: r.me.rank, scope: me.group ? "group" : "all" } : "none"))
      .catch(() => alive && setRank("none"));

    async function loadHomework(raw: Raw) {
      if (!me?.group) { setHw("nogroup"); return; }
      try {
        const r = await api<{ items: Hw[] }>("hwList");
        store.set("f.hw", r.items); // eski ilova bilan bir xil kesh: sinxronlashda uy vazifasi holati shundan hisoblanadi
        const open = r.items.filter((h) => !h.teacher && !h.mine?.done).sort((a, b) => a.due.localeCompare(b.due));
        const h = open[0];
        if (!h) { if (alive) setHw("none"); return; }
        if (h.book === "a0") {
          // A0 vazifasi: kitob emas, alifbo darsi (eski ilovada ham alohida karta)
          const [L, d] = await Promise.all([loadKb(`a0:${h.unit}`).catch(() => null), a0Data()]);
          const s = a0HwState(h as unknown as A0Hw, L);
          if (alive) setHw({ book: "a0", title: d.TOPICS[h.unit - 1] || "", unitAr: "", unitN: h.unit, pct: s.tot ? Math.round((s.done / s.tot) * 100) : 0, due: h.due, next: s.full ? "Ustozga topshirish" : `${s.done}/${s.tot} qadam` });
          return;
        }
        const book = await loadData<Book>(`books/${h.book}`);
        const u = book.units.find((x) => x.n === h.unit);
        const key = kbKeyOf(h.book, h.unit);
        const kb = key ? await loadKb(key).catch(() => null) : null;
        const nx = nextStep(book, h.unit, kb);
        if (alive) setHw({ book: h.book, title: h.title || u?.uz || "", unitAr: u?.ar || "", unitN: h.unit, pct: hwProgress(raw, book, h.unit).pct, due: h.due, next: nx.kind === "done" ? "" : nx.label });
      } catch { if (alive) setHw("none"); }
    }
    return () => { alive = false; };
  }, [me]);

  useCoach("home", !!sum && !intro);
  const level = books?.find((b) => b.id === (sum?.book || "a1"));
  const gauge = level ? Math.min(1, (sum?.known || 0) / level.words) : 0;
  const saved = Object.keys(savedAll()).length;

  return (
    <main className="screen home">
      <header className="top">
        <Avatar name={name} photo={tg.user?.photo_url} />
        <div className="who"><b>{name}</b><span>{me?.level || "—"}{me?.group ? ` · ${me.group.title}` : ""}</span></div>
        <HelpButton k="home" />
        <button type="button" className="ibtn" aria-label="Reyting" onClick={() => go("league")}><Trophy size={22} aria-hidden /></button>
      </header>

      <div className="stories" role="list">
        {word && (
          <button type="button" role="listitem" className="story" onClick={() => go("dayword", { word })}>
            <span className="in s1">Kun so'zi<img src={img("book")} alt="" /></span>
          </button>
        )}
        {(sum?.streak || 0) > 0 && (
          <button type="button" role="listitem" className="story seen" onClick={() => setTab("marks")}>
            <span className="in s2">{sum!.streak} kunlik seriya<img src={img("fire")} alt="" /></span>
          </button>
        )}
      </div>

      <div className="grid">
        <div className="stat">
          <div><Star size={40} className="st" aria-hidden /><b>{sum ? sum.xp.toLocaleString("ru-RU") : "…"}</b><span>Yulduzcha</span></div>
          <div><TrendingUp size={40} className="wk" aria-hidden /><b>{sum ? `+${sum.weekXp.toLocaleString("ru-RU")}` : "…"}</b><span>Bu hafta</span></div>
        </div>
        <HomeworkCard hw={hw} onOpen={() => (hw && typeof hw === "object" ? (hw.book === "a0" ? go("a0d", { n: hw.unitN }) : go("unit", { book: hw.book, unit: hw.unitN })) : setTab("lessons"))} />
        <button type="button" className="rank" onClick={() => go("league")}>
          <img src={img("trophy")} alt="" />
          <b>{rank === null ? "…" : rank === "none" ? "Reyting" : `${rank.n}-o'rin`}</b>
          <span>{rank === "none" ? "Yulduzcha to'plang" : rank !== null && rank.scope === "all" ? "Butun markazda" : "Guruhingizda"}</span>
        </button>
      </div>

      {sum && !me?.group && !goalOf() && !store.get("f.goalHide", 0) && (
        <section className="card gl-card" aria-label="Shaxsiy reja">
          <span className="gl-oi big" aria-hidden><Target size={24} /></span>
          <span className="gl-ot"><b>Shaxsiy rejangizni tuzaylik</b><small>4 ta savol · 1 daqiqa — maqsadingizga qarab kunlik reja</small></span>
          <div className="gl-act">
            <button type="button" className="btn ghost" onClick={() => { store.set("f.goalHide", 1); setSum({ ...sum }); }}>Keyinroq</button>
            <button type="button" className="btn primary" onClick={() => go("goal")}>Boshlash</button>
          </div>
        </section>
      )}
      {sum && <WeekCard bookId={store.get("a1.book", bookOfLevel(me?.level))} />}
      {me?.level === "A0" && <A0Entry />}
      {sum && <TodayCard bookId={store.get("a1.book", bookOfLevel(me?.level))} />}
      {sum && <TasksCard />}

      {(me?.teacher || !!me?.myGroups?.length) && (
        <button type="button" className="rowbtn tpanel" onClick={() => go("teacher")}>
          <GraduationCap size={26} aria-hidden />
          <span><b>Ustoz paneli</b><small>Guruh natijalari, javoblarni baholash, vazifa berish</small></span>
          <ArrowUpRight size={20} aria-hidden />
        </button>
      )}

      <SectionTitle ar="الْمُفْرَدَاتُ" uz="Lug'at" />
      <div className="voc">
        <button type="button" className="vc learn" onClick={() => setTab("lessons")}>
          <b>O'rganilgan so'zlar</b><span className="go" aria-hidden><ArrowUpRight size={16} /></span>
          <span className="gauge" aria-label={`${sum?.known || 0} ta so'z${level ? ` / ${level.words}` : ""}`}>
            <svg viewBox="0 0 140 84" width="140" height="84" aria-hidden>
              <path d="M12 76a58 58 0 0 1 116 0" fill="none" stroke="rgba(251,247,239,.25)" strokeWidth="12" strokeLinecap="round" />
              <path d="M12 76a58 58 0 0 1 116 0" fill="none" stroke="#FBF7EF" strokeWidth="12" strokeLinecap="round" strokeDasharray="182" strokeDashoffset={182 * (1 - gauge)} />
            </svg>
            <span className="n">{sum ? sum.known : "…"}{level && <small>/{level.words}</small>}</span>
          </span>
        </button>
        <button type="button" className="vc games" onClick={() => go("saved")}>
          <b>Saqlangan so'zlar</b><span className="go" aria-hidden><ArrowUpRight size={16} /></span>
          <span className="vc-n">{saved}<small>ta so'z</small></span>
          <img className="pz" src={img("books")} alt="" />
        </button>
      </div>

      <button type="button" className="rowbtn invite" onClick={() => go("invite")}>
        <img src={img("handshake")} alt="" />
        <span><b>Do'stni taklif qilish</b><small>Har bir do'stingiz uchun 10 tanga</small></span>
        <ArrowUpRight size={20} aria-hidden />
      </button>

      {intro && <IntroOverlay onDone={() => { introDone(); setCoachBlocked(false); setIntro(false); }} />}

      <SectionTitle ar="قَرِيبًا" uz="Tez orada" />
      <ul className="soonlist" aria-label="Tez orada qo'shiladigan bo'limlar">
        <li><Headphones size={20} aria-hidden /><span><b>Kutubxona</b><small>Podkast va video darslar</small></span></li>
        <li><Search size={20} aria-hidden /><span><b>Lug'at-tarjimon</b><small>So'zni qidirib topish</small></span></li>
        <li><Gift size={20} aria-hidden /><span><b>Tanga va do'kon</b><small>Darslar uchun sovg'alar</small></span></li>
        <li><MessageCircle size={20} aria-hidden /><span><b>Xabarlar</b><small>Ustoz va guruh bilan chat</small></span></li>
      </ul>
    </main>
  );
}

function HomeworkCard({ hw, onOpen }: { hw: HwCard; onOpen: () => void }) {
  const body =
    hw === null ? <p className="hw-note">Yuklanmoqda…</p>
    : hw === "nogroup" ? <p className="hw-note">Uy vazifasini ustozingiz beradi. Avval guruhga qo'shiling.</p>
    : hw === "none" ? <p className="hw-note">Hozircha ochiq vazifa yo'q. Barakalla!</p>
    : (
      <>
        <div className="unit">{hw.unitN}-vahda{hw.unitAr && <Ar className="unit-ar">{hw.unitAr}</Ar>}</div>
        <div className="due">{dueText(hw.due) || `Muddat: ${hw.due.split("-").reverse().slice(0, 2).join(".")}`}</div>
        {hw.next && <div className="hw-next">Keyingi: <b>{hw.next}</b></div>}
        <div className="pct">{hw.pct}%</div>
      </>
    );
  return (
    <button type="button" className="hw" onClick={onOpen}>
      <span className="go" aria-hidden><ArrowUpRight size={18} /></span>
      <Ar className="hw-ar">الْوَاجِبُ الْمَنْزِلِيُّ</Ar>
      <span className="uz">Uy vazifasi</span>
      {body}
      <img src={img("house")} alt="" />
    </button>
  );
}
