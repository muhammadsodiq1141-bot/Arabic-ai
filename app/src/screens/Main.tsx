// Tasdiqlangan foydalanuvchi uchun asosiy qism: pastki menyu bo'limlari va ichki ekranlar.
// 2-partiya: bosh sahifa. 3-partiya: darslar va uy vazifasi (unit, round, nazariya, test, saqlangan so'zlar).
import { ChevronRight, ClipboardCheck, Mic, Moon, ShieldCheck, Sun, SunMoon } from "lucide-react";
import type { DayWord } from "../lib/data";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { useTheme, type ThemePref } from "../state/theme";
import { Avatar, BottomNav, Empty, SectionTitle } from "../ui/kit";
import { AdminRequests } from "./AdminRequests";
import { Home } from "./Home";
import { KbScreen } from "./Kitob";
import { SavedScreen } from "./Saved";
import { DayWordScreen, SoonScreen } from "./Small";
import { TestScreen, TheoryScreen } from "./Theory";
import { Lessons, RoundScreen, UnitScreen } from "./Unit";

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
  const p = route.params || {};
  if (route.view === "adminRequests") return <AdminRequests />;
  if (route.view === "dayword") return <DayWordScreen word={p.word as DayWord} />;
  if (route.view === "league") return <SoonScreen title="Reyting" />;
  if (route.view === "soon") return <SoonScreen title={String(p.title || "Bo'lim")} />;
  // uy vazifasi: book — kitob ID (a1, md1 ...), unit — vahda raqami, n — round raqami
  const book = String(p.book || "a1"), unit = Number(p.unit) || 1;
  if (route.view === "unit") return <UnitScreen key={`${book}:${unit}`} bookId={book} unitN={unit} />;
  if (route.view === "round") return <RoundScreen key={`${book}:${unit}:${p.n}`} bookId={book} unitN={unit} n={Number(p.n) || 1} />;
  if (route.view === "theory") return <TheoryScreen bookId={book} unitN={unit} />;
  if (route.view === "test") return <TestScreen key={`${book}:${unit}`} bookId={book} unitN={unit} />;
  if (route.view === "saved") return <SavedScreen />;
  if (route.view === "kb") return <KbScreen key={`${p.key}:${p.si}:${p.n || 0}`} lessonKey={String(p.key)} si={Number(p.si) || 0} unitN={unit} />;
  return (
    <>
      {tab === "home" && <Home />}
      {tab === "lessons" && <Lessons />}
      {tab === "practice" && <Soon title="Mashq" ar="التَّمَارِينُ" Icon={Mic} />}
      {tab === "marks" && <Soon title="Baholar" ar="الدَّرَجَاتُ" Icon={ClipboardCheck} />}
      {tab === "profile" && <Profile />}
      <BottomNav />
    </>
  );
}
