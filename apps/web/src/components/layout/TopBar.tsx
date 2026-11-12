"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Sun, Moon } from "lucide-react";
import { SIDEBAR_TOGGLE_EVENT } from "@/components/layout/Sidebar";
import { apiStocks } from "@/lib/api";
import UserMenu from "@/components/auth/UserMenu";
import BrandLogo from "@/components/ui/BrandLogo";
import InstallAppButton from "@/components/ui/InstallAppModal";

export default function TopBar() {
  const [time, setTime] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("theme_mode") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);

    const savedColor = localStorage.getItem("stock_color_preference") || "red-up";
    document.documentElement.setAttribute("data-color-scheme", savedColor);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme_mode", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleString("zh-TW", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiStocks.searchStocks(q);
        setSuggestions(Array.isArray(res.data) ? res.data : []);
        setOpen(true);
      } catch {
        // ignore
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const goSymbol = (sym: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/stock/${encodeURIComponent(sym)}`);
  };

  const handleSearchSubmit = async () => {
    const q = query.trim();
    if (!q) return;
    const upper = q.toUpperCase();

    // 1. 若輸入本身就是明確的代號 (台股/ETF如 00982A, 009802, 2330, 0050; 美股如 NVDA, QQQ; 加密如 BTC-USD; 期貨指數如 GC=F, ^TWII)
    if (/^(00\d{2,4}[A-Z]?|[0-9]\d{3,5}[A-Z]?|[A-Z]{1,5}|\^[A-Z0-9]+|[A-Z0-9]+=[A-Z0-9]+|[A-Z0-9]+-USD)$/i.test(upper)) {
      goSymbol(upper);
      return;
    }

    // 2. 若建議清單中有完全吻合代號或名稱的項目，直接跳轉
    const exactMatch = suggestions.find(
      (s) => String(s.symbol).toUpperCase() === upper || String(s.name).toUpperCase() === upper
    );
    if (exactMatch) {
      goSymbol(exactMatch.symbol);
      return;
    }

    // 3. 重新即時查詢最新關鍵字結果（避免 debounce 尚未完成導致拿到舊的 suggestions[0]）
    try {
      const res = await apiStocks.searchStocks(q);
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        const exact = list.find(
          (s: any) => String(s.symbol).toUpperCase() === upper || String(s.name).toUpperCase() === upper
        );
        goSymbol((exact || list[0]).symbol);
        return;
      }
    } catch {
      // fallback
    }
    goSymbol(upper);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchSubmit();
  };

  return (
    <div className="top-bar gap-3">
      <div className="flex items-center gap-2.5 flex-1 max-w-xl">
        <button
          className="menu-btn flex-shrink-0"
          aria-label="開啟選單"
          onClick={() => window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))}
        >
          <Menu size={20} />
        </button>

        <Link
          href="/dashboard"
          onClick={() => {
            document.querySelector(".page-content")?.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-1.5 md:hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
          title="點擊回到戰情首頁"
        >
          <BrandLogo size={24} />
          <span className="font-extrabold font-mono text-sm tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            OmniTick
          </span>
        </Link>

        <div ref={boxRef} className="relative flex-1">
          <form onSubmit={handleSubmit}>
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-secondary pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setOpen(true);
                }}
                placeholder="全域搜尋股號、公司名稱、ETF、黃金、比特幣 (Ctrl+K)..."
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1.5 pl-9 pr-14 text-xs sm:text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <kbd className="hidden sm:inline-block absolute right-2.5 text-[10px] font-mono text-muted bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border)] pointer-events-none">
                Ctrl+K
              </kbd>
            </div>
          </form>

          {open && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {suggestions.map((s: any) => (
                <button
                  key={`${s.symbol}-${s.name}`}
                  type="button"
                  onClick={() => goSymbol(s.symbol)}
                  className="w-full px-3.5 py-2.5 hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-left border-b border-[var(--border)] last:border-0 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-semibold text-accent text-sm flex-shrink-0">{s.symbol}</span>
                    <span className="text-primary text-sm truncate">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {s.industry && (
                      <span className="text-[11px] text-secondary bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                        {s.industry}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-muted bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                      {s.market}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
        <InstallAppButton />

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "切換為淺色明亮模式" : "切換為深色科技玻璃模式"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-secondary hover:text-primary hover:border-accent/40 text-xs font-medium transition-all cursor-pointer"
        >
          {theme === "dark" ? (
            <>
              <Sun size={14} className="text-amber-400" />
              <span className="hidden sm:inline">淺色模式</span>
            </>
          ) : (
            <>
              <Moon size={14} className="text-sky-600" />
              <span className="hidden sm:inline">深色科技</span>
            </>
          )}
        </button>

        <UserMenu />

        <div className="text-xs text-secondary font-mono tabular-nums hidden md:flex items-center gap-2">
          <span className="tech-glow-dot" title="即時報價連線中" />
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
}
