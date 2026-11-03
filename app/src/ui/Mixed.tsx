// O'zbekcha matn ichidagi arabcha bo'laklar (masalan «قَفَصٌ» so'zi nimani bildiradi?): matn chapdan o'ngga,
// arabcha bo'lak alohida ajratiladi — aks holda brauzer butun gapni o'ngdan chapga aylantirib yuboradi.
import { Fragment } from "react";

const AR = /[؀-ۿ]/;
const RUN = /([؀-ۿ](?:[؀-ۿ\s،؛…·]*[؀-ۿ])?)/;

export function MixedText({ text }: { text: string }) {
  if (!AR.test(text)) return <>{text}</>;
  return (
    <>
      {text.split(RUN).map((s, k) => (AR.test(s)
        ? <bdi key={k} className="ar mx-ar" dir="rtl" lang="ar">{s}</bdi>
        : <Fragment key={k}>{s}</Fragment>))}
    </>
  );
}
