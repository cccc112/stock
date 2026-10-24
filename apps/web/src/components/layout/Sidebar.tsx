"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Wallet,
  FlaskConical,
  Bell,
  Settings,
  X,
  Star,
  Newspaper,
  PieChart,
  Activity,
  Landmark,
  BarChart3,
  Sparkles,
  Factory,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "戰情總覽", href: "/dashboard", icon: LayoutDashboard },
  { name: "自選股", href: "/watchlist", icon: Star },
  { name: "個股分析", href: "/stock", icon: LineChart },
  { name: "ETF 專區", href: "/etf", icon: PieChart },
  { name: "AI 選股推薦", href: "/recommend", icon: Sparkles },
  { name: "產業研究", href: "/industry", icon: Factory },
  { name: "量化掃描", href: "/quant", icon: Activity },
  { name: "策略回測", href: "/backtest", icon: BarChart3 },
  { name: "資金流向", href: "/capital-flow", icon: TrendingUp },
  { name: "機構籌碼", href: "/institutions", icon: Landmark },
  { name: "財經新聞", href: "/news", icon: Newspaper },
  { name: "投資組合", href: "/portfolio", icon: Wallet },
  { name: "模擬交易", href: "/simulator", icon: FlaskConical },
  { name: "價格警報", href: "/alerts", icon: Bell },
  { name: "系統設定", href: "/settings", icon: Settings },
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
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
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
        </nav>
      </aside>
    </>
  );
}
