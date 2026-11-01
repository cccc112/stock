"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { apiAlerts } from "@/lib/api";
import { getTriggeredAlerts } from "@/lib/watchlistRadar";

interface RawAlertItem {
  id: string;
  type: "up" | "down" | "info";
  symbol: string;
  title?: string;
  message: string;
  time: string;
  timestamp: number;
}

interface GroupedStockAlert {
  symbol: string;
  primaryType: "up" | "down" | "info";
  latestTime: string;
  latestTimestamp: number;
  signals: RawAlertItem[];
}

export default function AlertFeed() {
  const [groupedAlerts, setGroupedAlerts] = useState<GroupedStockAlert[]>([]);
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        let apiList: any[] = [];
        try {
          const res = await apiAlerts.getAlerts();
          apiList = Array.isArray(res.data) ? res.data : res.data.alerts || [];
        } catch {
          // ignore backend failure
        }

        const radarEvents = getTriggeredAlerts();

        const formattedRadar: RawAlertItem[] = radarEvents.map((r) => ({
          id: r.id,
          type: r.type,
          symbol: r.symbol.trim().toUpperCase(),
          title: r.title,
          message: r.message,
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: r.timestamp,
        }));

        const formattedApi: RawAlertItem[] = apiList.map((a) => ({
          id: a.id,
          type: a.type || "info",
          symbol: String(a.symbol || "").trim().toUpperCase(),
          title: a.title,
          message: a.message || `${a.condition || ""} ${a.value || ""}`,
          time: new Date(a.created_at || a.createdAt || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: new Date(a.created_at || a.createdAt || 0).getTime(),
        }));

        const allItems = [...formattedRadar, ...formattedApi].filter((it) => it.symbol);

        // 依個股代號 (symbol) 聚合收合為單一卡片
        const groupMap = new Map<string, GroupedStockAlert>();

        for (const item of allItems) {
          const sym = item.symbol;
          if (!groupMap.has(sym)) {
            groupMap.set(sym, {
              symbol: sym,
              primaryType: item.type,
              latestTime: item.time,
              latestTimestamp: item.timestamp || 0,
              signals: [item],
            });
          } else {
            const existing = groupMap.get(sym)!;
            // 避免完全重複之訊息
            if (!existing.signals.some((s) => s.message === item.message)) {
              existing.signals.push(item);
            }
            if ((item.timestamp || 0) > existing.latestTimestamp) {
              existing.latestTimestamp = item.timestamp || 0;
              existing.latestTime = item.time;
              existing.primaryType = item.type;
            }
          }
        }

        // 依最新觸發時間由新至舊排序
        const sortedGroups = Array.from(groupMap.values()).sort(
          (a, b) => b.latestTimestamp - a.latestTimestamp
        );

        setGroupedAlerts(sortedGroups.slice(0, 6));
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // 監聽即時雷達事件動態更新
    const handleUpdate = () => fetchAlerts();
    window.addEventListener("watchlist_radar_alert", handleUpdate);
    window.addEventListener("stock_auth_changed", handleUpdate);
    return () => {
      window.removeEventListener("watchlist_radar_alert", handleUpdate);
      window.removeEventListener("stock_auth_changed", handleUpdate);
    };
  }, []);

  const toggleExpand = (symbol: string) => {
    setExpandedSymbols((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span>自選股即時量化雷達警報</span>
            {groupedAlerts.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 font-mono font-semibold">
                已收合 {groupedAlerts.length} 檔標的
              </span>
            )}
          </div>
        </div>
      }
      className="mb-6"
    >
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="text-center text-secondary py-4 text-sm animate-pulse">
            雷達掃描中...
          </div>
        ) : groupedAlerts.length > 0 ? (
          groupedAlerts.map((group) => {
            const isMulti = group.signals.length > 1;
            const isExpanded = !!expandedSymbols[group.symbol];
            const primarySignal = group.signals[0];

            return (
              <div
                key={group.symbol}
                className="flex flex-col p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 transition-all border border-[var(--border)] gap-2"
              >
                {/* 卡片標題列 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {group.primaryType === "up" && (
                        <TrendingUp size={16} className="text-up-tw" />
                      )}
                      {group.primaryType === "down" && (
                        <TrendingDown size={16} className="text-down-tw" />
                      )}
                      {group.primaryType === "info" && (
                        <Zap size={16} className="text-accent" />
                      )}
                    </div>
                    <span className="font-bold text-sm text-primary tracking-tight font-mono">
                      {group.symbol}
                    </span>
                    {isMulti && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-accent/15 text-accent font-semibold border border-accent/30 font-mono">
                        <Layers size={10} />
                        共 {group.signals.length} 項訊號
                      </span>
                    )}
                    {primarySignal.title && (
                      <span className="text-[11px] font-medium text-accent truncate max-w-[160px]">
                        {primarySignal.title}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-secondary flex-shrink-0">
                    {group.latestTime}
                  </span>
                </div>

                {/* 主要訊息摘要 */}
                <p className="text-xs text-secondary leading-relaxed pl-6">
                  {primarySignal.message}
                </p>

                {/* 多項訊號時之收合與展開區 */}
                {isMulti && (
                  <div className="pl-6 pt-1">
                    {!isExpanded ? (
                      /* 未展開時：呈現簡潔標籤縮略 */
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {group.signals.slice(1).map((sig, sidx) => (
                          <span
                            key={sidx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-secondary font-mono truncate max-w-[200px]"
                          >
                            {sig.title || sig.message.slice(0, 20)}
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.symbol)}
                          className="text-[11px] text-accent hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-1 font-medium"
                        >
                          <span>查看全部 ({group.signals.length})</span>
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    ) : (
                      /* 展開狀態：完整時間序列清單 */
                      <div className="space-y-1.5 mt-1.5 p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] animate-fade-in">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-primary pb-1 border-b border-[var(--border)]/60">
                          <span>觸發訊號歷程明細</span>
                          <button
                            type="button"
                            onClick={() => toggleExpand(group.symbol)}
                            className="text-muted hover:text-primary inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>收合</span>
                            <ChevronUp size={12} />
                          </button>
                        </div>
                        {group.signals.map((sig, sidx) => (
                          <div
                            key={sidx}
                            className="text-[11px] flex items-start justify-between gap-2 py-1 border-b border-[var(--border)]/30 last:border-0"
                          >
                            <div className="flex items-start gap-1.5 min-w-0">
                              <span className="text-accent flex-shrink-0 mt-0.5">•</span>
                              <span className="text-secondary leading-relaxed">
                                {sig.title ? (
                                  <strong className="text-primary mr-1">[{sig.title}]</strong>
                                ) : null}
                                {sig.message}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-muted flex-shrink-0">
                              {sig.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 底部導航捷徑 */}
                <div className="flex justify-end pt-1">
                  <Link
                    href={`/stock/${encodeURIComponent(group.symbol)}`}
                    className="text-[11px] text-accent hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>開啟個股戰情</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-secondary py-5 text-xs">
            目前自選股皆在常態區間震盪，暫無觸發突破或破線警報
          </div>
        )}
      </div>
    </Card>
  );
}
