// 3-paket 3-qism: qo'shimcha vazifa — faqat lokal sinov (demo.ts dan chaqiriladi). ?demo=approved — o'quvchi, ?demo=teacher — ustoz; &xw=1 — keng (A4) material.
const iso = (minAgo: number) => new Date(Date.now() - minAgo * 6e4).toISOString();
const day = (plus: number) => { const t = new Date(); t.setDate(t.getDate() + plus); return t.toISOString().slice(0, 10); };

// ustoz yuklagan materialga o'xshash namuna: 2 savolli test, oxirida natijani ilovaga yuboradi
const QUIZ = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:system-ui,sans-serif;background:radial-gradient(circle at 30% 0,#D7F1D2,#E3F2E2 45%,#EAF4EA);color:#0D3A1A;padding:18px}
h1{font-size:20px;margin:0 0 4px}.tb{width:60px;height:6px;border-radius:3px;background:#2EB82E;margin-bottom:14px}
.q{background:#fff;border:1px solid #CFE3CC;border-radius:14px;padding:12px;margin-bottom:12px}.ar{font-size:30px;text-align:center;font-family:'Noto Naskh Arabic',serif}
.o{display:grid;grid-template-columns:1fr 1fr;gap:8px}.o button{padding:10px;border-radius:10px;border:1.5px solid #CFE3CC;background:#fff;font-size:15px;font-weight:700;color:#3A6040}
.o button.ok{background:#2EB82E;color:#0A2A10;border-color:#2EB82E}.o button.no{background:#F6DDD6;border-color:#A33A28}#n{font-weight:800;text-align:center;font-size:17px}</style></head>
<body><h1>Harakatni toping</h1><div class="tb"></div>
<div class="q"><div class="ar">كِتَابٌ</div><div class="o" data-ok="kitob"><button>kitob</button><button>qalam</button><button>daftar</button><button>eshik</button></div></div>
<div class="q"><div class="ar">قَلَمٌ</div><div class="o" data-ok="qalam"><button>uy</button><button>qalam</button><button>stol</button><button>kitob</button></div></div>
<p id="n">0 / 2</p>
<script>var b=0,d=0;document.querySelectorAll('.o').forEach(function(o){o.querySelectorAll('button').forEach(function(x){x.onclick=function(){if(o.dataset.done)return;o.dataset.done=1;d++;
var ok=x.textContent===o.dataset.ok;x.className=ok?'ok':'no';if(ok)b++;document.getElementById('n').textContent=b+' / 2';if(d===2&&window.miyzanNatija)window.miyzanNatija(b,2)}})})</script></body></html>`;
const WIDE = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#e9e9e9}.a4{width:794px;min-height:1123px;margin:0 auto;background:#fff;padding:48px;box-sizing:border-box;font:16px/1.5 system-ui}h1{color:#0D3A1A}</style></head>
<body><div class="a4"><h1>A4 tarqatma — 4-vahda</h1><p>Bu sahifa 794 px kenglikda (A4). Telefonda eniga moslab kichraytiriladi; «Asl o'lcham» tugmasi bilan kattalashtirish mumkin.</p>
<p style="font-size:40px;text-align:center;font-family:serif">بَيْتٌ · مَدْرَسَةٌ · كِتَابٌ</p></div></body></html>`;

let sent: { text: string; at: string; result: unknown } | null = null;

const TASK = (wide: boolean) => ({
  id: 41, group_code: "K7QX2M", title: "4-vahda: so'zlar va harakatlar", body: "Materialdagi testni ishlang, 5 ta so'zni daftarga yozib suratga oling.",
  html: true, html_name: wide ? "a1-4-tarqatma.html" : "a1-4-vahda-mashq.html", html_size: 1_843_200, answer: { text: true, voice: true, photo: true },
  coins5: 1000, due: day(3), created_at: iso(60 * 5), picked: 0,
});

export function xDemo(action: string, p: Record<string, unknown>, teacher: boolean, q: URLSearchParams): Record<string, unknown> | null {
  const wide = q.get("xw") === "1";
  if (action === "xUpload") return { ok: true, path: (p.kind === "html" ? "h/K7QX2M/" : "p/demo/") + Math.random().toString(36).slice(2) + (p.kind === "html" ? ".html" : ".jpg"), url: "demo" };
  if (action === "xCreate") { (window as unknown as { __xc?: unknown }).__xc = p; return { ok: true, id: 42, sent: Array.isArray(p.kids) && p.kids.length ? p.kids.length : 6 }; }
  if (action === "xList") {
    if (teacher) return { ok: true, items: [
      { ...TASK(false), teacher: true, stats: { total: 6, done: 2 } },
      { ...TASK(false), id: 40, title: "Harflar o'yini", html_name: "harflar.html", answer: { text: false, voice: true, photo: false }, coins5: 500, due: day(-1), picked: 3, teacher: true, stats: { total: 3, done: 3 } },
    ] };
    return { ok: true, items: [{ ...TASK(wide), teacher: false, mine: sent ? { grade: null, comment: null, created_at: sent.at } : null }] };
  }
  if (action === "xGet") return { ok: true, role: teacher ? "teacher" : "student", url: "data:text/html;charset=utf-8," + encodeURIComponent(wide ? WIDE : QUIZ),
    task: TASK(wide), mine: sent ? { id: 1, text: sent.text, grade: null, comment: null, created_at: sent.at, photos: 0, audio: false, result: sent.result } : null };
  if (action === "xSubmit") { (window as unknown as { __xs?: unknown }).__xs = p; sent = { text: String(p.text || ""), at: new Date().toISOString(), result: p.result ?? null }; return { ok: true, late: false }; }
  if (action === "xStatus") return { ok: true, rows: [
    { n: "Aziz Karimov", lg: "MJ-48213", sent: iso(30), grade: null, late: false },
    { n: "Madina Yusupova", lg: "MJ-48877", sent: iso(60 * 26), grade: 5, late: true },
    { n: "Dilnoza Rahmonova", lg: "MJ-49001", sent: null, grade: null, late: false },
  ] };
  if (action === "xDelete") return { ok: true };
  return null;
}

/** ustoz «Javoblar» ro'yxatiga qo'shiladigan qo'shimcha vazifa javobi (suratlar — chizilgan daftar varag'i) */
export function xDemoSub() {
  const page = (n: number) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#fdfbf4"/>${Array.from({ length: 18 }, (_, i) => `<line x1="0" x2="300" y1="${30 + i * 20}" y2="${30 + i * 20}" stroke="#c9d8ef"/>`).join("")}<text x="150" y="${90 + n * 40}" font-size="34" text-anchor="middle" font-family="serif">كِتَابٌ قَلَمٌ</text></svg>`);
  return { id: 36, lesson: "x:41", step: "x", item: 41, text: "So'zlarni yozdim, ikkitasida harakatni adashtirdim.", created_at: iso(25), grade: null, comment: null, audio: true,
    name: "Aziz Karimov", login: "MJ-48213", pics: [page(0), page(1), page(2)], result: { ball: 8, jami: 10 },
    xt: { title: "4-vahda: so'zlar va harakatlar", coins5: 1000, due: day(3), late: false } };
}
