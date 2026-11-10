// 3-paket 3-qism: bosh sahifadagi «Qo'shimcha vazifa» kartasi — yengil fayl (vazifa ekrani va ovoz yozish alohida yuklanadi).
import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { api } from "../lib/api";
import { dueText } from "../lib/next";
import { fmtDay, type XTask } from "../lib/xtask";
import { useNav } from "../state/nav";

/** topshirilmagan eng yaqin vazifa; topshirilmagani bo'lmasa — hech narsa ko'rinmaydi */
export function XHomeCard() {
  const { go } = useNav();
  const [items, setItems] = useState<XTask[] | null>(null);
  useEffect(() => {
    let alive = true;
    api<{ items: XTask[] }>("xList")
      .then((r) => alive && setItems((r.items || []).filter((x) => !x.teacher && !x.mine).sort((a, b) => a.due.localeCompare(b.due))))
      .catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, []);
  if (!items?.length) return null;
  const x = items[0];
  return (
    <button type="button" className="rowbtn xh" onClick={() => go("xtask", { id: x.id })}>
      <span className="xt-ic" aria-hidden>{x.html ? "HTML" : <Paperclip size={18} />}</span>
      <span>
        <small className="xh-k">Qo'shimcha vazifa{items.length > 1 ? ` · yana ${items.length - 1} ta` : ""}</small>
        <b>{x.title}</b>
        <small>{dueText(x.due)} · {fmtDay(x.due)}{x.coins5 ? ` · 5 baho uchun ${x.coins5.toLocaleString("ru-RU")} tanga` : ""}</small>
      </span>
    </button>
  );
}
