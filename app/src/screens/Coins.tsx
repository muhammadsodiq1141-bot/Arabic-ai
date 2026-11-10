// 3-paket (1-qism): «Tangalarim» — qoldiq va tarix (serverdagi hisob). Tanga qayerdan keladi va nimaga sarflanadi.
import { ChevronRight, Coins as CoinsIc, Gift, Minus, Plus, Target } from "lucide-react";
import { COIN_KIND, fmtCoins, useCoins } from "../lib/coins";
import { getGoal } from "../lib/shop";
import { useNav } from "../state/nav";
import { Empty, ScreenHeader } from "../ui/kit";

const OY = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const when = (s: string) => { const d = new Date(s); return `${d.getDate()}-${OY[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function CoinsScreen() {
  const { s, bal } = useCoins();
  const { go } = useNav();
  const G = s?.grade;
  const goal = getGoal(); // 3-paket 4-qism: do'kondagi maqsad
  return (
    <main className="screen">
      <ScreenHeader title="Tangalarim" ar="نُقُودِي" />
      <section className="card cn-bal">
        <CoinsIc size={30} aria-hidden />
        <b>{fmtCoins(bal)}</b>
        <span>tanga</span>
      </section>
      {goal && (
        <button type="button" className="card cn-goal" onClick={() => go("shop")}>
          <span className="cn-gt"><Target size={18} aria-hidden /><b>Maqsad: {goal.title}</b><em>{Math.min(100, Math.floor((bal / goal.price) * 100))}%</em></span>
          <span className="sh-bar" aria-hidden><i style={{ width: `${Math.min(100, (bal / goal.price) * 100)}%` }} /></span>
          <small>{bal >= goal.price ? "Tanga yetdi — do'konda oling" : `yana ${fmtCoins(goal.price - bal)} tanga kerak`}</small>
        </button>
      )}
      <button type="button" className="rowbtn" onClick={() => go("shop")}>
        <Gift size={24} aria-hidden /><span><b>Do'kon</b><small>Tangaga markaz sovg'alari: futbolka, kitob, daftar</small></span><ChevronRight size={20} aria-hidden />
      </button>
      <section className="card cn-how">
        <b>Tanga qayerdan keladi</b>
        <ul>
          <li><span>Uy vazifasi — ustoz bahosi</span><small>{G ? `5 → ${fmtCoins(G["5"])} · 4 → ${fmtCoins(G["4"])} · 3 → ${fmtCoins(G["3"])}` : "bahoga yarasha"}</small></li>
          <li><span>Qo'shimcha vazifa</span><small>miqdorini ustoz belgilaydi</small></li>
          <li><span>Darsda faol bo'lsangiz</span><small>ustoz beradi</small></li>
          <li><span>Do'stni taklif qilish</span><small>har bir do'st uchun</small></li>
        </ul>
        <small className="muted">Kunlik vazifalar endi yulduzcha beradi. Tanga seriya muzlatish va do'kon uchun sarflanadi.</small>
      </section>
      {!s ? <p className="muted pad">Yuklanmoqda…</p> : !s.ready ? (
        <Empty icon={<CoinsIc size={28} />} title="Tanga tez orada ishga tushadi" text="Ustoz baholari va vazifalar uchun tanga shu yerda ko'rinadi." />
      ) : s.items.length === 0 ? (
        <Empty icon={<CoinsIc size={28} />} title="Hali tanga yo'q" text="Uy vazifasini topshiring — ustoz baholagach tanga shu yerda paydo bo'ladi." />
      ) : (
        <section className="card cn-list" aria-label="Tanga tarixi">
          <b>Tarix</b>
          <ul>
            {s.items.map((x) => (
              <li key={x.id}>
                <span className={`cn-ic ${x.amount < 0 ? "out" : "in"}`} aria-hidden>{x.amount < 0 ? <Minus size={14} /> : <Plus size={14} />}</span>
                <span className="cn-t"><b>{x.note || COIN_KIND[x.kind] || x.kind}</b><small>{COIN_KIND[x.kind] || x.kind} · {when(x.at)}</small></span>
                <b className={`cn-a ${x.amount < 0 ? "out" : "in"}`}>{x.amount > 0 ? "+" : ""}{fmtCoins(x.amount)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
