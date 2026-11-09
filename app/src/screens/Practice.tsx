// Mashq bo'limi (pastki menyu): vahda tanlanadi → bugungi bitta tavsiya, keyin 4 guruh (11-partiya): o'yinlar (3 ta + «Yana»), takrorlash, tinglash va gapirish, sinov;
// avval: 8 ta so'z o'yini (rekordlar bilan), kartochka, so'z testi;
// takrorlash: xatolar daftari, sokin takrorlash, saqlangan so'zlar, "Siz bilasiz"; tinglash: multfilmlar va kunlik shadowing.
// sinov: bellashuv (do'st bilan) va daraja testi (sertifikat).
import { useEffect, useState } from "react";
import { ALargeSmall, ArrowLeftRight, AudioLines, Building2, Bookmark, ChevronRight, CircleDot, Clapperboard, ClipboardCheck, Coins, Gamepad2, Image, Layers, ListOrdered, Mic, Moon, NotebookPen, PenLine, Puzzle, RotateCcw, Sparkles, Swords, Target, Zap } from "lucide-react";
import { loadData } from "../lib/data";
import { bestKey, lastUnit, setLastUnit, usePics, type Err, type PBook } from "../lib/practice";
import { useMults } from "./Mult";
import { shDaily } from "./Shadow";
import { bkKey } from "../lib/progress";
import { savedAll } from "../lib/saved";
import { store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, SectionTitle } from "../ui/kit";
import { HelpButton } from "./Onboard";
import { toast } from "../ui/Toast";
import { gameAvailable, GAME_NAMES } from "../lib/gamesMeta";
import { synAntConf } from "./Review";
import { bookOfLevel } from "./Unit";

const GAMES: { id: string; Icon: typeof Puzzle; d: string }[] = [
  { id: "match", Icon: Puzzle, d: "Rasm yoki tarjimani arabcha so'z bilan juftlang" },
  { id: "pic", Icon: Image, d: "Rasmga qarab to'g'ri so'zni tanlang" },
  { id: "bubble", Icon: CircleDot, d: "Uchib ketayotgan to'g'ri so'zni ushlab qoling" },
  { id: "million", Icon: Coins, d: "Savollarga javob berib, million so'mgacha yuting" },
  { id: "letters", Icon: PenLine, d: "So'zni harflardan tering" },
  { id: "speed", Icon: Zap, d: "Bir daqiqada tarjima to'g'rimi — toping" },
  { id: "order", Icon: ListOrdered, d: "Aralash so'zlardan to'g'ri gap tuzing" },
  { id: "synant", Icon: ArrowLeftRight, d: "Ma'nodosh va zid so'zlarni toping" },
];

export function Practice() {
  const { me } = useSession();
  const { go, replace } = useNav();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const [book, setBook] = useState<PBook | null>(null);
  const pics = usePics();
  const [unit, setUnit] = useState(() => lastUnit(bookId) || store.get<{ book: string; unit: number; teacher?: boolean }[]>("f.hw", []).find((h) => !h.teacher && h.book === bookId)?.unit || 1);
  useEffect(() => { loadData<PBook>(`books/${bookId}`).then(setBook).catch(() => {}); }, [bookId]);

  const ms = useMults();
  const sh = ms?.length ? shDaily(ms, me?.level) : null;
  const errN = Object.keys(store.get<Err>("f.err", {})).length;
  const duelW = store.get<number>("f.duelwins", 0);
  const cert = store.get<{ level: string; score: number } | null>("f.cert", null);
  const savedN = Object.keys(savedAll()).length;
  const test = store.get<Record<string, number>>(bkKey(bookId, "tests"), {})[unit];
  const u = book?.units.find((x) => x.n === unit);
  const pickUnit = (n: number) => { setUnit(n); setLastUnit(bookId, n); };
  const [allGames, setAllGames] = useState(false);
  const openGame = async (id: string) => {
    tg.haptic();
    if (id !== "synant") { go("game", { book: bookId, unit, game: id }); return; }
    const start = async (again: boolean) => {
      const conf = await synAntConf(bookId, unit, () => void start(true)).catch(() => null);
      if (!conf) { toast("Bu vahdada hali sinonim va antonim yo'q"); return; }
      (again ? replace : go)("qs", { conf, n: Date.now() });
    };
    await start(false);
  };

  // bugungi tavsiya: xatolar bo'lsa — xatolar daftari; bo'lmasa — kunlik shadowing; bo'lmasa — bitta o'yin (Nation: avval takrorlash)
  const shLeft = sh ? sh.picks.length - sh.done : 0;
  const rec = errN > 0
    ? { t: "Xatolar daftari", d: `${errN} ta so'z · ~3 daqiqa — xatolar eng tez o'rganiladi`, Icon: RotateCcw, run: () => go("errors") }
    : sh && shLeft > 0
      ? { t: "Shadowing", d: `${sh.picks.length} ta ibora · ~5 daqiqa — ovoz chiqarib ayting`, Icon: Mic, run: () => go("shadow", { items: sh.items, mode: "card", daily: true, n: Date.now() }) }
      : { t: GAME_NAMES.match, d: `${unit}-vahda so'zlari · rekordingizni yangilang`, Icon: Puzzle, run: () => void openGame("match") };
  const shown = allGames ? GAMES : GAMES.slice(0, 3);
  const row = (key: string, Icon: typeof Puzzle, t: string, d: string, on: () => void, dis = false) => (
    <button key={key} type="button" className="pr-row" disabled={dis} onClick={on}>
      <span className="pr-ri" aria-hidden><Icon size={20} /></span><span className="pr-rt"><b>{t}</b><small>{d}</small></span><ChevronRight size={18} className="pr-go" aria-hidden />
    </button>
  );

  return (
    <main className="screen practice">
      <SectionTitle ar="التَّمَارِينُ" uz="Mashq" right={<HelpButton k="practice" />} />
      <label className="pr-unit">
        <span>Qaysi vahda so'zlari bilan?</span>
        <select value={unit} onChange={(e) => pickUnit(Number(e.target.value))} aria-label="Vahda">
          {book?.units.map((x) => <option key={x.n} value={x.n}>{x.n}-vahda · {x.uz}</option>)}
        </select>
      </label>

      <button type="button" className="pr-rec" onClick={() => { tg.haptic(); rec.run(); }}>
        <span className="pr-rec-i" aria-hidden><rec.Icon size={24} /></span>
        <span className="pr-rt"><b>Bugun tavsiya: {rec.t}</b><small>{rec.d}</small></span>
        <span className="pr-rec-go">Boshlash</span>
      </button>

      {me?.level === "A0" && (
        <button type="button" className="rowbtn" onClick={() => go("a0")}>
          <ALargeSmall size={24} aria-hidden /><span><b>A0 · Alifbo</b><small>Harflar, barmoq bilan yozish, o'qish tezligi</small></span><ChevronRight size={20} aria-hidden />
        </button>
      )}

      <h2 className="pr-h"><Ar className="pr-h-ar">الْأَلْعَابُ</Ar><span>O'yinlar · {GAMES.length} ta</span></h2>
      <div className="pr-games pr-games-c">
        {shown.map(({ id, Icon, d }) => {
          const ok = !book || !pics || id === "synant" || gameAvailable(book, unit, id);
          const best = store.get<number | null>(bestKey(bookId, id, unit), null);
          return (
            <button key={id} type="button" className={`pg ${ok ? "" : "off"}`} disabled={!book} aria-label={`${GAME_NAMES[id]} — ${d}`}
              onClick={() => (ok ? void openGame(id) : toast(id === "order" ? "Bu kitobda gap tuzish mashqi yo'q" : "Bu vahdada so'z yetarli emas"))}>
              <span className="pg-i" aria-hidden><Icon size={22} /></span>
              <b>{GAME_NAMES[id]}</b>
              {best !== null && <em>Rekord: {best}{id === "match" ? " urinish" : ""}</em>}
            </button>
          );
        })}
        <button type="button" className="pg pg-more" aria-expanded={allGames} onClick={() => setAllGames(!allGames)}>
          <span className="pg-i" aria-hidden><Gamepad2 size={22} /></span><b>{allGames ? "Kamroq" : `Yana ${GAMES.length - 3} ta`}</b>
        </button>
      </div>

      <h2 className="pr-h"><Ar className="pr-h-ar">الْمُرَاجَعَةُ</Ar><span>Takrorlash</span></h2>
      <div className="pr-list">
        {row("cards", Layers, "Kartochka", `Yozib tekshirish · ${u ? `${u.words.length + (u.phrases?.length || 0)} so'z` : "…"}`, () => go("cards", { book: bookId, unit }), !u)}
        {row("err", RotateCcw, "Xatolar daftari", errN ? `${errN} ta so'z takrorlashni kutyapti` : "Hozircha xato yo'q", () => go("errors"))}
        {row("night", Moon, "Sokin takrorlash", "5 ta so'z · uyqudan oldin", () => go("night", { book: bookId }))}
        {row("saved", Bookmark, "Saqlangan so'zlar", savedN ? `${savedN} ta so'z` : "Roundda belgilagan so'zlaringiz", () => go("saved"))}
        {row("known", Sparkles, "Siz bilasiz", "O'zbekchadagi arabcha so'zlar", () => go("known"))}
        {row("city", Building2, "Shahrim", "Har bir vahda — yangi bino", () => go("city"))}
      </div>

      <h2 className="pr-h"><Ar className="pr-h-ar">الِاسْتِمَاعُ وَالْكَلَامُ</Ar><span>Tinglash va gapirish</span></h2>
      <div className="pr-list">
        {row("mults", Clapperboard, "Multfilmlar", ms ? `${ms.length} ta · arabcha subtitr va tarjima bilan` : "…", () => (ms && !ms.length ? toast("Multfilmlar tez orada qo'shiladi") : go("mults")))}
        {row("speak", AudioLines, "Yakka gapirish", `${unit}-vahda mavzusida o'z gapingiz · 60 → 45 → 30 s`, () => go("speak", { book: bookId, unit, n: Date.now() }), !u)}
        {row("dict", NotebookPen, "Diktant", `Kitob audiosidan 5 gap yoki ustoz kodi bilan`, () => go("dict", { book: bookId, unit, n: Date.now() }), !u)}
        {row("shadow", Mic, "Shadowing", !sh ? "…" : sh.done >= sh.picks.length ? "Bugungi mashq bajarildi · yana takrorlash mumkin" : `Bugungi ${sh.picks.length} ta ibora · ${sh.done} / ${sh.picks.length} · ~5 daqiqa`,
          () => sh && go("shadow", { items: sh.items, mode: "card", daily: true, n: Date.now() }), !sh?.picks.length)}
      </div>

      <h2 className="pr-h"><Ar className="pr-h-ar">الِاخْتِبَارَاتُ</Ar><span>Sinov va bellashuv</span></h2>
      <div className="pr-list">
        {row("wtest", ClipboardCheck, "So'z testi", `10 savol${test ? ` · eng yaxshi ${test}%` : ""}`, () => go("wtest", { book: bookId, unit }), !u)}
        {row("duel", Swords, "Bellashuv", `Do'stingiz bilan 10 ta savol${duelW ? ` · ${duelW} ta g'alaba` : ""}`, () => go("duel"))}
        {row("level", Target, "Daraja testi", cert ? `Oxirgi natija: ${cert.level === "A0" ? "Boshlang'ich" : cert.level} · ${cert.score} ball` : "30 ta savol · A1 dan C1 gacha · sertifikat", () => go("leveltest"))}
      </div>
    </main>
  );
}
