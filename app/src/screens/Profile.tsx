// Profil: hisob (ism va daraja, guvohnoma — login va yangi PIN), kitob tanlash, guruh (qo'shilish va chiqish),
// ustozlik so'rovi, ustoz va admin panellariga kirish, ko'rinish. Server amallari eski ilova bilan umumiy.
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, Copy, GraduationCap, IdCard, KeyRound, LogOut, Moon, Send, ShieldCheck, Sun, SunMoon, UserPen, Users } from "lucide-react";
import { api } from "../lib/api";
import { BOT_LINK } from "../lib/config";
import { loadData, type BookIndex } from "../lib/data";
import { store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { useTheme, type ThemePref } from "../state/theme";
import { useArm } from "../ui/arm";
import { Avatar, Logo, ScreenHeader, SectionTitle } from "../ui/kit";
import { toast } from "../ui/Toast";
import { bookOfLevel } from "./Unit";

const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1"];
const BOOK_LEVEL: Record<string, string> = { a1: "A1", md1: "A1", a2: "A2", md2: "A2", b1: "B1", b2: "B2", c1: "C1" };
const THEMES: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Kunduz", Icon: Sun },
  { id: "dark", label: "Tun", Icon: Moon },
  { id: "auto", label: "Avtomatik", Icon: SunMoon },
];

export function useBookIndex() {
  const [books, setBooks] = useState<BookIndex | null>(null);
  useEffect(() => { let on = true; loadData<BookIndex>("books/index").then((b) => on && setBooks(b)).catch(() => on && setBooks([])); return () => { on = false; }; }, []);
  return books;
}

export function Profile() {
  const { me } = useSession();
  const { go } = useNav();
  const { pref, set } = useTheme();
  const books = useBookIndex();
  const name = me?.full_name || me?.name || "O'quvchi";
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const book = books?.find((b) => b.id === bookId);
  return (
    <main className="screen">
      <SectionTitle ar="الْمَلَفُّ الشَّخْصِيُّ" uz="Profil" />
      <section className="card prof">
        <Avatar name={name} photo={tg.user?.photo_url} size={64} />
        <div><b>{name}</b><span>Login: {me?.login || "—"}</span><span>Daraja: {me?.level || "—"}{me?.group ? ` · ${me.group.title}` : ""}</span></div>
      </section>

      <h2 className="t-h">Hisob</h2>
      <button type="button" className="rowbtn" onClick={() => go("books")}>
        <BookOpen size={24} aria-hidden /><span><b>Kitobim</b><small>{book ? `${book.title} · ${book.units} dars` : "…"} · almashtirish</small></span><ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className="rowbtn" onClick={() => go("idcard")}>
        <IdCard size={24} aria-hidden /><span><b>Guvohnoma</b><small>Login va PIN · Telegram'siz kirish uchun</small></span><ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className="rowbtn" onClick={() => go("account")}>
        <UserPen size={24} aria-hidden /><span><b>Ism va daraja</b><small>{name} · {me?.level || "—"}</small></span><ChevronRight size={20} aria-hidden />
      </button>

      <h2 className="t-h">Guruh</h2>
      <GroupCard />
      {(me?.teacher || !!me?.myGroups?.length) ? (
        <button type="button" className="rowbtn" onClick={() => go("teacher")}>
          <GraduationCap size={24} aria-hidden /><span><b>Ustoz paneli</b><small>Guruh, javoblar, uy vazifalari</small></span><ChevronRight size={20} aria-hidden />
        </button>
      ) : <TeacherAsk />}
      {me?.admin && (
        <button type="button" className="rowbtn" onClick={() => go("admin")}>
          <ShieldCheck size={24} aria-hidden /><span><b>Admin paneli</b><small>Kirish so'rovlari, ustozlar, foydalanuvchilar</small></span><ChevronRight size={20} aria-hidden />
        </button>
      )}

      <section className="card">
        <b className="lbl">Ko'rinish</b>
        <div className="seg small">
          {THEMES.map(({ id, label, Icon }) => (
            <button key={id} type="button" className={pref === id ? "on" : ""} aria-pressed={pref === id} onClick={() => set(id)}><Icon size={16} aria-hidden />{label}</button>
          ))}
        </div>
      </section>
    </main>
  );
}

/** Guruh: a'zo bo'lsa — nomi va chiqish; bo'lmasa — kod bilan qo'shilish */
function GroupCard() {
  const { me, refresh } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { armed, fire } = useArm();
  const g = me?.group;
  const join = async () => {
    setBusy(true);
    try {
      const j = await api<{ title: string }>("groupJoin", { code: code.trim() });
      toast(`«${j.title}» guruhiga qo'shildingiz`); tg.haptic("success"); setCode("");
      await refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Qo'shilib bo'lmadi"); }
    setBusy(false);
  };
  const leave = async () => {
    if (!fire("leave")) return;
    setBusy(true);
    try { await api("groupLeave"); toast("Guruhdan chiqdingiz"); await refresh(); }
    catch (e) { toast(e instanceof Error ? e.message : "Chiqib bo'lmadi"); }
    setBusy(false);
  };
  if (g) {
    return (
      <section className="card pf-group">
        <Users size={24} aria-hidden />
        <div><b>{g.title}</b><span>Guruh kodi: {g.code}{g.teacher ? " · siz ustozsiz" : ""}</span></div>
        {!g.teacher && (
          <button type="button" className={`btn ghost bad ${armed === "leave" ? "armed" : ""}`} disabled={busy} onClick={() => void leave()}>
            <LogOut size={16} aria-hidden />{armed === "leave" ? "Yana bosing" : "Chiqish"}
          </button>
        )}
      </section>
    );
  }
  return (
    <form className="card pf-join" onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 4) void join(); }}>
      <b>Guruhga qo'shilish</b>
      <span>Ustozingiz bergan 6 belgili kodni yozing yoki u yuborgan havolani oching.</span>
      <div className="dform">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="Masalan: K7QX2M" maxLength={8} autoComplete="off" aria-label="Guruh kodi" />
        <button type="submit" className="btn primary" disabled={code.trim().length < 4 || busy}>Qo'shilish</button>
      </div>
    </form>
  );
}

/** Ustozlik so'rovi: admin Telegram'da xabar oladi va Admin paneli → Ustozlar orqali ruxsat beradi */
function TeacherAsk() {
  const { me, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (me?.teacherReq) {
    return <section className="card pf-req"><GraduationCap size={22} aria-hidden /><span><b>Ustozlik so'rovingiz yuborilgan</b><small>Bosh admin ko'rib chiqadi, javob Telegram'ga keladi.</small></span></section>;
  }
  if (!open) {
    return (
      <button type="button" className="rowbtn" onClick={() => setOpen(true)}>
        <GraduationCap size={24} aria-hidden /><span><b>Ustoz bo'lish</b><small>Guruh ochish va vazifa berish uchun ruxsat so'rash</small></span><ChevronRight size={20} aria-hidden />
      </button>
    );
  }
  const send = async () => {
    setBusy(true);
    try { await api("teacherRequest", { note: note.trim() }); toast("So'rov yuborildi"); tg.haptic("success"); await refresh(); }
    catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
    setBusy(false);
  };
  return (
    <form className="card form pf-ask" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <b>Ustozlik so'rovi</b>
      <label>Qisqa izoh (ixtiyoriy)<textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={3} placeholder="Masalan: markazda A1 guruhini o'qitaman" /></label>
      <div className="row2">
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Bekor qilish</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? "Yuborilmoqda…" : "Yuborish"}</button>
      </div>
    </form>
  );
}

// ===== Ism va daraja =====
export function AccountScreen() {
  const { me, refresh } = useSession();
  const { back, go } = useNav();
  const [name, setName] = useState(me?.full_name || me?.name || "");
  const [level, setLevel] = useState(me?.level || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cur = store.get("a1.book", bookOfLevel(me?.level));
  const bookMoves = !!level && level !== "A0" && BOOK_LEVEL[cur] !== level;
  const ok = name.trim().length >= 2 && !!level && (name.trim() !== (me?.full_name || "") || level !== me?.level);
  const save = async () => {
    setBusy(true); setErr("");
    try {
      await api("register", { name: name.trim().replace(/\s+/g, " "), level });
      if (bookMoves) store.set("a1.book", bookOfLevel(level));
      await refresh();
      toast("Saqlandi"); tg.haptic("success"); back();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  return (
    <main className="screen">
      <ScreenHeader title="Ism va daraja" />
      <form className="card form" onSubmit={(e) => { e.preventDefault(); if (ok) void save(); }}>
        <label>Ism va familiya<input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="Masalan: Aziz Karimov" autoComplete="name" /></label>
        <fieldset className="levels"><legend>Darajangiz</legend>
          {LEVELS.map((l) => <button key={l} type="button" className={l === level ? "on" : ""} aria-pressed={l === level} onClick={() => setLevel(l)}>{l}</button>)}
        </fieldset>
        {bookMoves && <p className="pf-note">Saqlansa, kitobingiz ham {level} darajasidagi kitobga almashadi. Natijalaringiz o'chmaydi.</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <button type="submit" className="btn dark wide" disabled={!ok || busy}>{busy ? "Saqlanmoqda…" : "Saqlash"}</button>
      </form>
      <button type="button" className="rowbtn" onClick={() => go("leveltest")}>
        <GraduationCap size={24} aria-hidden /><span><b>Darajamni test orqali aniqlash</b><small>30 ta savol · sertifikat bilan</small></span><ChevronRight size={20} aria-hidden />
      </button>
    </main>
  );
}

// ===== Guvohnoma: login, yangi PIN (faqat Telegram orqali), ustozga yuborish =====
export function IdCardScreen() {
  const { me } = useSession();
  const books = useBookIndex();
  const [pin, setPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { armed, fire } = useArm();
  const name = me?.full_name || me?.name || "O'quvchi";
  const book = books?.find((b) => b.id === store.get("a1.book", bookOfLevel(me?.level)));
  const login = me?.login || "";
  const newPin = async () => {
    if (!fire("pin")) return;
    setBusy(true); setErr("");
    try { const r = await api<{ pin: string }>("newPin"); setPin(r.pin); tg.haptic("success"); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(login); toast("Login nusxalandi"); } catch { toast("Nusxalab bo'lmadi — qo'lda yozib oling"); }
  };
  const send = () => tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(`Mening Mezon loginim: ${login} (${name})`)}`);
  return (
    <main className="screen">
      <ScreenHeader title="Guvohnoma" ar="بِطَاقَةُ الطَّالِبِ" />
      <section className="idc" aria-label="O'quvchi guvohnomasi">
        <div className="idc-top"><Logo size={44} /><span>Mezon · o'quvchi guvohnomasi</span></div>
        <b className="idc-n">{name}</b>
        <dl>
          <div><dt>Login</dt><dd className="idc-login">{login || "—"}</dd></div>
          <div><dt>Daraja</dt><dd>{me?.level || "—"}</dd></div>
          <div><dt>Kitob</dt><dd>{book?.title || "—"}</dd></div>
          <div><dt>Guruh</dt><dd>{me?.group?.title || "guruhsiz"}</dd></div>
        </dl>
      </section>
      {login && (
        <div className="row2 idc-act">
          <button type="button" className="btn ghost" onClick={() => void copy()}><Copy size={18} aria-hidden />Nusxalash</button>
          <button type="button" className="btn ghost" aria-label="Loginni ustozga yuborish" onClick={send}><Send size={18} aria-hidden />Ustozga</button>
        </div>
      )}

      <h2 className="t-h">PIN</h2>
      {pin ? (
        <section className="card idc-pin" role="status">
          <span>Yangi PIN</span><b>{pin}</b>
          <small>Buni yozib qo'ying — boshqa ko'rsatilmaydi. Eski PIN endi ishlamaydi.</small>
        </section>
      ) : (
        <section className="card idc-pin">
          <small>PIN faqat ro'yxatdan o'tganda ko'rsatiladi. Esdan chiqqan bo'lsa, yangisini oling — eski PIN ishlamay qoladi.</small>
          {err && <p className="err" role="alert">{err}</p>}
          <button type="button" className={`btn ${armed === "pin" ? "dark" : "primary"} wide`} disabled={busy || !login} onClick={() => void newPin()}>
            <KeyRound size={18} aria-hidden />{busy ? "Olinmoqda…" : armed === "pin" ? "Tasdiqlash: yana bosing" : "Yangi PIN olish"}
          </button>
        </section>
      )}
      <p className="pf-hint">Login va PIN bilan ilovani Telegram'siz — oddiy brauzerda ham ochish mumkin.</p>
    </main>
  );
}
