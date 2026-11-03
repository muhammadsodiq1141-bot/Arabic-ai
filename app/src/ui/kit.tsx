// Umumiy interfeys qismlari: Orqaga tugmasi, ekran sarlavhasi, bo'lim nomi (arabcha + o'zbekcha), pastki menyu, logo, avatar.
import type { ReactNode } from "react";
import { BookOpen, ChevronLeft, ClipboardCheck, House, Mic, UserRound } from "lucide-react";
import { useNav, type Tab } from "../state/nav";
import { tg } from "../lib/tg";

export function Ar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`ar ${className}`} dir="rtl" lang="ar">{children}</span>;
}

export function BackButton({ onClick }: { onClick?: () => void }) {
  const { back } = useNav();
  return (
    <button type="button" className="back" onClick={() => { tg.haptic(); (onClick || back)(); }} aria-label="Orqaga">
      <ChevronLeft aria-hidden size={24} strokeWidth={2.6} />Orqaga
    </button>
  );
}

export function ScreenHeader({ title, ar, actions, onBack }: { title: string; ar?: string; actions?: ReactNode; onBack?: () => void }) {
  return (
    <header className="shead">
      <div className="shead-row"><BackButton onClick={onBack} /><span className="sp" />{actions}</div>
      <h1 className="stitle">{title}</h1>
      {ar && <Ar className="stitle-ar">{ar}</Ar>}
    </header>
  );
}

export function SectionTitle({ ar, uz, right }: { ar: string; uz: string; right?: ReactNode }) {
  return (
    <div className="sect">
      <div><Ar className="sect-ar">{ar}</Ar><div className="sect-uz">{uz}</div></div>
      {right}
    </div>
  );
}

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: "home", label: "Asosiy", Icon: House },
  { id: "lessons", label: "Darslar", Icon: BookOpen },
  { id: "practice", label: "Mashq", Icon: Mic },
  { id: "marks", label: "Baholar", Icon: ClipboardCheck },
  { id: "profile", label: "Profil", Icon: UserRound },
];

export function BottomNav() {
  const { tab, setTab } = useNav();
  return (
    <nav className="bnav" aria-label="Asosiy menyu">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={id === tab ? "on" : ""} aria-current={id === tab ? "page" : undefined}
          onClick={() => { tg.haptic(); setTab(id); }}>
          <Icon aria-hidden size={26} strokeWidth={2.2} />{label}
        </button>
      ))}
    </nav>
  );
}

export function Avatar({ name, photo, size = 52 }: { name: string; photo?: string; size?: number }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return photo
    ? <img className="ava" src={photo} alt="" width={size} height={size} draggable={false} />
    : <span className="ava" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden>{ini}</span>;
}

export function Logo({ size = 112 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Mezon">
      <circle cx="60" cy="60" r="60" fill="var(--hero)" />
      <path d="M60 30V86" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 92h32l-4-6H48z" fill="var(--gold)" />
      <circle cx="60" cy="28" r="4.5" fill="var(--gold)" />
      <path d="M26 38H94" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 38L16 66M26 38L36 66M94 38L84 66M94 38L104 66" stroke="var(--gold)" strokeWidth="1.6" />
      <path d="M14 66q12 12 24 0z" fill="var(--gold)" />
      <path d="M82 66q12 12 24 0z" fill="var(--gold)" />
      <text x="26" y="62" textAnchor="middle" fontFamily="Noto Naskh Arabic, serif" fontSize="17" fontWeight="700" fill="var(--hero-ink)">ع</text>
      <text x="94" y="62" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="14" fontWeight="800" fill="var(--hero-ink)">a</text>
    </svg>
  );
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="empty">
      <span className="empty-ico" aria-hidden>{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
