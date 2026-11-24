// 24.11.2026 (P3.1): «Eslatma» — o'quvchi o'zi tanlagan vaqt va kunlarda bot Telegram'ga yozadi (bugun mashq qilgan bo'lsa — yozmaydi).
// Kirish: Profil → «Eslatma», Maqsadim va rejam, bot xabaridagi «Vaqtni o'zgartirish» (go=rem_<kun>). Server: api 24 remGet / remSet / remTest.
import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { api } from "../lib/api";
import { streakNow } from "../lib/motiv";
import { daysText, dueAhead, hhmm, REM_DAYS, REM_DEF, REM_TIMES, remPreview, tzNow, type Rem } from "../lib/remind";
import { tg } from "../lib/tg";
import { useSession } from "../state/session";
import { ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

export function RemindScreen() {
  const { me } = useSession();
  const [r, setR] = useState<Rem | null>(null);
  const [saved, setSaved] = useState<Rem | null>(null);
  const [err, setErr] = useState("");
  const [other, setOther] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [n, setN] = useState(0);
  useEffect(() => {
    api<Rem>("remGet").then((j) => {
      const v = { on: !!j.on, min: Number(j.min ?? REM_DEF.min), days: Number(j.days ?? REM_DEF.days), tz: Number(j.tz ?? REM_DEF.tz) };
      setR(v); setSaved(v); setOther(!REM_TIMES.includes(v.min));
    }).catch((e: Error) => setErr(e.message || "Yuklanmadi"));
    dueAhead().then(([, c]) => setN(c[0] || 0)).catch(() => {});
  }, []);
  const dirty = !!r && !!saved && (r.on !== saved.on || r.min !== saved.min || r.days !== saved.days || saved.tz !== tzNow());
  const pv = useMemo(() => remPreview(me?.full_name || me?.name || "", n, streakNow()), [me, n]);
  const set = (p: Partial<Rem>) => { tg.haptic("light"); setR((x) => (x ? { ...x, ...p } : x)); };
  const toggleDay = (d: number) => r && set({ days: r.days ^ (1 << d) });

  const save = async () => {
    if (!r) return;
    if (r.on && !r.days) { toast("Kamida bitta kunni tanlang"); return; }
    setBusy("save");
    try {
      const j = await api<Rem>("remSet", { on: r.on, min: r.min, days: r.days, tz: tzNow() });
      const v = { on: !!j.on, min: Number(j.min), days: Number(j.days), tz: Number(j.tz) };
      setR(v); setSaved(v); tg.haptic("success");
      toast(v.on ? `Saqlandi: ${daysText(v.days)}, ${hhmm(v.min)}` : "Eslatma o'chirildi");
    } catch (e) { toast(e instanceof Error ? e.message : "Saqlanmadi"); }
    setBusy("");
  };
  const test = async () => {
    setBusy("test");
    try { await api("remTest"); tg.haptic("success"); toast("Sinov xabari Telegram'ga yuborildi"); }
    catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
    setBusy("");
  };

  return (
    <main className="screen rem">
      <ScreenHeader title="Eslatma" ar="التَّذْكِيرُ" />
      <p className="muted rem-lead">Tanlagan vaqtingizda bot Telegram'ga eslatma yozadi: nechta so'zni takrorlash vaqti kelganini aytadi. O'sha kuni mashq qilgan bo'lsangiz, yozmaydi.</p>
      {err && <p className="err">{err}</p>}
      {!r && !err && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1].map((k) => <span key={k} />)}</div>}
      {r && (
        <>
          <div className="seg" role="radiogroup" aria-label="Eslatma">
            <button type="button" role="radio" aria-checked={r.on} className={r.on ? "on" : ""} onClick={() => set({ on: true })}><Bell size={17} aria-hidden />Yoqilgan</button>
            <button type="button" role="radio" aria-checked={!r.on} className={!r.on ? "on" : ""} onClick={() => set({ on: false })}><BellOff size={17} aria-hidden />O'chirilgan</button>
          </div>
          {r.on && (
            <>
              <div className="cc-lbl"><span>Har kuni qachon mashq qilasiz?</span></div>
              <div className="chips rem-chips" role="radiogroup" aria-label="Vaqt">
                {REM_TIMES.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={!other && r.min === m} className={!other && r.min === m ? "on" : ""}
                    onClick={() => { setOther(false); set({ min: m }); }}>{hhmm(m)}</button>
                ))}
                <button type="button" role="radio" aria-checked={other} className={other ? "on" : ""} onClick={() => { tg.haptic("light"); setOther(true); }}>Boshqa vaqt</button>
              </div>
              {other && (
                <label className="rem-time">
                  <span>Vaqt (15 daqiqa aniqlikda)</span>
                  <input type="time" step={900} value={hhmm(r.min)}
                    onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); if (Number.isFinite(h) && Number.isFinite(m)) set({ min: (Math.round((h * 60 + m) / 15) * 15) % 1440 }); }} />
                </label>
              )}
              <div className="cc-lbl"><span>Qaysi kunlari?</span><button type="button" className="link" onClick={() => set({ days: r.days === 127 ? 62 : 127 })}>{r.days === 127 ? "Faqat ish kunlari" : "Har kuni"}</button></div>
              <div className="chips rem-chips rem-days" role="group" aria-label="Kunlar">
                {REM_DAYS.map(([d, t]) => (
                  <button key={d} type="button" aria-pressed={!!(r.days & (1 << d))} className={r.days & (1 << d) ? "on" : ""} onClick={() => toggleDay(d)}>{t}</button>
                ))}
              </div>
              <div className="cc-lbl"><span>Xabar namunasi · {daysText(r.days)}, {hhmm(r.min)}</span></div>
              <section className="rem-msg" aria-label="Xabar namunasi">
                <b>{pv.title}</b>
                <p>{pv.body}</p>
                {pv.streak && <p>{pv.streak}</p>}
                <span className="rem-btn">{pv.btn}</span>
                <span className="rem-btn">Vaqtni o'zgartirish</span>
              </section>
            </>
          )}
          <div className="rem-act">
            {r.on && <button type="button" className="btn ghost" disabled={!!busy} onClick={() => void test()}><Send size={17} aria-hidden />{busy === "test" ? "Yuborilmoqda…" : "Sinov xabari"}</button>}
            <button type="button" className="btn primary" disabled={!!busy || !dirty} onClick={() => void save()}>{busy === "save" ? "Saqlanmoqda…" : dirty ? "Saqlash" : "Saqlangan"}</button>
          </div>
          <p className="muted rem-note">Eslatma @miyzanbot orqali keladi. Kelmasa, botni ochib «Start» bosing.</p>
        </>
      )}
    </main>
  );
}
