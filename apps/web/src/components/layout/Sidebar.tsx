"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Landmark,
  Loader2,
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
      { name: "即時新聞與名人動態", href: "/news", matchPrefixes: ["/news"], icon: Newspaper },
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
        name: "三大法人與 13F 機構",
        href: "/institutions",
        matchPrefixes: ["/institutions"],
        icon: Landmark,
      },
      {
        name: "資金流向與產業輪動",
        href: "/capital-flow",
        matchPrefixes: ["/capital-flow", "/industry"],
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    const toggle = () => setIsOpen((v) => !v);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, toggle);
  }, []);

  // 預先載入所有主導覽路由，讓頁面切換達到 0ms 瞬時跳轉
  useEffect(() => {
    const timer = setTimeout(() => {
      navGroups.forEach((group) => {
        group.items.forEach((item) => {
          try {
            router.prefetch(item.href);
          } catch {}
        });
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    setIsOpen(false);
    setPendingHref(null);
    const mainEl = document.querySelector(".page-content");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname]);

  const activePath = pendingHref || pathname;
  const isNavigating = Boolean(pendingHref && !pathname.startsWith(pendingHref));

  return (
    <>
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-[2.5px] bg-transparent overflow-hidden pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 animate-route-progress origin-left" />
        </div>
      )}

      {isOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      <aside className={cn("sidebar", isOpen ? "open" : "")}>
        <div className="sidebar-header">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500/25 to-indigo-500/25 border border-sky-400/30 text-accent flex items-center justify-center flex-shrink-0 shadow-sm">
            <TrendingUp size={16} />
          </div>
          <span className="font-semibold tracking-tight">AI 投資戰情室</span>
          <span className="tech-glow-dot ml-0.5" />
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
                const isActive = item.matchPrefixes.some((p) => activePath.startsWith(p));
                const isItemPending = pendingHref === item.href && !pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn("nav-item", isActive && "active")}
                    onClick={() => {
                      if (!pathname.startsWith(item.href)) {
                        setPendingHref(item.href);
                      }
                      setIsOpen(false);
                    }}
                  >
                    {isItemPending ? (
                      <Loader2 size={17} className="flex-shrink-0 animate-spin text-accent" />
                    ) : (
                      <Icon size={17} className="flex-shrink-0" />
                    )}
                    <span className="truncate">{item.name}</span>
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
