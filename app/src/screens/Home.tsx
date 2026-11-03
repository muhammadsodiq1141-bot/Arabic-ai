// Bosh sahifa (shablon tuzilishi, Mezon ranglari). Haqiqiy ma'lumot: progress (eski ilova formati), uy vazifasi (hwList),
// guruh reytingi (leaderboard), kun so'zi (DAY_WORDS). Tanga, yangiliklar, do'kon va podkastlar — keyingi navbatlarda.
import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, Headphones, MessageCircle, Play, Star, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { BOT_LINK } from "../lib/config";
import { img, loadData, type BookIndex, type DayWord } from "../lib/data";
import { hash, dayKey, hwProgress, localRaw, summarize, weekId, type Book, type Raw, type Summary } from "../lib/progress";
import { kbFlush } from "../lib/kb";
import { bootSync, store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Avatar, SectionTitle } from "../ui/kit";

type Hw = { id: number; book: string; unit: number; title: string; due: string; mine: { done?: boolean } | null; teacher?: boolean };
type HwCard = { book: string; title: string; unitAr: string; unitN: number; pct: number; due: string } | null | "none" | "nogroup";

export function Home() {
  const { me } = useSession();
  const { go, setTab } = useNav();
  const [sum, setSum] = useState<Summary | null>(null);
  const [hw, setHw] = useState<HwCard>(null);
  const [rank, setRank] = useState<{ n: number; scope: "group" | "all" } | null | "none">(null);
  const [word, setWord] = useState<DayWord | null>(null);
  const [books, setBooks] = useState<BookIndex | null>(null);
  const name = me?.full_name || me?.name || "O'quvchi";

  useEffect(() => {
    if (!me) return;
    let alive = true;
    (async () => {
      await bootSync(me);
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
        const book = await loadData<Book>(`books/${h.book}`);
        const u = book.units.find((x) => x.n === h.unit);
        if (alive) setHw({ book: h.book, title: h.title || u?.uz || "", unitAr: u?.ar || "", unitN: h.unit, pct: hwProgress(raw, book, h.unit).pct, due: h.due });
      } catch { if (alive) setHw("none"); }
    }
    return () => { alive = false; };
  }, [me]);

  const level = books?.find((b) => b.id === (sum?.book || "a1"));
  const gauge = level ? Math.min(1, (sum?.known || 0) / level.words) : 0;
  const invite = () => tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent("Men Mezon'da arab tilini o'rganyapman. Sen ham qo'shil!")}`);

  return (
    <main className="screen home">
      <header className="top">
        <Avatar name={name} photo={tg.user?.photo_url} />
        <div className="who"><b>{name}</b><span>{me?.level || "—"}{me?.group ? ` · ${me.group.title}` : ""}</span></div>
        <button type="button" className="ibtn" aria-label="Reyting" onClick={() => go("league")}><Trophy size={22} aria-hidden /></button>
        <button type="button" className="ibtn" aria-label="Bildirishnomalar" onClick={() => go("soon", { title: "Bildirishnomalar" })}><Bell size={22} aria-hidden /></button>
        <button type="button" className="ibtn" aria-label="Xabarlar" onClick={() => go("soon", { title: "Xabarlar" })}><MessageCircle size={22} aria-hidden /></button>
      </header>

      <div className="stories" role="list">
        {word && (
          <button type="button" role="listitem" className="story" onClick={() => go("dayword", { word })}>
            <span className="in s1">Kun so'zi<img src={img("book")} alt="" /></span>
          </button>
        )}
        {(sum?.streak || 0) > 0 && (
          <button type="button" role="listitem" className="story seen" onClick={() => setTab("practice")}>
            <span className="in s2">{sum!.streak} kunlik seriya<img src={img("fire")} alt="" /></span>
          </button>
        )}
      </div>

      <div className="grid">
        <div className="stat">
          <div><Star size={40} className="st" aria-hidden /><b>{sum ? sum.xp.toLocaleString("ru-RU") : "…"}</b><span>Yulduzcha</span></div>
          <div><img src={img("coin")} alt="" /><b>0</b><span>Tanga</span></div>
        </div>
        <HomeworkCard hw={hw} onOpen={() => (hw && typeof hw === "object" ? go("unit", { book: hw.book, unit: hw.unitN }) : setTab("lessons"))} />
        <button type="button" className="rank" onClick={() => go("league")}>
          <img src={img("trophy")} alt="" />
          <b>{rank === null ? "…" : rank === "none" ? "—" : `${rank.n}-o'rin`}</b>
          <span>{rank !== null && rank !== "none" && rank.scope === "all" ? "Umumiy reyting" : "Guruh reytingi"}</span>
        </button>
      </div>

      <SectionTitle ar="الْمَكْتَبَةُ" uz="Kutubxona" />
      <div className="lib">
        <button type="button" className="lc big" onClick={() => go("soon", { title: "Podkastlar" })}>
          <b>Podkastlar</b><span>Arabcha suhbatlar, sekin va aniq</span><em className="tag">Tez kunda</em>
          <span className="podc" aria-hidden><Headphones size={52} /></span>
        </button>
        <button type="button" className="lc" onClick={() => go("soon", { title: "Videolar" })}>
          <b>Videolar</b><span>Multfilm va darslar</span><span className="play" aria-hidden><Play size={22} fill="currentColor" /></span>
        </button>
        <button type="button" className="lc" onClick={() => setTab("lessons")}>
          <b>Kitoblar</b><span>{books ? `${books.length} ta kitob` : "Madina, Al-Manhaj"}</span><img src={img("books")} alt="" />
        </button>
      </div>

      <SectionTitle ar="الْخِدْمَاتُ" uz="Xizmatlar" />
      <div className="row">
        <button type="button" className="svc v1" onClick={() => go("soon", { title: "Lug'at" })}>Lug'at<Ar className="svc-ar">قَامُوسٌ</Ar><img src={img("magnifier")} alt="" /></button>
        <button type="button" className="svc v2" onClick={invite}>Do'stni taklif qilish<img src={img("handshake")} alt="" /></button>
        <button type="button" className="svc v3" onClick={() => go("soon", { title: "Imtihonga yozilish" })}>Imtihonga yozilish<img src={img("ticket")} alt="" /></button>
      </div>

      <SectionTitle ar="الْمَتْجَرُ" uz="Do'kon" />
      <button type="button" className="shopsoon" onClick={() => go("soon", { title: "Do'kon" })}>
        <img src={img("gift")} alt="" />
        <span><b>Do'kon tez orada ochiladi</b><small>Darslardan tanga yig'ing — ularni sovg'alarga almashtirasiz.</small></span>
      </button>

      <SectionTitle ar="الْمُفْرَدَاتُ" uz="Lug'at" />
      <div className="voc">
        <button type="button" className="vc learn" onClick={() => setTab("lessons")}>
          <b>O'rganilgan so'zlar</b><span className="go" aria-hidden><ArrowUpRight size={16} /></span>
          <span className="gauge" aria-label={`${sum?.known || 0} ta so'z`}>
            <svg viewBox="0 0 140 84" width="140" height="84" aria-hidden>
              <path d="M12 76a58 58 0 0 1 116 0" fill="none" stroke="rgba(251,247,239,.25)" strokeWidth="12" strokeLinecap="round" />
              <path d="M12 76a58 58 0 0 1 116 0" fill="none" stroke="#FBF7EF" strokeWidth="12" strokeLinecap="round" strokeDasharray="182" strokeDashoffset={182 * (1 - gauge)} />
            </svg>
            <span className="n">{sum ? sum.known : "…"}</span>
          </span>
        </button>
        <button type="button" className="vc games" onClick={() => setTab("practice")}>
          <b>So'z o'yinlari</b><span className="go" aria-hidden><ArrowUpRight size={16} /></span>
          <img className="gm" src={img("game")} alt="" /><img className="pz" src={img("puzzle")} alt="" />
        </button>
      </div>
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
        <div className="due">Muddat: {hw.due.split("-").reverse().slice(0, 2).join(".")}</div>
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
