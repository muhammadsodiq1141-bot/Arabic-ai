// Kichik ichki ekranlar: kun so'zi va "tez orada" sahifasi (Orqaga tugmasi bilan).
import { Clock } from "lucide-react";
import type { DayWord } from "../lib/data";
import { Ar, Empty, ScreenHeader } from "../ui/kit";

export function DayWordScreen({ word }: { word: DayWord }) {
  return (
    <main className="screen">
      <ScreenHeader title="Kun so'zi" ar="كَلِمَةُ الْيَوْمِ" />
      <section className="card dword">
        <Ar className="dword-ar">{word.ar}</Ar>
        <b className="dword-uz">{word.uz}</b>
        {word.note && <p className="dword-note">{word.note}</p>}
      </section>
      {word.ex && (
        <section className="card dword-ex">
          <span className="lbl">Misol</span>
          <Ar className="dword-exar">{word.ex}</Ar>
          {word.exUz && <p>{word.exUz}</p>}
        </section>
      )}
    </main>
  );
}

export function SoonScreen({ title }: { title: string }) {
  return (
    <main className="screen">
      <ScreenHeader title={title} />
      <Empty icon={<Clock size={28} />} title="Tez orada" text="Bu bo'lim tayyorlanmoqda. Hozircha uy vazifasi va darslardan foydalaning." />
    </main>
  );
}
