"use client";

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function BrandLogo({ size = 32, className = "", showText = false }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
        {/* 背景微光暈 */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-blue-600/30 to-emerald-400/25 blur-md animate-pulse pointer-events-none"
          style={{ animationDuration: "3s" }}
        />

        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-md overflow-visible"
        >
          <defs>
            {/* 台灣黑熊外皮漸層 (深黑曜岩 + 夜空黑) */}
            <linearGradient id="bear-coat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* 胸前金黃勝利 V 領 (VCP 突破 / 絕地反轉) */}
            <linearGradient id="gold-v-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Omni 量子光環漸層 */}
            <linearGradient id="omni-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <filter id="v-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 外圍 Omni 全時旋轉量子圓環 */}
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="url(#omni-ring)"
            strokeWidth="2.5"
            strokeDasharray="16 10"
            opacity="0.75"
            className="animate-spin"
            style={{ animationDuration: "20s", transformOrigin: "60px 60px" }}
          />

          {/* 台灣黑熊 - 圓圓立體雙耳 (外耳黑、內耳粉嫩 #fda4af) */}
          {/* 左耳 */}
          <circle cx="34" cy="34" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx="34" cy="34" r="8" fill="#fda4af" opacity="0.85" />
          {/* 右耳 */}
          <circle cx="86" cy="34" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx="86" cy="34" r="8" fill="#fda4af" opacity="0.85" />

          {/* 科技耳機天線 (與右下角黑熊同款：天藍弧線 + 頂端感應球) */}
          <path
            d="M 30 28 Q 60 14 90 28"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />
          <circle cx="60" cy="18" r="3.5" fill="#38bdf8" filter="url(#v-glow)" />

          {/* 台灣黑熊 - 頭部主體 (圓潤萌態) */}
          <rect x="22" y="28" width="76" height="70" rx="35" fill="#090d16" stroke="#1e293b" strokeWidth="2" />

          {/* 圓滾滾粉紅腮紅 (兩頰可愛紅暈) */}
          <circle cx="36" cy="70" r="5" fill="#f43f5e" opacity="0.45" />
          <circle cx="84" cy="70" r="5" fill="#f43f5e" opacity="0.45" />

          {/* 靈動大眼睛 (右下角同款：白眼球 + 黑眼珠 + 白色晶亮高光) */}
          {/* 左眼 */}
          <circle cx="47" cy="54" r="6" fill="#f8fafc" />
          <circle cx="48" cy="53" r="3.2" fill="#0f172a" />
          <circle cx="49.5" cy="51.5" r="1.2" fill="#ffffff" />
          {/* 右眼 */}
          <circle cx="73" cy="54" r="6" fill="#f8fafc" />
          <circle cx="74" cy="53" r="3.2" fill="#0f172a" />
          <circle cx="75.5" cy="51.5" r="1.2" fill="#ffffff" />

          {/* 吻部 (乳白色/米白微凸橢圓 #f1f5f9) */}
          <ellipse cx="60" cy="67" rx="14" ry="10" fill="#f1f5f9" />
          {/* 黑色倒三角小鼻 */}
          <path d="M 55 63 L 65 63 L 60 69 Z" fill="#0f172a" />
          {/* 微笑嘴角 */}
          <path d="M 57 71 Q 60 74 63 71" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* ★ 核心靈魂標誌：胸前厚實金黃勝利「V」字領 ★ */}
          <path
            d="M 40 82 L 60 100 L 80 82"
            stroke="url(#gold-v-glow)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#v-glow)"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold font-mono text-base tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
              OmniTick
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-blue-600/20 text-amber-300 border border-amber-400/30 tracking-wider flex items-center gap-1">
              <span>台灣黑熊 熊霸</span>
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
