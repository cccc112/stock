"use client";

import { fetchOrBuildDeepReport } from "@/lib/clientDeepReport";
import { getCurrentUserNamespace } from "@/hooks/useAuth";
import { getSyncedHoldings } from "@/lib/holdingsSync";
import { isTwMarketTradingHours, isUsMarketTradingHours } from "@/lib/marketHours";

export interface RadarAlertEvent {
  id: string;
  symbol: string;
  name: string;
  ruleId: string;
  title: string;
  message: string;
  signals?: string[];
  price: number;
  changePct: number;
  type: "up" | "down" | "info";
  timestamp: number;
}

const STORAGE_KEY_WATCHLIST = "watchlist_symbols";
const STORAGE_KEY_TRIGGERED = "triggered_radar_alerts";
const STORAGE_KEY_COOLDOWN = "radar_cooldown_map";
const COOLDOWN_MS = 30 * 60 * 1000; // 30 分鐘去重防洗版

function getStorageNamespaceKey(base: string): string {
  const ns = getCurrentUserNamespace();
  return ns === "default" ? base : `${base}_${ns}`;
}

export function getWatchlistSymbols(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageNamespaceKey(STORAGE_KEY_WATCHLIST);
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) =>
            typeof item === "string" ? item.trim().toUpperCase() : item?.symbol?.trim().toUpperCase()
          )
          .filter(Boolean);
      }
    }
  } catch {}
  return [];
}

export function getTriggeredAlerts(): RadarAlertEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageNamespaceKey(STORAGE_KEY_TRIGGERED);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveTriggeredAlert(event: RadarAlertEvent) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageNamespaceKey(STORAGE_KEY_TRIGGERED);
    const existing = getTriggeredAlerts();
    const updated = [event, ...existing.filter((e) => e.id !== event.id)].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  return await Notification.requestPermission();
}

/**
 * 檢查當前是否為台股或美股盤中交易時段
 */
export function isMarketTradingHours(): boolean {
  return isTwMarketTradingHours() || isUsMarketTradingHours();
}

/**
 * 全自選股池背景自動量化雷達掃描
 */
export async function runWatchlistRadarScan(): Promise<RadarAlertEvent[]> {
  const symbols = getWatchlistSymbols();
  if (!symbols || symbols.length === 0) return [];

  const now = Date.now();
  let cooldownMap: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COOLDOWN);
    if (raw) cooldownMap = JSON.parse(raw);
  } catch {}

  const triggeredEvents: RadarAlertEvent[] = [];

  for (const symbol of symbols) {
    try {
      const report = await fetchOrBuildDeepReport(symbol);
      if (!report) continue;

      const price = Number(report.price || 0);
      const changePct = Number(report.change_pct || 0);
      const name = report.name || symbol;
      const min = report.models?.minervini || {};
      const smc = report.models?.smc || {};
      const verdict = report.verdict || {};

      // 聚合單一股票在此次掃描中觸發的所有信號
      const symbolSignals: {
        ruleId: string;
        title: string;
        message: string;
        type: "up" | "down" | "info";
      }[] = [];

      // 1. Minervini VCP 收斂爆發突破
      const vcpRatio = Number(min.vcp_ratio ?? 1.0);
      const minScore = Number(min.score ?? 0);
      if (vcpRatio <= 0.85 && minScore >= 5 && changePct >= 1.8) {
        const ruleId = "vcp_breakout";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          symbolSignals.push({
            ruleId,
            title: `Minervini VCP 波動壓縮突破`,
            message: `波動壓縮比 ${vcpRatio}x 完成洗盤，帶量轉強 (+${changePct}%)`,
            type: "up",
          });
          cooldownMap[cooldownKey] = now;
        }
      }

      // 2. SMC 多方機構訂單塊 (Bullish OB) 支撐踩點
      const obLow = Number(smc.bullish_ob?.low || 0);
      const obHigh = Number(smc.bullish_ob?.high || 0);
      if (obLow > 0 && obHigh > 0 && price >= obLow * 0.995 && price <= obHigh * 1.015) {
        const ruleId = "smc_bull_ob";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          symbolSignals.push({
            ruleId,
            title: `SMC 機構訂單塊踩點支撐`,
            message: `現價 $${price} 精準回測主力訂單塊支撐區 ($${obLow} ~ $${obHigh})`,
            type: "info",
          });
          cooldownMap[cooldownKey] = now;
        }
      }

      // 2.5 底部爆量主力起漲訊號 (Bottom Volume Breakout)
      if (changePct >= 2.5 && price > 0) {
        const ruleId = "bottom_volume_surge";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          symbolSignals.push({
            ruleId,
            title: `底部爆量主力換手起漲`,
            message: `打底後爆量收紅 (+${changePct}%)，主力大單換手積極脫離成本區`,
            type: "up",
          });
          cooldownMap[cooldownKey] = now;
        }
      }

      // 3. AI 投資委員會階梯進場價觸及
      const entryZone = verdict.entry_zone;
      if (Array.isArray(entryZone) && entryZone.length === 2) {
        const eLow = Number(entryZone[0]);
        const eHigh = Number(entryZone[1]);
        if (price >= eLow * 0.995 && price <= eHigh * 1.005) {
          const ruleId = "ladder_entry";
          const cooldownKey = `${symbol}_${ruleId}`;
          const lastTriggered = cooldownMap[cooldownKey] || 0;

          if (now - lastTriggered > COOLDOWN_MS) {
            symbolSignals.push({
              ruleId,
              title: `觸及 AI 委員會階梯進場區`,
              message: `現價 $${price} 進入建議階梯掛單位階 ($${eLow} ~ $${eHigh})`,
              type: "up",
            });
            cooldownMap[cooldownKey] = now;
          }
        }
      }

      // 4. 硬性防守停損價警示
      const stopLoss = Number(verdict.stop_loss || 0);
      if (stopLoss > 0 && price <= stopLoss) {
        const ruleId = "stop_loss_breach";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          symbolSignals.push({
            ruleId,
            title: `跌破硬性防守停損價`,
            message: `現價 $${price} 跌破防守價 $${stopLoss}，請嚴格執行風控紀律`,
            type: "down",
          });
          cooldownMap[cooldownKey] = now;
        }
      }

      // 5. 當日急拉噴出
      if (changePct >= 4.0) {
        const ruleId = "momentum_surge";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          symbolSignals.push({
            ruleId,
            title: `自選股強勢放量突破`,
            message: `當日大漲 +${changePct}%，目前報價 $${price}，多方買盤強勁`,
            type: "up",
          });
          cooldownMap[cooldownKey] = now;
        }
      }

      // 將該股票觸發的所有信號「整合為單一推播通知」，杜絕同一股票連發多條洗版
      if (symbolSignals.length === 1) {
        const sig = symbolSignals[0];
        triggeredEvents.push({
          id: `${symbol}_${sig.ruleId}_${now}`,
          symbol,
          name,
          ruleId: sig.ruleId,
          title: `${sig.title} (${symbol} ${name})`,
          message: `${name} 現價 $${price}（${changePct >= 0 ? "+" : ""}${changePct}%）：${sig.message}`,
          signals: [`${sig.title}：${sig.message}`],
          price,
          changePct,
          type: sig.type,
          timestamp: now,
        });
      } else if (symbolSignals.length > 1) {
        const hasDown = symbolSignals.some((s) => s.type === "down");
        const hasUp = symbolSignals.some((s) => s.type === "up");
        const aggType: "up" | "down" | "info" = hasDown ? "down" : hasUp ? "up" : "info";

        triggeredEvents.push({
          id: `${symbol}_aggregated_${now}`,
          symbol,
          name,
          ruleId: "aggregated",
          title: `${symbol} ${name} 多重雷達共振 (${symbolSignals.length} 項訊號)`,
          message: `${name} 現價 $${price} (${changePct >= 0 ? "+" : ""}${changePct}%) 同時觸發 ${symbolSignals.map((s) => s.title.replace(/^[^\s]+\s*/, "")).join("、")}`,
          signals: symbolSignals.map((s) => `${s.title}：${s.message}`),
          price,
          changePct,
          type: aggType,
          timestamp: now,
        });
      }
    } catch (e) {
      // 容錯跳過個別標的
    }
  }

  // 儲存冷卻表
  try {
    localStorage.setItem(STORAGE_KEY_COOLDOWN, JSON.stringify(cooldownMap));
  } catch {}

  // 預先取得「當日熱門前 10 檔」與「個人庫存持股」白名單，確保 LINE 主動通報嚴格只推送此範圍內的消息
  let hotTop10Set = new Set<string>();
  const hotVolumeMap = new Map<string, number>();
  const holdingSet = new Set<string>(
    getSyncedHoldings().map((h) => h.symbol.trim().toUpperCase())
  );

  const lineAutoPushEnabled =
    typeof window !== "undefined" && localStorage.getItem("line_auto_push_enabled") !== "false";

  if (lineAutoPushEnabled && triggeredEvents.length > 0 && isTwMarketTradingHours(true)) {
    try {
      const rankRes = await fetch("/api/market-rankings?limit=10&sort_by=volume", {
        cache: "no-store",
      });
      if (rankRes.ok) {
        const rankJson = await rankRes.json();
        const combined = [...(rankJson?.twse || []), ...(rankJson?.tpex || [])]
          .sort((a: any, b: any) => (b.volume_lots || 0) - (a.volume_lots || 0))
          .slice(0, 10);
        hotTop10Set = new Set(combined.map((x: any) => String(x.symbol).toUpperCase()));
        for (const x of combined) {
          hotVolumeMap.set(String(x.symbol).toUpperCase(), Number(x.volume_lots || 0));
        }
      }
    } catch {}
  }

  // 廣播與儲存觸發事件
  for (const ev of triggeredEvents) {
    saveTriggeredAlert(ev);

    // 觸發自定義 window 事件（供畫面上 Toast 捕捉）
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("watchlist_radar_alert", { detail: ev }));

      const upperSym = ev.symbol.toUpperCase();
      const eligibleForLine = hotTop10Set.has(upperSym) || holdingSet.has(upperSym);

      // ★ 嚴格限定：僅在台股交易時段，且標的是「當天熱門 10 檔」或「庫存持股」時才推播至 LINE ★
      if (lineAutoPushEnabled && isTwMarketTradingHours(true) && eligibleForLine) {
        fetch("/api/line/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "radar",
            mode: "broadcast",
            data: {
              symbol: ev.symbol,
              name: ev.name,
              price: ev.price,
              change: Number(((ev.price * ev.changePct) / 100).toFixed(2)),
              changePct: ev.changePct,
              volumeLots: hotVolumeMap.get(upperSym) || 0,
              triggerName: holdingSet.has(upperSym)
                ? `庫存焦點警示 · ${ev.title}`
                : `熱門10檔焦點 · ${ev.title}`,
              triggerDesc: ev.message,
              category: ev.type === "up" ? "BREAKOUT" : "VOLUME",
            },
          }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res?.success) {
              const logItem = {
                symbol: ev.symbol,
                name: ev.name,
                title: ev.title,
                price: ev.price,
                changePct: ev.changePct,
                time: new Date().toLocaleTimeString("zh-TW", { hour12: false }),
              };
              localStorage.setItem("last_line_auto_push_log", JSON.stringify(logItem));
              window.dispatchEvent(new CustomEvent("line_auto_pushed", { detail: logItem }));
            }
          })
          .catch(() => {});
      }

      // 發送系統桌面 Notification（純靜音視覺通知）
      if (isNotificationSupported() && Notification.permission === "granted") {
        try {
          const notif = new Notification(`${ev.title} (${ev.symbol})`, {
            body: ev.message,
            silent: true, // 純靜音
            icon: "/omnitick-avatar.png",
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = `/stock/${encodeURIComponent(ev.symbol)}`;
          };
        } catch {}
      }
    }
  }

  return triggeredEvents;
}
