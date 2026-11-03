import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { accountSwitch } from "./lib/store";
import { initTelegram } from "./lib/tg";
import "./styles.css";

initTelegram();
accountSwitch(); // eski ilova bilan bir xil: bitta telefonda bir nechta akkaunt progressi aralashmaydi
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
