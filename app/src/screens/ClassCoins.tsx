// 3-paket 2-qism (10.11.2026): darsda tanga — ustoz dars paytida o'quvchilarni tanlab (yoki «Hammasi») +50/+100/+200 beradi, sabab ixtiyoriy.
// Tanga 10 soniyadan keyin yuboriladi: shu orada «Bekor qilish» bosilsa — umuman yozilmaydi. Ekrandan chiqilsa yoki ilova yopilsa — darhol yuboriladi.
// Server (api 16): classToday — o'quvchilar va bugungi tangasi, limitlar; classCoins — yozish (limitdan ortig'i yozilmaydi). Telegram'ga xabar yo'q.
import { useCallback, useEffect, useRef, useState } from "react";
import { Coins, Undo2, Users } from "lucide-react";
import { api } from "../lib/api";
import { ccResend, ccSend } from "../lib/classq";
import { fmtCoins } from "../lib/coins";
import { tg } from "../lib/tg";
import { Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";
import { useTeacherGroup } from "./Teacher";

type Mem = { kid: string; name: string; today: number };
type Data = { members: Mem[]; per: number; day: number; total: number; amounts: number[]; why: string[] };
type Pend = { kids: string[]; amount: number; why: string; batch: string; until: number };
const WAIT = 10_000;
const newBatch = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const short = (n: string) => n.split(/\s+/)[0] || n;

export function ClassCoinsScreen({ code: code0 }: { code?: string }) {
  const tgr = useTeacherGroup();
  const code = code0 || tgr.cur?.code || "";
  const [d, setD] = useState<Data | null | "err">(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [why, setWhy] = useState("");
  const [pend, setPend] = useState<Pend | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pendRef = useRef<Pend | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    if (!code) return;
    let alive = true;
    setD(null); setSel(new Set());
    api<Data>("classToday", { code }).then((r) => alive && setD(r)).catch(() => alive && setD("err"));
    return () => { alive = false; };
  }, [code]);

  const send = useCallback(async (p: Pend) => {
    try {
      // navbat orqali: telefonda saqlanadi, tasdiqlangach o'chadi; uzilsa — keyingi ochilishda qayta yuboriladi
      const r = await ccSend({ code: codeRef.current, amount: p.amount, why: p.why, kids: p.kids, batch: p.batch });
      setD((x) => (x && x !== "err" ? { ...x, total: r.total, members: x.members.map((m) => ({ ...m, today: r.today?.[m.kid] ?? m.today })) } : x));
      if (r.capped?.length) {
        const g = Object.values(r.given || {});
        const full = g.filter((v) => v >= p.amount).length, part = g.filter((v) => v > 0 && v < p.amount).length, none = p.kids.length - full - part;
        toast(full + part === 0 ? "Bugungi limit tugadi — tanga yozilmadi"
          : [full ? `${full} ta o'quvchiga +${p.amount}` : "", part ? `${part} tasiga limitgacha` : "", none ? `${none} tasida bugungi limit tugadi` : ""].filter(Boolean).join(" · "));
      }
    } catch (e) { toast(e instanceof Error ? `${e.message} — internet tiklanganda qayta yuboriladi` : "Tanga yuborilmadi — internet tiklanganda qayta yuboriladi"); }
  }, []);
  useEffect(() => { ccResend(); }, []);
  // kutayotganini darhol yuborish (yangi berish, ekrandan chiqish, ilovani yopish)
  const flush = useCallback(() => {
    const p = pendRef.current;
    if (!p) return;
    pendRef.current = null; setPend(null);
    void send(p);
  }, [send]);
  useEffect(() => {
    const vis = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); flush(); };
  }, [flush]);
  useEffect(() => {
    if (!pend) return;
    const h = setInterval(() => { const t = Date.now(); setNow(t); if (t >= pend.until) flush(); }, 250);
    return () => clearInterval(h);
  }, [pend, flush]);

  if (!code) return <main className="screen"><ScreenHeader title="Darsda tanga" ar="نُقُودُ الدَّرْسِ" /><Empty icon={<Users size={28} />} title="Guruh yo'q" text="Tanga berish uchun avval guruh oching." /></main>;

  const list = d && d !== "err" ? d.members : [];
  const pendSum = pend ? pend.amount * pend.kids.length : 0;
  const left = d && d !== "err" ? Math.max(0, d.day - d.total - pendSum) : 0;
  const allOn = list.length > 0 && list.every((m) => sel.has(m.kid));
  const toggle = (k: string) => { tg.haptic(); setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; }); };
  const toggleAll = () => { tg.haptic(); setSel(allOn ? new Set() : new Set(list.map((m) => m.kid))); };
  const give = (amount: number) => {
    if (!sel.size) { toast("Avval o'quvchini tanlang"); return; }
    flush();
    const p: Pend = { kids: [...sel], amount, why, batch: newBatch(), until: Date.now() + WAIT };
    pendRef.current = p; setPend(p); setNow(Date.now()); setSel(new Set());
    tg.haptic("success");
  };
  const undo = () => { if (!pendRef.current) return; pendRef.current = null; setPend(null); toast("Bekor qilindi — tanga yozilmadi"); }; // kech bosilsa (yuborilgan) — hech narsa
  const pendNames = pend ? pend.kids.map((k) => short(list.find((m) => m.kid === k)?.name || "")).filter(Boolean) : [];

  return (
    <main className="screen cc">
      <ScreenHeader title="Darsda tanga" ar="نُقُودُ الدَّرْسِ" />
      {!code0 && tgr.groups.length > 1 && (
        <div className="chips" role="tablist" aria-label="Guruh">
          {tgr.groups.map((g) => <button key={g.code} type="button" role="tab" aria-selected={g.code === code} className={g.code === code ? "on" : ""} onClick={() => { flush(); tgr.pick(g.code); }}>{g.title}</button>)}
        </div>
      )}
      {d === "err" && <p className="err">O'quvchilar yuklanmadi. Internetni tekshiring.</p>}
      {d === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div>}
      {d && d !== "err" && (
        <>
          <div className="cc-lbl"><span>Sabab</span><small>ixtiyoriy</small></div>
          <div className="cc-why" role="radiogroup" aria-label="Sabab">
            {d.why.map((w) => <button key={w} type="button" role="radio" aria-checked={why === w} className={why === w ? "on" : ""} onClick={() => setWhy(why === w ? "" : w)}>{w}</button>)}
          </div>
          <div className="cc-lbl">
            <span>O'quvchilar{sel.size ? ` · ${sel.size} ta tanlandi` : ""}</span>
            {list.length > 0 && <button type="button" className="cc-all" onClick={toggleAll}>{allOn ? "Tanlovni bekor qilish" : "Hammasi"}</button>}
          </div>
          {!list.length && <Empty icon={<Users size={28} />} title="Guruhda hali o'quvchi yo'q" text="Taklif havolasini Ustoz panelidan yuboring." />}
          <div className="cc-grid">
            {list.map((m) => {
              const on = sel.has(m.kid), wait = !!pend?.kids.includes(m.kid), full = m.today >= d.per;
              return (
                <button key={m.kid} type="button" className={`cc-st${on ? " on" : ""}${wait ? " wait" : ""}${full ? " full" : ""}`} aria-pressed={on} onClick={() => toggle(m.kid)}>
                  <span className="cc-av" aria-hidden>{initials(m.name)}</span>
                  <span className="cc-t"><b>{m.name}</b>
                    <small className={wait ? "" : m.today > 0 ? "got" : ""}>{wait ? `+${pend!.amount} kutilmoqda` : full ? `bugun +${fmtCoins(m.today)} · limit` : `bugun ${m.today > 0 ? "+" + fmtCoins(m.today) : "0"}`}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="cc-space" aria-hidden />
          <div className="cc-bar">
            {pend && (
              <div className="cc-pend" role="status">
                <span className="cc-ring" aria-hidden>{Math.max(1, Math.ceil((pend.until - now) / 1000))}</span>
                <span className="cc-pt">{pendNames.slice(0, 3).join(", ")}{pendNames.length > 3 ? ` va yana ${pendNames.length - 3}` : ""}: +{pend.amount} tanga{pend.why ? ` · ${pend.why}` : ""}</span>
                <button type="button" onClick={undo}><Undo2 size={16} aria-hidden />Bekor qilish</button>
              </div>
            )}
            <div className="cc-lim"><span>Bitta o'quvchiga: kuniga {fmtCoins(d.per)} gacha</span><span>Guruhga qoldi: {fmtCoins(left)}</span></div>
            <div className="cc-amts">
              {d.amounts.map((a) => <button key={a} type="button" className={a === d.amounts[0] ? "lo" : ""} disabled={!sel.size} onClick={() => give(a)}><Coins size={17} aria-hidden />+{a}</button>)}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
