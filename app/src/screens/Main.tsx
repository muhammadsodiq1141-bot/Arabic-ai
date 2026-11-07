// Tasdiqlangan foydalanuvchi uchun asosiy qism: pastki menyu bo'limlari va ichki ekranlar.
// 2-partiya: bosh sahifa. 3-partiya: darslar va uy vazifasi (unit, round, nazariya, test, saqlangan so'zlar).
// 4-partiya: reyting (league), baholar (o'quvchi natijalari). 5-partiya: ustoz paneli (teacher, tsubs, thw, thwnew).
// 6-partiya: Mashq bo'limi (game, cards, wtest, errors, night, known, qs; mults, mult, mvoc, shadow; duel, leveltest, cert).
// 7-partiya: profil (books, account, idcard), admin (admin, ateachers, ausers), guruh havolasi g_KOD.
import { SpeakScreen } from "./Speak";
import { DictScreen } from "./Dict";
import { ClassModeScreen } from "./ClassMode";
import { GoalScreen } from "./Goal";
import { InviteScreen } from "./Invite";
import { useEffect, useLayoutEffect } from "react";
import { strandRoute } from "../lib/strand";
import { api } from "../lib/api";
import type { DayWord } from "../lib/data";
import type { ShItem } from "../lib/mult";
import { setReportMe } from "../lib/report";
import { store } from "../lib/store";
import { startGo, tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { BottomNav } from "../ui/kit";
import { useReactions } from "../ui/Reaction";
import { toast } from "../ui/Toast";
import { A0Grow, A0Home, A0Lesson, A0Map, HwSend } from "./A0";
import { AdminScreen, AdminTeachersScreen, AdminUsersScreen } from "./Admin";
import { AdminRequests } from "./AdminRequests";
import { ArNameScreen } from "./ArName";
import { BooksScreen } from "./Books";
import { CityScreen } from "./City";
import { CardsScreen, WordTestScreen } from "./Drill";
import { DuelScreen } from "./Duel";
import { GameScreen } from "./Games";
import { Home } from "./Home";
import { KbScreen } from "./Kitob";
import { LeagueScreen } from "./League";
import { LessonScreen, type Plan } from "./Lesson";
import { DrillScreen, MemScreen } from "./Madina";
import { CertScreen, LevelTestScreen, type Cert } from "./Level";
import { Marks } from "./Marks";
import { ShareScreen } from "./Motiv";
import { MultScreen, MultsScreen, MultVocScreen } from "./Mult";
import { Practice } from "./Practice";
import { AccountScreen, IdCardScreen, Profile } from "./Profile";
import { QuizScreen, type QConf } from "./Quiz";
import { ErrorsScreen, KnownWordsScreen, NightScreen } from "./Review";
import { SavedScreen } from "./Saved";
import { RuleDetail, RulePractice, RulesHub } from "./Rules";
import { ShadowScreen } from "./Shadow";
import { TeacherScreen } from "./Teacher";
import { TeacherHwNewScreen, TeacherHwScreen } from "./TeacherHw";
import { TeacherSubsScreen } from "./TeacherSubs";
import { DayWordScreen, SoonScreen } from "./Small";
import { TestScreen, TheoryScreen } from "./Theory";
import { Lessons, RoundScreen, UnitScreen } from "./Unit";
import { WordScreen, WordsScreen } from "./WordCard";

/** Bot havolasidan kelganda (?go=... yoki start_param): d_KOD — bellashuv, g_KOD — guruhga qo'shilish.
 *  f.handled — eski ilova bilan umumiy; f.gjoin — tasdiq kutilayotganda saqlangan guruh kodi (endi qo'shiladi). */
function useStartParam() {
  const { go } = useNav();
  const { me, refresh } = useSession();
  useEffect(() => {
    const v = startGo();
    const fresh = !!v && store.get("f.handled", "") !== v;
    if (fresh && /^d_[A-Za-z0-9]{4,10}$/.test(v)) { store.set("f.handled", v); go("duel", { open: v.slice(2) }); return; }
    let code = fresh && /^g_[A-Za-z0-9]{4,10}$/.test(v) ? v.slice(2) : "";
    if (code) store.set("f.handled", v);
    else code = store.get("f.gjoin", "");
    if (!code) return;
    store.set("f.gjoin", "");
    if (me?.group?.code === code.toUpperCase()) return;
    api<{ title: string }>("groupJoin", { code })
      .then((j) => { toast(`«${j.title}» guruhiga qo'shildingiz`); tg.haptic("success"); return refresh(); })
      .catch((e: Error) => toast(e.message || "Guruhga qo'shilib bo'lmadi"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

const GUARDED = new Set(["round", "kb", "lesson", "qs", "rprac", "game", "cards", "wtest", "test", "darslik", "dict"]);

export function Main() {
  const { tab, route } = useNav();
  useStartParam();
  useReactions(); // reaksiya stikerlari overlay'i (har qanday ekran ustida) va bir martalik «Xush kebsiz!»
  const { me } = useSession();
  useEffect(() => { setReportMe(me); }, [me]); // Google jadval hisobotidagi ism va login
  // mashq o'rtasida ilova yopilsa javoblar yo'qoladi — Telegram yopishdan oldin so'raydi
  const guard = GUARDED.has(route.view);
  useEffect(() => { tg.closeGuard(guard); }, [guard]);
  // 13-partiya (A1): vaqt 4 yo'l bo'yicha — layout effekt, chunki ekranning o'z aniqlashtirishi (useEffect) undan keyin ishlashi kerak
  useLayoutEffect(() => { strandRoute(route.view, (route.params || {}).game); }, [route]);
  const p = route.params || {};
  if (route.view === "adminRequests") return <AdminRequests />;
  if (route.view === "admin") return <AdminScreen />;
  if (route.view === "ateachers") return <AdminTeachersScreen />;
  if (route.view === "ausers") return <AdminUsersScreen />;
  if (route.view === "books") return <BooksScreen />;
  // 10-partiya: arabcha ism sahifasi, «Yutuqlarim» kartasi
  if (route.view === "arname") return <ArNameScreen />;
  if (route.view === "invite") return <InviteScreen />; // 14-partiya
  if (route.view === "goal") return <GoalScreen key={`${String(p.redo || "")}:${String(p.conf || "")}`} redo={!!p.redo} confOnly={!!p.conf} />; // 15-partiya
  if (route.view === "share") return <ShareScreen />;
  // 17-partiya: sinf rejimi (U7, ustoz) va diktant (K7 o'zi / U7 ustoz kodi bilan)
  if (route.view === "class") return <ClassModeScreen />;
  if (route.view === "dict") return <DictScreen key={String(p.n || "")} bookId={String(p.book || store.get("a1.book", "a1"))} unitN={Number(p.unit) || 1} mode={p.mode ? String(p.mode) : undefined} code={p.code ? String(p.code) : undefined} seed={Number(p.n) || Date.now()} />;
  // A0 · Alifbo: n — dars, l — harf, id — vazifa
  if (route.view === "city") return <CityScreen />;
  if (route.view === "mem") return <MemScreen key={`${p.book}:${p.unit}`} bookId={String(p.book || "md1")} unitN={Number(p.unit) || 1} />;
  if (route.view === "darslik") return <DrillScreen key={`${p.key}:${p.si}:${p.n || 0}`} dkey={String(p.key)} si={Number(p.si) || 0} />;
  if (route.view === "a0") return <A0Home />;
  if (route.view === "a0d") return <A0Lesson key={String(p.n)} n={Number(p.n) || 1} />;
  if (route.view === "a0map") return <A0Map l={p.l ? String(p.l) : undefined} />;
  if (route.view === "a0grow") return <A0Grow />;
  if (route.view === "hwsend") return <HwSend key={String(p.id)} id={Number(p.id)} />;
  if (route.view === "account") return <AccountScreen />;
  if (route.view === "idcard") return <IdCardScreen />;
  if (route.view === "dayword") return <DayWordScreen word={p.word as DayWord} />;
  if (route.view === "league") return <LeagueScreen />;
  // ustoz paneli: code — guruh kodi
  const gcode = String(p.code || "");
  if (route.view === "teacher") return <TeacherScreen key={gcode} fixed={gcode ? { code: gcode, title: String(p.title || gcode) } : undefined} />;
  if (route.view === "tsubs") return <TeacherSubsScreen key={gcode} code={gcode} />;
  if (route.view === "thw") return <TeacherHwScreen key={gcode} code={gcode} />;
  if (route.view === "thwnew") return <TeacherHwNewScreen code={gcode} />;
  if (route.view === "soon") return <SoonScreen title={String(p.title || "Bo'lim")} />;
  // uy vazifasi: book — kitob ID (a1, md1 ...), unit — vahda raqami, n — round raqami
  const book = String(p.book || "a1"), unit = Number(p.unit) || 1;
  if (route.view === "unit") return <UnitScreen key={`${book}:${unit}`} bookId={book} unitN={unit} />;
  if (route.view === "speak") return <SpeakScreen key={`${book}:${unit}:${String(p.n || "")}`} bookId={book} unitN={unit} />; // 16-partiya
  if (route.view === "round") return <RoundScreen key={`${book}:${unit}:${p.n}`} bookId={book} unitN={unit} n={Number(p.n) || 1} />;
  if (route.view === "theory") return <TheoryScreen bookId={book} unitN={unit} />;
  if (route.view === "test") return <TestScreen key={`${book}:${unit}`} bookId={book} unitN={unit} />;
  if (route.view === "saved") return <SavedScreen />;
  // 9b: so'zlar ro'yxati va so'z kartasi (ar — so'z), qoidalar markazi (u, i — qoida; list — mashqdagi qoidalar), bugungi dars (plan — bosh sahifa kartasidagi reja)
  if (route.view === "words") return <WordsScreen key={`${book}:${unit}`} bookId={book} unitN={unit} />;
  if (route.view === "word") return <WordScreen key={`${book}:${unit}:${p.ar}`} bookId={book} unitN={unit} ar={String(p.ar || "")} />;
  if (route.view === "rules") return <RulesHub key={book} bookId={book} />;
  if (route.view === "rule") return <RuleDetail key={`${book}:${p.u}:${p.i}`} bookId={book} u={Number(p.u) || 1} i={Number(p.i) || 0} />;
  if (route.view === "rprac") return <RulePractice key={String(p.n || "")} bookId={book} list={(p.list as [number, number][]) || []} title={String(p.title || "Qoida mashqi")} />;
  if (route.view === "lesson") return <LessonScreen key={String(p.n || "")} bookId={book} plan={p.plan as Plan} />;
  // mashq bo'limi
  if (route.view === "game") return <GameScreen key={`${book}:${unit}:${p.game}`} bookId={book} unit={unit} game={String(p.game)} />;
  if (route.view === "cards") return <CardsScreen key={`${book}:${unit}`} bookId={book} unit={unit} />;
  if (route.view === "wtest") return <WordTestScreen key={`${book}:${unit}:${String(p.to || "")}`} bookId={book} unit={unit} to={p.to === "voc" || p.to === "unit" ? p.to : undefined} />;
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
  if (route.view === "kb") return <KbScreen key={`${p.key}:${p.si}:${p.l || ""}:${p.n || 0}`} lessonKey={String(p.key)} si={Number(p.si) || 0} unitN={unit} letter={p.l ? String(p.l) : undefined} />;
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
