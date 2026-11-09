// 1-paket: o'yinlar menyusi uchun yengil ma'lumot — nomlar va «o'ynasa bo'ladimi» tekshiruvi.
// O'yinlar ekrani (screens/Games.tsx) alohida bo'lak bo'lib yuklanadi; Mashq bo'limi faqat shu faylni oladi.
import { itemsOf, picOf, poolFor, type Item, type PBook } from "./practice";
import { strip } from "./words";

export const GAME_NAMES: Record<string, string> = {
  match: "Juftini top", pic: "Rasmni top", bubble: "Pufakchalar", million: "Million so'm", letters: "Harflardan yig'", speed: "60 soniya", order: "Gapni tartibla", synant: "Sinonim va antonim",
};

/** «Harflardan yig'» uchun yaraydigan so'z: bitta so'z, 3–7 harf */
export const okLetters = (x: Item) => { const s = strip(x.ar); return !/[\s×]/.test(s) && s.length >= 3 && s.length <= 7; };

/** O'yinni o'ynash mumkinmi (savol yetadimi) — menyuda ko'rsatish uchun */
export function gameAvailable(book: PBook, unit: number, game: string) {
  const u = book.units.find((x) => x.n === unit);
  if (!u) return false;
  if (game === "order") return !!(book.sent?.[unit]?.length);
  if (game === "pic") return poolFor(book, unit, (x) => !!picOf(x.ar), 4).length >= 4;
  if (game === "letters") return poolFor(book, unit, okLetters, 6).length >= 3;
  return itemsOf(u).length >= 6 || game !== "match";
}
