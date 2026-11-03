// Mashq bo'limi (pastki menyu): vahda tanlanadi → 8 ta so'z o'yini (rekordlar bilan), kartochka, so'z testi;
// takrorlash: xatolar daftari, sokin takrorlash, saqlangan so'zlar, "Siz bilasiz". Multfilm, shadowing, bellashuv — keyingi bosqichda.
import { useEffect, useState } from "react";
import { ArrowLeftRight, Bookmark, ChevronRight, CircleDot, Clapperboard, ClipboardCheck, Coins, Image, Layers, ListOrdered, Mic, Moon, PenLine, Puzzle, RotateCcw, Sparkles, Swords, Target, Zap } from "lucide-react";
import { loadData } from "../lib/data";
import { bestKey, lastUnit, setLastUnit, usePics, type Err, type PBook } from "../lib/practice";
import { bkKey } from "../lib/progress";
import { savedAll } from "../lib/saved";
import { store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { SectionTitle } from "../ui/kit";
import { toast } from "../ui/Toast";
import { gameAvailable, GAME_NAMES } from "./Games";
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

  const errN = Object.keys(store.get<Err>("f.err", {})).length;
  const savedN = Object.keys(savedAll()).length;
  const test = store.get<Record<string, number>>(bkKey(bookId, "tests"), {})[unit];
  const u = book?.units.find((x) => x.n === unit);
  const pickUnit = (n: number) => { setUnit(n); setLastUnit(bookId, n); };
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

  return (
    <main className="screen practice">
      <SectionTitle ar="التَّمَارِينُ" uz="Mashq" />
      <label className="pr-unit">
        <span>Qaysi vahda so'zlari bilan?</span>
        <select value={unit} onChange={(e) => pickUnit(Number(e.target.value))} aria-label="Vahda">
          {book?.units.map((x) => <option key={x.n} value={x.n}>{x.n}-vahda · {x.uz}</option>)}
        </select>
      </label>

      <h2 className="t-h">So'z o'yinlari</h2>
      <div className="pr-games">
        {GAMES.map(({ id, Icon, d }) => {
          const ok = !book || !pics || id === "synant" || gameAvailable(book, unit, id);
          const best = store.get<number | null>(bestKey(bookId, id, unit), null);
          return (
            <button key={id} type="button" className={`pg ${ok ? "" : "off"}`} disabled={!book}
              onClick={() => (ok ? void openGame(id) : toast(id === "order" ? "Bu kitobda gap tuzish mashqi yo'q" : "Bu vahdada so'z yetarli emas"))}>
              <span className="pg-i" aria-hidden><Icon size={22} /></span>
              <b>{GAME_NAMES[id]}</b>
              <small>{d}</small>
              {best !== null && <em>Rekord: {best}{id === "match" ? " urinish" : ""}</em>}
            </button>
          );
        })}
      </div>

      <h2 className="t-h">Vahda so'zlari</h2>
      <div className="pr-two">
        <button type="button" className="rowbtn" disabled={!u} onClick={() => go("cards", { book: bookId, unit })}>
          <Layers size={24} aria-hidden /><span><b>Kartochka</b><small>Yozib tekshirish · {u ? `${u.words.length + (u.phrases?.length || 0)} so'z` : "…"}</small></span><ChevronRight size={20} aria-hidden />
        </button>
        <button type="button" className="rowbtn" disabled={!u} onClick={() => go("wtest", { book: bookId, unit })}>
          <ClipboardCheck size={24} aria-hidden /><span><b>So'z testi</b><small>10 savol{test ? ` · eng yaxshi ${test}%` : ""}</small></span><ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <h2 className="t-h">Takrorlash</h2>
      <button type="button" className="rowbtn" onClick={() => go("errors")}>
        <RotateCcw size={24} aria-hidden /><span><b>Xatolar daftari</b><small>{errN ? `${errN} ta so'z takrorlashni kutyapti` : "Hozircha xato yo'q"}</small></span><ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className="rowbtn" onClick={() => go("night", { book: bookId })}>
        <Moon size={24} aria-hidden /><span><b>Sokin takrorlash</b><small>5 ta so'z · uyqudan oldin</small></span><ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className="rowbtn" onClick={() => go("saved")}>
        <Bookmark size={24} aria-hidden /><span><b>Saqlangan so'zlar</b><small>{savedN ? `${savedN} ta so'z` : "Roundda belgilagan so'zlaringiz"}</small></span><ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className="rowbtn" onClick={() => go("known")}>
        <Sparkles size={24} aria-hidden /><span><b>Siz bilasiz</b><small>O'zbekchadagi arabcha so'zlar</small></span><ChevronRight size={20} aria-hidden />
      </button>

      <h2 className="t-h">Tez orada</h2>
      <ul className="soonlist" aria-label="Tez orada qo'shiladigan mashqlar">
        <li><Clapperboard size={20} aria-hidden /><span><b>Multfilmlar</b><small>Arabcha subtitr bilan</small></span></li>
        <li><Mic size={20} aria-hidden /><span><b>Shadowing</b><small>Iboralarni tinglab takrorlash</small></span></li>
        <li><Swords size={20} aria-hidden /><span><b>Bellashuv</b><small>Do'stingiz bilan 10 ta savol</small></span></li>
        <li><Target size={20} aria-hidden /><span><b>Daraja testi</b><small>Sertifikat bilan</small></span></li>
      </ul>
    </main>
  );
}
