"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Wallet,
  Settings,
  X,
  Star,
  Newspaper,
  PieChart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  matchPrefixes: string[];
  icon: any;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "市場與標的",
    items: [
      { name: "戰情總覽", href: "/dashboard", matchPrefixes: ["/dashboard"], icon: LayoutDashboard },
      { name: "個股與跨資產", href: "/stock", matchPrefixes: ["/stock"], icon: LineChart },
      { name: "多元資產與 ETF", href: "/etf", matchPrefixes: ["/etf"], icon: PieChart },
      { name: "即時財經新聞", href: "/news", matchPrefixes: ["/news"], icon: Newspaper },
    ],
  },
  {
    title: "AI 量化與籌碼",
    items: [
      {
        name: "AI 選股與量化",
        href: "/recommend",
        matchPrefixes: ["/recommend", "/quant", "/backtest"],
        icon: Sparkles,
      },
      {
        name: "資金與法人籌碼",
        href: "/capital-flow",
        matchPrefixes: ["/capital-flow", "/institutions", "/industry"],
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "部位與設定",
    items: [
      {
        name: "自選與價格警報",
        href: "/watchlist",
        matchPrefixes: ["/watchlist", "/alerts"],
        icon: Star,
      },
      {
        name: "投資組合與模擬",
        href: "/portfolio",
        matchPrefixes: ["/portfolio", "/simulator"],
        icon: Wallet,
      },
      { name: "系統設定", href: "/settings", matchPrefixes: ["/settings"], icon: Settings },
    ],
  },
];

export const SIDEBAR_TOGGLE_EVENT = "sidebar:toggle";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const toggle = () => setIsOpen((v) => !v);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, toggle);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      <aside className={cn("sidebar", isOpen ? "open" : "")}>
        <div className="sidebar-header">
          <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} />
          </div>
          <span className="font-semibold tracking-tight">AI 投資戰情室</span>
          <button
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="關閉選單"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav space-y-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.matchPrefixes.some((p) => pathname.startsWith(p));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-item", isActive && "active")}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={17} className="flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
