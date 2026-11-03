import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Yangi ilova /v2/ papkasiga yig'iladi (GitHub Pages: .../Arabic-ai/v2/), eski ilova ildizda qoladi.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "../v2", emptyOutDir: true, target: "es2020", sourcemap: false },
  server: { host: "127.0.0.1", port: 5173 },
  preview: { host: "127.0.0.1", port: 4173 },
});
