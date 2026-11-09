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

// 1-paket: bosh sahifa uchun multfilmlarning rasmsiz yengil ro'yxati (MULT_DATA ~63 KB → bir necha yuz bayt).
// MULT_DATA.json dan yig'ishda avtomatik yasaladi — yangi multfilm qo'shilganda alohida yangilash shart emas.
function multIndex(): Plugin {
  const make = () => {
    const d = JSON.parse(fs.readFileSync(path.resolve(__dirname, "public/data/MULT_DATA.json"), "utf8")) as { id: string; level: string; title: string; titleAr?: string; dur?: number }[];
    return JSON.stringify(d.map((m) => ({ id: m.id, level: m.level, title: m.title, titleAr: m.titleAr, dur: m.dur })));
  };
  return {
    name: "mult-index",
    configureServer(s) {
      s.middlewares.use((req, res, next) => {
        if (!String(req.url || "").split("?")[0].endsWith("/data/MULT_INDEX.json")) return next();
        res.setHeader("Content-Type", "application/json"); res.end(make());
      });
    },
    generateBundle() { this.emitFile({ type: "asset", fileName: "data/MULT_INDEX.json", source: make() }); },
  };
}

// Yangi ilova /v2/ papkasiga yig'iladi (GitHub Pages: .../Arabic-ai/v2/), eski ilova ildizda qoladi.
export default defineConfig({
  plugins: [react(), ildizVideo(), multIndex()],
  base: "./",
  // 1-paket: ilova versiyasi (xato jurnalida qaysi yig'ishda chiqqani ko'rinsin)
  define: { __APP_VER__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ")) },
  build: { outDir: "../v2", emptyOutDir: true, target: "es2020", sourcemap: false },
  server: { host: "127.0.0.1", port: 5173 },
  preview: { host: "127.0.0.1", port: 4173 },
});
