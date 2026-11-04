// Reyting (4-partiya): bu hafta yoki umumiy (jami yulduzcha); guruhim, darajam yoki butun markaz.
// Server: "leaderboard" {week, period, scope, level} — 12-versiya. Eski server (11) "period"ni bilmaydi va haftalikni qaytaradi.
import { useEffect, useState } from "react";
import { Crown, RefreshCw, Star, Users } from "lucide-react";
import { api } from "../lib/api";
import { weekId } from "../lib/progress";
import { report } from "../lib/report";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Avatar, Empty, ScreenHeader } from "../ui/kit";

type Row = { n: string; x: number; me?: boolean; lvl?: string | null };
type Res = { top: Row[]; me: { rank: number; x: number } | null; noGroup?: boolean; period?: string };
type Period = "week" | "all";
type Scope = "group" | "level" | "all";

// haftaning oxirigacha (yakshanba 23:59) necha kun qoldi
function weekLeft() {
  const d = new Date();
  const left = 7 - ((d.getDay() + 6) % 7) - 1; // dushanba=0 ... yakshanba=6
  return left === 0 ? "Hafta bugun tugaydi" : `Hafta tugashiga ${left} kun`;
}

export function LeagueScreen() {
  const { me } = useSession();
  const { setTab } = useNav();
  const [period, setPeriod] = useState<Period>("week");
  const [scope, setScope] = useState<Scope>(me?.group ? "group" : "all");
  const [res, setRes] = useState<Res | null | "err">(null);
  const [nonce, setNonce] = useState(0);
  const lvl = me?.level || null;
  useEffect(() => { report("reyting", "", null, null, true); }, []);

  useEffect(() => {
    let alive = true;
    setRes(null);
    api<Res>("leaderboard", { week: weekId(), period, scope: scope === "group" ? "group" : "all", level: scope === "level" ? lvl : null })
      .then((r) => alive && setRes(r))
      .catch(() => alive && setRes("err"));
    return () => { alive = false; };
  }, [period, scope, lvl, nonce]);

  const scopes: { id: Scope; label: string }[] = [
    ...(me?.group ? [{ id: "group" as const, label: "Guruhim" }] : []),
    ...(lvl ? [{ id: "level" as const, label: `${lvl} darajam` }] : []),
    { id: "all", label: "Butun markaz" },
  ];
  const top = res && res !== "err" ? res.top : [];
  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const meInList = top.some((r) => r.me);
  const unit = period === "week" ? "bu hafta" : "jami";

  return (
    <main className="screen league">
      <ScreenHeader title="Reyting" ar="التَّرْتِيبُ" />
      <div className="seg" role="tablist" aria-label="Davr">
        {([["week", "Bu hafta"], ["all", "Umumiy"]] as const).map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={period === id} className={period === id ? "on" : ""} onClick={() => { tg.haptic(); setPeriod(id); }}>{l}</button>
        ))}
      </div>
      <div className="chips lg-scope" role="tablist" aria-label="Kim bilan">
        {scopes.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={scope === s.id} className={scope === s.id ? "on" : ""} onClick={() => { tg.haptic(); setScope(s.id); }}>{s.label}</button>
        ))}
      </div>
      <p className="lg-note">{period === "week" ? `${weekLeft()} · har dushanba yangidan boshlanadi` : "Ilovadagi butun o'qishingiz uchun to'plangan yulduzchalar"}</p>

      {res === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2, 3].map((k) => <span key={k} />)}</div>}
      {res === "err" && (
        <div className="empty">
          <span className="empty-ico" aria-hidden><RefreshCw size={28} /></span>
          <h2>Reyting yuklanmadi</h2>
          <p>Internet aloqasini tekshirib, qayta urinib ko'ring.</p>
          <button type="button" className="btn ghost lg-retry" onClick={() => setNonce((x) => x + 1)}>Qayta urinish</button>
        </div>
      )}
      {res && res !== "err" && top.length === 0 && (
        <Empty icon={<Star size={28} />} title={period === "week" ? "Bu hafta hali yulduzcha yo'q" : "Hali yulduzcha yo'q"}
          text={res.noGroup ? "Siz hali guruhga qo'shilmagansiz." : "Uy vazifasini bajaring — birinchi bo'lib reytingga chiqing."} />
      )}

      {podium.length > 0 && (
        <ol className="podium" aria-label="Eng yaxshi uchtalik">
          {[1, 0, 2].map((k) => podium[k] && (
            <li key={k} className={`pd p${k + 1} ${podium[k].me ? "me" : ""}`}>
              {k === 0 && <Crown className="pd-crown" size={26} aria-hidden />}
              <Avatar name={podium[k].n} size={k === 0 ? 64 : 52} />
              <b className="pd-n">{podium[k].me ? "Siz" : podium[k].n}</b>
              <span className="pd-x"><Star size={14} aria-hidden />{podium[k].x.toLocaleString("ru-RU")}</span>
              <span className="pd-step" aria-label={`${k + 1}-o'rin`}>{k + 1}</span>
            </li>
          ))}
        </ol>
      )}

      {rest.length > 0 && (
        <ol className="lg-list" start={4}>
          {rest.map((r, i) => (
            <li key={i} className={r.me ? "me" : ""}>
              <span className="lg-r">{i + 4}</span>
              <Avatar name={r.n} size={40} />
              <span className="lg-n">{r.me ? "Siz" : r.n}{r.lvl && scope !== "level" && <em>{r.lvl}</em>}</span>
              <span className="lg-x"><Star size={14} aria-hidden />{r.x.toLocaleString("ru-RU")}</span>
            </li>
          ))}
        </ol>
      )}

      {res && res !== "err" && (
        <div className="lg-me" role="status">
          {res.me ? (
            <><b>{res.me.rank}-o'rin</b><span>Sizda {unit} {res.me.x.toLocaleString("ru-RU")} yulduzcha{!meInList ? " · ro'yxatdan tashqarida" : ""}</span></>
          ) : (
            <><b><Users size={18} aria-hidden /> Siz hali reytingda yo'qsiz</b>
              <button type="button" className="btn primary" onClick={() => setTab("home")}>Uy vazifasiga</button></>
          )}
        </div>
      )}
    </main>
  );
}
