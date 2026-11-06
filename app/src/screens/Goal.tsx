// 15-partiya (M1, M11): «Maqsadim va rejam» — 4 savol (nima uchun, kuniga necha daqiqa, avvalgi tajriba, o'ziga ishonch),
// keyin shaxsiy reja: 4 yo'l ulushi, kunlik maqsad, nimadan boshlash, 4 haftalik yo'l. confOnly — faqat o'ziga ishonch shkalasi
// (4-haftada va har oy qayta baholash). Nation, 2-bob (ehtiyojni aniqlash); TMLT, 5-bob (maqsad va o'zini boshqarish).
import { useState } from "react";
import { BookOpen, Briefcase, Check, GraduationCap, MessageCircle, Target } from "lucide-react";
import { addConf, CONF_Q, confAll, confAvg, dailyOf, EXP, goalOf, MINS, MIX, setGoal, WHY, type Why } from "../lib/goal";
import { STRANDS } from "../lib/strand";
import { store } from "../lib/store";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { bookOfLevel } from "./Unit";

const WHY_I = { talk: MessageCircle, read: BookOpen, exam: GraduationCap, work: Briefcase } as const;
const WEEKS = [["1-hafta", "Tanishuv va kunlik odat"], ["2-hafta", "Takrorlash odati · maqsadni ko'rib chiqish"], ["3-hafta", "Tinglash va gapirish"], ["4-hafta", "Natijani o'lchash · yangi maqsad"]];

export function GoalScreen({ redo, confOnly }: { redo?: boolean; confOnly?: boolean }) {
  const { back, go, setTab } = useNav();
  const { me } = useSession();
  const g0 = goalOf();
  const [step, setStep] = useState(confOnly ? 3 : g0 && !redo ? 4 : 0);
  const [why, setWhy] = useState<Why | null>(g0?.why ?? null);
  const [mins, setMins] = useState<number>(g0?.mins ?? 20);
  const [exp, setExp] = useState<number | null>(g0?.exp ?? null);
  const [cv, setCv] = useState<number[]>([0, 0, 0, 0, 0]);
  const pick = <T,>(set: (v: T) => void, v: T) => { tg.haptic("light"); set(v); };

  const finish = () => {
    addConf(cv);
    if (confOnly) { toast("Baholandi — o'sishingiz «Baholar» bo'limida"); back(); return; }
    setGoal({ why: why!, mins, exp: exp ?? 0, at: Date.now() });
    tg.haptic("success");
    setStep(4);
  };

  if (step < 4) {
    const can = step === 0 ? !!why : step === 1 ? !!mins : step === 2 ? exp !== null : cv.every((x) => x > 0);
    const total = confOnly ? 1 : 4;
    return (
      <main className="screen goal-s">
        <ScreenHeader title={confOnly ? "O'zingizni baholang" : "Maqsadim va rejam"} />
        {!confOnly && <div className="gl-steps" aria-hidden>{[0, 1, 2, 3].map((k) => <i key={k} className={k <= step ? "on" : ""} />)}</div>}
        <span className="gl-n">{confOnly ? "5 ta qisqa savol" : `${step + 1} / ${total} savol`}</span>

        {step === 0 && (
          <>
            <h2 className="gl-q">Arab tilini nima uchun o'rganyapsiz?</h2>
            <div className="gl-opts">
              {WHY.map((w) => {
                const I = WHY_I[w.k];
                return (
                  <button key={w.k} type="button" className={`gl-opt ${why === w.k ? "on" : ""}`} aria-pressed={why === w.k} onClick={() => pick(setWhy, w.k)}>
                    <span className="gl-oi" aria-hidden><I size={20} /></span><span className="gl-ot"><b>{w.t}</b><small>{w.d}</small></span>
                    {why === w.k && <Check size={20} className="gl-ok" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="gl-q">Kuniga qancha vaqt ajrata olasiz?</h2>
            <div className="gl-chips" role="radiogroup" aria-label="Kunlik vaqt">
              {MINS.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mins === m} className={mins === m ? "on" : ""} onClick={() => pick(setMins, m)}>{m === 45 ? "45+" : m} daqiqa</button>
              ))}
            </div>
            <p className="gl-hint">Kunlik maqsad shunga moslanadi: {dailyOf(mins)} yulduzcha. Kam bo'lsa ham har kuni — eng yaxshi natija.</p>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="gl-q">Avval arab tilini o'qiganmisiz?</h2>
            <div className="gl-opts">
              {EXP.map((t, k) => (
                <button key={k} type="button" className={`gl-opt one ${exp === k ? "on" : ""}`} aria-pressed={exp === k} onClick={() => pick(setExp, k)}>
                  <span className="gl-ot"><b>{t}</b></span>{exp === k && <Check size={20} className="gl-ok" aria-hidden />}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="gl-q">Hozir o'zingizni qanday baholaysiz?</h2>
            <p className="gl-hint">1 — umuman yo'q, 5 — bemalol. To'g'ri yoki noto'g'ri javob yo'q: bu faqat o'sishingizni ko'rish uchun.</p>
            <div className="gl-conf">
              {CONF_Q.map((q, i) => (
                <div key={i} className="gl-cq">
                  <b>{q}</b>
                  <div className="gl-scale" role="radiogroup" aria-label={q}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} type="button" role="radio" aria-checked={cv[i] === v} className={cv[i] === v ? "on" : ""}
                        onClick={() => { tg.haptic("light"); setCv(cv.map((x, j) => (j === i ? v : x))); }}>{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="gl-nav">
          {step > 0 && !confOnly && <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>Orqaga</button>}
          <button type="button" className="btn primary" disabled={!can} onClick={() => (step < 3 ? setStep(step + 1) : finish())}>
            {step < 3 ? "Keyingi savol" : confOnly ? "Saqlash" : "Rejani ko'rish"}
          </button>
        </div>
      </main>
    );
  }

  // ===== shaxsiy reja =====
  const g = goalOf()!;
  const W = WHY.find((x) => x.k === g.why)!;
  const mix = MIX[g.why];
  const C = confAll();
  const bookId = store.get("a1.book", bookOfLevel(me?.level));
  const wk = store.get<{ start: number } | null>("f.ob.wk", null);
  const wkN = wk ? Math.floor((Date.now() - new Date(wk.start).setHours(0, 0, 0, 0)) / (7 * 864e5)) + 1 : 0;
  const start: [string, string, () => void] = [
    ["Avval harflar", "A0 · Alifbo kursi: harflar, yozish va o'qish tezligi", () => go("a0")],
    ["1-vahdadan boshlang", "Har kuni «Bugun» kartasi — tartib bilan", () => go("unit", { book: bookId, unit: 1 })],
    ["Tanish vahdalarni o'tkazing", "Darslar ro'yxatida «Bilaman — sinab ko'raman»", () => setTab("lessons")],
    ["Daraja testini ishlang", "30 ta savol — kitobingizni to'g'ri tanlaymiz", () => go("leveltest")],
  ][Math.min(3, Math.max(0, g.exp))] as [string, string, () => void];
  return (
    <main className="screen goal-s">
      <ScreenHeader title="Sizning rejangiz" ar="خُطَّتِي" />
      <section className="card gl-sum">
        <span className="gl-oi big" aria-hidden><Target size={24} /></span>
        <span className="gl-ot"><b>Maqsad: {W.t}</b><small>Kuniga {g.mins === 45 ? "45+" : g.mins} daqiqa · kunlik maqsad {dailyOf(g.mins)} yulduzcha</small></span>
      </section>

      <section className="card gl-mix">
        <b>Haftalik vaqtingiz shunday bo'linadi</b>
        <div className="gl-bar" role="img" aria-label={STRANDS.map((s) => `${s.t} ${mix[s.k]}%`).join(", ")}>
          {STRANDS.map((s) => <i key={s.k} className={`s-${s.k}`} style={{ flexGrow: mix[s.k] }}>{mix[s.k] >= 18 ? `${mix[s.k]}%` : ""}</i>)}
        </div>
        <div className="gl-lg">{STRANDS.map((s) => <span key={s.k} className={`s-${s.k}`}>{s.t} · {mix[s.k]}%</span>)}</div>
        <small className="muted">«Bugun» kartasidagi «Bu hafta — 4 yo'l» shu rejaga solishtiriladi.</small>
      </section>

      {g.why === "talk" && <p className="gl-note">Mezon adabiy arab tilini (fusha) o'rgatadi. Kundalik lahjalar boshqacha, lekin fusha arab dunyosining hamma joyida tushuniladi va lahjani keyin tez o'rganishga yordam beradi.</p>}

      <button type="button" className="card gl-start" onClick={() => { tg.haptic(); start[2](); }}>
        <span className="gl-ot"><small>Nimadan boshlash</small><b>{start[0]}</b><small>{start[1]}</small></span>
      </button>

      <section className="card gl-weeks">
        <b>4 haftalik yo'l</b>
        <ol>{WEEKS.map(([a, b], k) => <li key={k} className={k + 1 === wkN ? "on" : k + 1 < wkN ? "dn" : ""}><span>{a}</span>{b}</li>)}</ol>
      </section>

      <section className="card gl-cf">
        <b>O'ziga ishonch</b>
        {C.length ? <p>{C.length > 1 ? <>Boshida {confAvg(C[0])} → hozir <strong>{confAvg(C[C.length - 1])}</strong> / 5</> : <>Hozir {confAvg(C[0])} / 5 · 4-haftada qayta baholaysiz</>}</p> : <p>Hali baholanmagan.</p>}
        <button type="button" className="btn ghost" onClick={() => go("goal", { conf: 1 })}>Qayta baholash</button>
      </section>

      <div className="gl-nav">
        <button type="button" className="btn ghost" onClick={() => { setWhy(g.why); setStep(0); }}>Qayta tuzish</button>
        <button type="button" className="btn primary" onClick={back}>Rejani boshlash</button>
      </div>
    </main>
  );
}
