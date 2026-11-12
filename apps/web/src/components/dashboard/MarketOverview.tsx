"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { apiStocks } from "@/lib/api";
import AnimatedPrice from "@/components/ui/AnimatedPrice";
import { getCurrentUserNamespace } from "@/hooks/useAuth";
import {
  Plus,
  Settings2,
  X,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";

interface OverviewCardItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  market: "TW" | "US";
}

const DEFAULT_CARDS: Omit<OverviewCardItem, "price" | "change" | "change_pct">[] = [
  { id: "TWII", symbol: "^TWII", name: "台股加權指數", market: "TW" },
  { id: "2330", symbol: "2330", name: "台積電", market: "TW" },
  { id: "2317", symbol: "2317", name: "鴻海", market: "TW" },
  { id: "2454", symbol: "2454", name: "聯發科", market: "TW" },
  { id: "SOX", symbol: "^SOX", name: "費城半導體", market: "TW" },
  { id: "NVDA", symbol: "NVDA", name: "NVIDIA (輝達)", market: "TW" },
  { id: "BTC", symbol: "BTC-USD", name: "比特幣 (BTC)", market: "TW" },
  { id: "USDTWD", symbol: "TWD=X", name: "美元/台幣", market: "TW" },
];

const QUICK_PRESETS: { symbol: string; name: string }[] = [
  { symbol: "^TWII", name: "台股加權指數" },
  { symbol: "2330", name: "台積電" },
  { symbol: "2317", name: "鴻海" },
  { symbol: "2454", name: "聯發科" },
  { symbol: "2603", name: "長榮" },
  { symbol: "3231", name: "緯創" },
  { symbol: "2382", name: "廣達" },
  { symbol: "3017", name: "奇鋐" },
  { symbol: "0050", name: "元大台灣50" },
  { symbol: "00878", name: "國泰永續高股息" },
  { symbol: "00919", name: "群益台灣精選高息" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq 綜合" },
  { symbol: "^SOX", name: "費城半導體" },
  { symbol: "NVDA", name: "NVIDIA (輝達)" },
  { symbol: "TSLA", name: "Tesla (特斯拉)" },
  { symbol: "AAPL", name: "Apple (蘋果)" },
  { symbol: "BTC-USD", name: "比特幣 (BTC)" },
  { symbol: "GC=F", name: "黃金期貨" },
  { symbol: "TWD=X", name: "美元/台幣" },
  { symbol: "^TNX", name: "美債10年殖利率" },
];

const STORAGE_BASE_KEY = "dashboard_custom_overview_cards_v1";

export default function MarketOverview() {
  const [cards, setCards] = useState<OverviewCardItem[]>(
    DEFAULT_CARDS.map((i) => ({ ...i, price: 0, change: 0, change_pct: 0 }))
  );
  const [isEditing, setIsEditing] = useState(false);
  const [inputSymbol, setInputSymbol] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const getStorageKey = useCallback(() => {
    const ns = getCurrentUserNamespace();
    return ns === "default" ? STORAGE_BASE_KEY : `${STORAGE_BASE_KEY}_${ns}`;
  }, []);

  // 載入使用者自訂的首頁卡片配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(
            parsed.map((item: any) => ({
              id: item.symbol || item.id,
              symbol: String(item.symbol).toUpperCase(),
              name: item.name || item.symbol,
              market: "TW",
              price: Number(item.price) || 0,
              change: Number(item.change) || 0,
              change_pct: Number(item.change_pct) || 0,
            }))
          );
        }
      }
    } catch {}
    setInitialized(true);
  }, [getStorageKey]);

  // 持久化儲存卡片結構
  const saveCardsToStorage = useCallback(
    (nextCards: OverviewCardItem[]) => {
      try {
        const minimal = nextCards.map(({ id, symbol, name, market }) => ({
          id,
          symbol,
          name,
          market,
        }));
        localStorage.setItem(getStorageKey(), JSON.stringify(minimal));
      } catch {}
    },
    [getStorageKey]
  );

  // 即時報價拉取
  const fetchQuotesForCards = useCallback(async (targetList: OverviewCardItem[]) => {
    if (!targetList || targetList.length === 0) return;
    const results = await Promise.allSettled(
      targetList.map((idx) =>
        apiStocks.getQuote(idx.symbol).then((r) => ({ symbol: idx.symbol, data: r.data }))
      )
    );

    const quoteMap = new Map<string, any>();
    results.forEach((res) => {
      if (res.status === "fulfilled" && res.value?.data) {
        quoteMap.set(res.value.symbol.toUpperCase(), res.value.data);
      }
    });

    setCards((prev) => {
      let nameUpdated = false;
      const updated = prev.map((card) => {
        const d = quoteMap.get(card.symbol.toUpperCase());
        if (d) {
          const resolvedName =
            d.name && d.name !== card.symbol && card.name === card.symbol ? d.name : card.name;
          if (resolvedName !== card.name) nameUpdated = true;
          return {
            ...card,
            name: resolvedName,
            price: d.price ?? card.price,
            change: d.change ?? card.change,
            change_pct: d.change_pct ?? card.change_pct,
          };
        }
        return card;
      });
      if (nameUpdated) {
        try {
          const minimal = updated.map(({ id, symbol, name, market }) => ({
            id,
            symbol,
            name,
            market,
          }));
          localStorage.setItem(
            getCurrentUserNamespace() === "default"
              ? STORAGE_BASE_KEY
              : `${STORAGE_BASE_KEY}_${getCurrentUserNamespace()}`,
            JSON.stringify(minimal)
          );
        } catch {}
      }
      return updated;
    });
  }, []);

  const symbolsSignature = cards.map((c) => c.symbol).join(",");

  useEffect(() => {
    if (!initialized) return;
    fetchQuotesForCards(cards);
    const timer = setInterval(() => {
      fetchQuotesForCards(cards);
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, symbolsSignature, fetchQuotesForCards]);

  // 搜尋建議自動補全
  useEffect(() => {
    const q = inputSymbol.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await apiStocks.searchStocks(q);
        setSuggestions(Array.isArray(res.data) ? res.data.slice(0, 8) : []);
        setShowSuggest(true);
      } catch {}
    }, 180);
    return () => clearTimeout(t);
  }, [inputSymbol]);

  const handleAddCard = (rawSym: string, customName?: string) => {
    const sym = rawSym.trim().toUpperCase();
    if (!sym) return;
    if (cards.some((c) => c.symbol.toUpperCase() === sym)) {
      setInputSymbol("");
      setShowSuggest(false);
      return;
    }
    const presetMatch = QUICK_PRESETS.find((p) => p.symbol.toUpperCase() === sym);
    const newCard: OverviewCardItem = {
      id: sym,
      symbol: sym,
      name: customName || presetMatch?.name || sym,
      price: 0,
      change: 0,
      change_pct: 0,
      market: "TW",
    };
    const next = [...cards, newCard];
    setCards(next);
    saveCardsToStorage(next);
    setInputSymbol("");
    setShowSuggest(false);
  };

  const handleRemoveCard = (sym: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const next = cards.filter((c) => c.symbol !== sym);
    setCards(next);
    saveCardsToStorage(next);
  };

  const handleMoveCard = (index: number, direction: -1 | 1, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= cards.length) return;
    const next = [...cards];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setCards(next);
    saveCardsToStorage(next);
  };

  const handleResetDefault = () => {
    const next = DEFAULT_CARDS.map((i) => ({ ...i, price: 0, change: 0, change_pct: 0 }));
    setCards(next);
    saveCardsToStorage(next);
  };

  return (
    <div className="space-y-3">
      {/* 頂部操作列：標題與自訂卡片開關 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-secondary tracking-wide flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span>首頁自訂核心看盤卡片 ({cards.length} 檔)</span>
          </span>
          <span className="text-[11px] text-muted hidden sm:inline">
            · 盤中每 5 秒自動刷新即時報價
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-amber-500/50 text-secondary hover:text-amber-400 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="恢復預設首頁卡片組合"
            >
              <RotateCcw size={12} />
              <span>恢復預設</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isEditing
                ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                : "bg-[var(--bg-secondary)] border-[var(--border)] text-secondary hover:text-primary hover:border-accent/50"
            }`}
          >
            {isEditing ? (
              <>
                <Check size={13} />
                <span>完成自訂</span>
              </>
            ) : (
              <>
                <Settings2 size={13} />
                <span>自訂首頁股票卡片</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 自訂卡片編輯面板 */}
      {isEditing && (
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-accent/40 shadow-lg space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div ref={searchBoxRef} className="relative flex-1 max-w-md">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (suggestions.length > 0) {
                    handleAddCard(suggestions[0].symbol, suggestions[0].name);
                  } else {
                    handleAddCard(inputSymbol);
                  }
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={inputSymbol}
                    onChange={(e) => setInputSymbol(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggest(true);
                    }}
                    placeholder="輸入股號或名稱新增卡片 (如 2330, 2603, 0050, NVDA)..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg py-1.5 pl-8 pr-3 text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-accent hover:opacity-90 text-white text-xs font-bold flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  <Plus size={14} />
                  <span>新增卡片</span>
                </button>
              </form>

              {showSuggest && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                  {suggestions.map((s: any) => (
                    <button
                      key={`${s.symbol}-${s.name}`}
                      type="button"
                      onClick={() => handleAddCard(s.symbol, s.name)}
                      className="w-full px-3 py-2 hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-left text-xs border-b border-[var(--border)] last:border-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-accent">{s.symbol}</span>
                        <span className="text-primary">{s.name}</span>
                      </div>
                      <span className="text-[10px] text-muted font-mono">+ 加入首頁</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[11px] text-secondary">
              提示：點選下方熱門標籤可快速開關，或點擊卡片右上角調整順序與移除。
            </div>
          </div>

          {/* 熱門標的快速點選列 */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
            <span className="text-[11px] text-muted mr-1">熱門快選：</span>
            {QUICK_PRESETS.map((preset) => {
              const isSelected = cards.some(
                (c) => c.symbol.toUpperCase() === preset.symbol.toUpperCase()
              );
              return (
                <button
                  key={preset.symbol}
                  type="button"
                  onClick={() =>
                    isSelected
                      ? handleRemoveCard(preset.symbol)
                      : handleAddCard(preset.symbol, preset.name)
                  }
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-accent/20 text-accent border border-accent/40 font-bold"
                      : "bg-[var(--bg-primary)] text-secondary border border-[var(--border)] hover:border-accent/40 hover:text-primary"
                  }`}
                >
                  <span>{preset.name}</span>
                  <span className="font-mono text-[10px] opacity-75">
                    {preset.symbol.replace("^", "")}
                  </span>
                  {isSelected ? <Check size={11} /> : <Plus size={11} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 股票與指數卡片網格 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((idx, index) => (
          <div key={idx.symbol} className="relative group">
            <Link
              href={isEditing ? "#" : `/stock/${encodeURIComponent(idx.symbol)}`}
              onClick={(e) => {
                if (isEditing) e.preventDefault();
              }}
              className="block h-full"
            >
              <Card
                className={`transition-all h-full ${
                  isEditing
                    ? "border-dashed border-accent/50 bg-[var(--bg-secondary)]/90"
                    : "group-hover:border-accent/50"
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="text-secondary text-xs font-medium tracking-wide flex justify-between items-center pr-1">
                    <span className="truncate font-bold text-primary/90">{idx.name}</span>
                    {!isEditing && (
                      <span className="font-mono text-[10px] text-muted flex-shrink-0 ml-1">
                        {idx.symbol.replace("^", "")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-primary">
                      {idx.price > 0 ? (
                        <AnimatedPrice price={idx.price} showIndicator={false} />
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  <div>
                    {idx.price > 0 ? (
                      <Badge value={idx.change_pct} market={idx.market} size="sm">
                        {idx.change > 0 ? `+${idx.change.toFixed(2)}` : idx.change.toFixed(2)} (
                        {idx.change_pct > 0
                          ? `+${idx.change_pct.toFixed(2)}`
                          : idx.change_pct.toFixed(2)}
                        %)
                      </Badge>
                    ) : (
                      <span className="text-muted text-xs">報價連線中...</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>

            {/* 編輯模式下的排序與刪除浮動控制按鈕 */}
            {isEditing && (
              <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                <button
                  type="button"
                  onClick={(e) => handleMoveCard(index, -1, e)}
                  disabled={index === 0}
                  className="p-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-secondary hover:text-primary disabled:opacity-30 cursor-pointer"
                  title="往前移動"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleMoveCard(index, 1, e)}
                  disabled={index === cards.length - 1}
                  className="p-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-secondary hover:text-primary disabled:opacity-30 cursor-pointer"
                  title="往後移動"
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleRemoveCard(idx.symbol, e)}
                  className="p-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                  title="移除此卡片"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
