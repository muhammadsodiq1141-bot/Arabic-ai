// 3-paket (1-qism): «Tangalarim» — qoldiq va tarix (serverdagi hisob). Tanga qayerdan keladi va nimaga sarflanadi.
import { Coins as CoinsIc, Minus, Plus } from "lucide-react";
import { COIN_KIND, fmtCoins, useCoins } from "../lib/coins";
import { Empty, ScreenHeader } from "../ui/kit";

const OY = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const when = (s: string) => { const d = new Date(s); return `${d.getDate()}-${OY[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function CoinsScreen() {
  const { s, bal } = useCoins();
  const G = s?.grade;
  return (
    <main className="screen">
      <ScreenHeader title="Tangalarim" ar="نُقُودِي" />
      <section className="card cn-bal">
        <CoinsIc size={30} aria-hidden />
        <b>{fmtCoins(bal)}</b>
        <span>tanga</span>
      </section>
      <section className="card cn-how">
        <b>Tanga qayerdan keladi</b>
        <ul>
          <li><span>Uy vazifasi — ustoz bahosi</span><small>{G ? `5 → ${fmtCoins(G["5"])} · 4 → ${fmtCoins(G["4"])} · 3 → ${fmtCoins(G["3"])}` : "bahoga yarasha"}</small></li>
          <li><span>Qo'shimcha vazifa</span><small>miqdorini ustoz belgilaydi</small></li>
          <li><span>Darsda faol bo'lsangiz</span><small>ustoz beradi</small></li>
          <li><span>Do'stni taklif qilish</span><small>har bir do'st uchun</small></li>
        </ul>
        <small className="muted">Kunlik vazifalar endi yulduzcha beradi. Tanga muzlatish va keyinchalik do'kon uchun sarflanadi.</small>
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
