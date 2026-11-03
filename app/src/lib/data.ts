// Ilova ma'lumotlari (lug'at, kitoblar, kun so'zi...) — kerak bo'lganda yuklanadi va xotirada saqlanadi.
const cache = new Map<string, Promise<unknown>>();

export function loadData<T>(name: string): Promise<T> {
  let p = cache.get(name);
  if (!p) {
    p = fetch(`./data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`Ma'lumot yuklanmadi: ${name}`);
      return r.json();
    });
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p as Promise<T>;
}

// 3D rasmlar (Microsoft Fluent, MIT): eski ilovadagi tartib raqamlari
export const IMG = {
  trophy: 157, coin: 104, house: 70, books: 20, book: 34, fire: 247, medal: 150, gift: 174, magnifier: 97,
  handshake: 9, ticket: 93, game: 162, puzzle: 158, tv: 167, calendar: 31, target: 233, teacher: 240,
} as const;
export const img = (k: keyof typeof IMG) => `./img/fli/${IMG[k]}.webp`;

export type DayWord = { ar: string; uz: string; note?: string; ex?: string; exUz?: string };
export type BookIndex = { id: string; title: string; sub: string; emo: string; units: number; words: number }[];
