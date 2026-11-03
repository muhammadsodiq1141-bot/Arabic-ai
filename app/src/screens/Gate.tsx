// Ilovaga kirishdan oldingi ekranlar: Telegram'siz ochilganda kirish, ro'yxatdan o'tish, tasdiq kutish, rad etilgan.
import { useState } from "react";
import { Check, KeyRound, RefreshCw, Send } from "lucide-react";
import { api, setLogin } from "../lib/api";
import { BOT_LINK } from "../lib/config";
import { tg } from "../lib/tg";
import { useSession } from "../state/session";
import { Avatar, Logo } from "../ui/kit";

const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1"];

export function NoAuth() {
  const { refresh, error } = useSession();
  const [login, setL] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = /^MJ-\d{5}$/i.test(login.trim()) && /^\d{6}$/.test(pin);
  const submit = async () => {
    setBusy(true);
    setLogin(`login:${login.trim().toUpperCase()}:${pin}`);
    await refresh();
    setBusy(false);
  };
  return (
    <main className="gate">
      <Logo />
      <h1>Mezon'ga xush kelibsiz</h1>
      <p>Ilovani Telegram bot orqali oching yoki shaxsiy loginingiz bilan kiring.</p>
      <button type="button" className="btn primary wide" onClick={() => tg.openLink(BOT_LINK)}><Send size={20} aria-hidden />Telegram'da ochish</button>
      <form className="card form" onSubmit={(e) => { e.preventDefault(); if (ok) void submit(); }}>
        <label>Login<input value={login} onChange={(e) => setL(e.target.value)} placeholder="MJ-12345" autoComplete="username" inputMode="text" /></label>
        <label>PIN (6 raqam)<input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" inputMode="numeric" type="password" autoComplete="current-password" /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button type="submit" className="btn dark wide" disabled={!ok || busy}><KeyRound size={18} aria-hidden />{busy ? "Tekshirilmoqda…" : "Kirish"}</button>
      </form>
    </main>
  );
}

export function Register() {
  const { refresh, me } = useSession();
  const [name, setName] = useState(me?.name || tg.user?.first_name || "");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cred, setCred] = useState<{ login: string; pin?: string } | null>(null);
  const ok = name.trim().length >= 2 && !!level;

  if (cred) {
    return (
      <main className="gate">
        <Logo size={88} />
        <h1>Shaxsiy loginingiz</h1>
        <p>Buni yozib qo'ying: Telegram'siz kirish uchun kerak bo'ladi. PIN boshqa ko'rsatilmaydi.</p>
        <div className="card cred"><div><small>Login</small><b>{cred.login}</b></div>{cred.pin && <div><small>PIN</small><b>{cred.pin}</b></div>}</div>
        <button type="button" className="btn primary wide" onClick={() => void refresh()}>Davom etish</button>
      </main>
    );
  }
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api<{ login: string; pin?: string }>("register", { name: name.trim(), level });
      setCred(r);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  return (
    <main className="gate">
      <Logo size={88} />
      <h1>Ro'yxatdan o'tish</h1>
      <p>Ism-familiyangiz va darajangizni kiriting. Keyin so'rovingiz bosh adminga boradi.</p>
      <form className="card form" onSubmit={(e) => { e.preventDefault(); if (ok) void submit(); }}>
        <label>Ism va familiya<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Aziz Karimov" autoComplete="name" /></label>
        <fieldset className="levels"><legend>Darajangiz</legend>
          {LEVELS.map((l) => <button key={l} type="button" className={l === level ? "on" : ""} aria-pressed={l === level} onClick={() => setLevel(l)}>{l}</button>)}
        </fieldset>
        {err && <p className="err" role="alert">{err}</p>}
        <button type="submit" className="btn dark wide" disabled={!ok || busy}>{busy ? "Yuborilmoqda…" : "So'rov yuborish"}</button>
      </form>
    </main>
  );
}

export function Pending() {
  const { me, refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const name = me?.full_name || me?.name || tg.user?.first_name || "O'quvchi";
  const sub = [me?.level, me?.group ? `guruh: ${me.group.title}` : "guruhsiz"].filter(Boolean).join(" · ");
  return (
    <main className="gate">
      <Logo />
      <h1>So'rovingiz qabul qilindi</h1>
      <p>Mezon'dan faqat bosh admin tasdiqlagan o'quvchilar foydalanadi. Tasdiqlanganda Telegram orqali xabar olasiz.</p>
      <div className="who2"><Avatar name={name} size={44} /><div><b>{name}</b><span>{sub}</span></div></div>
      <ol className="steps">
        <li><span className="k ok"><Check size={18} aria-hidden /></span><div><b>Ro'yxatdan o'tdingiz</b><span>Ism va daraja</span></div></li>
        <li><span className="k now">2</span><div><b>Bosh admin tasdig'i</b><span>Kutilmoqda</span></div></li>
        <li><span className="k next">3</span><div><b>Ilova ochiladi</b><span>Uy vazifasi, lug'at va reyting</span></div></li>
      </ol>
      <button type="button" className="btn ghost wide" disabled={busy} onClick={async () => { setBusy(true); await refresh(); setBusy(false); }}>
        <RefreshCw size={18} aria-hidden className={busy ? "spin" : ""} />Holatni yangilash
      </button>
    </main>
  );
}

export function Rejected() {
  return (
    <main className="gate">
      <Logo />
      <h1>So'rovingiz tasdiqlanmadi</h1>
      <p>Hozircha Mezon'ga kirish ruxsati berilmadi. Savollar bo'lsa, ustozingizga yoki adminga yozing.</p>
      <button type="button" className="btn ghost wide" onClick={() => tg.openLink(BOT_LINK)}><Send size={18} aria-hidden />Botga yozish</button>
    </main>
  );
}

export function Problem() {
  const { error, refresh } = useSession();
  return (
    <main className="gate">
      <Logo />
      <h1>Ulanib bo'lmadi</h1>
      <p>{error || "Server javob bermadi."} Internetni tekshirib, qayta urinib ko'ring.</p>
      <button type="button" className="btn primary wide" onClick={() => void refresh()}><RefreshCw size={18} aria-hidden />Qayta urinish</button>
    </main>
  );
}
