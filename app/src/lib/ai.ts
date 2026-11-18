// 18.11.2026: sun'iy intellekt tekshiruvi (server 22-versiya: aiSay / aiAnswer / aiSummary — bepul Gemini kaliti).
// Natija null — AI ishlamadi (internet yo'q, kunlik chegara tugadi, server xatosi): ilova avvalgidek ishlaydi — o'quvchi o'zi
// baholaydi yoki javob ustozga boradi. limit = true — bugungi bepul chegara tugagan.
import { api, ApiError } from "./api";
import { blobB64 } from "./kb";

export type AiFail = { fail: true; limit: boolean; msg: string };
const fail = (e: unknown): AiFail => ({ fail: true, limit: e instanceof ApiError && !!e.data?.limit, msg: e instanceof Error ? e.message : "AI javob bermadi" });
const audio = async (b: Blob) => ({ audio: await blobB64(b), mime: b.type || "audio/webm" });

export type SayRes = { pass: boolean; heard: string; tip: string };
/** so'z talaffuzi: o'quvchi «word» ni aytdimi */
export async function aiSay(b: Blob, word: string): Promise<SayRes | AiFail> {
  try { return await api<SayRes>("aiSay", { ...(await audio(b)), word }); } catch (e) { return fail(e); }
}

export type AnswerRes = { verdict: "ok" | "partial" | "no"; heard: string; feedback: string; fix: string };
/** matn bo'yicha savolga javob — yozma (text) yoki ovozli (b) */
export async function aiAnswer(o: { q: string; model?: string; ctx?: string; text?: string; b?: Blob }): Promise<AnswerRes | AiFail> {
  try {
    return await api<AnswerRes>("aiAnswer", { q: o.q, model: o.model || "", ctx: o.ctx || "", text: o.text || "", ...(o.b ? await audio(o.b) : {}) });
  } catch (e) { return fail(e); }
}

export type SummaryRes = { heard: string; content: number; language: number; fluency: number; total: number; feedback: string };
/** matn xulosasi (ovozli) — 10 ballik: mazmun 4 + til 3 + ravonlik 3 */
export async function aiSummary(b: Blob, ctx: string, title: string): Promise<SummaryRes | AiFail> {
  try { return await api<SummaryRes>("aiSummary", { ...(await audio(b)), ctx, title }); } catch (e) { return fail(e); }
}
export const isFail = (x: unknown): x is AiFail => !!x && typeof x === "object" && "fail" in x;
