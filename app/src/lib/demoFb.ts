// 10.11.2026: «Tashakkur va takliflar» — faqat lokal sinov (demo.ts dan). ?demo=approved — o'quvchi, ?demo=admin — xabarlar.
const iso = (minAgo: number) => new Date(Date.now() - minAgo * 6e4).toISOString();
let name = "MuhammadSodiq Ibrohimov";
type It = { id: number; kind: string; text: string; created_at: string; reply: string | null; replied_at: string | null; name: string; login: string; level: string; group: string };
const all: It[] = [
  { id: 3, kind: "complaint", text: "Hurmatli MuhammadSodiq Ibrohimov, kecha karnay ishlamadi", created_at: iso(50), reply: null, replied_at: null, name: "Malika Saidova", login: "MJ-48877", level: "A2", group: "A2-kechki" },
  { id: 2, kind: "idea", text: "Hurmatli MuhammadSodiq Ibrohimov, lug'atga rasm qo'shilsa yaxshi bo'lardi", created_at: iso(60 * 20), reply: null, replied_at: null, name: "Aziz Karimov", login: "MJ-48213", level: "A1", group: "A1-ertalab" },
  { id: 1, kind: "thanks", text: "Hurmatli MuhammadSodiq Ibrohimov, darsdagi o'yinlar juda yoqdi", created_at: iso(60 * 30), reply: "Tashakkur, o'qishingizga omad!", replied_at: iso(60 * 29), name: "Aziz Karimov", login: "MJ-48213", level: "A1", group: "A1-ertalab" },
];

export function fbDemo(action: string, p: Record<string, unknown>): Record<string, unknown> | null {
  const withPre = (b: string) => (/^hurmatli\b/i.test(b) ? b : `Hurmatli ${name}, ${b}`);
  if (action === "fbSend") {
    const text = withPre(String(p.text || "").trim());
    all.unshift({ id: all.length + 10, kind: String(p.kind), text, created_at: new Date().toISOString(), reply: null, replied_at: null, name: "Aziz Karimov", login: "MJ-48213", level: "A1", group: "A1-ertalab" });
    (window as unknown as { __fb?: unknown }).__fb = { kind: p.kind, text };
    return { ok: true, id: all[0].id, text };
  }
  if (action === "fbMine") return { ok: true, ready: true, name, items: all.filter((x) => x.name === "Aziz Karimov") };
  if (action === "fbList") { const fresh = all.filter((x) => !x.reply).length; return p.count ? { ok: true, fresh } : { ok: true, ready: true, fresh, name, items: [...all].sort((a, b) => (a.reply ? 1 : 0) - (b.reply ? 1 : 0)) }; }
  if (action === "fbReply") { const x = all.find((y) => y.id === Number(p.id)); if (x) { x.reply = String(p.reply); x.replied_at = new Date().toISOString(); } return { ok: true }; }
  if (action === "fbName") { name = String(p.name); return { ok: true, name }; }
  return null;
}
