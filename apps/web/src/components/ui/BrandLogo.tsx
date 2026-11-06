"use client";

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function BrandLogo({ size = 36, className = "", showText = false }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
        {/* 背景柔和量子光暈 */}
        <div
          className="absolute inset-0 rounded-full bg-cyan-500/15 blur-sm pointer-events-none"
        />

        {/* 1:1 忠實復刻右下角正宗台灣黑熊 (大耳粉嫩、純白大 V 領、萌態靈動大眼) */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-md overflow-visible"
        >
          {/* 左耳與右耳 (圓圓大耳 + 柔和粉嫩內耳 #fda4af) */}
          <g>
            <circle cx="24" cy="24" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="8" fill="#fda4af" opacity="0.85" />
          </g>
          <g>
            <circle cx="76" cy="24" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
            <circle cx="76" cy="24" r="8" fill="#fda4af" opacity="0.85" />
          </g>

          {/* 科技耳機天線 (量化雷達感應器 - 天藍色弧環與頂部感應球) */}
          <path
            d="M 20 18 Q 50 6 80 18"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />
          <circle cx="50" cy="8" r="4" fill="#38bdf8" />

          {/* 圓滾滾黑色黑熊大頭 (更圓潤可愛的 Chibi 比例) */}
          <rect x="14" y="20" width="72" height="68" rx="34" fill="#090d16" stroke="#1e293b" strokeWidth="2" />

          {/* 圓滾滾白皙臉頰粉紅紅暈 (兩頰可愛腮紅 #f43f5e) */}
          <circle cx="28" cy="62" r="4.5" fill="#f43f5e" opacity="0.45" />
          <circle cx="72" cy="62" r="4.5" fill="#f43f5e" opacity="0.45" />

          {/* 靈動大眼睛 (右下角同款：大白眼球 + 黑色瞳孔 + 純白晶瑩反光點) */}
          {/* 左眼 */}
          <circle cx="38" cy="46" r="5.5" fill="#f8fafc" />
          <circle cx="39" cy="45" r="2.8" fill="#0f172a" />
          <circle cx="40" cy="44" r="1.1" fill="#ffffff" />
          {/* 右眼 */}
          <circle cx="62" cy="46" r="5.5" fill="#f8fafc" />
          <circle cx="63" cy="45" r="2.8" fill="#0f172a" />
          <circle cx="64" cy="44" r="1.1" fill="#ffffff" />

          {/* 口鼻部 (乳白色/米黃圓潤橢圓 #f1f5f9) */}
          <ellipse cx="50" cy="58" rx="14" ry="10" fill="#f1f5f9" />
          {/* 黑色倒三角小鼻 */}
          <path d="M 45 54 L 55 54 L 50 60 Z" fill="#0f172a" />
          {/* 微笑小嘴 */}
          <path d="M 47 62 Q 50 65 53 62" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* ★ 正宗台灣黑熊標誌：純白雪亮大「V」字胸標 (不是金色的！純白色更顯呆萌純真！) ★ */}
          <path
            d="M 32 75 L 50 92 L 68 75"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold font-mono text-base tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
              OmniTick
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 tracking-wider flex items-center gap-1">
              <span>台灣黑熊 V-Bear</span>
            </span>
          </div>
          <span className="text-[10px] text-secondary font-medium tracking-wider mt-0.5">
            全時量化 · 智能戰情室
          </span>
        </div>
      )}
    </div>
  );
}
