// 10.11.2026: «Tashakkur va takliflar» — o'quvchi adminga tashakkur, taklif yoki shikoyat yozadi; boshiga «Hurmatli <ism>,» avtomatik qo'shiladi.
// O'quvchi: FeedbackScreen (route fb) — yozish va «Mening xabarlarim» (javoblar). Admin: AdminFeedbackScreen (route afb) — xabarlar, tez javoblar, murojaat ismi.
// Server (api 20): fbSend, fbMine, fbList, fbReply, fbName. Ustozlar ko'rmaydi.
import { useEffect, useState } from "react";
import { MessageSquareHeart, Pencil, Send } from "lucide-react";
import { api } from "../lib/api";
import { tg } from "../lib/tg";
import { Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

type Kind = "thanks" | "idea" | "complaint";
const KIND: Record<Kind, string> = { thanks: "Tashakkur", idea: "Taklif", complaint: "Shikoyat" };
type Mine = { id: number; kind: Kind; text: string; created_at: string; reply: string | null; replied_at: string | null };
type AdminItem = Mine & { name: string; login: string; level: string; group: string };
const DEF_NAME = "MuhammadSodiq Ibrohimov";
const OY = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const when = (s: string) => {
  const d = new Date(s), t = new Date();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toDateString() === t.toDateString() ? `bugun, ${hm}` : `${d.getDate()}-${OY[d.getMonth()]}, ${hm}`;
};
/** server bilan bir xil: o'zi «Hurmatli» deb boshlasa — qo'shilmaydi */
const withPrefix = (name: string, body: string) => (/^hurmatli\b/i.test(body.trim()) ? body.trim() : `Hurmatli ${name}, ${body.trim()}`);

// ===== O'quvchi =====
export function FeedbackScreen() {
  const [tab, setTab] = useState<"write" | "mine">("write");
  const [kind, setKind] = useState<Kind>("thanks");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState<{ name: string; items: Mine[]; ready: boolean } | null | "err">(null);
  const load = () => api<{ name: string; items: Mine[]; ready: boolean }>("fbMine").then(setD).catch(() => setD("err"));
  useEffect(() => { void load(); }, []);
  const name = d && d !== "err" ? d.name : DEF_NAME;
  const items = d && d !== "err" ? d.items : [];
  const answered = items.filter((x) => x.reply).length;
  const send = async () => {
    if (text.trim().length < 2) { toast("Xabaringizni yozing"); return; }
    setBusy(true);
    try {
      await api("fbSend", { kind, text: text.trim() });
      tg.haptic("success"); toast("Xabaringiz yuborildi — rahmat!");
      setText(""); setTab("mine"); void load();
    } catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi, qayta urinib ko'ring"); }
    setBusy(false);
  };
  return (
    <main className="screen fb">
      <ScreenHeader title="Tashakkur va takliflar" ar="الشُّكْرُ وَالِاقْتِرَاحَاتُ" />
      <div className="seg" role="tablist" aria-label="Tashakkur va takliflar">
        <button type="button" role="tab" aria-selected={tab === "write"} className={tab === "write" ? "on" : ""} onClick={() => setTab("write")}>Yozish</button>
        <button type="button" role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>Mening xabarlarim{answered > 0 && <em>{answered}</em>}</button>
      </div>
      {tab === "write" ? (
        <>
          <div className="cc-lbl"><span>Turi</span></div>
          <div className="fb-kinds" role="radiogroup" aria-label="Turi">
            {(Object.keys(KIND) as Kind[]).map((k) => <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? `on ${k}` : ""} onClick={() => setKind(k)}>{KIND[k]}</button>)}
          </div>
          <div className="cc-lbl"><span>Xabaringiz</span></div>
          <label className="fb-compose" htmlFor="fb-text">
            {!/^hurmatli\b/i.test(text.trim()) && <span className="fb-pre">Hurmatli {name},</span>}
            <textarea id="fb-text" rows={5} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={kind === "thanks" ? "masalan: ilova judayam zo'r chiqibdi" : kind === "idea" ? "masalan: lug'atga rasm qo'shilsa yaxshi bo'lardi" : "nima ishlamadi yoki nima yoqmadi?"} />
          </label>
          {text.trim().length > 1 && <p className="fb-prev">Yuboriladi: <b>«{withPrefix(name, text)}»</b></p>}
          <p className="muted fb-note">Xabaringizni faqat ilova muallifi o'qiydi. Javob shu yerda va Telegram'da keladi.</p>
          <button type="button" className="btn primary wide" disabled={busy || text.trim().length < 2} onClick={() => void send()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : "Yuborish"}</button>
        </>
      ) : (
        <>
          {d === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1].map((k) => <span key={k} />)}</div>}
          {d === "err" && <p className="err">Xabarlar yuklanmadi. Internetni tekshiring.</p>}
          {d && d !== "err" && !items.length && <Empty icon={<MessageSquareHeart size={28} />} title="Hali xabar yo'q" text="Tashakkur, taklif yoki shikoyatingizni yozing — muallif albatta o'qiydi." />}
          <ul className="fb-list">
            {items.map((x) => (
              <li key={x.id} className="fb-msg">
                <div className="fb-top"><span className={`fb-chip ${x.kind}`}>{KIND[x.kind]}</span><small>{when(x.created_at)}</small></div>
                <p>{x.text}</p>
                {x.reply ? <div className="fb-reply"><b>Javob · {x.replied_at ? when(x.replied_at) : ""}</b>{x.reply}</div>
                  : <div className="fb-reply wait"><b>Javob kutilmoqda</b>Javob kelganda shu yerda va Telegram'da ko'rinadi.</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

// ===== Admin =====
const QUICK = ["Tashakkur, o'qishingizga omad!", "Taklifingiz uchun rahmat — ko'rib chiqamiz.", "Uzr so'raymiz — tez orada tuzatamiz."];

export function AdminFeedbackScreen() {
  const [d, setD] = useState<{ items: AdminItem[]; name: string; fresh: number; ready: boolean } | null | "err">(null);
  const [tab, setTab] = useState<"new" | "done">("new");
  const [editName, setEditName] = useState<string | null>(null);
  const load = () => api<{ items: AdminItem[]; name: string; fresh: number; ready: boolean }>("fbList").then(setD).catch(() => setD("err"));
  useEffect(() => { void load(); }, []);
  const list = d && d !== "err" ? d.items : [];
  const fresh = list.filter((x) => !x.reply), done = list.filter((x) => x.reply);
  const shown = tab === "new" ? fresh : done;
  const saveName = async () => {
    if (!editName || editName.trim().length < 3) { toast("Ismni yozing"); return; }
    try { const r = await api<{ name: string }>("fbName", { name: editName.trim() }); setD((x) => (x && x !== "err" ? { ...x, name: r.name } : x)); setEditName(null); toast("Saqlandi"); }
    catch (e) { toast(e instanceof Error ? e.message : "Saqlanmadi"); }
  };
  return (
    <main className="screen fb">
      <ScreenHeader title="Xabarlar" ar="الرَّسَائِلُ" />
      {d && d !== "err" && (
        editName === null ? (
          <button type="button" className="fb-name" onClick={() => setEditName(d.name)}><span>Murojaat: <b>Hurmatli {d.name},</b></span><Pencil size={16} aria-hidden /></button>
        ) : (
          <div className="fb-name edit">
            <label htmlFor="fb-nm" className="sr-only">Murojaatdagi ism</label>
            <input id="fb-nm" value={editName} maxLength={60} onChange={(e) => setEditName(e.target.value)} />
            <button type="button" className="btn primary" onClick={() => void saveName()}>Saqlash</button>
          </div>
        )
      )}
      <div className="seg" role="tablist" aria-label="Xabarlar">
        <button type="button" role="tab" aria-selected={tab === "new"} className={tab === "new" ? "on" : ""} onClick={() => setTab("new")}>Yangi{fresh.length > 0 && <em>{fresh.length}</em>}</button>
        <button type="button" role="tab" aria-selected={tab === "done"} className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>Javob berilgan</button>
      </div>
      {d === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1].map((k) => <span key={k} />)}</div>}
      {(d === "err" || (d && !d.ready)) && <p className="err">Xabarlar yuklanmadi (supabase-18-versiya.sql bajarilganmi?).</p>}
      {d && d !== "err" && d.ready && !shown.length && <Empty icon={<MessageSquareHeart size={28} />} title={tab === "new" ? "Yangi xabar yo'q" : "Hali javob berilmagan"} text="O'quvchilar yozganda shu yerda va Telegram'da ko'rinadi." />}
      <ul className="fb-list">
        {shown.map((x) => <AdminCard key={x.id} x={x} onSent={(reply) => setD((v) => (v && v !== "err" ? { ...v, items: v.items.map((y) => (y.id === x.id ? { ...y, reply, replied_at: new Date().toISOString() } : y)) } : v))} />)}
      </ul>
    </main>
  );
}

function AdminCard({ x, onSent }: { x: AdminItem; onSent: (reply: string) => void }) {
  const [reply, setReply] = useState(x.reply || "");
  const [open, setOpen] = useState(!x.reply);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (reply.trim().length < 2) { toast("Javob yozing yoki tez javobni tanlang"); return; }
    setBusy(true);
    try { await api("fbReply", { id: x.id, reply: reply.trim() }); tg.haptic("success"); toast(`Javob yuborildi · ${x.name}ga Telegram'da boradi`); onSent(reply.trim()); setOpen(false); }
    catch (e) { toast(e instanceof Error ? e.message : "Yuborilmadi"); }
    setBusy(false);
  };
  return (
    <li className="fb-msg">
      <div className="fb-top"><span className={`fb-chip ${x.kind}`}>{KIND[x.kind]}</span><small>{when(x.created_at)}</small></div>
      <span className="fb-who">{x.name}<small>{[x.group, x.level, x.login].filter(Boolean).join(" · ")}</small></span>
      <p>{x.text}</p>
      {open ? (
        <>
          <div className="fb-quick">{QUICK.map((t) => <button key={t} type="button" onClick={() => setReply(t)}>{t}</button>)}</div>
          <label htmlFor={`fb-r${x.id}`} className="sr-only">Javob</label>
          <textarea id={`fb-r${x.id}`} className="fb-ans" rows={2} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Javobingiz" />
          <button type="button" className="btn good wide" disabled={busy || reply.trim().length < 2} onClick={() => void send()}><Send size={18} aria-hidden />{busy ? "Yuborilmoqda…" : x.reply ? "Javobni yangilash" : "Javob yuborish"}</button>
        </>
      ) : (
        <div className="fb-reply"><b>Javobingiz · {x.replied_at ? when(x.replied_at) : ""}</b>{x.reply}
          <button type="button" className="kb-link" onClick={() => setOpen(true)}>O'zgartirish</button></div>
      )}
    </li>
  );
}
