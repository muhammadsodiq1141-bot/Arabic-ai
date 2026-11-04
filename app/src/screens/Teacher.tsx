// Ustoz paneli (5-partiya): guruh o'quvchilari va natijalari (server "groupMembers" + har o'quvchining _sum hisoboti),
// tekshiriladigan javoblar soni, uy vazifalari, taklif havolasi, o'quvchini guruhdan chiqarish (ikki marta bosib tasdiqlanadi).
// 7-partiya: admin istalgan guruhni ochadi (fixed), guruhni o'chirish (groupDelete), yana guruh ochish.
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardList, Flame, Link2, MessageSquareText, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { api } from "../lib/api";
import { BOT_LINK } from "../lib/config";
import { loadData, type BookIndex } from "../lib/data";
import { weekId } from "../lib/progress";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { useArm } from "../ui/arm";
import { useLets } from "./KbA0";
import { Avatar, Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

export type Sum = {
  streak?: number; xpw?: number; xpt?: number; days?: number[]; book?: string; books?: Record<string, [number, number]>;
  test?: number | null; kb?: Record<string, [number, number, number]>; a0?: { m: string; sp?: number | null; rv?: number }; ob?: { d: number; n: number };
};
export type Member = { name: string; full_name: string | null; login: string | null; level: string | null; username?: string; last_seen: string | null; kid: string; xp: number; sum: Sum | null };

/** Ustozning tanlangan guruhi (bir nechta bo'lsa — eslab qolinadi) */
export function useTeacherGroup() {
  const { me } = useSession();
  const groups = me?.myGroups || [];
  const [code, setCode] = useState<string>(() => { try { return sessionStorage.getItem("v2.tgroup") || ""; } catch { return ""; } });
  const cur = groups.find((g) => g.code === code) || groups[0] || null;
  const pick = (c: string) => { setCode(c); try { sessionStorage.setItem("v2.tgroup", c); } catch { /* */ } };
  return { groups, cur, pick };
}

const daysAgo = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null);
const lastText = (iso: string | null) => { const d = daysAgo(iso); return d === null ? "hali kirmagan" : d <= 0 ? "bugun faol" : d === 1 ? "kecha" : `${d} kun oldin`; };

export function TeacherScreen({ fixed }: { fixed?: { code: string; title: string } }) {
  const { me, refresh } = useSession();
  const { go, back } = useNav();
  const tgr = useTeacherGroup();
  const groups = fixed ? [fixed] : tgr.groups;
  const cur = fixed || tgr.cur;
  const pick = tgr.pick;
  const [adding, setAdding] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const { armed, fire } = useArm();
  const del = async () => {
    if (!cur || !fire("del")) return;
    setDelBusy(true);
    try {
      await api("groupDelete", { code: cur.code });
      toast(`«${cur.title}» guruhi o'chirildi`);
      await refresh();
      if (fixed) back();
    } catch (e) { toast(e instanceof Error ? e.message : "O'chirilmadi"); }
    setDelBusy(false);
  };
  const [members, setMembers] = useState<Member[] | null | "err">(null);
  const [pending, setPending] = useState<number | null>(null);
  const [hwN, setHwN] = useState<number | null>(null);
  const [books, setBooks] = useState<BookIndex>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => { loadData<BookIndex>("books/index").then(setBooks).catch(() => {}); }, []);
  useEffect(() => {
    if (!cur) return;
    let alive = true;
    setMembers(null); setPending(null);
    api<{ members: Member[] }>("groupMembers", { code: cur.code, week: weekId() })
      .then((r) => alive && setMembers(r.members || [])).catch(() => alive && setMembers("err"));
    api<{ items: { grade: number | null; item: number }[] }>("subList", { code: cur.code })
      .then((r) => alive && setPending((r.items || []).filter((x) => x.grade === null && x.item < 300).length)).catch(() => alive && setPending(0));
    api<{ items: { group_code: string; teacher?: boolean }[] }>("hwList")
      .then((r) => alive && setHwN((r.items || []).filter((h) => h.teacher && h.group_code === cur.code).length)).catch(() => alive && setHwN(0));
    return () => { alive = false; };
  }, [cur, nonce]);

  if (!fixed && !me?.teacher && !groups.length) {
    return <main className="screen"><ScreenHeader title="Ustoz paneli" ar="لَوْحَةُ الْمُعَلِّمِ" /><Empty icon={<Users size={28} />} title="Ustozlik ruxsati yo'q" text="Guruh ochish uchun bosh admin ustozlik ruxsatini berishi kerak." /></main>;
  }
  if (!cur) return <main className="screen"><ScreenHeader title="Ustoz paneli" ar="لَوْحَةُ الْمُعَلِّمِ" /><NewGroup onDone={() => void refresh()} /></main>;

  const list = members && members !== "err" ? members : [];
  const today = list.filter((m) => daysAgo(m.last_seen) === 0).length;
  const week = list.filter((m) => { const d = daysAgo(m.last_seen); return d !== null && d < 7; }).length;
  const link = `${BOT_LINK}?start=g_${cur.code}`;
  const share = () => tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`«${cur.title}» guruhiga qo'shiling — Mezon'da arab tilini birga o'rganamiz.`)}`);
  const bookName = (id: string) => books.find((b) => b.id === id)?.title || id;

  return (
    <main className="screen teacher">
      <ScreenHeader title={fixed ? fixed.title : "Ustoz paneli"} ar="لَوْحَةُ الْمُعَلِّمِ" />
      {groups.length > 1 && (
        <div className="chips" role="tablist" aria-label="Guruh">
          {groups.map((g) => <button key={g.code} type="button" role="tab" aria-selected={g.code === cur.code} className={g.code === cur.code ? "on" : ""} onClick={() => pick(g.code)}>{g.title}</button>)}
        </div>
      )}

      <section className="t-stats" aria-label="Guruh holati">
        <div><b>{members === null ? "…" : list.length}</b><span>o'quvchi</span></div>
        <div><b>{members === null ? "…" : today}</b><span>bugun faol</span></div>
        <div><b>{members === null ? "…" : week}</b><span>hafta faol</span></div>
      </section>

      <button type="button" className={`rowbtn t-subs ${pending ? "has" : ""}`} onClick={() => go("tsubs", { code: cur.code })}>
        <MessageSquareText size={24} aria-hidden />
        <span><b>Tekshiriladigan javoblar</b><small>{pending === null ? "Yuklanmoqda…" : pending ? `${pending} ta javob baho kutmoqda` : "Hammasi baholangan"}</small></span>
        {!!pending && <em className="t-badge">{pending}</em>}<ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className="rowbtn" onClick={() => go("thw", { code: cur.code })}>
        <ClipboardList size={24} aria-hidden />
        <span><b>Uy vazifalari</b><small>{hwN === null ? "Yuklanmoqda…" : hwN ? `${hwN} ta vazifa · kim bajardi` : "Hali vazifa berilmagan"}</small></span>
        <ChevronRight size={20} aria-hidden />
      </button>
      <div className="t-act">
        <button type="button" className="btn primary" onClick={() => go("thwnew", { code: cur.code })}><Plus size={18} aria-hidden />Vazifa berish</button>
        <button type="button" className="btn ghost" onClick={share}><Link2 size={18} aria-hidden />Taklif havolasi</button>
      </div>

      {members !== null && members !== "err" && <A0Heat list={list} />}
      <h2 className="t-h">O'quvchilar</h2>
      {members === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div>}
      {members === "err" && (
        <div className="empty"><h2>Ro'yxat yuklanmadi</h2><p>Internetni tekshirib, qayta urinib ko'ring.</p>
          <button type="button" className="btn ghost lg-retry" onClick={() => setNonce((x) => x + 1)}>Qayta urinish</button></div>
      )}
      {members !== null && members !== "err" && !list.length && (
        <Empty icon={<Users size={28} />} title="Guruhda hali o'quvchi yo'q" text="Taklif havolasini o'quvchilarga yuboring — ular havola orqali guruhga qo'shiladi." />
      )}
      <ul className="t-list">
        {list.map((m) => (
          <MemberRow key={m.kid} m={m} open={open === m.kid} onToggle={() => setOpen(open === m.kid ? null : m.kid)} bookName={bookName}
            onKick={async () => {
              try { await api("groupKick", { code: cur.code, kid: m.kid }); toast(`${m.full_name || m.name} guruhdan chiqarildi`); setNonce((x) => x + 1); }
              catch (e) { toast(e instanceof Error ? e.message : "Chiqarilmadi"); }
            }} />
        ))}
      </ul>
      <p className="t-code">Guruh kodi: <b>{cur.code}</b></p>
      {!fixed && (adding
        ? <NewGroup again onDone={() => { setAdding(false); void refresh(); }} />
        : <button type="button" className="btn ghost wide t-more" onClick={() => setAdding(true)}><Plus size={18} aria-hidden />Yana guruh ochish</button>)}
      <section className="t-danger">
        <p>Guruh o'chirilsa, o'quvchilar guruhsiz qoladi va vazifalar o'chadi. O'quvchilarning natijalari saqlanadi.</p>
        <button type="button" className={`btn ghost bad wide ${armed === "del" ? "armed" : ""}`} disabled={delBusy} onClick={() => void del()}>
          <Trash2 size={18} aria-hidden />{armed === "del" ? "Rostdan o'chirilsinmi? Yana bosing" : "Guruhni o'chirish"}
        </button>
      </section>
    </main>
  );
}

function MemberRow({ m, open, onToggle, bookName, onKick }: { m: Member; open: boolean; onToggle: () => void; bookName: (id: string) => string; onKick: () => void }) {
  const [sure, setSure] = useState(false);
  const s = m.sum || {};
  const name = m.full_name || m.name || "O'quvchi";
  const d = daysAgo(m.last_seen);
  const books = Object.entries(s.books || {}).sort((a, b) => b[1][0] - a[1][0]).slice(0, 3);
  return (
    <li className={`t-mem ${open ? "open" : ""}`}>
      <button type="button" className="t-row" aria-expanded={open} onClick={onToggle}>
        <Avatar name={name} size={44} />
        <span className="t-who">
          <b>{name}</b>
          <small className={d === 0 ? "on" : d !== null && d > 3 ? "late" : ""}>{lastText(m.last_seen)}{m.level ? ` · ${m.level}` : ""}</small>
        </span>
        <span className="t-xp" aria-label={`Bu hafta ${m.xp} yulduzcha`}>+{m.xp}</span>
        <ChevronDown size={18} aria-hidden className="t-chev" />
      </button>
      <div className="t-days" aria-label="Oxirgi 14 kun faolligi">{(s.days || Array(14).fill(0)).map((v, i) => <i key={i} className={v > 0 ? "on" : ""} />)}</div>
      {open && (
        <div className="t-det">
          <dl className="t-kv">
            <div><dt>Seriya</dt><dd><Flame size={14} aria-hidden />{s.streak ?? 0} kun</dd></div>
            <div><dt>So'z testlari</dt><dd>{s.test == null ? "—" : `${s.test}%`}</dd></div>
            <div><dt>Login</dt><dd>{m.login || "—"}</dd></div>
            <div><dt>Bugun</dt><dd>+{s.xpt ?? 0} yulduzcha</dd></div>
          </dl>
          {books.map(([id, v]) => {
            const p = v[1] ? Math.round((v[0] / v[1]) * 100) : 0;
            return (
              <div key={id} className="t-bk"><span>{bookName(id)}</span>
                <span className="mk-b" role="progressbar" aria-label={bookName(id)} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${p}%` }} /></span>
                <b>{v[0]}/{v[1]}</b></div>
            );
          })}
          {s.kb && Object.entries(s.kb).map(([k, v]) => <p key={k} className="t-note">Mashqlar · {k.startsWith("a0:") ? `A0 ${k.slice(3)}-dars` : k.startsWith("md") ? `Madina ${k[2]} · ${k.split(":")[1]}-vahda` : `${k.split(":")[1]}-vahda`}: {v[0]}/{v[1]} topshiriq · o'rtacha {v[2]}%</p>)}
          {s.a0 && <p className="t-note">A0 alifbo: {(s.a0.m.match(/2/g) || []).length}/28 harf{s.a0.sp ? ` · ${s.a0.sp} bo'g'in/daqiqa` : ""}</p>}
          {s.ob && <p className="t-note">Birinchi hafta: {s.ob.d > 7 ? "tugadi" : `${s.ob.d}-kun`} · {s.ob.n} / 21 vazifa</p>}
          {!m.sum && <p className="t-note">Natijalar hali serverga kelmagan.</p>}
          <div className="t-kick">
            {!sure
              ? <button type="button" className="btn ghost bad" onClick={() => setSure(true)}><UserMinus size={18} aria-hidden />Guruhdan chiqarish</button>
              : <><span>{name} guruhdan chiqarilsinmi?</span>
                  <button type="button" className="btn ghost" onClick={() => setSure(false)}>Yo'q</button>
                  <button type="button" className="btn bad-fill" onClick={onKick}>Ha, chiqarish</button></>}
          </div>
        </div>
      )}
    </li>
  );
}

/** Guruh ochish (ustozda hali guruh bo'lmasa) */
function NewGroup({ onDone, again }: { onDone: () => void; again?: boolean }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    if (title.trim().length < 2) { setErr("Guruh nomini yozing (masalan: A1-ertalab)."); return; }
    setBusy(true); setErr("");
    try { await api("groupCreate", { title: title.trim() }); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Guruh ochilmadi"); setBusy(false); }
  };
  return (
    <section className="card">
      <h2 className="t-h first">{again ? "Yangi guruh ochish" : "Birinchi guruhingizni oching"}</h2>
      <p className="muted">Guruh ochilgach, taklif havolasini o'quvchilarga yuborasiz va ularga uy vazifasi berasiz.</p>
      <form className="form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label>Guruh nomi<input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="A1-ertalab" /></label>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="btn primary wide" disabled={busy}>{busy ? "Ochilmoqda…" : "Guruh ochish"}</button>
      </form>
    </section>
  );
}

/** A0 o'quvchilari bo'lsa: guruhning harflar xaritasi — har harfni o'zlashtirganlar foizi (_sum.a0.m, A0_LET tartibida) */
function A0Heat({ list }: { list: Member[] }) {
  const LETS = useLets();
  const R = list.filter((m) => m.sum?.a0?.m);
  if (!R.length || !LETS) return null;
  return (
    <section className="card a0-heat">
      <b className="lbl">Guruhning harflar xaritasi</b>
      <small className="muted">{R.length} ta o'quvchi · har harfni o'zlashtirganlar foizi</small>
      <div className="a0-grid sm" dir="rtl">
        {LETS.map((r, i) => {
          const p = Math.round((R.filter((m) => m.sum!.a0!.m[i] === "2").length / R.length) * 100);
          return <span key={r[0]} className="a0-c" style={{ background: `color-mix(in srgb, var(--good) ${p}%, var(--soft))`, color: p > 55 ? "var(--good-ink)" : "var(--ink)" }} aria-label={`${r[1]}: ${p}%`}><span className="ar">{r[0]}</span><small>{p}%</small></span>;
        })}
      </div>
    </section>
  );
}
