// Javob ovozini tinglash: o'quvchi ovozi yoki (t) ustozning ovozli izohi — server «subAudio» 1 soatlik havola beradi (24.11.2026, api 25).
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "./Toast";

export function SubVoice({ id, t, label, className = "" }: { id: number; t?: boolean; label: string; className?: string }) {
  const [st, setSt] = useState<"idle" | "load" | "play">("idle");
  const a = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { a.current?.pause(); }, []);
  const toggle = async () => {
    if (st === "play") { a.current?.pause(); setSt("idle"); return; }
    setSt("load");
    try {
      if (!a.current) {
        const r = await api<{ url: string }>("subAudio", { id, ...(t ? { t: true } : {}) });
        a.current = new Audio(r.url);
        a.current.onended = () => setSt("idle");
      }
      await a.current.play(); setSt("play");
    } catch (e) { setSt("idle"); toast(e instanceof Error ? e.message : "Ovoz ochilmadi"); }
  };
  return (
    <button type="button" className={`btn ghost sv-btn ${className}`} onClick={() => void toggle()} disabled={st === "load"} aria-pressed={st === "play"}>
      {st === "play" ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}{st === "load" ? "Yuklanmoqda…" : st === "play" ? "To'xtatish" : label}
    </button>
  );
}
