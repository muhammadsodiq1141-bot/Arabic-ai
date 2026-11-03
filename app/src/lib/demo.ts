// Sinov rejimi: faqat shu kompyuterda (localhost) va manzilda ?demo=... bo'lsa ishlaydi. Serverga umuman murojaat qilmaydi,
// hamma ma'lumot soxta. Haqiqiy saytda (github.io) yoqilmaydi.
const q = new URLSearchParams(location.search);
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
export const DEMO: string | null = local ? q.get("demo") : null; // pending | rejected | approved | admin | new

const people = [
  { sid: "tg101", name: "Aziz Karimov", tgName: "Aziz", user: "aziz_k", level: "A1", group: { code: "K7QX2M", title: "A1-ertalab", teacher: "Domla" }, at: new Date(Date.now() - 5 * 6e4).toISOString(), seen: null },
  { sid: "tg102", name: "Zarina Saidova", tgName: "Zarina", user: "", level: "A0", group: null, at: new Date(Date.now() - 36e5).toISOString(), seen: null },
  { sid: "tg103", name: "Bekzod Toshev", tgName: "Bek", user: "bek_t", level: "A2", group: { code: "P4WZ8N", title: "A2-kechki", teacher: "Malika" }, at: new Date(Date.now() - 864e5).toISOString(), seen: null },
  { sid: "tg104", name: "Madina Yusupova", tgName: "Madina", user: "madina_y", level: "A1", group: { code: "K7QX2M", title: "A1-ertalab", teacher: "Domla" }, at: new Date(Date.now() - 2 * 864e5).toISOString(), seen: null },
];

export async function demoApi(action: string, p: Record<string, unknown>): Promise<Record<string, unknown>> {
  await new Promise((r) => setTimeout(r, 250));
  const admin = DEMO === "admin";
  if (action === "me") {
    if (DEMO === "new") return { ok: true, id: "tg101", name: "Aziz", full_name: null, login: null, level: null, group: null, admin: false, access: "pending" };
    return {
      ok: true, id: "tg101", name: "Aziz", full_name: admin ? "Bosh admin" : "Aziz Karimov", login: admin ? "MJ-10001" : "MJ-48213", level: "A1",
      group: admin ? null : { code: "K7QX2M", title: "A1-ertalab", teacher: false }, admin, tg: 101,
      access: admin ? "approved" : DEMO === "rejected" ? "rejected" : DEMO === "approved" ? "approved" : "pending",
    };
  }
  if (action === "register") return { ok: true, login: "MJ-48213", pin: "305917" };
  if (action === "adminRequests") return { ok: true, status: p.status || "pending", items: p.status === "rejected" ? people.slice(3) : people.slice(0, 3) };
  if (action === "adminApprove") return { ok: true, n: Array.isArray(p.sids) ? p.sids.length : 1 };
  return { ok: true };
}
