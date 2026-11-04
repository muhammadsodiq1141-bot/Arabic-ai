// Shahrim: joriy kitobning har vahdasi — bitta bino; vahda so'zlarining 80% i yodlansa bino qurib bitadi (YODLASH-HAFTA-SHAHAR-SPEC §4).
// Farqlar (ataylab): foiz faqat so'zlar bo'yicha (vahdadagi Lug'at foizi bilan bir xil); 16 dan ko'p vahda — ikki qator; emoji o'rniga Lucide.
import { useEffect, useState } from "react";
import { ArrowRight, Building2, Castle, FerrisWheel, Hospital, Hotel, House, Landmark, Library, Plane, School, ShoppingBasket, Store, Trophy } from "lucide-react";
import { loadData } from "../lib/data";
import { pctOf } from "../lib/next";
import type { PBook } from "../lib/practice";
import { knownOf, store } from "../lib/store";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { ScreenHeader } from "../ui/kit";
import { Scale } from "../ui/Scale";
import { bookOfLevel } from "./Unit";

const B: [typeof School, string][] = [[School, "Maktab"], [House, "Uy"], [Building2, "Ofis"], [Store, "Do'kon"], [Hospital, "Shifoxona"], [Hotel, "Mehmonxona"],
  [Landmark, "Muzey"], [Trophy, "Stadion"], [ShoppingBasket, "Bozor"], [FerrisWheel, "Bog'"], [Plane, "Aeroport"], [Castle, "Qasr"]];
const COL = ["#B4693A", "#C08A3E", "#8A9A5B", "#5F7F6B", "#4F7C8A", "#6B6FA0", "#8C6A9E", "#A85B6D", "#C27C58", "#7E8C4A", "#5A7D9A", "#9C7A54"];

export function CityScreen() {
  const { me } = useSession();
  const { go } = useNav();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const [book, setBook] = useState<PBook | null>(null);
  useEffect(() => { void loadData<PBook>(`books/${bookId}`).then(setBook).catch(() => {}); }, [bookId]);
  if (!book) return <main className="screen"><ScreenHeader title="Mening shahrim" /><p className="muted pad">Yuklanmoqda…</p></main>;
  const U = book.units as (PBook["units"][number] & { lbl?: string })[];
  const data = U.map((u, i) => ({ u, p: pctOf(u.words, knownOf(bookId, u.n)) / 100, c: COL[i % 12], b: B[i % 12] }));
  const built = data.filter((d) => d.p >= 0.8).length;
  const nx = data.find((d) => d.p < 0.8);
  const n = data.length, rows = n > 16 ? 2 : 1, per = Math.ceil(n / rows);
  const W = 340, rowH = rows === 1 ? 250 : 190, H = rows === 1 ? 250 : 380;
  const bw = Math.floor((W - 20) / per) - 4;
  const NI = nx?.b[0];
  return (
    <main className="screen">
      <ScreenHeader title="Mening shahrim" ar="مَدِينَتِي" />
      <p className="m-info">{book.title} · {built} / {n} bino qurildi</p>
      <section className="card city-card">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Mening shahrim: ${built} ta bino qurilgan, ${n} tadan`}>
          <defs><linearGradient id="csky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sky1" /><stop offset="1" className="sky2" /></linearGradient></defs>
          <rect width={W} height={H} rx="18" fill="url(#csky)" />
          <circle cx={W - 44} cy="34" r="16" className="sun" />
          {Array.from({ length: rows }, (_, r) => {
            const base = rows === 1 ? 212 : 160 + r * rowH;
            return <path key={r} d={`M0 ${base + 2} Q${W / 2} ${base - 10} ${W} ${base + 2} V${base + 38} H0z`} className="ground" />;
          })}
          {data.map((d, i) => {
            const r = Math.floor(i / per), col = i % per;
            const base = rows === 1 ? 212 : 160 + r * rowH;
            const x = 12 + col * (bw + 4);
            const full = Math.round((60 + ((i * 37) % 70)) * (rows === 1 ? 1 : 0.85));
            const h = Math.max(0, Math.round(full * Math.min(1, d.p / 0.8)));
            const y = base - full;
            const win: JSX.Element[] = [];
            if (d.p > 0) for (let wy = base - h + 8; wy < base - 6; wy += 14) for (let wx = x + 4; wx < x + bw - 6; wx += 10) win.push(<rect key={`${wx}-${wy}`} x={wx} y={wy} width="5" height="7" rx="1.5" fill="#fff" opacity=".85" />);
            return (
              <g key={i}>
                {d.p > 0 && <rect x={x} y={base - h} width={bw} height={h} rx="4" fill={d.c} />}
                {win}
                {d.p < 0.8 && <rect x={x} y={y} width={bw} height={full - h} rx="4" fill="none" className="plan" />}
              </g>
            );
          })}
        </svg>
      </section>
      {nx && NI ? (
        <section className="card city-next">
          <div className="city-next-h"><b>Keyingi bino: <NI size={18} aria-hidden /> {nx.b[1]}</b><small>{nx.u.lbl || `${nx.u.n}-vahda`}</small></div>
          <span className="lt-bar"><i className="ok" style={{ width: `${Math.round(Math.min(1, nx.p / 0.8) * 100)}%` }} /></span>
          <small className="muted">«{nx.u.uz}» so'zlarining 80% ini yodlang — bino qurib bitadi.</small>
          <button type="button" className="btn primary wide" onClick={() => go("unit", { book: bookId, unit: nx.u.n })}>Shu vahdaga o'tish <ArrowRight size={18} aria-hidden /></button>
        </section>
      ) : (
        <section className="card city-done"><Scale size={90} balanced star /><b>Shahar to'liq qurildi!</b><small className="muted">Keyingi kitobda yangi shahar sizni kutyapti.</small></section>
      )}
      <section className="card">
        <div className="city-leg">
          {data.map((d, i) => { const I = d.b[0]; return <span key={i} className={d.p >= 0.8 ? "on" : ""}><I size={14} aria-hidden />{d.b[1]}</span>; })}
        </div>
        <button type="button" className="btn ghost wide city-books" onClick={() => go("books")}><Library size={18} aria-hidden />Har bir kitobning o'z shahri bor — kitobni almashtirish</button>
      </section>
    </main>
  );
}
