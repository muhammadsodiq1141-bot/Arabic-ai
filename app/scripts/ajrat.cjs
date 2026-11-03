// Eski index.html dagi ma'lumot bloklarini (lug'at, qoidalar, kitob mashqlari...) o'zgartirmay JSON fayllarga ajratadi.
// Har yuqori darajadagi e'lon alohida, DOM'siz muhitda bajariladi; DOM'ga tegadigan qatorlar o'tkazib yuboriladi.
// Ishga tushirish: node scripts/ajrat.cjs   (app/ papkasidan)
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.resolve(__dirname, "../public/data");
const IMG = path.resolve(__dirname, "../public/img/fli");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(IMG, { recursive: true });

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const src = scripts.sort((a, b) => b.length - a.length)[0];
const sf = ts.createSourceFile("app.js", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);

// DOM'siz muhit: har qanday chaqiruv jim o'tadi
const noop = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : noop), apply: () => noop, construct: () => noop });
const store = {};
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  document: noop, navigator: { userAgent: "", language: "uz" }, location: { search: "", hash: "", href: "" },
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  fetch: () => new Promise(() => {}), Audio: noop, Image: noop, MutationObserver: noop, IntersectionObserver: noop, ResizeObserver: noop,
  addEventListener() {}, removeEventListener() {}, scrollTo() {}, alert() {}, confirm: () => false,
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

let ok = 0, skip = 0;
const skipped = [];
for (const st of sf.statements) {
  let code = src.slice(st.getStart(sf), st.end);
  if (ts.isVariableStatement(st)) code = code.replace(/^(export\s+)?(const|let)\s/, "var ");
  else if (ts.isClassDeclaration(st) && st.name) code = `var ${st.name.text} = ${code};`;
  try { vm.runInContext(code, ctx, { timeout: 2000 }); ok++; }
  catch (e) { skip++; if (ts.isVariableStatement(st)) skipped.push(st.declarationList.declarations.map((d) => d.name.getText(sf)).join(",") + ": " + String(e.message).slice(0, 80)); }
}
console.log(`bajarildi: ${ok}, o'tkazildi: ${skip}`);

const NAMES = ["BOOKS", "MADINA", "WF", "KB_LESSONS", "DR_LESSONS", "MULT_DATA", "KNOWN_WORDS", "DAY_WORDS", "AR_NAME_MAP", "STK", "RK_IMG", "RK_SET",
  "FLX", "FLC", "EMO", "A0_LET", "A0_TOPICS", "A0_SPEED", "A0_NOJOIN", "LEVELS", "TASKS", "GOALS", "GAMES", "LADDER", "BOOK_LEVEL", "BOOK_TAG", "BOOK_COL"];
const report = [];
for (const n of NAMES) {
  let v;
  try { v = vm.runInContext(`typeof ${n} === "undefined" ? undefined : ${n}`, ctx); } catch { v = undefined; }
  if (v === undefined) { report.push(`${n}: YO'Q`); continue; }
  let fns = 0;
  const json = JSON.stringify(v, (k, x) => (typeof x === "function" ? (fns++, undefined) : x));
  fs.writeFileSync(path.join(OUT, n + ".json"), json, "utf8");
  report.push(`${n}: ${(json.length / 1024).toFixed(0)} KB${fns ? ` (funksiya tashlab ketildi: ${fns})` : ""}`);
}
console.log(report.join("\n"));

// Kitoblar alohida fayllarda (telefonda faqat keraklisi yuklanadi) + qisqa ro'yxat
const books = JSON.parse(fs.readFileSync(path.join(OUT, "BOOKS.json"), "utf8"));
fs.mkdirSync(path.join(OUT, "books"), { recursive: true });
const index = books.map((b) => {
  fs.writeFileSync(path.join(OUT, "books", b.id + ".json"), JSON.stringify(b), "utf8");
  return { id: b.id, title: b.title, sub: b.sub, emo: b.emo, units: b.units.length,
    words: b.units.reduce((a, u) => a + (u.words || []).length + (u.phrases || []).length, 0) };
});
fs.writeFileSync(path.join(OUT, "books", "index.json"), JSON.stringify(index), "utf8");
console.log("kitoblar alohida:", index.map((b) => `${b.id}(${b.units})`).join(" "));

// So'z kartalari (turkum, misollar, sinonim...) ham kitob bo'yicha
const wf = JSON.parse(fs.readFileSync(path.join(OUT, "WF.json"), "utf8"));
fs.mkdirSync(path.join(OUT, "wf"), { recursive: true });
for (const [bid, words] of Object.entries(wf)) fs.writeFileSync(path.join(OUT, "wf", bid + ".json"), JSON.stringify(words), "utf8");
console.log("so'z kartalari alohida:", Object.keys(wf).join(" "));

// Kitob mashqlari (KB) dars bo'yicha: kb/a1-4.json (":" fayl nomida ishlatilmaydi)
const kb = JSON.parse(fs.readFileSync(path.join(OUT, "KB_LESSONS.json"), "utf8"));
fs.mkdirSync(path.join(OUT, "kb"), { recursive: true });
for (const [key, lesson] of Object.entries(kb)) fs.writeFileSync(path.join(OUT, "kb", key.replace(":", "-") + ".json"), JSON.stringify(lesson), "utf8");
console.log("kitob mashqlari alohida:", Object.keys(kb).length, "ta dars");
if (skipped.length) console.log("O'tkazilgan e'lonlar (DOM bilan bog'liq bo'lishi mumkin):\n  " + skipped.slice(0, 40).join("\n  "));

// 3D rasmlar: rasm.js -> alohida webp fayllar
const r = fs.readFileSync(path.join(ROOT, "rasm.js"), "utf8");
const arr = [...r.match(/FLI_IMG\s*=\s*\[([\s\S]*)\]/)[1].matchAll(/"([A-Za-z0-9+/=]+)"/g)].map((m) => m[1]);
arr.forEach((b, i) => fs.writeFileSync(path.join(IMG, `${i}.webp`), Buffer.from(b, "base64")));
console.log(`3D rasmlar: ${arr.length} ta -> public/img/fli/`);
