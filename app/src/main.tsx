import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { accountSwitch } from "./lib/store";
import { initTelegram } from "./lib/tg";
import { initErrLog } from "./lib/errlog";
import { initBoard } from "./lib/board";
import "./styles.css";

initErrLog(); // 1-paket: xatolar jurnali
initBoard(); // 14.11.2026: doska / katta ekranda ilova o'zi kattalashadi
initTelegram();
accountSwitch(); // eski ilova bilan bir xil: bitta telefonda bir nechta akkaunt progressi aralashmaydi
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 10.11.2026: sinov nusxasi (v2-sinov/, VITE_KANAL=sinov bilan yig'iladi) — burchakda «SINOV» belgisi, o'quvchilar nusxasida yo'q
if (import.meta.env.VITE_KANAL === "sinov") {
  const b = document.createElement("div");
  b.className = "beta-pill"; b.textContent = "SINOV"; b.setAttribute("aria-hidden", "true");
  document.body.appendChild(b);
  document.title = "SINOV · " + document.title;
}
