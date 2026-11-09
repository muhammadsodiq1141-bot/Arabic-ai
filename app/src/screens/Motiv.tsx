// Motivatsiya ekranlari (MOTIVATSIYA-SPEC §1–§5): bosh sahifadagi «Bugungi vazifalar» kartasi (kunlik maqsad halqasi, vazifalar, haftalik qator,
// maqsad tanlovi), Profil bo'limlari (unvon va yulduzcha chizig'i, 12 nishon, muzlatish, ustozga hisobot, yutuqni ulashish),
// «Yutuqlarim» kartasi (PNG qilib ulashiladi) va MotivHost — gain() xabarlari (toast) hamda unvon/nishon tabrigi.
import { fmtCoins, useCoins } from "../lib/coins";
import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Check, Coins, Flame, PenLine, Send, Share2, Snowflake, Star } from "lucide-react";
import { useMyArName } from "../lib/arname";
import { BOT_LINK, BOT_USER } from "../lib/config";
import { loadData, type BookIndex } from "../lib/data";
import { badges, buyFreeze, freezes, GOALS, goalXP, knownTotal, levelOf, pendingCele, reportText, shareText, streakNow, todayTasks,
  weekDays, xpToday, xpTotal, type Cele } from "../lib/motiv";
import { gainPending, gainPush } from "../lib/gainNote";
import { sharePng } from "../lib/sharePng";
import { store, syncNow } from "../lib/store";
import { mySummary } from "../lib/summary";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { useArm } from "../ui/arm";
import { Emo } from "../ui/Emo";
import { Ar, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { canvasPng, drawLogo, H, M, palette, rr, W } from "./ArName";

const SLOGAN = "اَلْعَرَبِيَّةُ لُغَةٌ جَمِيلَةٌ";
const shareTg = (text: string, link = BOT_LINK) => tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);

// ===== bosh sahifa: kunlik maqsad va vazifalar =====
function Ring({ v, g }: { v: number; g: number }) {
  const s = 76, r = s / 2 - 6, C = 2 * Math.PI * r, p = Math.min(1, v / g);
  return (
    <span className="tk-ring">
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth="7" />
        {p > 0 && <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(C * p).toFixed(1)} ${C.toFixed(1)}`} transform={`rotate(-90 ${s / 2} ${s / 2})`} />}
      </svg>
      <span className="tk-ring-in"><b>{v}</b><small>/{g}</small></span>
    </span>
  );
}

export function TasksCard() {
  const [g, setG] = useState(goalXP());
  const { go } = useNav();
  const { bal } = useCoins(); // 3-paket: tanga serverda
  const v = xpToday(), T = todayTasks(), wd = weekDays(), wdone = !!store.get(`x.w.${weekIdNow()}`, 0);
  return (
    <section className="card tkcard" aria-label="Bugungi vazifalar">
      <div className="tk-top">
        <Ring v={v} g={g} />
        <div className="tk-meta">
          <span className="muted">Bugungi maqsad</span>
          <b className="tk-goal">{v >= g ? "Bajarildi" : `${g - v} yulduzcha qoldi`}</b>
          <span className="tk-chips">
            <span title="Ketma-ket kunlar"><Flame size={15} aria-hidden />{streakNow()}</span>
            <button type="button" className="tk-coin" title="Tangalarim" aria-label={`Tangalarim: ${bal}`} onClick={() => go("coins")}><Coins size={15} aria-hidden />{fmtCoins(bal)}</button>
            <span title="Muzlatish"><Snowflake size={15} aria-hidden />{freezes()}</span>
          </span>
        </div>
      </div>
      <h3 className="tk-h">Bugungi vazifalar</h3>
      <ul className="tks">
        {T.map((t) => (
          <li key={t.k} className={t.done ? "done" : ""}>
            <span className="tk-c" aria-hidden>{t.done && <Check size={13} strokeWidth={3.5} />}</span>
            <span className="tk-t">{t.t}</span>
            <span className="tk-v">{t.done ? <><Star size={13} aria-hidden />{t.st * 10}</> : `${t.val}/${t.n}`}</span>
          </li>
        ))}
        <li className={`wk ${wdone ? "done" : ""}`}>
          <span className="tk-c" aria-hidden>{wdone && <Check size={13} strokeWidth={3.5} />}</span>
          <span className="tk-t">Haftalik: 5 kun mashq qiling</span>
          <span className="tk-v">{wdone ? <><Star size={13} aria-hidden />50</> : `${Math.min(wd, 5)}/5`}</span>
        </li>
      </ul>
      <label className="tk-sel">Kunlik maqsad:
        <select value={g} aria-label="Kunlik maqsad" onChange={(e) => { const n = +e.target.value; store.set("x.goal", n); setG(n); }}>
          {GOALS.map(([n, l]) => <option key={n} value={n}>{l} — {n} yulduzcha</option>)}
        </select>
      </label>
    </section>
  );
}
const weekIdNow = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// ===== Profil =====
/** Profil kartasi ichida: arabcha ism (bosilsa — «Ismingiz arabchada»), unvon, yulduzcha chizig'i, seriya / aniqlik / so'zlar */
export function ProfMotiv({ name }: { name: string }) {
  const { go } = useNav();
  const an = useMyArName(name);
  const X = xpTotal(), L = levelOf(X);
  const pct = L.next ? Math.round(((X - L.from) / (L.next - L.from)) * 100) : 100;
  const acc = store.get<{ ok: number; n: number }>("f.acc", { ok: 0, n: 0 });
  return (
    <div className="pm">
      <button type="button" className="pm-an" onClick={() => go("arname")} aria-label="Ismingiz arabchada">
        <Ar>{an || "اِسْمُكَ"}</Ar><PenLine size={16} aria-hidden />
      </button>
      <span className="pm-pill"><Award size={16} aria-hidden />{L.name} · {L.i + 1}-unvon <Ar>{L.ar}</Ar></span>
      <div className="pm-bar">
        <span className="pm-bar-h"><b>{X} yulduzcha</b><small>{L.next ? `${L.nextName}gacha ${L.next - X} yulduzcha` : "Eng yuqori unvon!"}</small></span>
        <span className="pm-b" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Keyingi unvon"><i style={{ width: `${pct}%` }} /></span>
      </div>
      <div className="pm-stats">
        <span><b><Flame size={16} aria-hidden />{streakNow()}</b>kun ketma-ket</span>
        <span><b>{acc.n ? `${Math.round((acc.ok / acc.n) * 100)}%` : "—"}</b>aniqlik</span>
        <span><b>{knownTotal()}</b>so'z</span>
      </div>
    </div>
  );
}

export function BadgesCard() {
  const { me } = useSession();
  const B = badges(!!me?.group);
  const got = B.filter((b) => b.ok).length;
  return (
    <>
      <h2 className="t-h">Nishonlar · {got}/{B.length}</h2>
      <section className="card bdgs">
        {B.map((b) => (
          <button key={b.id} type="button" className={`bdg ${b.ok ? "" : "off"}`} aria-label={`${b.t}: ${b.d}${b.ok ? "" : " (hali olinmagan)"}`} onClick={() => toast(`${b.t}: ${b.d}`)}>
            <Emo e={b.e} size={40} /><small>{b.t}</small>
          </button>
        ))}
      </section>
    </>
  );
}

export function FreezeCard() {
  const { armed, fire } = useArm();
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const { s, bal } = useCoins();
  const price = s?.freeze || 500;
  const buy = async () => {
    if (freezes() < 2 && bal >= price && !fire("fz")) return; // sotib olish — ikki bosish bilan
    setBusy(true);
    const r = await buyFreeze();
    setBusy(false);
    toast(r.msg); tg.haptic(r.ok ? "success" : "error"); force((x) => x + 1);
  };
  return (
    <section className="card fzc">
      <div className="fzc-h"><Snowflake size={22} aria-hidden /><span><b>Muzlatish</b><small>Bir kun mashq qilmasangiz ham ketma-ketlik uzilmaydi.</small></span></div>
      <div className="tk-chips"><span><Coins size={15} aria-hidden />{fmtCoins(bal)} tanga</span><span><Snowflake size={15} aria-hidden />{freezes()} / 2</span></div>
      <button type="button" className={`btn ghost wide ${armed === "fz" ? "armed" : ""}`} disabled={busy} onClick={() => void buy()}>
        {busy ? "Olinmoqda…" : armed === "fz" ? `Yana bosing — ${fmtCoins(price)} tanga sarflanadi` : `Muzlatish olish · ${fmtCoins(price)} tanga`}
      </button>
      <small className="muted">Tanga uy vazifasi bahosi, qo'shimcha vazifa va darsdagi faollik uchun beriladi.</small>
    </section>
  );
}

/** Ustozga hisobot (server sync + Telegram ulashish oynasi) va yutuqni ulashish */
export function ProfActions() {
  const { me } = useSession();
  const { go } = useNav();
  const send = async () => {
    void syncNow();
    const [s, idx] = await Promise.all([mySummary(), loadData<BookIndex>("books/index").catch(() => [] as BookIndex)]);
    const nm = (id: string) => idx.find((b) => b.id === id)?.title || id;
    shareTg(reportText(s as Parameters<typeof reportText>[0], me?.full_name || me?.name || "", me?.login || "", nm));
  };
  return (
    <section className="card pf-acts">
      <button type="button" className="btn primary wide" onClick={() => void send()}><Send size={18} aria-hidden />Ustozga hisobot yuborish</button>
      <button type="button" className="btn ghost wide" onClick={() => go("share")}><Share2 size={18} aria-hidden />Yutuqni ulashish</button>
    </section>
  );
}

// ===== «Yutuqlarim» kartasi =====
export async function drawShare(name: string): Promise<Blob> {
  const p = palette();
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas yo'q");
  await Promise.all([document.fonts.load("800 40px Manrope", "0123456789 Miyzan"), document.fonts.load('700 40px "Noto Naskh Arabic"', SLOGAN)]).catch(() => undefined);
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
  rr(ctx, M, M, W - 2 * M, H - 2 * M, 64); ctx.fillStyle = p.hero; ctx.fill();
  ctx.strokeStyle = p.gold;
  ctx.globalAlpha = 0.55; ctx.lineWidth = 4; rr(ctx, M + 22, M + 22, W - 2 * M - 44, H - 2 * M - 44, 46); ctx.stroke();
  ctx.globalAlpha = 1;
  drawLogo(ctx, W / 2, 210, 120, p);
  ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.fillStyle = p.gold;
  ctx.font = "800 30px Manrope, sans-serif";
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("MIYZAN · ARAB TILI", W / 2, 340);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  ctx.font = "800 230px Manrope, sans-serif"; ctx.fillText(String(streakNow()), W / 2, 590);
  ctx.fillStyle = p.ink; ctx.font = "800 46px Manrope, sans-serif"; ctx.fillText("kun ketma-ket", W / 2, 660);
  const cells: [string, string][] = [[String(knownTotal()), "so'z"], [String(xpTotal()), "yulduzcha"], [levelOf(xpTotal()).name, "unvon"]];
  const cw = 270, gap = 24, x0 = W / 2 - (cw * 3 + gap * 2) / 2;
  cells.forEach(([v, l], i) => {
    const x = x0 + i * (cw + gap);
    rr(ctx, x, 720, cw, 150, 28); ctx.globalAlpha = 0.12; ctx.fillStyle = p.ink; ctx.fill(); ctx.globalAlpha = 1;
    let s = 54; ctx.font = `800 ${s}px Manrope, sans-serif`;
    while (s > 24 && ctx.measureText(v).width > cw - 30) { s -= 4; ctx.font = `800 ${s}px Manrope, sans-serif`; }
    ctx.fillStyle = p.gold; ctx.fillText(v, x + cw / 2, 805);
    ctx.fillStyle = p.ink; ctx.font = "700 28px Manrope, sans-serif"; ctx.fillText(l, x + cw / 2, 850);
  });
  ctx.direction = "rtl"; ctx.fillStyle = p.gold; ctx.font = '700 64px "Noto Naskh Arabic", serif'; ctx.fillText(SLOGAN, W / 2, 1010);
  ctx.direction = "ltr"; ctx.fillStyle = p.ink; ctx.globalAlpha = 0.75;
  let s = 34; ctx.font = `700 ${s}px Manrope, sans-serif`;
  const foot = `${name} · @${BOT_USER}`;
  while (s > 18 && ctx.measureText(foot).width > W - 2 * M - 120) { s -= 2; ctx.font = `700 ${s}px Manrope, sans-serif`; }
  ctx.fillText(foot, W / 2, H - M - 90);
  ctx.globalAlpha = 1;
  return canvasPng(c);
}

export function ShareScreen() {
  const { me } = useSession();
  const name = me?.full_name || me?.name || "";
  const L = levelOf(xpTotal());
  const blob = useRef<Blob | null>(null);
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { let on = true; void drawShare(name).then((b) => { if (on) blob.current = b; }).catch(() => {}); return () => { on = false; }; }, [name]);
  useEffect(() => () => { if (img) URL.revokeObjectURL(img); }, [img]);
  const share = async () => {
    const b = blob.current || (await drawShare(name).catch(() => null));
    if (!b) { toast("Rasm tayyorlanmadi"); return; }
    const r = await sharePng(b, "miyzan-yutuq.png", shareText());
    if (r === "failed") setImg(URL.createObjectURL(b)); // Telegram ichida ulashib bo'lmasa — rasmni ko'rsatamiz
  };
  return (
    <main className="screen">
      <ScreenHeader title="Yutuqlarim" />
      <section className="sharecard" aria-label="Yutuq kartasi">
        <span className="sk">MIYZAN · ARAB TILI</span>
        <span className="sn">{streakNow()}</span>
        <b className="sl"><Flame size={18} aria-hidden />kun ketma-ket</b>
        <span className="sg"><span><b>{knownTotal()}</b>so'z</span><span><b>{xpTotal()}</b>yulduzcha</span><span><b>{L.name}</b>unvon</span></span>
        <Ar className="ss">{SLOGAN}</Ar>
        <span className="sm">{name} · @{BOT_USER}</span>
      </section>
      <button type="button" className="btn primary wide" onClick={() => void share()}><Share2 size={18} aria-hidden />Rasm qilib ulashish</button>
      <button type="button" className="btn ghost wide share-txt" onClick={() => shareTg(shareText())}><Send size={18} aria-hidden />Matnini Telegram'da yuborish</button>
      {img && (
        <div className="share-img">
          <p className="muted">Rasmni bosib turib saqlang yoki ekran rasmini oling.</p>
          <img src={img} alt="Yutuq kartasi" />
        </div>
      )}
    </main>
  );
}

// ===== gain() xabarlari va bir martalik tabrik =====
export function MotivHost() {
  const { me } = useSession();
  const [cele, setCele] = useState<Cele | null>(null);
  const grp = useMemo(() => !!me?.group, [me]);
  useEffect(() => {
    const check = () => { const c = pendingCele(grp); if (c) { setCele(c); tg.haptic("success"); } };
    const onGain = (e: Event) => {
      const m = (e as CustomEvent<string[]>).detail || [];
      if (m.length) {
        gainPush(m); // natija ekrani ochilsa — kartaning ichida (GainNote); aks holda qisqa xabar
        window.setTimeout(() => { const p = gainPending(); if (p.length) toast(p.join(" · ")); }, 450);
      }
      window.setTimeout(check, 300);
    };
    window.addEventListener("mezon:gain", onGain);
    window.addEventListener("mezon:check", check);
    return () => { window.removeEventListener("mezon:gain", onGain); window.removeEventListener("mezon:check", check); };
  }, [grp]);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (cele) btn.current?.focus(); }, [cele]);
  if (!cele) return null;
  return (
    <div className="cele" role="dialog" aria-modal="true" aria-labelledby="cele-t">
      <div className="cele-in">
        {cele.lvl && (
          <>
            <span className="cele-ic"><Award size={40} aria-hidden /></span>
            <h1 id="cele-t">Yangi unvon!</h1>
            <b className="cele-n">{cele.lvl.name}</b>
            <Ar className="cele-ar">{cele.lvl.ar}</Ar>
            <p>{cele.lvl.next ? `Keyingi unvon — ${cele.lvl.nextName}: ${cele.lvl.next} yulduzchada.` : "Bu eng yuqori unvon. Barcha unvonlarni oldingiz!"}</p>
          </>
        )}
        {cele.bdg.length > 0 && (
          <>
            {!cele.lvl && <h1 id="cele-t">{cele.bdg.length > 1 ? "Yangi nishonlar!" : "Yangi nishon!"}</h1>}
            {cele.lvl && <h2 className="cele-h2">{cele.bdg.length > 1 ? "Yangi nishonlar" : "Yangi nishon"}</h2>}
            <ul className="cele-b">{cele.bdg.map((b) => <li key={b.id}><Emo e={b.e} size={48} /><span><b>{b.t}</b><small>{b.d}</small></span></li>)}</ul>
          </>
        )}
        <button ref={btn} type="button" className="btn primary wide" onClick={() => setCele(null)}>Davom etish</button>
      </div>
    </div>
  );
}
