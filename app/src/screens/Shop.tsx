// 3-paket 4-qism (10.11.2026): tanga do'koni.
// O'quvchi: ShopScreen (route shop) — mahsulotlar, «maqsad», buyurtma oynasi (variant, hisob-kitob), «Buyurtmalarim» (bekor qilish — tanga qaytadi).
// Admin: AdminShopScreen (route ashop) — mahsulot qo'shish/tahrirlash (rasm, nom, tavsif, narx, soni, variant, cheklov, ko'rinadi) va buyurtmalar.
// Ustoz: TeacherShopScreen (route tshop) — o'z guruhi buyurtmalari, «Topshirildi». Server: shopList, shopBuy, shopCancel, shopDone, shopOrders, shopSave, shopImg (api 18).
import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Gift, Pencil, Plus, Target, X } from "lucide-react";
import { api } from "../lib/api";
import { fmtCoins, refreshCoins } from "../lib/coins";
import { getGoal, ORDER_ST, putShopImg, setGoal, type Goal, type ShopItem, type ShopState, type StaffOrder } from "../lib/shop";
import { tg } from "../lib/tg";
import { useArm } from "../ui/arm";
import { Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

const OY = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const when = (s: string) => { const d = new Date(s); return `${d.getDate()}-${OY[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const Pic = ({ src, size = 40 }: { src: string | null; size?: number }) => (src ? <img src={src} alt="" loading="lazy" /> : <Gift size={size} aria-hidden />);

// ===== O'quvchi: do'kon =====
export function ShopScreen() {
  const [d, setD] = useState<ShopState | null | "err">(null);
  const [tab, setTab] = useState<"items" | "orders">("items");
  const [open, setOpen] = useState<ShopItem | null>(null);
  const [goal, setG] = useState<Goal | null>(getGoal);
  const load = () => api<ShopState>("shopList").then(setD).catch(() => setD("err"));
  useEffect(() => { void load(); }, []);
  const pickGoal = (x: ShopItem | null) => { const g = x ? { id: x.id, title: x.title, price: x.price } : null; setGoal(g); setG(g); tg.haptic(); toast(x ? `«${x.title}» — maqsadingiz. «Tangalarim»da ham ko'rinadi` : "Maqsad olib tashlandi"); };
  if (d === null) return <main className="screen"><ScreenHeader title="Do'kon" ar="الْمَتْجَرُ" /><div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div></main>;
  if (d === "err" || !d.ready) return <main className="screen"><ScreenHeader title="Do'kon" ar="الْمَتْجَرُ" /><Empty icon={<Gift size={28} />} title={d === "err" ? "Do'kon ochilmadi" : "Do'kon tez orada ochiladi"} text={d === "err" ? "Internetni tekshirib, qayta oching." : "Tanga yig'ishda davom eting — sovg'alar shu yerda bo'ladi."} /></main>;
  const wait = d.orders.filter((o) => o.status === "wait").length;
  return (
    <main className="screen shop">
      <ScreenHeader title="Do'kon" ar="الْمَتْجَرُ" />
      <section className="sh-bal"><span>Sizda<b>{fmtCoins(d.bal)}</b></span><small>tanga</small></section>
      <div className="seg" role="tablist" aria-label="Do'kon">
        <button type="button" role="tab" aria-selected={tab === "items"} className={tab === "items" ? "on" : ""} onClick={() => setTab("items")}>Mahsulotlar</button>
        <button type="button" role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>Buyurtmalarim{wait > 0 && <em>{wait}</em>}</button>
      </div>
      {tab === "items" ? (
        d.items.length ? (
          <div className="sh-grid">
            {d.items.map((x) => {
              const short = Math.max(0, x.price - d.bal), out = x.stock <= 0, isGoal = goal?.id === x.id;
              return (
                <button key={x.id} type="button" className={`sh-card${out ? " out" : ""}`} onClick={() => setOpen(x)}>
                  {isGoal && <span className="sh-goal">Maqsad</span>}
                  {out && <span className="sh-out">Tugadi</span>}
                  <span className="sh-img"><Pic src={x.img} /></span>
                  <b className="sh-t">{x.title}</b>
                  <span className="sh-p">{fmtCoins(x.price)}</span>
                  {short > 0 && !out ? (
                    <><span className="sh-bar" aria-hidden><i style={{ width: `${Math.min(100, (d.bal / x.price) * 100)}%` }} /></span><small>yana {fmtCoins(short)} kerak</small></>
                  ) : <small>{out ? "tez orada" : `qoldi ${x.stock} ta`}</small>}
                </button>
              );
            })}
          </div>
        ) : <Empty icon={<Gift size={28} />} title="Hozircha mahsulot yo'q" text="Admin sovg'alarni qo'shganda shu yerda paydo bo'ladi." />
      ) : <MyOrders d={d} onChanged={() => { void load(); void refreshCoins(); }} />}
      {open && <BuySheet x={open} bal={d.bal} goal={goal?.id === open.id} onGoal={() => pickGoal(goal?.id === open.id ? null : open)} onClose={() => setOpen(null)}
        onBought={() => { setOpen(null); setTab("orders"); if (goal?.id === open.id) pickGoal(null); void load(); void refreshCoins(); }} />}
    </main>
  );
}

function BuySheet({ x, bal, goal, onGoal, onClose, onBought }: { x: ShopItem; bal: number; goal: boolean; onGoal: () => void; onClose: () => void; onBought: () => void }) {
  const [v, setV] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const short = x.price - bal, out = x.stock <= 0, lim = !!x.per_limit && x.mine >= x.per_limit;
  const needV = !!x.variants?.length && !v;
  const buy = async () => {
    setBusy(true);
    try {
      await api("shopBuy", { item: x.id, variant: v || null });
      tg.haptic("success"); toast("Buyurtma qabul qilindi — sovg'ani markazda ustozingizdan olasiz");
      onBought();
    } catch (e) { toast(e instanceof Error ? e.message : "Buyurtma berilmadi"); }
    setBusy(false);
  };
  return (
    <div className="sh-dim" role="dialog" aria-modal="true" aria-label={x.title} onClick={onClose}>
      <div className="sh-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sh-x" aria-label="Yopish" onClick={onClose}><X size={20} aria-hidden /></button>
        <div className="sh-hd"><span className="sh-img sm"><Pic src={x.img} size={30} /></span><span><b>{x.title}</b>{x.descr && <small>{x.descr}</small>}</span></div>
        {!!x.variants?.length && (
          <div className="sh-var" role="radiogroup" aria-label="Variant">
            {x.variants.map((s) => <button key={s} type="button" role="radio" aria-checked={v === s} className={v === s ? "on" : ""} onClick={() => setV(s)}>{s}</button>)}
          </div>
        )}
        <div className="sh-calc">
          <div><span>Sizda</span><span>{fmtCoins(bal)}</span></div>
          <div><span>Narxi</span><span>− {fmtCoins(x.price)}</span></div>
          <div><span>{short > 0 ? "Yetmaydi" : "Qoladi"}</span><span>{fmtCoins(Math.abs(bal - x.price))}</span></div>
        </div>
        <p className="sh-note">{out ? "Bu mahsulot hozircha tugagan." : lim ? `Bu mahsulotdan bir kishiga ko'pi bilan ${x.per_limit} ta — siz olgansiz.`
          : "Tanga hozir yechiladi. Sovg'ani markazda ustozingizdan olasiz. Topshirilgunicha bekor qilsangiz, tanga qaytadi."}</p>
        {short > 0 || out || lim ? (
          <button type="button" className={`btn wide ${goal ? "ghost" : "dark"}`} onClick={onGoal}><Target size={18} aria-hidden />{goal ? "Maqsaddan olib tashlash" : "Maqsad qilish"}</button>
        ) : (
          <button type="button" className="btn primary wide" disabled={busy || needV} onClick={() => void buy()}>{busy ? "Buyurtma berilmoqda…" : needV ? "Avval variantni tanlang" : `${fmtCoins(x.price)} tangaga olish`}</button>
        )}
      </div>
    </div>
  );
}

function MyOrders({ d, onChanged }: { d: ShopState; onChanged: () => void }) {
  const { armed, fire } = useArm();
  const cancel = async (id: number) => {
    if (!fire(`c${id}`)) return;
    try { await api("shopCancel", { id }); tg.haptic("success"); toast("Buyurtma bekor qilindi — tanga qaytdi"); onChanged(); }
    catch (e) { toast(e instanceof Error ? e.message : "Bekor qilinmadi"); }
  };
  if (!d.orders.length) return <Empty icon={<Gift size={28} />} title="Hali buyurtma yo'q" text="Tanga yetganda mahsulotni tanlab, buyurtma bering." />;
  return (
    <ul className="sh-orders">
      {d.orders.map((o) => (
        <li key={o.id} className={`sh-ord ${o.status}`}>
          <div className="sh-ot"><b>{o.title}{o.variant ? ` · ${o.variant}` : ""}</b><small>{when(o.created_at)}</small></div>
          <div className="sh-om"><span className={`sh-st ${o.status}`}>{ORDER_ST[o.status]}</span><span>{fmtCoins(o.price)} tanga{o.status === "cancel" ? " · qaytarildi" : ""}</span></div>
          {o.status === "wait" && <button type="button" className={`btn ghost ${armed === `c${o.id}` ? "bad" : ""}`} onClick={() => void cancel(o.id)}>{armed === `c${o.id}` ? "Yana bir bosing — bekor qilish" : "Bekor qilish"}</button>}
        </li>
      ))}
    </ul>
  );
}

// ===== Admin va ustoz: buyurtmalar =====
function StaffOrders() {
  const [items, setItems] = useState<StaffOrder[] | null | "err">(null);
  const [all, setAll] = useState(false);
  const { armed, fire } = useArm();
  const load = () => api<{ items: StaffOrder[] }>("shopOrders").then((r) => setItems(r.items || [])).catch(() => setItems("err"));
  useEffect(() => { void load(); }, []);
  const act = async (o: StaffOrder, a: "shopDone" | "shopCancel") => {
    if (a === "shopCancel" && !fire(`x${o.id}`)) return;
    try { await api(a, { id: o.id }); tg.haptic("success"); toast(a === "shopDone" ? `Topshirildi · ${o.name}ga xabar boradi` : "Bekor qilindi — tanga o'quvchiga qaytdi"); void load(); }
    catch (e) { toast(e instanceof Error ? e.message : "Saqlanmadi"); }
  };
  const list = items && items !== "err" ? items : [];
  const waitN = list.filter((o) => o.status === "wait").length;
  const shown = all ? list : list.filter((o) => o.status === "wait");
  return (
    <>
      <div className="seg small" role="tablist" aria-label="Buyurtmalar">
        <button type="button" role="tab" aria-selected={!all} className={!all ? "on" : ""} onClick={() => setAll(false)}>Kutilmoqda{waitN > 0 && <em>{waitN}</em>}</button>
        <button type="button" role="tab" aria-selected={all} className={all ? "on" : ""} onClick={() => setAll(true)}>Hammasi</button>
      </div>
      {items === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1].map((k) => <span key={k} />)}</div>}
      {items === "err" && <p className="err">Buyurtmalar yuklanmadi. Internetni tekshiring.</p>}
      {items && items !== "err" && !shown.length && <Empty icon={<Gift size={28} />} title={all ? "Hali buyurtma yo'q" : "Kutilayotgan buyurtma yo'q"} text="O'quvchi buyurtma berganda shu yerda va Telegram'da ko'rinadi." />}
      <ul className="sh-orders">
        {shown.map((o) => (
          <li key={o.id} className={`sh-ord ${o.status}`}>
            <div className="sh-ot"><b>{o.title}{o.variant ? ` · ${o.variant}` : ""}</b><small>{when(o.created_at)}</small></div>
            <div className="sh-who">{o.name}{o.group ? ` · ${o.group}` : ""} · {fmtCoins(o.price)} tanga</div>
            {o.status === "wait" ? (
              <div className="sh-act">
                <button type="button" className={`btn ghost ${armed === `x${o.id}` ? "bad" : ""}`} onClick={() => void act(o, "shopCancel")}>{armed === `x${o.id}` ? "Tasdiqlang" : "Bekor qilish"}</button>
                <button type="button" className="btn good" onClick={() => void act(o, "shopDone")}><Check size={18} aria-hidden />Topshirildi</button>
              </div>
            ) : <span className={`sh-st ${o.status}`}>{ORDER_ST[o.status]}{o.closed_at ? ` · ${when(o.closed_at)}` : ""}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

export function TeacherShopScreen() {
  return <main className="screen shop"><ScreenHeader title="Do'kon buyurtmalari" ar="طَلَبَاتُ الْمَتْجَرِ" /><StaffOrders /></main>;
}

// ===== Admin: do'kon boshqaruvi =====
type Draft = { id?: number; title: string; descr: string; price: string; stock: string; variants: string; per_limit: string; img: string | null; preview: string | null; visible: boolean; sort: string };
const toDraft = (x?: ShopItem): Draft => ({
  id: x?.id, title: x?.title || "", descr: x?.descr || "", price: x ? String(x.price) : "", stock: x ? String(x.stock) : "10", variants: (x?.variants || []).join(", "),
  per_limit: x?.per_limit ? String(x.per_limit) : "", img: x?.imgPath ?? null, preview: x?.img ?? null, visible: x?.visible ?? true, sort: x ? String(x.sort) : "0",
});

export function AdminShopScreen() {
  const [tab, setTab] = useState<"items" | "orders">("orders");
  const [d, setD] = useState<ShopItem[] | null | "err">(null);
  const [edit, setEdit] = useState<Draft | null>(null);
  const load = () => api<ShopState>("shopList", { all: 1 }).then((r) => setD(r.ready ? r.items : "err")).catch(() => setD("err"));
  useEffect(() => { void load(); }, []);
  return (
    <main className="screen shop">
      <ScreenHeader title="Do'kon boshqaruvi" ar="إِدَارَةُ الْمَتْجَرِ" />
      <div className="seg" role="tablist" aria-label="Do'kon boshqaruvi">
        <button type="button" role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>Buyurtmalar</button>
        <button type="button" role="tab" aria-selected={tab === "items"} className={tab === "items" ? "on" : ""} onClick={() => setTab("items")}>Mahsulotlar{d && d !== "err" ? <em>{d.length}</em> : null}</button>
      </div>
      {tab === "orders" ? <StaffOrders /> : (
        <>
          {d === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1].map((k) => <span key={k} />)}</div>}
          {d === "err" && <p className="err">Mahsulotlar yuklanmadi (supabase-17-versiya.sql bajarilganmi?).</p>}
          {!edit && <button type="button" className="rowbtn xadd" onClick={() => setEdit(toDraft())}><Plus size={22} aria-hidden /><span><b>Mahsulot qo'shish</b><small>Rasm, nom, narx, soni</small></span></button>}
          {edit && <ItemForm key={edit.id ?? "new"} d={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void load(); }} />}
          <ul className="sh-admin">
            {d && d !== "err" && d.map((x) => (
              <li key={x.id} className={x.visible ? "" : "hid"}>
                <span className="sh-img sm"><Pic src={x.img} size={26} /></span>
                <span className="sh-at"><b>{x.title}</b><small>{fmtCoins(x.price)} tanga · qoldi {x.stock} ta{x.variants?.length ? ` · ${x.variants.join("/")}` : ""}{x.per_limit ? ` · 1 kishiga ${x.per_limit}` : ""}</small>
                  {!x.visible && <small className="sh-hidden"><EyeOff size={12} aria-hidden /> yashirin</small>}</span>
                <button type="button" className="ibtn" aria-label={`${x.title} — tahrirlash`} onClick={() => { setEdit(toDraft(x)); window.scrollTo(0, 0); }}><Pencil size={18} aria-hidden /></button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function ItemForm({ d: d0, onClose, onSaved }: { d: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(d0);
  const [busy, setBusy] = useState("");
  const set = (k: keyof Draft, v: string | boolean | null) => setD((x) => ({ ...x, [k]: v }));
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy("Rasm yuklanmoqda…");
    try { const r = await putShopImg(f); setD((x) => ({ ...x, img: r.path, preview: r.preview })); }
    catch (e) { toast(e instanceof Error ? e.message : "Rasm yuklanmadi"); }
    setBusy("");
  };
  const num = (s: string) => Math.round(Number(s.replace(/\s/g, "")) || 0);
  const save = async () => {
    if (d.title.trim().length < 2) { toast("Mahsulot nomini yozing"); return; }
    if (num(d.price) < 1) { toast("Narxni yozing"); return; }
    setBusy("Saqlanmoqda…");
    try {
      const stockChanged = !d.id || num(d.stock) !== num(d0.stock); // tahrirda soni faqat o'zgartirilsa yuboriladi
      await api("shopSave", { item: { id: d.id, title: d.title.trim(), descr: d.descr.trim(), price: num(d.price), stock: stockChanged ? num(d.stock) : undefined, stock0: num(d0.stock), variants: d.variants.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        per_limit: num(d.per_limit) || null, img: d.img, visible: d.visible, sort: num(d.sort) } });
      tg.haptic("success"); toast(d.id ? "Mahsulot yangilandi" : "Mahsulot qo'shildi"); onSaved();
    } catch (e) { toast(e instanceof Error ? e.message : "Saqlanmadi"); }
    setBusy("");
  };
  const digits = (v: string) => v.replace(/[^\d\s]/g, "");
  return (
    <section className="card form sh-form">
      <div className="sh-fhd"><b>{d.id ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</b><button type="button" className="ibtn" aria-label="Yopish" onClick={onClose}><X size={18} aria-hidden /></button></div>
      <label className="sh-pic" htmlFor="sh-file">
        <span className="sh-img">{d.preview ? <img src={d.preview} alt="" /> : <Gift size={34} aria-hidden />}</span>
        <span><b>{d.preview ? "Rasmni almashtirish" : "Rasm tanlash"}</b><small>Telefondan · avtomatik siqiladi</small></span>
        <input id="sh-file" type="file" accept="image/*" hidden disabled={!!busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <label htmlFor="sh-t">Nomi<input id="sh-t" value={d.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder="Masalan: Miyzan futbolkasi" /></label>
      <label htmlFor="sh-d">Qisqa tavsif<input id="sh-d" value={d.descr} maxLength={300} onChange={(e) => set("descr", e.target.value)} placeholder="Ixtiyoriy" /></label>
      <div className="xn-row">
        <label htmlFor="sh-p">Narx (tanga)<input id="sh-p" inputMode="numeric" value={d.price} onChange={(e) => set("price", digits(e.target.value))} /></label>
        <label htmlFor="sh-s">Soni<input id="sh-s" inputMode="numeric" value={d.stock} onChange={(e) => set("stock", digits(e.target.value))} /></label>
      </div>
      <label htmlFor="sh-v">Variantlar (vergul bilan)<input id="sh-v" value={d.variants} onChange={(e) => set("variants", e.target.value)} placeholder="S, M, L, XL — bo'sh qolsa variantsiz" /></label>
      <div className="xn-row">
        <label htmlFor="sh-l">Bir kishiga ko'pi bilan<input id="sh-l" inputMode="numeric" value={d.per_limit} onChange={(e) => set("per_limit", digits(e.target.value))} placeholder="cheklovsiz" /></label>
        <label htmlFor="sh-o">Tartib raqami<input id="sh-o" inputMode="numeric" value={d.sort} onChange={(e) => set("sort", digits(e.target.value))} /></label>
      </div>
      <button type="button" className={`btn ghost wide sh-vis ${d.visible ? "" : "off"}`} aria-pressed={d.visible} onClick={() => set("visible", !d.visible)}>
        {d.visible ? <><Eye size={18} aria-hidden />O'quvchilarga ko'rinadi</> : <><EyeOff size={18} aria-hidden />Yashirin</>}
      </button>
      <button type="button" className="btn primary wide" disabled={!!busy} onClick={() => void save()}>{busy || "Saqlash"}</button>
    </section>
  );
}
