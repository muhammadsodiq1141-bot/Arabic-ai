// Daraja testi: A1–C1 har darajadan 4 ta so'z va 2 ta qoida savoli (30 ta). Har darajada 60%+ topilsa — keyingisiga o'tiladi.
// Natija — sertifikat. Eski ilova bilan bir xil: f.cert {level, score, date}, gain("test", 10).
import { useState } from "react";
import { Send, Target } from "lucide-react";
import { useMyArName } from "../lib/arname";
import { BOT_LINK, BOT_USER } from "../lib/config";
import { loadData } from "../lib/data";
import { isAr } from "../lib/kb";
import { allItems, mcq, type PBook } from "../lib/practice";
import { gain, store } from "../lib/store";
import { tg } from "../lib/tg";
import { shuffle } from "../lib/words";
import { useNav } from "../state/nav";
import { useSession } from "../state/session";
import { Ar, Logo, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import type { QConf, QItem } from "./Quiz";

const LVL: [string, string][] = [["a1", "A1"], ["a2", "A2"], ["b1", "B1"], ["b2", "B2"], ["c1", "C1"]];
export type Cert = { level: string; score: number; date: string };
type Per = Record<string, { ok: number; n: number }>;
type RQ = [string, string[], number, string?];

const latin = (s: string) => /[A-Za-zʻʼ']{2,}/.test(s);
const arOnly = (s: string) => isAr(s) && !latin(s);

export function LevelTestScreen() {
  const { go, replace } = useNav();
  const [busy, setBusy] = useState(false);
  const c = store.get<Cert | null>("f.cert", null);

  const start = async () => {
    setBusy(true);
    const books = await Promise.all(LVL.map(([id]) => loadData<PBook>(`books/${id}`).catch(() => null)));
    setBusy(false);
    const items: QItem[] = [];
    LVL.forEach(([, lab], k) => {
      const b = books[k];
      if (!b) return;
      const pool = allItems(b).filter((x) => x.ar && x.uz);
      shuffle(pool).slice(0, 4).forEach((it) => {
        const { opts, ans } = mcq(it, pool, "ar2uz");
        items.push({ q: it.ar, qAr: true, hint: "Tarjimasini tanlang", opts, ans, tag: lab });
      });
      const rq = b.units.flatMap((u) => ((b.rules?.[u.n] || []) as { quiz?: RQ[] }[]).flatMap((r) => r.quiz || []));
      shuffle(rq).slice(0, 2).forEach((q) => {
        const opts = shuffle(q[1].slice());
        items.push({ q: q[0], qAr: arOnly(q[0]), opts, optsAr: opts.every(arOnly), ans: opts.indexOf(q[1][q[2]]), why: q[3], tag: lab });
      });
    });
    if (items.length < LVL.length * 6) { toast("Test to'liq yuklanmadi. Internetni tekshirib, qayta urinib ko'ring"); return; }
    const conf: QConf = {
      title: "Daraja testi", items, track: false, auto: false,
      finish: (score, n, wrong) => {
        const per: Per = {};
        for (const it of items) {
          const t = it.tag || "";
          per[t] = per[t] || { ok: 0, n: 0 };
          per[t].n++;
          if (!wrong.includes(it)) per[t].ok++;
        }
        let level = "A0";
        for (const [, lab] of LVL) { const p = per[lab]; if (p && p.ok / p.n >= 0.6) level = lab; else break; }
        const cert: Cert = { level, score: Math.round((score / Math.max(1, n)) * 100), date: new Date().toLocaleDateString("uz-UZ") };
        store.set("f.cert", cert);
        gain("test", 10);
        replace("cert", { cert, per });
      },
    };
    tg.haptic();
    go("qs", { conf, n: Date.now() });
  };

  return (
    <main className="screen">
      <ScreenHeader title="Daraja testi" ar="اخْتِبَارُ الْمُسْتَوَى" />
      <section className="card lt-card">
        <span className="lt-ico" aria-hidden><Target size={30} /></span>
        <b>Arab tilingiz qaysi darajada?</b>
        <span>30 ta savol · so'zlar va qoidalar · A1 dan C1 gacha</span>
        <ol className="lt-strip" aria-label="Darajalar">{LVL.map(([id, l]) => <li key={id}>{l}</li>)}</ol>
        <p>Har darajada savollarning kamida 60% ini topsangiz, keyingi darajaga o'tasiz. Oxirida sertifikat beriladi.</p>
        <button type="button" className="btn primary wide" disabled={busy} onClick={() => void start()}>{busy ? "Savollar yuklanmoqda…" : "Testni boshlash"}</button>
      </section>
      {c && (
        <section className="card lt-last">
          <b>Oxirgi natija</b>
          <div><span>{c.date}</span><span className="m-pill done">{c.level === "A0" ? "Boshlang'ich" : c.level} · {c.score} ball</span></div>
          <button type="button" className="btn ghost wide" onClick={() => go("cert", { cert: c })}>Sertifikatni ko'rish</button>
        </section>
      )}
    </main>
  );
}

export function CertScreen({ cert, per }: { cert: Cert; per?: Per }) {
  const { me } = useSession();
  const nm = me?.full_name || me?.name || "O'quvchi";
  const an = useMyArName(nm); // o'quvchi «Ismingiz arabchada»da tuzatgan ism, bo'lmasa avtomatik
  const lvl = cert.level === "A0" ? "Boshlang'ich" : cert.level;
  const share = () => tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(`Mezon daraja testi: arab tilim — ${lvl} (${cert.score} ball). Sen ham sinab ko'r!`)}`);
  return (
    <main className="screen">
      <ScreenHeader title="Sertifikat" />
      <section className="cert" aria-label={`Sertifikat: ${nm}, arab tili darajasi ${lvl}`}>
        <Logo size={58} />
        <b className="cert-n">{nm}</b>
        {an && <Ar className="cert-an">{an}</Ar>}
        <span className="cert-k">Arab tili darajasi</span>
        <div className={`cert-l ${cert.level === "A0" ? "long" : ""}`}>{lvl}</div>
        <span>{cert.score} ball · {cert.date}</span>
        <small>Mezon · @{BOT_USER}</small>
      </section>
      {per && (
        <section className="card lt-per">
          <b>Darajalar bo'yicha</b>
          {LVL.map(([id, l]) => {
            const p = per[l];
            const v = p ? Math.round((p.ok / p.n) * 100) : 0;
            return (
              <div key={id}>
                <span>{l}</span>
                <span className="lt-bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={`${l}: ${v}%`}><i className={v >= 60 ? "ok" : ""} style={{ width: `${v}%` }} /></span>
                <b>{v}%</b>
              </div>
            );
          })}
        </section>
      )}
      <button type="button" className="btn primary wide" onClick={share}><Send size={18} aria-hidden />Ulashish</button>
    </main>
  );
}
