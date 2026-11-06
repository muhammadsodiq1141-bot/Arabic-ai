// Bellashuv: 10 ta so'z savoli → natija serverga (duelCreate) → do'stga kod va havola; do'st xuddi shu savollarga javob beradi (duelFinish).
// Server amallari eski ilova bilan umumiy (12-versiya). f.duelwins — g'alabalar soni (eski kalit), f.duelc — hisobga olingan bellashuvlar.
import { useEffect, useState } from "react";
import { ChevronRight, Send, Swords, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { BOT_LINK } from "../lib/config";
import { loadData } from "../lib/data";
import { allItems, mcq, type PBook } from "../lib/practice";
import { gain, gameXp, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle } from "../lib/words";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Avatar, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import type { QConf, QItem } from "./Quiz";
import { bookOfLevel } from "./Unit";

type Side = { n: string; score: number | null; time: number | null; me: boolean };
export type DuelData = { id: string; book?: string; questions: QItem[]; creator: Side; opponent: Side | null; canPlay: boolean; finished: boolean };
type Mine = { id: string; mineCreator: boolean; c: string; o: string | null; cs: number | null; os: number | null };

/** Natija: g'alaba / durang / mag'lubiyat (kim ko'p topsa, teng bo'lsa — kim tezroq) */
function outcome(d: DuelData): "win" | "draw" | "lose" | "wait" {
  const c = d.creator, o = d.opponent;
  if (!o || o.score === null || c.score === null) return "wait";
  const ct = c.time ?? 0, ot = o.time ?? 0;
  if (c.score === o.score && ct === ot) return "draw";
  const cWins = c.score > o.score || (c.score === o.score && ct < ot);
  if ((c.me && cWins) || (o.me && !cWins)) return "win";
  return "lose";
}

const pack = (items: QItem[]) => items.map(({ q, qAr, opts, optsAr, ans }) => ({ q, qAr: !!qAr, opts, optsAr: !!optsAr, ans }));

export function DuelScreen({ p }: { p: Record<string, unknown> }) {
  const { me } = useSession();
  const { go, replace } = useNav();
  const view = String(p.view || "home");
  const name = me?.full_name || me?.name || "Siz";
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const [book, setBook] = useState<PBook | null>(null);
  const [mine, setMine] = useState<Mine[] | null | "err">(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const openDuel = async (raw: string, viaLink = false) => {
    const id = raw.trim().toUpperCase().replace(/^D_/, "");
    if (!id) return;
    setBusy(true);
    try {
      const d = await api<DuelData>("duelGet", { id });
      if (d.canPlay) {
        const conf: QConf = {
          title: `Bellashuv · ${d.creator.n} bilan`, items: d.questions, track: false,
          finish: (score, _n, _w, sec) => {
            gain("game", gameXp(10));
            api("duelFinish", { id: d.id, score, time: sec })
              .then(() => api<DuelData>("duelGet", { id: d.id }))
              .then((r) => replace("duel", { view: "result", data: r }))
              .catch((e: Error) => { toast(e.message || "Natija saqlanmadi"); replace("duel", {}); });
          },
        };
        (viaLink ? replace : go)("qs", { conf, n: Date.now() });
      } else (viaLink ? replace : go)("duel", { view: "result", data: d });
    } catch (e) {
      toast((e as Error).message || "Bellashuv topilmadi");
    } finally { setBusy(false); }
  };

  const startNew = async () => {
    const b = book || await loadData<PBook>(`books/${bookId}`).catch(() => null);
    if (!b) { toast("Kitob yuklanmadi. Internetni tekshiring"); return; }
    const pool = allItems(b).filter((x) => x.ar && x.uz);
    const dir = Math.random() < 0.5 ? "ar2uz" : "uz2ar";
    const items: QItem[] = shuffle(pool).slice(0, 10).map((it) => {
      const { opts, ans } = mcq(it, pool, dir);
      return dir === "ar2uz" ? { q: it.ar, qAr: true, opts, optsAr: false, ans } : { q: it.uz, qAr: false, opts, optsAr: true, ans };
    });
    const conf: QConf = {
      title: "Bellashuv", items, track: false,
      finish: (score, _n, _w, sec) => {
        gain("game", gameXp(10));
        api<{ id: string }>("duelCreate", { book: bookId, questions: pack(items), score, time: sec })
          .then((j) => replace("duel", { view: "made", id: j.id, score }))
          .catch((e: Error) => { toast(`Saqlanmadi: ${e.message}`); replace("duel", {}); });
      },
    };
    tg.haptic();
    go("qs", { conf, n: Date.now() });
  };

  useEffect(() => {
    if (p.open) { void openDuel(String(p.open), true); return; } // bot havolasi orqali kelganda
    if (view !== "home") return;
    void loadData<PBook>(`books/${bookId}`).then(setBook).catch(() => {});
    api<{ items: Mine[] }>("duelMine", {}).then((j) => setMine(j.items || [])).catch(() => setMine("err"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // g'alaba bir bellashuv uchun bir marta hisoblanadi
  const data = p.data as DuelData | undefined;
  const res = data ? outcome(data) : "wait";
  useEffect(() => {
    if (view !== "result" || !data || res !== "win") return;
    const C = store.get<string[]>("f.duelc", []);
    if (C.includes(data.id)) return;
    store.set("f.duelc", [...C, data.id].slice(-60));
    store.set("f.duelwins", store.get<number>("f.duelwins", 0) + 1);
    tg.haptic("success");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (view === "made") {
    const id = String(p.id), score = Number(p.score) || 0;
    const share = () => tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(`${BOT_LINK}?start=d_${id}`)}&text=${encodeURIComponent(`Men bilan arab tilidan bellashasanmi? Men ${score}/10 topdim. Kod: ${id}`)}`);
    return (
      <main className="screen">
        <ScreenHeader title="Chaqiruv tayyor" />
        <section className="duelhero">
          <div className="vs">
            <div className="dv"><Avatar name={name} size={56} /><b>Siz</b></div>
            <div className="dsc">{score}<small>/10</small></div>
            <div className="dv"><span className="dq" aria-hidden>?</span><b>Raqib</b></div>
          </div>
          <p>Natijangiz saqlandi. Endi do'stingizga havolani yuboring — u xuddi shu savollarga javob beradi.</p>
          <div className="dcode" aria-label={`Bellashuv kodi ${id}`}>{id}</div>
        </section>
        <button type="button" className="btn primary wide" onClick={share}><Send size={18} aria-hidden />Do'stni chaqirish</button>
      </main>
    );
  }

  if (view === "result" && data) {
    const c = data.creator, o = data.opponent;
    const title = res === "win" ? "G'alaba!" : res === "draw" ? "Durang" : res === "lose" ? "Bu safar raqib kuchli" : "Raqib kutilmoqda";
    const sub = res === "wait" ? "Do'stingiz javob berganda natija shu yerda chiqadi." : res === "lose" ? "Lug'atni takrorlab, yana bellashing." : res === "win" ? "Ko'proq yoki tezroq topdingiz." : "Hisob ham, vaqt ham teng.";
    return (
      <main className="screen">
        <ScreenHeader title={title} />
        <p className="m-info">Kod: {data.id} · {sub}</p>
        <section className={`duelhero ${res === "win" ? "win" : ""}`}>
          {res === "win" && <Trophy size={34} className="d-cup" aria-hidden />}
          <div className="vs">
            <div className="dv"><Avatar name={c.n} size={56} /><b>{c.n}{c.me ? " (siz)" : ""}</b>{c.time !== null && <small>{c.time} s</small>}</div>
            <div className="dsc">{c.score ?? "?"} : {o?.score ?? "?"}</div>
            <div className="dv">{o ? <Avatar name={o.n} size={56} /> : <span className="dq" aria-hidden>?</span>}<b>{o ? `${o.n}${o.me ? " (siz)" : ""}` : "Raqib"}</b>{o && o.time !== null && <small>{o.time} s</small>}</div>
          </div>
        </section>
        <button type="button" className="btn primary wide" onClick={() => void startNew()}><Swords size={18} aria-hidden />Yangi bellashuv</button>
      </main>
    );
  }

  return (
    <main className="screen">
      <ScreenHeader title="Bellashuv" ar="الْمُبَارَزَةُ" />
      <p className="m-info">{book?.title ? `${book.title} so'zlari bilan` : "Kitobingiz so'zlari bilan"}</p>
      <section className="duelhero">
        <div className="vs">
          <div className="dv"><Avatar name={name} size={56} /><b>Siz</b></div>
          <div className="dsc">VS</div>
          <div className="dv"><span className="dq" aria-hidden>?</span><b>Raqib</b></div>
        </div>
        <p>10 ta savolga javob bering, keyin do'stingizni chaqiring. Kim ko'proq va tezroq topsa — o'sha yutadi.</p>
      </section>
      <button type="button" className="btn primary wide" disabled={busy} onClick={() => void startNew()}><Swords size={18} aria-hidden />Yangi bellashuv</button>
      <form className="dform" onSubmit={(e) => { e.preventDefault(); void openDuel(code); }}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Do'stingiz yuborgan kod" autoComplete="off" maxLength={8} aria-label="Bellashuv kodi" />
        <button type="submit" className="btn ghost" disabled={!code.trim() || busy}>Kirish</button>
      </form>
      <h2 className="t-h">Mening bellashuvlarim</h2>
      {mine === null ? <p className="muted pad">Yuklanmoqda…</p>
        : mine === "err" ? <p className="muted pad">Ro'yxatni yuklab bo'lmadi. Internetni tekshiring.</p>
        : mine.length === 0 ? <p className="muted pad">Hali bellashuv yo'q. Birinchisini boshlang.</p>
        : (
          <ul className="slist">
            {mine.map((d) => (
              <li key={d.id}>
                <button type="button" className="srow dm" onClick={() => void openDuel(d.id)}>
                  <span className="dm-t">{d.c} <b>{d.cs ?? "?"} : {d.os ?? "?"}</b> {d.o || "…"}</span>
                  <span className="dm-id">{d.id}</span>
                  <ChevronRight size={20} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
    </main>
  );
}
