// Miyzan tarozisi — yakun lahzalari uchun (brend: مِيزَان). Yulduzcha yengil pallaga tushadi va shayin muvozanatga keladi.
// balanced=false bo'lsa tarozi qiyshiq qoladi (natija hali yetarli emas). Harakatni kamaytirish sozlamasida darhol oxirgi holat.
export function Scale({ size = 150, balanced = true, star = true }: { size?: number; balanced?: boolean; star?: boolean }) {
  return (
    <svg className={`scale ${balanced ? "bal" : "tilt"}`} width={size} height={size} viewBox="0 0 160 160" role="img"
      aria-label={balanced ? "Tarozi muvozanatda" : "Tarozi hali muvozanatda emas"}>
      {/* poydevor va ustun */}
      <path d="M58 146h44l-6-10H64z" className="sc-gold" />
      <rect x="77" y="40" width="6" height="98" rx="3" className="sc-gold" />
      <circle cx="80" cy="36" r="7" className="sc-gold" />
      {/* shayin (aylanadi) */}
      <g className="sc-beam">
        <rect x="22" y="33" width="116" height="6" rx="3" className="sc-gold" />
      </g>
      {/* chap palla */}
      <g className="sc-pan sc-l">
        <path d="M28 38L14 84M28 38L42 84" className="sc-rope" />
        <path d="M8 84h40q-4 16-20 16t-20-16z" className="sc-gold" />
      </g>
      {/* o'ng palla + tushadigan yulduzcha */}
      <g className="sc-pan sc-r">
        <path d="M132 38L118 84M132 38L146 84" className="sc-rope" />
        <path d="M112 84h40q-4 16-20 16t-20-16z" className="sc-gold" />
        {star && <path className="sc-star" d="M132 58l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1-7.2-3.8-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" />}
      </g>
    </svg>
  );
}
