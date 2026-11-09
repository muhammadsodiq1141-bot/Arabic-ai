// 1-paket: ekranda kutilmagan xato bo'lsa — oq ekran o'rniga tushunarli xabar va «Qayta yuklash»; xato jurnalga yoziladi.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { logErr } from "../lib/errlog";

type P = { children: ReactNode; resetKey?: string };
type S = { err: Error | null; key?: string };

export class ErrorBoundary extends Component<P, S> {
  state: S = { err: null, key: this.props.resetKey };
  static getDerivedStateFromError(err: Error) { return { err }; }
  static getDerivedStateFromProps(p: P, s: S) { return p.resetKey !== s.key ? { err: null, key: p.resetKey } : null; }
  componentDidCatch(err: Error, info: ErrorInfo) { logErr("react", err, `${err.stack || ""}\n${info.componentStack || ""}`); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <main className="screen eb">
        <section className="card eb-card" role="alert">
          <b>Bu ekranda nosozlik chiqdi</b>
          <p>Natijalaringiz saqlangan. Xato haqida ma'lumot bizga yuborildi — tez orada tuzatamiz.</p>
          <button type="button" className="btn primary wide" onClick={() => location.reload()}><RotateCcw size={18} aria-hidden />Qayta yuklash</button>
          <button type="button" className="btn ghost wide" onClick={() => { history.back(); this.setState({ err: null }); }}>Orqaga qaytish</button>
        </section>
      </main>
    );
  }
}
