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
          className="absolute inset-0 rounded-xl bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-cyan-400/30 blur-sm animate-pulse"
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
            <linearGradient id="omni-primary" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="omni-surge" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            <filter id="omni-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 外圈雷達掃描圓環 (動態旋轉光暈感) */}
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="url(#omni-primary)"
            strokeWidth="2.5"
            strokeDasharray="16 10"
            opacity="0.45"
            className="animate-spin"
            style={{ animationDuration: "24s", transformOrigin: "60px 60px" }}
          />
          <circle cx="60" cy="60" r="46" stroke="#38bdf8" strokeWidth="1.2" opacity="0.25" />

          {/* 核心中軸光束 */}
          <rect x="57" y="16" width="6" height="88" rx="3" fill="url(#omni-primary)" opacity="0.2" />

          {/* 柱1 (蓄勢左柱) */}
          <rect x="36" y="54" width="12" height="32" rx="3" fill="#3b82f6" opacity="0.85" />
          <line x1="42" y1="44" x2="42" y2="92" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

          {/* 柱2 (中央主升柱) */}
          <rect x="54" y="32" width="12" height="48" rx="3" fill="url(#omni-primary)" filter="url(#omni-glow)" />
          <line x1="60" y1="20" x2="60" y2="88" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />

          {/* 柱3 (阿爾法超額收益暴衝柱) */}
          <rect x="72" y="24" width="12" height="42" rx="3" fill="url(#omni-surge)" filter="url(#omni-glow)" />
          <line x1="78" y1="14" x2="78" y2="76" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

          {/* 閃電疾速折線 (Tick 瞬時連線) */}
          <path
            d="M26 80 L44 64 L62 42 L80 18 L96 32"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
            filter="drop-shadow(0 0 4px rgba(255,255,255,0.7))"
          />

          {/* 頂端脈動星點 */}
          <circle cx="96" cy="32" r="4.5" fill="#38bdf8" filter="url(#omni-glow)" className="animate-ping" style={{ animationDuration: "2s" }} />
          <circle cx="96" cy="32" r="3.5" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold font-mono text-base tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              OmniTick
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-sky-300 border border-sky-400/30 tracking-wider">
              0s 實時
            </span>
          </div>
          <span className="text-[10px] text-muted tracking-wider font-medium mt-0.5">奧米全時智投終端</span>
        </div>
      )}
    </div>
  );
}
