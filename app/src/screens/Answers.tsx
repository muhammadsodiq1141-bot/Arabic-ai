// 2-paket (20-partiya): «Javoblar» — vahda kitob mashqlarining kaliti. Faqat ustoz va admin (foydalanuvchi qarori 09.11.2026).
// Har topshiriq bo'yicha: savol va to'g'ri javob; erkin javobda — kitobdagi namuna. O'quvchining o'z javoblari ilovada saqlanmaydi.
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { kbKeyOf, loadKb, type KbItem, type KbLesson } from "../lib/kb";
import { useSession } from "../state/session";
import { Ar, Empty, ScreenHeader } from "../ui/kit";

const SKIP = new Set(["read", "intro", "hear", "trace", "ladder", "letter", "alphabet"]);
const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** savol matni (arabcha bo'lsa — Ar) */
function qOf(it: KbItem): string {
  if (it.type === "tf") return s(it.s);
  if (it.type === "listen1" || it.type === "pick") return s(it.ar);
  if (it.type === "letters") return it.uz ? `${it.pic ? it.pic + " " : ""}${it.uz}` : s(it.pic);
  if (it.type === "order") return s(it.uz || it.q);
  return s(it.q || it.s || it.ar);
}
const isArS = (t: string) => /[؀-ۿ]/.test(t);
const Txt = ({ t }: { t: string }) => (isArS(t) ? <Ar>{t}</Ar> : <span>{t}</span>);

function Answer({ it }: { it: KbItem }) {
  if (it.type === "tf") return <b className={it.ok ? "an-ok" : "an-no"}>{it.ok ? "To'g'ri" : "Noto'g'ri"}</b>;
  if (it.type === "match" && it.pairs) return <ul className="an-pairs">{it.pairs.map((p, k) => <li key={k}><Txt t={s(p[0])} /><span aria-hidden>—</span><Txt t={s(p[1])} /></li>)}</ul>;
  if (it.type === "classify" && it.cols && Array.isArray(it.words)) {
    const W = it.words as (string | number)[][];
    return <ul className="an-pairs">{it.cols.map((c, ci) => <li key={ci}><Txt t={c} /><span aria-hidden>:</span><Ar>{W.filter((w) => Number(w[1]) === ci).map((w) => s(w[0])).join("، ")}</Ar></li>)}</ul>;
  }
  if (it.type === "free") {
    return it.ans?.length
      ? <div className="an-model"><small>Kitobdagi namuna</small>{it.ans.map((a, k) => <Ar key={k}>{a}</Ar>)}</div>
      : <small className="an-free">Erkin javob — namuna yo'q, ustozingiz tekshiradi</small>;
  }
  if (it.type === "pick") return <Txt t={s(it.ok)} />;
  if (it.type === "letters") return <Ar>{s(it.show)}</Ar>;
  const r = s(it.full || it.ok);
  return r ? <Txt t={r} /> : null;
}

export function AnswersScreen({ bookId, unitN }: { bookId: string; unitN: number }) {
  const { me } = useSession();
  const staff = !!(me?.teacher || me?.admin || me?.myGroups?.length); // o'quvchiga kalit ko'rsatilmaydi
  const key = staff ? kbKeyOf(bookId, unitN) : null;
  const [L, setL] = useState<KbLesson | null | "err">(null);
  useEffect(() => { if (key) loadKb(key).then(setL).catch(() => setL("err")); }, [key]);
  if (!key || L === "err") return <main className="screen"><ScreenHeader title="Javoblar" ar="الْإِجَابَاتُ" /><Empty icon={<KeyRound size={28} />} title="Kalit yo'q" text="Bu vahda uchun kitob mashqlari kaliti topilmadi." /></main>;
  if (!L) return <main className="screen"><ScreenHeader title="Javoblar" ar="الْإِجَابَاتُ" /><p className="muted pad">Yuklanmoqda…</p></main>;
  let n = 0;
  return (
    <main className="screen">
      <ScreenHeader title={`Javoblar · ${unitN}-vahda`} ar="الْإِجَابَاتُ" />
      <p className="an-lead">Kitob mashqlarining kaliti — faqat ustoz uchun. O'quvchilar bu bo'limni ko'rmaydi.</p>
      {L.steps.map((st, si) => {
        const items = st.items.filter((it) => !SKIP.has(it.type));
        if (!items.length) return null;
        return (
          <section key={si} className="card an-step">
            <b className="an-h">{si + 1}-topshiriq{st.t ? ` · ${st.t}` : ""}</b>
            <ol className="an-list">
              {items.map((it, k) => {
                n++;
                const q = qOf(it);
                const sub = it.type === "free" && Array.isArray(it.lines) ? (it.lines as unknown[]).map((x) => (Array.isArray(x) ? s(x[1]) : s(x))).filter(Boolean) : [];
                return (
                  <li key={k}>
                    {q && <div className="an-q"><Txt t={q} /></div>}
                    {sub.length > 0 && <ol className="an-sub">{sub.map((x, j) => <li key={j}><Ar>{x}</Ar></li>)}</ol>}
                    <div className="an-a"><Answer it={it} /></div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {!n && <Empty icon={<KeyRound size={28} />} title="Kalit yo'q" text="Bu vahdada tekshiriladigan mashq yo'q." />}
    </main>
  );
}
