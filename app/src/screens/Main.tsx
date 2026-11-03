// Tasdiqlangan foydalanuvchi uchun asosiy qism: pastki menyu bo'limlari va ichki ekranlar.
// 1-partiya: bosh sahifa sarlavhasi, profil, admin so'rovlari; qolgan bo'limlar keyingi partiyalarda to'ldiriladi.
import { Bell, BookOpen, ChevronRight, ClipboardCheck, MessageCircle, Mic, Moon, ShieldCheck, Sun, SunMoon, Trophy } from "lucide-react";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { useTheme, type ThemePref } from "../state/theme";
import { Avatar, BottomNav, Empty, SectionTitle } from "../ui/kit";
import { AdminRequests } from "./AdminRequests";

function HomeHeader() {
  const { me } = useSession();
  const name = me?.full_name || me?.name || "O'quvchi";
  return (
    <header className="top">
      <Avatar name={name} photo={tg.user?.photo_url} />
      <div className="who"><b>{name}</b><span>{me?.level || "—"}{me?.group ? ` · ${me.group.title}` : ""}</span></div>
      <button type="button" className="ibtn" aria-label="Reyting"><Trophy size={22} aria-hidden /></button>
      <button type="button" className="ibtn" aria-label="Bildirishnomalar"><Bell size={22} aria-hidden /></button>
      <button type="button" className="ibtn" aria-label="Xabarlar"><MessageCircle size={22} aria-hidden /></button>
    </header>
  );
}

function Home() {
  return (
    <main className="screen">
      <HomeHeader />
      <SectionTitle ar="الْوَاجِبُ الْمَنْزِلِيُّ" uz="Uy vazifasi" />
      <Empty icon={<BookOpen size={28} />} title="Bosh sahifa tayyorlanmoqda" text="Uy vazifasi, yulduzcha, tanga va reyting kartalari keyingi partiyada qo'shiladi." />
    </main>
  );
}

function Soon({ title, ar, Icon }: { title: string; ar: string; Icon: typeof Mic }) {
  return (
    <main className="screen">
      <SectionTitle ar={ar} uz={title} />
      <Empty icon={<Icon size={28} />} title={`${title} — tez orada`} text="Bu bo'lim keyingi partiyalarda quriladi." />
    </main>
  );
}

const THEMES: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Kunduz", Icon: Sun },
  { id: "dark", label: "Tun", Icon: Moon },
  { id: "auto", label: "Avtomatik", Icon: SunMoon },
];

function Profile() {
  const { me } = useSession();
  const { go } = useNav();
  const { pref, set } = useTheme();
  const name = me?.full_name || me?.name || "O'quvchi";
  return (
    <main className="screen">
      <SectionTitle ar="الْمَلَفُّ الشَّخْصِيُّ" uz="Profil" />
      <section className="card prof">
        <Avatar name={name} photo={tg.user?.photo_url} size={64} />
        <div><b>{name}</b><span>Login: {me?.login || "—"}</span><span>Daraja: {me?.level || "—"}{me?.group ? ` · ${me.group.title}` : ""}</span></div>
      </section>
      {me?.admin && (
        <button type="button" className="rowbtn" onClick={() => go("adminRequests")}>
          <ShieldCheck size={24} aria-hidden /><span><b>Kirish so'rovlari</b><small>Yangi odamlarni tasdiqlash</small></span><ChevronRight size={20} aria-hidden />
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

export function Main() {
  const { tab, route } = useNav();
  const inner = route.view === "adminRequests" ? <AdminRequests /> : null;
  if (inner) return inner;
  return (
    <>
      {tab === "home" && <Home />}
      {tab === "lessons" && <Soon title="Darslar" ar="الدُّرُوسُ" Icon={BookOpen} />}
      {tab === "practice" && <Soon title="Mashq" ar="التَّمَارِينُ" Icon={Mic} />}
      {tab === "marks" && <Soon title="Baholar" ar="الدَّرَجَاتُ" Icon={ClipboardCheck} />}
      {tab === "profile" && <Profile />}
      <BottomNav />
    </>
  );
}
