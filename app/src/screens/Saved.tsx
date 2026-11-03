// Saqlangan so'zlar: roundning "Tanishish" bosqichida xatcho'p bosilgan so'zlar (f.saved). Tinglash va ro'yxatdan olib tashlash.
import { useState } from "react";
import { Bookmark, Trash2, Volume2 } from "lucide-react";
import { say } from "../lib/audio";
import { removeSaved, savedAll } from "../lib/saved";
import { tg } from "../lib/tg";
import { Ar, Empty, ScreenHeader } from "../ui/kit";

export function SavedScreen() {
  const [list, setList] = useState(() => Object.entries(savedAll()).sort((a, b) => b[1].at - a[1].at));
  const drop = (ar: string) => { removeSaved(ar); tg.haptic("light"); setList((l) => l.filter(([k]) => k !== ar)); };
  return (
    <main className="screen">
      <ScreenHeader title="Saqlangan so'zlar" ar="الْكَلِمَاتُ الْمَحْفُوظَةُ" />
      {list.length === 0 ? (
        <Empty icon={<Bookmark size={28} />} title="Hozircha bo'sh" text="Roundda so'z yonidagi xatcho'p belgisini bossangiz, so'z shu yerga tushadi." />
      ) : (
        <>
          <p className="muted saved-n">{list.length} ta so'z</p>
          <ul className="slist">
            {list.map(([ar, s]) => (
              <li key={ar} className="srow">
                <button type="button" className="say" aria-label="Tinglash" onClick={() => void say(ar)}><Volume2 size={22} aria-hidden /></button>
                <span className="st"><Ar className="st-ar">{ar}</Ar><span>{s.uz}</span></span>
                <button type="button" className="ibtn sdel" aria-label="Olib tashlash" onClick={() => drop(ar)}><Trash2 size={20} aria-hidden /></button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
