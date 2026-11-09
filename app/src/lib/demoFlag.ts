// Sinov rejimi belgisi: faqat shu kompyuterda (localhost) va manzilda ?demo=... bo'lsa. 1-paket: soxta ma'lumotlarning o'zi
// (demo.ts) alohida bo'lak — haqiqiy saytda o'quvchi telefoniga umuman yuklanmaydi.
const q = new URLSearchParams(location.search);
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
export const DEMO: string | null = local ? q.get("demo") : null; // pending | rejected | approved | admin | new | teacher
