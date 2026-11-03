import { NavProvider } from "./state/nav";
import { SessionProvider, useSession } from "./state/session";
import { useTheme } from "./state/theme";
import { usePrivacy, Watermark } from "./ui/Guard";
import { Logo } from "./ui/kit";
import { NoAuth, Pending, Problem, Register, Rejected } from "./screens/Gate";
import { Main } from "./screens/Main";

function Gate() {
  const { phase, me } = useSession();
  if (phase === "loading") return <main className="gate"><Logo size={88} /><p className="muted">Yuklanmoqda…</p></main>;
  if (phase === "noauth") return <NoAuth />;
  if (phase === "register") return <Register />;
  if (phase === "pending") return <Pending />;
  if (phase === "rejected") return <Rejected />;
  if (phase === "error") return <Problem />;
  return (
    <NavProvider>
      <Main />
      <Watermark name={me?.full_name || me?.name || ""} login={me?.login || null} />
    </NavProvider>
  );
}

export function App() {
  useTheme();
  usePrivacy();
  return (
    <SessionProvider>
      <div className="app"><Gate /></div>
    </SessionProvider>
  );
}
