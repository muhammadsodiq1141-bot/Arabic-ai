// 14-partiya: «Do'stni taklif qilish» — shaxsiy havola, Telegram'da yuborish, nusxalash va taklif qilinganlar ro'yxati (server refList).
// Mukofot admin kirishni tasdiqlagach beriladi: taklif qilganga 10, do'stga 5 tanga (lib/ref.ts).
import { useEffect, useState } from "react";
import { Check, Clock, Coins, Copy, Send, UserPlus, X } from "lucide-react";
import { api } from "../lib/api";
import { REF_FRIEND, REF_INVITER, refLink } from "../lib/ref";
import { tg } from "../lib/tg";
import { useSession } from "../state/session";
import { ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

type Item = { n: string; st: string; at: string | null };
const ST: Record<string, { t: string; c: string; I: typeof Check }> = {
  approved: { t: "Qo'shildi", c: "ok", I: Check },
  pending: { t: "Tasdiq kutilmoqda", c: "wait", I: Clock },
  rejected: { t: "Tasdiqlanmadi", c: "no", I: X },
};

export function InviteScreen() {
  const { me } = useSession();
  const [list, setList] = useState<Item[] | null | "err">(null);
  useEffect(() => { let a = true; api<{ items: Item[] }>("refList").then((r) => a && setList(r.items || [])).catch(() => a && setList("err")); return () => { a = false; }; }, []);
  const link = me?.login ? refLink(me.login) : "";
  const share = () => {
    if (!link) return;
    tg.haptic();
    tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Men Miyzan'da arab tilini o'rganyapman: kitob, lug'at, multfilm va gapirish mashqlari. Sen ham qo'shil!")}`);
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast("Havola nusxalandi"); tg.haptic("success"); }
    catch { toast("Nusxalab bo'lmadi — havolani bosib turib nusxalang"); }
  };
  const ok = Array.isArray(list) ? list.filter((x) => x.st === "approved").length : 0;
  return (
    <main className="screen invite-s">
      <ScreenHeader title="Do'stni taklif qilish" ar="ادْعُ صَدِيقًا" />
      <section className="card inv-card">
        <div className="inv-gift">
          <span className="inv-gi" aria-hidden><Coins size={26} /></span>
          <span><b>+{REF_INVITER} tanga</b><small>har bir do'stingiz uchun · do'stingizga +{REF_FRIEND}</small></span>
        </div>
        <ol className="inv-steps">
          <li><b>Havolani yuboring</b><small>Telegram'da do'stingizga</small></li>
          <li><b>Do'stingiz ro'yxatdan o'tadi</b><small>Admin kirishini tasdiqlaydi</small></li>
          <li><b>Ikkalangiz tanga olasiz</b><small>Tanga muzlatish uchun kerak: seriya bir kun saqlanadi</small></li>
        </ol>
        {link ? (
          <>
            <div className="inv-link">
              <span className="inv-url" dir="ltr">{link.replace(/^https:\/\//, "")}</span>
              <button type="button" className="inv-copy" aria-label="Havolani nusxalash" onClick={() => void copy()}><Copy size={18} aria-hidden /></button>
            </div>
            <button type="button" className="btn primary wide" onClick={share}><Send size={18} aria-hidden />Telegram'da yuborish</button>
          </>
        ) : <p className="muted">Havola ro'yxatdan o'tgach paydo bo'ladi.</p>}
      </section>

      <h2 className="inv-h"><UserPlus size={18} aria-hidden />Taklif qilganlarim{ok ? ` · ${ok} kishi qo'shildi` : ""}</h2>
      {list === null ? <p className="muted pad">Yuklanmoqda…</p>
        : list === "err" ? <p className="muted pad">Ro'yxat ochilmadi. Internetni tekshirib, qayta oching.</p>
        : !list.length ? <p className="muted inv-empty">Hali hech kim yo'q. Birinchi do'stingizni taklif qiling — u qo'shilgach shu yerda ko'rinadi.</p>
        : (
          <ul className="inv-list">
            {list.map((x, k) => {
              const s = ST[x.st] || ST.pending;
              return (
                <li key={k}><b>{x.n}</b><span className={`inv-st ${s.c}`}><s.I size={14} aria-hidden />{s.t}</span></li>
              );
            })}
          </ul>
        )}
    </main>
  );
}
