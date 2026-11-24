// 24.11.2026 (api 27, U3): oldingi urinishlar — yig'ma blok (javob matni, o'quvchi ovozi, o'sha urinishdagi ustoz izohi va ovozi).
// Ustoz kartasida (TeacherSubs) va o'quvchining «Ustoz izohlari»da (Marks) bir xil; me — o'quvchi ko'rinishi (yorliqlar).
import { History, PenLine, ThumbsUp } from "lucide-react";
import { autoText, dateUz, fmtSec, pureAr, splitAiText, type Try } from "../lib/subs";
import { Ar } from "./kit";
import { MixedText } from "./Mixed";
import { SubVoice } from "./SubVoice";

export function Tries({ id, tries, me }: { id: number; tries: Try[]; me?: boolean }) {
  if (!tries.length) return null;
  const L = [...tries].sort((a, b) => b.n - a.n);
  return (
    <details className="tr-box">
      <summary><History size={16} aria-hidden />{L.length > 1 ? `Oldingi urinishlar (${L.length})` : "Oldingi urinish"}</summary>
      {L.map((t) => {
        const own = splitAiText(t.text).own;
        return (
          <div key={t.n} className="tr-i">
            <b className="tr-n">{t.n}-urinish{t.at ? ` · ${dateUz(t.at)}` : ""}</b>
            {own && !autoText(own) && (pureAr(own) ? <Ar className="tr-ar">{own}</Ar> : <p className="tr-txt"><MixedText text={own} /></p>)}
            {t.audio && <SubVoice id={id} tr={t.n} label={me ? "Mening ovozim" : "O'quvchi ovozi"} />}
            {t.praise && <p className="tr-l"><ThumbsUp size={15} aria-hidden /><span><MixedText text={t.praise} /></span></p>}
            {t.fix && <p className="tr-l fix"><PenLine size={15} aria-hidden /><span><MixedText text={t.fix} /></span></p>}
            {!!t.tags?.length && <span className="tr-tags">{t.tags.join(" · ")}</span>}
            {t.t_audio && <SubVoice id={id} t tr={t.n} label={`${me ? "Ustoz ovozi" : "Izohingiz"}${t.t_sec ? ` · ${fmtSec(t.t_sec)}` : ""}`} />}
          </div>
        );
      })}
    </details>
  );
}
