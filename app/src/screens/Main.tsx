// Tasdiqlangan foydalanuvchi uchun asosiy qism: pastki menyu bo'limlari va ichki ekranlar.
// 2-partiya: bosh sahifa. 3-partiya: darslar va uy vazifasi (unit, round, nazariya, test, saqlangan so'zlar).
// 4-partiya: reyting (league), baholar (o'quvchi natijalari). 5-partiya: ustoz paneli (teacher, tsubs, thw, thwnew).
// 6-partiya: Mashq bo'limi (game, cards, wtest, errors, night, known, qs; mults, mult, mvoc, shadow; duel, leveltest, cert).
import { useEffect } from "react";
import { ChevronRight, GraduationCap, Moon, ShieldCheck, Sun, SunMoon } from "lucide-react";
import type { DayWord } from "../lib/data";
import type { ShItem } from "../lib/mult";
import { store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { useTheme, type ThemePref } from "../state/theme";
import { Avatar, BottomNav, SectionTitle } from "../ui/kit";
import { AdminRequests } from "./AdminRequests";
import { CardsScreen, WordTestScreen } from "./Drill";
import { DuelScreen } from "./Duel";
import { GameScreen } from "./Games";
import { Home } from "./Home";
import { KbScreen } from "./Kitob";
import { LeagueScreen } from "./League";
import { CertScreen, LevelTestScreen, type Cert } from "./Level";
import { Marks } from "./Marks";
import { MultScreen, MultsScreen, MultVocScreen } from "./Mult";
import { Practice } from "./Practice";
import { QuizScreen, type QConf } from "./Quiz";
import { ErrorsScreen, KnownWordsScreen, NightScreen } from "./Review";
import { SavedScreen } from "./Saved";
import { ShadowScreen } from "./Shadow";
import { TeacherScreen } from "./Teacher";
import { TeacherHwNewScreen, TeacherHwScreen } from "./TeacherHw";
import { TeacherSubsScreen } from "./TeacherSubs";
import { DayWordScreen, SoonScreen } from "./Small";
import { TestScreen, TheoryScreen } from "./Theory";
import { Lessons, RoundScreen, UnitScreen } from "./Unit";

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
      {(me?.teacher || !!me?.myGroups?.length) && (
        <button type="button" className="rowbtn" onClick={() => go("teacher")}>
          <GraduationCap size={24} aria-hidden /><span><b>Ustoz paneli</b><small>Guruh, javoblar, uy vazifalari</small></span><ChevronRight size={20} aria-hidden />
        </button>
      )}
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

/** Bot havolasidan kelganda (?go=d_KOD yoki start_param): bellashuvni ochish. f.handled — eski ilova bilan umumiy */
function useStartParam() {
  const { go } = useNav();
  useEffect(() => {
    let v = "";
    try { v = new URLSearchParams(location.search).get("go") || ""; } catch { /* */ }
    v = v || tg.startParam;
    if (!/^d_[A-Za-z0-9]{4,10}$/.test(v) || store.get("f.handled", "") === v) return;
    store.set("f.handled", v);
    go("duel", { open: v.slice(2) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Main() {
  const { tab, route } = useNav();
  useStartParam();
  const p = route.params || {};
  if (route.view === "adminRequests") return <AdminRequests />;
  if (route.view === "dayword") return <DayWordScreen word={p.word as DayWord} />;
  if (route.view === "league") return <LeagueScreen />;
  // ustoz paneli: code — guruh kodi
  const gcode = String(p.code || "");
  if (route.view === "teacher") return <TeacherScreen />;
  if (route.view === "tsubs") return <TeacherSubsScreen key={gcode} code={gcode} />;
  if (route.view === "thw") return <TeacherHwScreen key={gcode} code={gcode} />;
  if (route.view === "thwnew") return <TeacherHwNewScreen code={gcode} />;
  if (route.view === "soon") return <SoonScreen title={String(p.title || "Bo'lim")} />;
  // uy vazifasi: book — kitob ID (a1, md1 ...), unit — vahda raqami, n — round raqami
  const book = String(p.book || "a1"), unit = Number(p.unit) || 1;
  if (route.view === "unit") return <UnitScreen key={`${book}:${unit}`} bookId={book} unitN={unit} />;
  if (route.view === "round") return <RoundScreen key={`${book}:${unit}:${p.n}`} bookId={book} unitN={unit} n={Number(p.n) || 1} />;
  if (route.view === "theory") return <TheoryScreen bookId={book} unitN={unit} />;
  if (route.view === "test") return <TestScreen key={`${book}:${unit}`} bookId={book} unitN={unit} />;
  if (route.view === "saved") return <SavedScreen />;
  // mashq bo'limi
  if (route.view === "game") return <GameScreen key={`${book}:${unit}:${p.game}`} bookId={book} unit={unit} game={String(p.game)} />;
  if (route.view === "cards") return <CardsScreen key={`${book}:${unit}`} bookId={book} unit={unit} />;
  if (route.view === "wtest") return <WordTestScreen key={`${book}:${unit}`} bookId={book} unit={unit} />;
  if (route.view === "errors") return <ErrorsScreen />;
  if (route.view === "night") return <NightScreen bookId={book} />;
  if (route.view === "known") return <KnownWordsScreen />;
  if (route.view === "qs") return <QuizScreen key={String(p.n || "")} conf={p.conf as QConf} />;
  // multfilmlar va shadowing: id — multfilm, i — lug'at so'zi, items — iboralar ({m, i}), daily — kunlik mashq
  if (route.view === "mults") return <MultsScreen />;
  if (route.view === "mult") return <MultScreen key={String(p.id)} id={String(p.id)} />;
  if (route.view === "mvoc") return <MultVocScreen id={String(p.id)} i={Number(p.i) || 0} />;
  if (route.view === "duel") return <DuelScreen key={String(p.view || "home") + String(p.open || "")} p={p} />;
  if (route.view === "leveltest") return <LevelTestScreen />;
  if (route.view === "cert") return <CertScreen cert={p.cert as Cert} per={p.per as Record<string, { ok: number; n: number }> | undefined} />;
  if (route.view === "shadow") return <ShadowScreen key={String(p.n || "")} items={(p.items as ShItem[]) || []} mode={p.mode === "flow" ? "flow" : "card"} daily={!!p.daily} />;
  if (route.view === "kb") return <KbScreen key={`${p.key}:${p.si}:${p.n || 0}`} lessonKey={String(p.key)} si={Number(p.si) || 0} unitN={unit} />;
  return (
    <>
      {tab === "home" && <Home />}
      {tab === "lessons" && <Lessons />}
      {tab === "practice" && <Practice />}
      {tab === "marks" && <Marks />}
      {tab === "profile" && <Profile />}
      <BottomNav />
    </>
  );
}
