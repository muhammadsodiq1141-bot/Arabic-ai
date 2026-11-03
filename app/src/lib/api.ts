// Server bilan aloqa: eski ilova bilan bir xil manzil va format ({initData, action, payload}) + "v: 2" belgisi
// (server yangi ilovaga kirishni faqat bosh admin tasdig'i bilan beradi).
import { API_KEY, API_URL } from "./config";
import { tg } from "./tg";
import { DEMO, demoApi } from "./demo";

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown>) { super(message); }
}

let login: string | null = null; // Telegram'siz kirish: "login:MJ-12345:123456"
export const setLogin = (cred: string | null) => { login = cred; };
export const hasCredentials = () => DEMO || tg.inTelegram || !!login;

export async function api<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (DEMO) return demoApi(action, payload) as Promise<T>;
  if (!navigator.onLine) throw new ApiError("Internet yo'q", 0, {});
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: API_KEY },
    body: JSON.stringify({ initData: tg.initData || login || "", action, payload, v: 2 }),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok || j.error) throw new ApiError(String(j.error || `Server xatosi (${r.status})`), r.status, j);
  return j as T;
}
