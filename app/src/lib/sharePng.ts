// PNG rasmni ulashish yoki saqlash (ism kartasi, yutuq kartasi va h.k.) — Telegram ichida ham, brauzerda ham, imkon qadar.
// Tartib: tizimning ulashish oynasi (navigator.share, fayl bilan) → yuklab olish (<a download>). Hech qachon xato otmaydi.
// Muhim: navigator.share foydalanuvchi bosishidan keyin darhol chaqirilishi kerak — rasmni (Blob) oldindan tayyorlab qo'ying.
//   "shared" — ulashish oynasi ochildi (o'quvchi bekor qilgan bo'lishi ham mumkin);
//   "saved"  — fayl yuklab olishga berildi;
//   "failed" — ikkalasi ham imkonsiz (masalan Telegram'ning Android ilovasi): chaqiruvchi rasmni ekranda ko'rsatsin.
export type ShareResult = "shared" | "saved" | "failed";

type TgWin = { Telegram?: { WebApp?: { initData?: string; platform?: string } } };

/** Telegram'ning telefon ilovasi ichidamiz — u yerda <a download> ishlamaydi */
function tgMobile() {
  try {
    const w = (window as unknown as TgWin).Telegram?.WebApp;
    return !!w?.initData && /^(android|ios)/i.test(w.platform || "");
  } catch { return false; }
}

export async function sharePng(blob: Blob, fileName: string, caption: string): Promise<ShareResult> {
  const name = /\.png$/i.test(fileName) ? fileName : `${fileName}.png`;
  try {
    const file = new File([blob], name, { type: "image/png" });
    const data: ShareData = caption ? { files: [file], text: caption } : { files: [file] };
    if (typeof navigator.share === "function" && navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
        return "shared";
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return "shared"; // o'quvchi o'zi yopdi
        // boshqa xato (ruxsat, tarmoq) — yuklab olishga o'tamiz
      }
    }
  } catch { /* File yoki canShare yo'q */ }
  if (tgMobile()) return "failed";
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "saved";
  } catch {
    return "failed";
  }
}
