// Bosh admin paneli: umumiy raqamlar (adminOverview), kirish so'rovlari, ustozlik so'rovlari va ustozlar (adminTeachers, adminSetTeacher),
// foydalanuvchilar ro'yxati (adminUsers), guruhlar (bosilsa — guruh paneli), kitob audiosini yuklash (kitobPut, kitobCount).
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, FileAudio, GraduationCap, Search, UserCheck, Users, X } from "lucide-react";
import { api } from "../lib/api";
import { weekId } from "../lib/progress";
import { tg } from "../lib/tg";
import { useNav } from "../state/nav";
import { useArm } from "../ui/arm";
import { Avatar, Empty, ScreenHeader } from "../ui/kit";
import { toast } from "../ui/Toast";

type Totals = { students: number; teachers: number; groups: number; today: number; week: number; newWeek: number; noGroup: number; xp: number };
type OGroup = { code: string; title: string; teacher: string; n: number; today: number; week: number; xp: number; words: number };
type Overview = { totals: Totals; levels: Record<string, number>; teachers: { name: string; groups: number; n: number; week: number; last: string | null }[]; groups: OGroup[] };
type TRow = { id: string; name: string; login: string; level: string; at: string | null; note: string; byGroup?: boolean };
type URow = { tg: number | null; name: string; full: string; user: string; level: string; group: string; teacher: boolean; seen: string | null; at: string | null; words: number | null };

const ago = (t: string | null) => {
  if (!t) return "—";
  const m = Math.round((Date.now() - new Date(t).getTime()) / 6e4);
  return m < 60 ? `${Math.max(1, m)} daq. oldin` : m < 1440 ? `${Math.round(m / 60)} soat oldin` : m < 2880 ? "kecha" : `${Math.round(m / 1440)} kun oldin`;
};
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function AdminScreen() {
  const { go } = useNav();
  const [o, setO] = useState<Overview | null | "err">(null);
  const [req, setReq] = useState<number | null>(null);
  const [treq, setTreq] = useState<number | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    api<Overview>("adminOverview", { week: weekId() }).then(setO).catch(() => setO("err"));
    api<{ items: unknown[] }>("adminRequests", { status: "pending" }).then((r) => setReq(r.items.length)).catch(() => setReq(null));
    api<{ requests: unknown[] }>("adminTeachers").then((r) => setTreq(r.requests.length)).catch(() => setTreq(null));
  }, []);
  const t = o && o !== "err" ? o.totals : null;
  const groups = o && o !== "err" ? o.groups.filter((g) => !q.trim() || `${g.title} ${g.teacher} ${g.code}`.toLowerCase().includes(q.trim().toLowerCase())) : [];
  const lv = o && o !== "err" ? Object.entries(o.levels).sort((a, b) => a[0].localeCompare(b[0])) : [];
  const lvMax = Math.max(1, ...lv.map((x) => x[1]));
  return (
    <main className="screen">
      <ScreenHeader title="Admin paneli" ar="لَوْحَةُ الْإِدَارَةِ" />
      {o === "err" && <p className="err">Umumiy ma'lumot yuklanmadi. Internetni tekshiring.</p>}
      <section className="ad-stats" aria-label="Umumiy raqamlar">
        {([["O'quvchi", t?.students], ["Bugun faol", t?.today], ["Hafta faol", t?.week], ["Ustoz", t?.teachers], ["Guruh", t?.groups], ["Yangi · 7 kun", t?.newWeek]] as [string, number | undefined][])
          .map(([l, v]) => <div key={l}><b>{v ?? "…"}</b><span>{l}</span></div>)}
      </section>
      {t && t.noGroup > 0 && <p className="pf-hint">{t.noGroup} ta o'quvchi hali guruhsiz.</p>}

      <button type="button" className={`rowbtn ${req ? "t-subs has" : ""}`} onClick={() => go("adminRequests")}>
        <UserCheck size={24} aria-hidden /><span><b>Kirish so'rovlari</b><small>{req === null ? "Yangi ilovaga kirishni tasdiqlash" : req ? `${req} ta odam tasdiq kutmoqda` : "Kutayotgan yo'q"}</small></span>
        {!!req && <em className="t-badge">{req}</em>}<ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className={`rowbtn ${treq ? "t-subs has" : ""}`} onClick={() => go("ateachers")}>
        <GraduationCap size={24} aria-hidden /><span><b>Ustozlar</b><small>{treq ? `${treq} ta ustozlik so'rovi` : "So'rovlar va ruxsatlar"}</small></span>
        {!!treq && <em className="t-badge">{treq}</em>}<ChevronRight size={20} aria-hidden />
      </button>
      <button type="button" className="rowbtn" onClick={() => go("ausers")}>
        <Users size={24} aria-hidden /><span><b>Foydalanuvchilar</b><small>Ilovaga kirganlar · qidiruv va filtr</small></span><ChevronRight size={20} aria-hidden />
      </button>

      {lv.length > 0 && (
        <section className="card lt-per ad-lv">
          <b>Darajalar bo'yicha o'quvchilar</b>
          {lv.map(([l, n]) => (
            <div key={l}><span>{l}</span><span className="lt-bar" aria-hidden><i className="ok" style={{ width: `${(n / lvMax) * 100}%` }} /></span><b>{n}</b></div>
          ))}
        </section>
      )}

      <h2 className="t-h">Guruhlar{o && o !== "err" ? <small>{o.groups.length} ta</small> : null}</h2>
      <label className="ad-search"><Search size={18} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guruh, ustoz yoki kod" aria-label="Guruh qidirish" /></label>
      {o === null && <div className="lg-skel" aria-label="Yuklanmoqda">{[0, 1, 2].map((k) => <span key={k} />)}</div>}
      <ul className="slist">
        {groups.map((g) => (
          <li key={g.code}>
            <button type="button" className="srow ad-g" onClick={() => go("teacher", { code: g.code, title: g.title })}>
              <span className="st"><b>{g.title}</b><span>{g.teacher} · {g.code}</span><span>{g.n} o'quvchi · hafta faol {g.week} · o'rtacha {g.words} so'z</span></span>
              <ChevronRight size={20} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {o && o !== "err" && !groups.length && <p className="muted pad">{q ? "Topilmadi." : "Hali guruh yo'q."}</p>}

      <h2 className="t-h">Kitob audiosi</h2>
      <AudioUpload />
    </main>
  );
}

// ===== Ustozlik so'rovlari va ustozlar =====
export function AdminTeachersScreen() {
  const [d, setD] = useState<{ requests: TRow[]; teachers: TRow[] } | null | "err">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { armed, fire } = useArm();
  const load = () => api<{ requests: TRow[]; teachers: TRow[] }>("adminTeachers").then(setD).catch(() => setD("err"));
  useEffect(() => { void load(); }, []);
  const set = async (r: TRow, on: boolean) => {
    if (!on && !fire(r.id)) return;
    setBusy(r.id);
    try { await api("adminSetTeacher", { sid: r.id, on }); tg.haptic(on ? "success" : "light"); toast(on ? `${r.name} — endi ustoz` : "Bajarildi"); await load(); }
    catch (e) { toast(errText(e)); }
    setBusy(null);
  };
  return (
    <main className="screen">
      <ScreenHeader title="Ustozlar" ar="الْمُعَلِّمُونَ" />
      {d === null && <p className="muted pad">Yuklanmoqda…</p>}
      {d === "err" && <p className="err">Ro'yxat yuklanmadi. Internetni tekshiring.</p>}
      {d && d !== "err" && (
        <>
          <h2 className="t-h first">Ustozlik so'rovlari<small>{d.requests.length} ta</small></h2>
          {!d.requests.length && <p className="muted pad">Yangi so'rov yo'q.</p>}
          <ul className="slist">
            {d.requests.map((r) => (
              <li key={r.id} className="srow ad-req">
                <Avatar name={r.name} size={44} />
                <span className="st"><b>{r.name}</b><span>{[r.login, r.level, ago(r.at)].filter(Boolean).join(" · ")}</span>{r.note && <span className="ad-note">«{r.note}»</span>}</span>
                <span className="ad-btns">
                  <button type="button" className="ibtn ok" disabled={busy === r.id} aria-label={`${r.name}ni ustoz qilish`} onClick={() => void set(r, true)}><Check size={20} aria-hidden /></button>
                  <button type="button" className={`ibtn no ${armed === r.id ? "armed" : ""}`} disabled={busy === r.id} aria-label={armed === r.id ? "Rad etishni tasdiqlash: yana bosing" : `${r.name} so'rovini rad etish`} onClick={() => void set(r, false)}><X size={20} aria-hidden /></button>
                </span>
              </li>
            ))}
          </ul>
          <h2 className="t-h">Ustozlar<small>{d.teachers.length} ta</small></h2>
          {!d.teachers.length && <p className="muted pad">Hali ustoz yo'q.</p>}
          <ul className="slist">
            {d.teachers.map((r) => (
              <li key={r.id} className="srow ad-req">
                <Avatar name={r.name} size={44} />
                <span className="st"><b>{r.name}</b><span>{[r.login, r.level].filter(Boolean).join(" · ")}{r.byGroup ? " · guruh egasi" : ""}</span></span>
                {!r.byGroup && (
                  <button type="button" className={`btn ghost bad sm ${armed === r.id ? "armed" : ""}`} disabled={busy === r.id} onClick={() => void set(r, false)}>
                    {armed === r.id ? "Yana bosing" : "Ruxsatni olish"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="pf-hint">Guruh egasi bo'lgan ustozning ruxsati guruhi bor ekan saqlanadi — uni guruhini o'chirish orqali olish mumkin.</p>
        </>
      )}
    </main>
  );
}

// ===== Foydalanuvchilar =====
type UF = "all" | "today" | "new" | "nogroup" | "teachers";
const UF_L: [UF, string][] = [["all", "Hammasi"], ["today", "Bugun"], ["new", "Yangi"], ["nogroup", "Guruhsiz"], ["teachers", "Ustozlar"]];

export function AdminUsersScreen() {
  const [list, setList] = useState<URow[] | null | "err">(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState<UF>("all");
  const [open, setOpen] = useState<URow | null>(null);
  useEffect(() => { api<{ users: URow[] }>("adminUsers").then((r) => setList(r.users || [])).catch(() => setList("err")); }, []);
  const shown = useMemo(() => {
    if (!list || list === "err") return [];
    const s = q.trim().toLowerCase().replace(/^@/, "");
    const day = (t: string | null) => (t ? (Date.now() - new Date(t).getTime()) / 864e5 : 1e9);
    return list.filter((u) => (f === "all" || (f === "today" && day(u.seen) < 1) || (f === "new" && day(u.at) < 7) || (f === "nogroup" && !u.group) || (f === "teachers" && u.teacher))
      && (!s || `${u.full} ${u.name} ${u.user} ${u.group}`.toLowerCase().includes(s)));
  }, [list, q, f]);
  const tap = (u: URow) => { if (u.user) tg.openLink(`https://t.me/${u.user}`); else setOpen(u); };
  return (
    <main className="screen">
      <ScreenHeader title="Foydalanuvchilar" ar="الْمُسْتَخْدِمُونَ" />
      <label className="ad-search"><Search size={18} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, @username yoki guruh" aria-label="Foydalanuvchi qidirish" /></label>
      <div className="chips" role="group" aria-label="Filtr">
        {UF_L.map(([k, l]) => <button key={k} type="button" className={f === k ? "on" : ""} aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>)}
      </div>
      {list === null && <p className="muted pad">Yuklanmoqda…</p>}
      {list === "err" && <p className="err">Ro'yxat yuklanmadi. Internetni tekshiring.</p>}
      {list && list !== "err" && <p className="saved-n">{shown.length} ta{shown.length > 300 ? " · birinchi 300 tasi ko'rsatilgan" : ""}</p>}
      {list && list !== "err" && !shown.length && <Empty icon={<Users size={28} />} title="Topilmadi" text="Qidiruv yoki filtrni o'zgartirib ko'ring." />}
      <ul className="slist">
        {shown.slice(0, 300).map((u, i) => (
          <li key={`${u.tg}-${i}`}>
            <button type="button" className="srow ad-u" onClick={() => tap(u)}>
              <Avatar name={u.full || u.name} size={40} />
              <span className="st"><b>{u.full || u.name || "—"}{u.teacher ? " · ustoz" : ""}</b><span>{[u.user && `@${u.user}`, u.level, u.group || "guruhsiz"].filter(Boolean).join(" · ")}</span><span>{ago(u.seen)}{u.words !== null ? ` · ${u.words} so'z` : ""}</span></span>
              <ChevronRight size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div className="mpop" role="dialog" aria-modal="true" aria-label="Foydalanuvchi" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="mpopc ad-sheet">
            <Avatar name={open.full || open.name} size={56} />
            <b>{open.full || open.name || "—"}</b>
            <dl>
              <div><dt>Telegram'dagi ismi</dt><dd>{open.name || "—"}</dd></div>
              <div><dt>Telegram ID</dt><dd>{open.tg ?? "—"}</dd></div>
              <div><dt>Daraja</dt><dd>{open.level || "—"}</dd></div>
              <div><dt>Guruh</dt><dd>{open.group || "guruhsiz"}</dd></div>
              <div><dt>Roli</dt><dd>{open.teacher ? "ustoz" : "o'quvchi"}</dd></div>
              <div><dt>Birinchi kirgan</dt><dd>{open.at ? new Date(open.at).toLocaleDateString("uz-UZ") : "—"}</dd></div>
              <div><dt>Oxirgi faollik</dt><dd>{ago(open.seen)}</dd></div>
              <div><dt>O'rgangan so'zlari</dt><dd>{open.words ?? "—"}</dd></div>
            </dl>
            <div className="row2">
              <button type="button" className="btn ghost" onClick={() => setOpen(null)}>Yopish</button>
              <button type="button" className="btn primary" disabled={!open.tg} onClick={() => { window.location.href = `tg://user?id=${open.tg}`; }}>Telegram profili</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ===== Kitob audiosi: zip yoki <sha1>.mp3 fayllar → yopiq "kitob" ombori (10 tadan, 3 urinish) =====
type KFile = { name: string; u8?: Uint8Array; file?: File };
const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000))); return btoa(s); };
const MP3 = /^[0-9a-f]{40}\.mp3$/;

async function unzip(file: File): Promise<KFile[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let e = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("Zip fayl buzilgan");
  const cnt = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const out: KFile[] = [];
  for (let k = 0; k < cnt; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const meth = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = (new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl)).split("/").pop() || "").toLowerCase();
    p += 46 + nl + xl + cl;
    if (!MP3.test(name)) continue;
    const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    let data = buf.subarray(ds, ds + cs);
    if (meth === 8) {
      if (typeof DecompressionStream === "undefined") throw new Error("Bu telefon zipni ocha olmadi");
      data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    } else if (meth !== 0) continue;
    out.push({ name, u8: data });
  }
  return out;
}
const readOne = async (f: KFile) => {
  if (f.u8) return { name: f.name, b64: b64(f.u8) };
  if (!f.file) return null;
  try { return { name: f.name, b64: b64(new Uint8Array(await f.file.arrayBuffer())) }; } catch { return null; }
};

function AudioUpload() {
  const [rep, setRep] = useState(false);
  const [run, setRun] = useState<{ done: number; tot: number } | null>(null);
  const [res, setRes] = useState<{ up: number; skip: number; bad: number; rep: boolean } | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [cBusy, setCBusy] = useState(false);
  const start = async (list: FileList) => {
    const F: KFile[] = [];
    try {
      for (const f of Array.from(list)) {
        if (/\.zip$/i.test(f.name) || f.type === "application/zip") { toast("Zip ochilmoqda…"); F.push(...await unzip(f)); }
        else if (MP3.test(f.name.toLowerCase())) F.push({ name: f.name.toLowerCase(), file: f });
      }
    } catch (e) { toast(errText(e) || "Zip ochilmadi"); return; }
    if (!F.length) { toast("Mos audio topilmadi: fayl nomi <sha1>.mp3 bo'lishi kerak"); return; }
    const r = { up: 0, skip: 0, bad: 0, rep };
    setRes(null); setRun({ done: 0, tot: F.length });
    for (let i = 0; i < F.length; i += 10) {
      const part = (await Promise.all(F.slice(i, i + 10).map(readOne))).filter(Boolean);
      for (let tries = 0; ; tries++) {
        try { const j = await api<{ up: number; skip: number; bad: number }>("kitobPut", { files: part, replace: rep }); r.up += j.up; r.skip += j.skip; r.bad += j.bad; break; }
        catch { if (tries >= 2) { r.bad += part.length; break; } await new Promise((ok) => setTimeout(ok, 1500)); }
      }
      setRun({ done: Math.min(F.length, i + 10), tot: F.length });
    }
    setRun(null); setRep(false); setRes(r); toast("Yuklash tugadi"); tg.haptic("success");
  };
  const countNow = async () => {
    setCBusy(true);
    try { const j = await api<{ n: number }>("kitobCount"); setCount(j.n); } catch (e) { toast(errText(e)); }
    setCBusy(false);
  };
  return (
    <section className="card ad-kup">
      <p>Telegram'dan yuklab olingan <b>zip faylni</b> tanlang — ochish shart emas. Ilova ichidagi audiolarni yopiq omborga o'zi yuklaydi;
        {rep ? " nomi bir xil fayllar yangisiga almashtiriladi." : " bor fayllar o'tkazib yuboriladi."}</p>
      {run ? (
        <div className="ad-run" role="status">
          <span className="lt-bar"><i className="ok" style={{ width: `${Math.round((run.done / run.tot) * 100)}%` }} /></span>
          <small>{run.done} / {run.tot} · yuklanmoqda, ilovani yopmang</small>
        </div>
      ) : (
        <>
          <label className="sh-switch ad-rep">
            <span><b>Bor fayllarni almashtirish</b><small>Tozalangan audio yuborilganda yoqing</small></span>
            <input type="checkbox" checked={rep} onChange={(e) => setRep(e.target.checked)} />
          </label>
          <label className="btn primary wide ad-pick">
            <FileAudio size={18} aria-hidden />Zip yoki mp3 tanlash
            <input type="file" accept=".zip,application/zip,.mp3,audio/mpeg" multiple hidden onChange={(e) => { if (e.target.files?.length) void start(e.target.files); e.target.value = ""; }} />
          </label>
        </>
      )}
      {res && (
        <p className="ad-res" role="status">
          {res.rep ? <>Almashtirildi: <b>{res.up}</b>{res.skip ? <> · almashtirilmadi: <b>{res.skip}</b></> : null}</> : <>Yangi: <b>{res.up}</b> · bor edi: <b>{res.skip}</b></>}
          {res.bad ? <> · xato: <b className="bad">{res.bad}</b></> : null}
        </p>
      )}
      <button type="button" className="btn ghost wide" disabled={cBusy} onClick={() => void countNow()}>{count === null ? "Omborda nechta fayl bor?" : `Omborda: ${count} ta audio`}</button>
    </section>
  );
}
