"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { apiMarket } from "@/lib/api";
import { isTwMarketTradingHours } from "@/lib/marketHours";
import { formatNumber } from "@/lib/utils";
import { Zap, Volume2, VolumeX, Flame, PauseCircle } from "lucide-react";

interface WhaleTick {
  id: string;
  time: string;
  symbol: string;
  name: string;
  price: number;
  lots: number;
  amountM: number; // 成交金額 (百萬台幣)
  side: "BUY" | "SELL";
  tag: string;
  isLiveNew?: boolean;
}

interface RawRankRow {
  symbol: string;
  name: string;
  price: number;
  change_pct?: number;
  volume_lots?: number;
  tv?: number;
  bid1?: number;
  ask1?: number;
  trade_time?: string;
  date?: string;
}

function resolveSideAndTag(row: RawRankRow, lots: number, amountM: number): {
  side: "BUY" | "SELL";
  tag: string;
} {
  let isBuy = (row.change_pct ?? 0) >= 0;
  if (row.ask1 && row.ask1 > 0 && row.price >= row.ask1) {
    isBuy = true;
  } else if (row.bid1 && row.bid1 > 0 && row.price <= row.bid1) {
    isBuy = false;
  }

  const side: "BUY" | "SELL" = isBuy ? "BUY" : "SELL";
  let tag: string;
  if (isBuy) {
    tag = amountM >= 50 ? "機構特大單掃貨" : lots >= 300 ? "外盤大單急敲" : "主力外盤進場";
  } else {
    tag = amountM >= 50 ? "大戶高檔調節" : lots >= 300 ? "內盤大單賣出" : "主力獲利了結";
  }
  return { side, tag };
}

export default function WhaleOrderStream() {
  const [ticks, setTicks] = useState<WhaleTick[]>([]);
  const [tradeDate, setTradeDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [isTrading, setIsTrading] = useState<boolean>(() => isTwMarketTradingHours(true));
  const prevStateRef = useRef<Map<string, { volumeLots: number; tradeTime: string }>>(new Map());
  const soundOnRef = useRef(soundOn);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Web Audio 清脆大單提示音
  const playWhalePing = useCallback((isBuy: boolean) => {
    if (!soundOnRef.current || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(isBuy ? 880 : 440, now);
      osc.frequency.exponentialRampToValueAtTime(isBuy ? 1318.5 : 330, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }, []);

  // 每 15 秒檢查是否仍在台股盤中交易時段 (09:00 ~ 13:35 Asia/Taipei)
  useEffect(() => {
    const syncState = () => setIsTrading(isTwMarketTradingHours(true));
    syncState();
    const t = setInterval(syncState, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;

    const pollRealExchangeTicks = async (isInitial: boolean) => {
      try {
        const [turnoverRes, volumeRes] = await Promise.all([
          apiMarket.getRankings(20, "turnover").catch(() => null),
          isInitial ? apiMarket.getRankings(20, "volume").catch(() => null) : Promise.resolve(null),
        ]);
        if (!alive) return;

        const d1 = turnoverRes?.data;
        const d2 = volumeRes?.data;
        if (d1?.date || d2?.date) {
          setTradeDate(d1?.date || d2?.date);
        }

        const merged = new Map<string, RawRankRow>();
        for (const list of [d1?.twse, d1?.tpex, d1?.etf, d2?.twse, d2?.tpex]) {
          if (!Array.isArray(list)) continue;
          for (const row of list) {
            if (row?.symbol && Number(row.price) > 0 && !merged.has(row.symbol)) {
              merged.set(row.symbol, row);
            }
          }
        }

        const prevMap = prevStateRef.current;

        if (isInitial || prevMap.size === 0) {
          // 首次載入：僅擷取證交所/櫃買中心真實最近一筆撮合張數 (tv) 與撮合時間 (trade_time)
          const initialTicks: WhaleTick[] = [];
          for (const row of merged.values()) {
            const volLots = Number(row.volume_lots || 0);
            const tTime = row.trade_time || "";
            prevMap.set(row.symbol, { volumeLots: volLots, tradeTime: tTime });

            const singleLots = Number(row.tv || 0);
            if (singleLots <= 0 || !row.price) continue;
            const amountM = Number(((singleLots * row.price * 1000) / 1_000_000).toFixed(1));
            if (singleLots < 15 && amountM < 3) continue;

            const { side, tag } = resolveSideAndTag(row, singleLots, amountM);
            initialTicks.push({
              id: `init-${row.symbol}-${tTime || "close"}`,
              time: tTime || "13:30:00",
              symbol: row.symbol,
              name: row.name,
              price: row.price,
              lots: singleLots,
              amountM,
              side,
              tag,
              isLiveNew: false,
            });
          }

          initialTicks.sort((a, b) => b.amountM - a.amountM || b.lots - a.lots);
          setTicks(initialTicks.slice(0, 7));
          setLoading(false);
          return;
        }

        // 盤中即時比對前後兩次交易所真實張數與最新撮合單量變化
        const incomingTicks: WhaleTick[] = [];
        for (const row of merged.values()) {
          const curVolLots = Number(row.volume_lots || 0);
          const curTime = row.trade_time || "";
          const prev = prevMap.get(row.symbol);

          if (prev) {
            const volDelta = curVolLots > prev.volumeLots ? curVolLots - prev.volumeLots : 0;
            const timeAdvanced = Boolean(curTime && prev.tradeTime && curTime !== prev.tradeTime);
            const effectiveLots = volDelta > 0 ? volDelta : timeAdvanced ? Number(row.tv || 0) : 0;

            if (effectiveLots > 0 && row.price > 0) {
              const amountM = Number(((effectiveLots * row.price * 1000) / 1_000_000).toFixed(1));
              if (effectiveLots >= 25 || amountM >= 5) {
                const { side, tag } = resolveSideAndTag(row, effectiveLots, amountM);
                incomingTicks.push({
                  id: `${row.symbol}-${curTime || Date.now()}-${curVolLots}`,
                  time: curTime || "盤中",
                  symbol: row.symbol,
                  name: row.name,
                  price: row.price,
                  lots: effectiveLots,
                  amountM,
                  side,
                  tag,
                  isLiveNew: true,
                });
              }
            }
          }

          prevMap.set(row.symbol, { volumeLots: curVolLots, tradeTime: curTime });
        }

        if (incomingTicks.length > 0) {
          incomingTicks.sort((a, b) => b.amountM - a.amountM);
          const topIncoming = incomingTicks.slice(0, 3);
          playWhalePing(topIncoming[0].side === "BUY");
          setTicks((prev) => {
            const clearedOld = prev.map((t) => ({ ...t, isLiveNew: false }));
            return [...topIncoming, ...clearedOld].slice(0, 7);
          });
        }
      } catch (err) {
        console.error("Failed to poll real exchange whale ticks:", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    // 啟動時抓取一次真實交易所快照
    pollRealExchangeTicks(true);

    // 嚴格僅在台股交易期間 (09:00-13:35 Asia/Taipei) 才持續追蹤真實撮合變化；收盤後完全停止輪詢
    if (!isTrading) {
      return () => {
        alive = false;
      };
    }

    const timer = setInterval(() => {
      pollRealExchangeTicks(false);
    }, 4000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isTrading, playWhalePing]);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Zap
            size={16}
            className={isTrading ? "text-amber-400 fill-amber-400" : "text-muted"}
          />
          <span>盤中主力大單瀑布流 (Live Whale Tape)</span>
        </div>
      }
      subtitle={
        isTrading
          ? "盤中真實連線證交所 MIS 逐筆成交快照，追蹤單筆百張 / 千萬級大單變動"
          : `台股已收盤${tradeDate ? ` (${tradeDate})` : ""} · 靜態顯示最後一盤真實大單，僅於盤中 09:00–13:30 即時跳動`
      }
      headerAction={
        <div className="flex items-center gap-2">
          {isTrading ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              盤中偵測中
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              <PauseCircle size={12} />
              已收盤 · 已停止更新
            </span>
          )}
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundOn
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-[var(--bg-primary)] text-secondary border-[var(--border)] hover:text-primary"
            }`}
            title="開啟或關閉主力大單音效提醒"
          >
            {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{soundOn ? "大單音效 ON" : "音效 OFF"}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-11 bg-[var(--bg-tertiary)] rounded-xl" />
            ))}
          </div>
        ) : ticks.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted border border-dashed border-[var(--border)] rounded-xl">
            目前尚無達門檻之真實大單紀錄（盤中期間 09:00–13:30 將即時顯現交易所大量撮合）
          </div>
        ) : (
          ticks.map((t) => {
            const isBuy = t.side === "BUY";
            const isMega = t.amountM >= 50;
            return (
              <Link
                key={t.id}
                href={`/stock/${encodeURIComponent(t.symbol)}`}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all hover:scale-[1.01] ${
                  t.isLiveNew ? "animate-spring-pop" : ""
                } ${
                  isBuy
                    ? "bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60"
                    : "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[11px] text-muted">{t.time}</span>
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      isBuy ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                    }`}
                  >
                    {isMega && <Flame size={10} />}
                    {t.tag}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-primary truncate">
                    {t.name} <span className="font-mono text-xs text-secondary">{t.symbol}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs flex-shrink-0">
                  <span className="text-primary font-bold">${formatNumber(t.price, 2)}</span>
                  <span className={`font-extrabold ${isBuy ? "text-up" : "text-down"}`}>
                    {isBuy ? "+" : "-"}
                    {t.lots} 張
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-amber-400 font-bold hidden sm:inline">
                    {t.amountM} 百萬
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
