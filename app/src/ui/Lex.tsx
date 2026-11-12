// 2-paket (20-partiya): o'qishda yordam — bosiladigan so'zlar, so'z oynasi, «siz bilgan so'zlar» belgisi va o'qishdan oldingi so'zlar.
import { Fragment, useState } from "react";
import { BookOpenCheck, Check, Plus, Volume2 } from "lucide-react";
import { say } from "../lib/audio";
import { covLabel, inSrs, srcLabel, type Cover, type LexE } from "../lib/lex";
import { learnLater } from "../lib/practice";
import { savedHas, toggleSaved } from "../lib/saved";
import { tg } from "../lib/tg";
import { Ar } from "./kit";
import { toast } from "./Toast";

const AR_WORD = /([ء-يً-ْٰـ]+)/;
/** arabcha gap — har so'zi alohida tugma (tinish belgilari va bo'shliqlar o'z joyida) */
export function TapText({ text, onWord }: { text: string; onWord: (w: string) => void }) {
  return (
    <>
      {text.split(AR_WORD).map((p, i) => (i % 2
        ? <button key={i} type="button" className="tw" onClick={(e) => { e.stopPropagation(); onWord(p); }}>{p}</button>
        : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

/** «Siz bilgan so'zlar: ~92% · mos»; qiyin matnda — «Avval 5 ta so'z» */
export function CoverBar({ cov, onPre }: { cov: Cover; onPre: () => void }) {
  const l = covLabel(cov.pct);
  return (
    <div className="cov">
      <span><b>~{cov.pct}%</b> so'zni bilasiz <i className={`cov-l cov-${l === "oson" ? "ok" : l === "mos" ? "mid" : "hard"}`}>{l}</i></span>
      {l === "qiyin" && cov.unknown.length > 0 && (
        <button type="button" className="btn ghost sm" onClick={onPre}><BookOpenCheck size={16} aria-hidden />Avval {Math.min(5, cov.unknown.length)} ta so'z</button>
      )}
    </div>
  );
}

function AddBtn({ e }: { e: LexE }) {
  const [on, setOn] = useState(() => inSrs(e) || savedHas(e.ar));
  if (e.b === "core") return null;
  // 12.11: qo'shimcha lug'at so'zi biror kitob vahdasiga bog'lanmagan — takrorlashga emas, faqat «Saqlanganlar»ga
  if (e.b === "qosh") return savedHas(e.ar) || on
    ? <button type="button" className="btn ghost" disabled><Check size={18} aria-hidden />Saqlangan</button>
    : <button type="button" className="btn primary" onClick={() => { toggleSaved(e.ar, e.uz); setOn(true); tg.haptic("success"); toast("Saqlangan so'zlarga qo'shildi"); }}><Plus size={18} aria-hidden />Saqlash</button>;
  return on
    ? <button type="button" className="btn ghost" disabled><Check size={18} aria-hidden />Takrorlashda bor</button>
    : (
      <button type="button" className="btn primary" onClick={() => {
        learnLater(e.b, [e.ar]);
        if (!savedHas(e.ar)) toggleSaved(e.ar, e.uz);
        setOn(true); tg.haptic("success"); toast("Takrorlashga va saqlangan so'zlarga qo'shildi");
      }}><Plus size={18} aria-hidden />Takrorlashga</button>
    );
}

/** bosilgan so'z: lug'atdagi shakli, tarjimasi, qaysi kitobdan; topilmasa — ochiq aytiladi */
export function WordPop({ w, e, onClose }: { w: string; e: LexE | null; onClose: () => void }) {
  return (
    <div className="mpop" role="dialog" aria-modal="true" aria-label="So'z tarjimasi" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="mpopc">
        <Ar className="mp-w">{w}</Ar>
        {e ? (
          <>
            <b>{e.uz}</b>
            {e.ar.replace(/[ً-ْٰ]/g, "") !== w.replace(/[ً-ْٰ]/g, "") && <Ar className="mp-ar">{e.ar}</Ar>}
            <small className="mp-src">{srcLabel(e)}</small>
            <div className="row2">
              <button type="button" className="btn ghost" onClick={() => void say(e.ar)}><Volume2 size={18} aria-hidden />Tinglash</button>
              <AddBtn key={e.ar} e={e} />
            </div>
          </>
        ) : (
          <p className="mp-none">Bu so'z ilova lug'atida yo'q. Gap tarjimasidan yoki ustozingizdan bilib oling.</p>
        )}
        <button type="button" className="btn ghost wide" onClick={onClose}>Yopish</button>
      </div>
    </div>
  );
}

/** o'qishdan oldin: matndagi eng ko'p uchraydigan notanish so'zlar (Nation: qiyin matndan oldin 5–6 so'z) */
export function PreWords({ list, onClose }: { list: LexE[]; onClose: () => void }) {
  return (
    <div className="mpop" role="dialog" aria-modal="true" aria-label="O'qishdan oldin so'zlar" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="mpopc pre">
        <b>O'qishdan oldin shu so'zlarni ko'rib oling</b>
        <small className="mp-src">Matnda ko'p uchraydi, siz hali o'rganmagansiz</small>
        <ul className="pre-l">
          {list.map((e) => (
            <li key={e.ar}>
              <button type="button" className="say sm" aria-label="Tinglash" onClick={() => void say(e.ar)}><Volume2 size={18} aria-hidden /></button>
              <Ar className="pre-ar">{e.ar}</Ar>
              <span>{e.uz}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn primary wide" onClick={onClose}>Matnni o'qish</button>
      </div>
    </div>
  );
}
