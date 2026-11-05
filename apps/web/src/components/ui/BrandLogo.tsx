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
          className="relative z-10 drop-shadow-md"
        >
          <defs>
            {/* 量子黑熊外皮漸層 (深黑曜岩 + 科技夜空藍) */}
            <linearGradient id="bear-coat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* 胸前金黃勝利 V 領 (VCP 突破 / V型反轉能量) */}
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
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 外圍 Omni 全時旋轉量子圓環 */}
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="url(#omni-ring)"
            strokeWidth="3"
            strokeDasharray="18 10"
            opacity="0.8"
            className="animate-spin"
            style={{ animationDuration: "20s", transformOrigin: "60px 60px" }}
          />
          <circle cx="60" cy="60" r="48" stroke="#38bdf8" strokeWidth="1" opacity="0.3" />

          {/* 台灣黑熊 - 圓圓立體雙耳 */}
          {/* 左耳 */}
          <circle cx="34" cy="36" r="14" fill="url(#bear-coat)" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="34" cy="36" r="8" fill="#f59e0b" opacity="0.85" filter="url(#v-glow)" />
          {/* 右耳 */}
          <circle cx="86" cy="36" r="14" fill="url(#bear-coat)" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="86" cy="36" r="8" fill="#f59e0b" opacity="0.85" filter="url(#v-glow)" />

          {/* 台灣黑熊 - 頭部主體 (圓潤萌態 + 量化霸氣) */}
          <ellipse cx="60" cy="62" rx="34" ry="32" fill="url(#bear-coat)" stroke="#334155" strokeWidth="2" />

          {/* 智慧戰術眼罩 / 雙眼 */}
          <ellipse cx="48" cy="54" rx="4" ry="5" fill="#38bdf8" filter="url(#v-glow)" />
          <circle cx="49" cy="53" r="1.5" fill="#ffffff" />
          <ellipse cx="72" cy="54" rx="4" ry="5" fill="#38bdf8" filter="url(#v-glow)" />
          <circle cx="73" cy="53" r="1.5" fill="#ffffff" />

          {/* 熊吻部 (Muzzle) */}
          <ellipse cx="60" cy="66" rx="14" ry="10" fill="#1e293b" opacity="0.9" />
          {/* 黑色小巧熊鼻 */}
          <path d="M 56 63 Q 60 66 64 63 Q 60 69 56 63 Z" fill="#020617" />
          {/* 微笑嘴角 */}
          <path d="M 57 69 Q 60 71 63 69" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" fill="none" />

          {/* 核心靈魂標誌：胸前金黃燦爛「V」字領 (VCP 波動收斂突破 & 勝利反轉) */}
          <path
            d="M 40 76 L 60 98 L 80 76 L 72 74 L 60 88 L 48 74 Z"
            fill="url(#gold-v-glow)"
            stroke="#fef08a"
            strokeWidth="1.5"
            filter="url(#v-glow)"
          />

          {/* 突破星芒連線 (Tick 閃電急速拉升) */}
          <path
            d="M 28 88 L 46 76 L 60 60 L 80 40 L 98 48"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
            filter="url(#v-glow)"
          />
          {/* 頂端突破閃亮火花 */}
          <circle cx="98" cy="48" r="3.5" fill="#ffffff" filter="url(#v-glow)" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold font-mono text-base tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
              OmniTick
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-blue-600/20 text-amber-300 border border-amber-400/30 tracking-wider flex items-center gap-1">
              <span>熊霸 V-Bear</span>
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
