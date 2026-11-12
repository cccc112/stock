"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Sparkles, Star, Radio } from "lucide-react";

const TABS = [
  {
    name: "戰情室",
    href: "/dashboard",
    match: ["/dashboard"],
    icon: LayoutDashboard,
  },
  {
    name: "K線行情",
    href: "/stock/2330",
    match: ["/stock"],
    icon: LineChart,
  },
  {
    name: "AI 選股",
    href: "/recommend",
    match: ["/recommend", "/quant", "/backtest"],
    icon: Sparkles,
  },
  {
    name: "自選股",
    href: "/watchlist",
    match: ["/watchlist"],
    icon: Star,
  },
  {
    name: "LINE 警報",
    href: "/alerts",
    match: ["/alerts"],
    icon: Radio,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="行動版底部導覽列"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-t border-[var(--border)] px-2 pb-[env(safe-area-inset-bottom)] shadow-2xl select-none"
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 ${
                isActive ? "text-accent font-extrabold" : "text-secondary hover:text-primary"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? "bg-accent/15 shadow-sm shadow-accent/20 -translate-y-0.5" : ""
                }`}
              >
                <Icon size={18} />
              </div>
              <span className="text-[10px] tracking-tight leading-none">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
