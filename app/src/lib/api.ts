// Server bilan aloqa: eski ilova bilan bir xil manzil va format ({initData, action, payload}) + "v: 2" belgisi
// (server yangi ilovaga kirishni faqat bosh admin tasdig'i bilan beradi).
import { API_KEY, API_URL } from "./config";
import { tg } from "./tg";
import { DEMO } from "./demoFlag";
import { logErr } from "./errlog";

// 1-paket (D6): xom texnik xabar o'rniga o'quvchiga tushunarli matn. Server o'zbekcha xabar bersa — o'shani ko'rsatamiz.
export const NET_MSG = "Internet yo'q. Ulanishni tekshirib, qayta urinib ko'ring.";
const SRV_MSG = "Serverda vaqtincha nosozlik. Birozdan keyin qayta urinib ko'ring.";
const AUTH_MSG = "Kirish muddati tugadi. Ilovani yopib, qayta oching.";

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown>) { super(message); }
}

let login: string | null = null; // Telegram'siz kirish: "login:MJ-12345:123456"
export const setLogin = (cred: string | null) => { login = cred; };
export const hasCredentials = () => DEMO || tg.inTelegram || !!login;

export async function api<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (DEMO) return (await import("./demo")).demoApi(action, payload) as Promise<T>; // 1-paket: faqat lokal sinovda yuklanadi
  if (!navigator.onLine) throw new ApiError(NET_MSG, 0, {});
  let r: Response;
  try {
    r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify({ initData: tg.initData || login || "", action, payload, v: 2 }),
    });
  } catch { throw new ApiError(NET_MSG, 0, {}); } // tarmoq uzildi (Failed to fetch)
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok || j.error) {
    const raw = String(j.error || "");
    if (r.status >= 500 && action !== "logErr") logErr("api", `${action}: ${r.status} ${raw}`.trim());
    const msg = r.status === 401 && /imzo/i.test(raw) ? AUTH_MSG : raw && !/^(Server xatosi|Internal|Error)/i.test(raw) ? raw : r.status >= 500 || !raw ? SRV_MSG : raw;
    throw new ApiError(msg, r.status, j);
  }
  return j as T;
}
