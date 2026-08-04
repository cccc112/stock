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
  Menu,
  X,
  Star,
  Newspaper,
  PieChart
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "戰情總覽", href: "/dashboard", icon: LayoutDashboard },
  { name: "自選股", href: "/watchlist", icon: Star },
  { name: "個股分析", href: "/stock", icon: LineChart },
  { name: "ETF", href: "/etf", icon: PieChart },
  { name: "新聞", href: "/news", icon: Newspaper },
  { name: "投資組合", href: "/portfolio", icon: Wallet },
  { name: "模擬交易", href: "/simulator", icon: FlaskConical },
  { name: "智慧警報", href: "/alerts", icon: Bell },
  { name: "設定", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-secondary rounded-md"
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'none' }} // Assuming handled by topbar on mobile
      >
        <Menu size={24} />
      </button>

      <div className={cn("sidebar", isOpen ? "open" : "")}>
        <div className="sidebar-header">
          <span>📊</span>
          <span>AI 戰情室</span>
          <button className="md:hidden ml-auto" onClick={() => setIsOpen(false)}>
            <X size={20} />
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
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
