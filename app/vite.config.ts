import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Multfilm videolari repo ildizida (eski ilova bilan umumiy). Saytda v2/ dan "../smurf2.mp4" bo'lib ochiladi;
// lokal sinovda (dev/preview) shu so'rovlarni ildizdagi faylga yo'naltiramiz — Range bilan (videoni surish uchun).
function ildizVideo(): Plugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serve = (req: any, res: any, next: () => void) => {
    const m = /^\/([\w-]+\.mp4)$/.exec(String(req.url || "").split("?")[0]);
    const f = m && path.resolve(__dirname, "..", m[1]);
    if (!f || !fs.existsSync(f)) return next();
    const size = fs.statSync(f).size;
    const r = /bytes=(\d*)-(\d*)/.exec(String(req.headers.range || ""));
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    if (r) {
      const start = r[1] ? Number(r[1]) : 0, end = r[2] ? Math.min(Number(r[2]), size - 1) : size - 1;
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.setHeader("Content-Length", end - start + 1);
      fs.createReadStream(f, { start, end }).pipe(res);
    } else {
      res.setHeader("Content-Length", size);
      fs.createReadStream(f).pipe(res);
    }
  };
  return {
    name: "ildiz-video",
    configureServer(s) { s.middlewares.use(serve); },
    configurePreviewServer(s) { s.middlewares.use(serve); },
  };
}

// Yangi ilova /v2/ papkasiga yig'iladi (GitHub Pages: .../Arabic-ai/v2/), eski ilova ildizda qoladi.
export default defineConfig({
  plugins: [react(), ildizVideo()],
  base: "./",
  build: { outDir: "../v2", emptyOutDir: true, target: "es2020", sourcemap: false },
  server: { host: "127.0.0.1", port: 5173 },
  preview: { host: "127.0.0.1", port: 4173 },
});
