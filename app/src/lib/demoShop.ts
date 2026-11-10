// 3-paket 4-qism: tanga do'koni — faqat lokal sinov (demo.ts dan). ?demo=approved — o'quvchi (qoldiq 27 600), teacher/admin — buyurtmalar.
const iso = (minAgo: number) => new Date(Date.now() - minAgo * 6e4).toISOString();
let bal = 27600;
type It = { id: number; title: string; descr: string; price: number; stock: number; variants: string[] | null; per_limit: number | null; img: string | null; visible: boolean; sort: number; mine: number };
type Ord = { id: number; item_id: number; title: string; variant: string | null; price: number; status: string; created_at: string; closed_at: string | null };
const items: It[] = [
  { id: 1, title: "Miyzan futbolkasi", descr: "Paxta, oq rangda, Miyzan belgisi bilan", price: 40000, stock: 12, variants: ["S", "M", "L", "XL"], per_limit: 1, img: null, visible: true, sort: 1, mine: 0 },
  { id: 2, title: "Arabcha lug'at", descr: "Arabcha–o'zbekcha, 20 000 so'z", price: 25000, stock: 4, variants: null, per_limit: null, img: null, visible: true, sort: 2, mine: 0 },
  { id: 3, title: "Daftar va ruchka", descr: "", price: 8000, stock: 20, variants: null, per_limit: null, img: null, visible: true, sort: 3, mine: 0 },
  { id: 4, title: "Krujka", descr: "", price: 15000, stock: 0, variants: null, per_limit: null, img: null, visible: true, sort: 4, mine: 0 },
  { id: 5, title: "Ryukzak", descr: "", price: 60000, stock: 3, variants: null, per_limit: null, img: null, visible: false, sort: 5, mine: 0 },
];
let orders: Ord[] = [
  { id: 11, item_id: 3, title: "Daftar va ruchka", variant: null, price: 8000, status: "done", created_at: iso(60 * 24 * 9), closed_at: iso(60 * 24 * 7) },
];
const staff = [
  { id: 21, title: "Miyzan futbolkasi", img: null, variant: "M", price: 40000, status: "wait", created_at: iso(40), closed_at: null as string | null, name: "Azizbek Karimov", group: "A1-ertalab" },
  { id: 22, title: "Arabcha lug'at", img: null, variant: null, price: 25000, status: "wait", created_at: iso(60 * 20), closed_at: null as string | null, name: "Malika Saidova", group: "A2-kechki" },
  { id: 23, title: "Daftar va ruchka", img: null, variant: null, price: 8000, status: "done", created_at: iso(60 * 24 * 9), closed_at: iso(60 * 24 * 7) as string | null, name: "Madina Yusupova", group: "A1-ertalab" },
];

export function shopDemo(action: string, p: Record<string, unknown>, admin: boolean): Record<string, unknown> | null {
  if (action === "shopList") return { ok: true, ready: true, bal, items: items.filter((x) => (admin && p.all) || x.visible).map((x) => ({ ...x, imgPath: admin && p.all ? x.img : undefined })), orders };
  if (action === "shopBuy") {
    const it = items.find((x) => x.id === Number(p.item));
    if (!it || it.stock <= 0) throw new Error("Afsus, bu mahsulot tugadi");
    if (bal < it.price) throw new Error(`Tanga yetmaydi: kerak ${it.price}, sizda ${bal}`);
    bal -= it.price; it.stock--; it.mine++;
    orders = [{ id: 30 + orders.length, item_id: it.id, title: it.title, variant: (p.variant as string) || null, price: it.price, status: "wait", created_at: new Date().toISOString(), closed_at: null }, ...orders];
    return { ok: true, bal, order: orders[0].id };
  }
  if (action === "shopCancel" || action === "shopDone") {
    const mine = orders.find((x) => x.id === Number(p.id));
    const o = mine || staff.find((x) => x.id === Number(p.id));
    if (!o) throw new Error("Buyurtma topilmadi");
    o.status = action === "shopDone" ? "done" : "cancel"; o.closed_at = new Date().toISOString();
    if (action === "shopCancel" && mine) { bal += mine.price; const it = items.find((x) => x.id === mine.item_id); if (it) { it.stock++; it.mine--; } }
    return { ok: true };
  }
  if (action === "shopOrders") return { ok: true, items: [...staff].sort((a, b) => (a.status === "wait" ? 0 : 1) - (b.status === "wait" ? 0 : 1)) };
  if (action === "shopSave") { (window as unknown as { __ss?: unknown }).__ss = p.item; return { ok: true, id: 9 }; }
  if (action === "shopImg") return { ok: true, path: "i/demo-" + Math.random().toString(36).slice(2, 8) + ".jpg", url: "demo" };
  return null;
}
