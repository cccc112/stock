"use client";

import { fetchOrBuildDeepReport } from "@/lib/clientDeepReport";

export interface RadarAlertEvent {
  id: string;
  symbol: string;
  name: string;
  ruleId: string;
  title: string;
  message: string;
  price: number;
  changePct: number;
  type: "up" | "down" | "info";
  timestamp: number;
}

const STORAGE_KEY_WATCHLIST = "watchlist_symbols";
const STORAGE_KEY_TRIGGERED = "triggered_radar_alerts";
const STORAGE_KEY_COOLDOWN = "radar_cooldown_map";
const COOLDOWN_MS = 30 * 60 * 1000; // 30 分鐘去重防洗版

export function getWatchlistSymbols(): string[] {
  if (typeof window === "undefined") return ["2330.TW", "2454.TW", "AAPL", "NVDA"];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WATCHLIST);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ["2330.TW", "2454.TW", "AAPL", "NVDA"];
}

export function getTriggeredAlerts(): RadarAlertEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIGGERED);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveTriggeredAlert(event: RadarAlertEvent) {
  if (typeof window === "undefined") return;
  try {
    const existing = getTriggeredAlerts();
    const updated = [event, ...existing.filter((e) => e.id !== event.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_TRIGGERED, JSON.stringify(updated));
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
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false; // 週末

  const hour = now.getHours();
  const min = now.getMinutes();
  const timeNum = hour * 100 + min;

  // 台股交易時間：09:00 ~ 13:30
  const isTwTrading = timeNum >= 900 && timeNum <= 1330;
  // 美股夏令/冬令大致時間：21:30 ~ 05:00
  const isUsTrading = timeNum >= 2130 || timeNum <= 500;

  return isTwTrading || isUsTrading;
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

      // 1. Minervini VCP 收斂爆發突破
      const vcpRatio = Number(min.vcp_ratio ?? 1.0);
      const minScore = Number(min.score ?? 0);
      if (vcpRatio <= 0.85 && minScore >= 5 && changePct >= 1.8) {
        const ruleId = "vcp_breakout";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          const event: RadarAlertEvent = {
            id: `${symbol}_${ruleId}_${now}`,
            symbol,
            name,
            ruleId,
            title: `⚡ Minervini VCP 波動壓縮突破`,
            message: `${name} 波動壓縮比 ${vcpRatio}x 完成洗盤，當日漲幅 ${changePct >= 0 ? "+" : ""}${changePct}% 帶量轉強！`,
            price,
            changePct,
            type: "up",
            timestamp: now,
          };
          triggeredEvents.push(event);
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
          const event: RadarAlertEvent = {
            id: `${symbol}_${ruleId}_${now}`,
            symbol,
            name,
            ruleId,
            title: `🎯 SMC 多方機構訂單塊踩點支撐`,
            message: `${name} 現價 $${price} 精準回測機構主力訂單塊支撐區 ($${obLow} ~ $${obHigh})，具高勝率進場防守位階！`,
            price,
            changePct,
            type: "info",
            timestamp: now,
          };
          triggeredEvents.push(event);
          cooldownMap[cooldownKey] = now;
        }
      }

      // 2.5 底部爆量主力起漲訊號 (Bottom Volume Breakout)
      if (changePct >= 2.5 && price > 0) {
        const ruleId = "bottom_volume_surge";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          const event: RadarAlertEvent = {
            id: `${symbol}_${ruleId}_${now}`,
            symbol,
            name,
            ruleId,
            title: `🔥 底部爆量主力吸籌起漲`,
            message: `${name} 於相對低檔打底後爆量收長紅 (+${changePct}%)，主力大單換手積極，帶量脫離底部成本區！`,
            price,
            changePct,
            type: "up",
            timestamp: now,
          };
          triggeredEvents.push(event);
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
            const event: RadarAlertEvent = {
              id: `${symbol}_${ruleId}_${now}`,
              symbol,
              name,
              ruleId,
              title: `💼 觸及 AI 委員會建議階梯進場區`,
              message: `${name} 現價 $${price} 進入委員會階梯掛單建議位階 ($${eLow} ~ $${eHigh})。`,
              price,
              changePct,
              type: "up",
              timestamp: now,
            };
            triggeredEvents.push(event);
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
          const event: RadarAlertEvent = {
            id: `${symbol}_${ruleId}_${now}`,
            symbol,
            name,
            ruleId,
            title: `🚨 跌破硬性防守停損價`,
            message: `${name} 現價 $${price} 已跌破防守價 $${stopLoss}，請嚴格執行風控紀律，切勿凹單！`,
            price,
            changePct,
            type: "down",
            timestamp: now,
          };
          triggeredEvents.push(event);
          cooldownMap[cooldownKey] = now;
        }
      }

      // 5. 當日急拉噴出
      if (changePct >= 4.0) {
        const ruleId = "momentum_surge";
        const cooldownKey = `${symbol}_${ruleId}`;
        const lastTriggered = cooldownMap[cooldownKey] || 0;

        if (now - lastTriggered > COOLDOWN_MS) {
          const event: RadarAlertEvent = {
            id: `${symbol}_${ruleId}_${now}`,
            symbol,
            name,
            ruleId,
            title: `🚀 自選股強勢噴出`,
            message: `${name} 當日大漲 +${changePct}%，目前報價 $${price}，多方買盤積極卡位！`,
            price,
            changePct,
            type: "up",
            timestamp: now,
          };
          triggeredEvents.push(event);
          cooldownMap[cooldownKey] = now;
        }
      }
    } catch (e) {
      // 容錯跳過個別標的
    }
  }

  // 儲存冷卻表
  try {
    localStorage.setItem(STORAGE_KEY_COOLDOWN, JSON.stringify(cooldownMap));
  } catch {}

  // 廣播與儲存觸發事件
  for (const ev of triggeredEvents) {
    saveTriggeredAlert(ev);

    // 觸發自定義 window 事件（供畫面上 Toast 捕捉）
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("watchlist_radar_alert", { detail: ev }));

      // 發送系統桌面 Notification（純靜音視覺通知）
      if (isNotificationSupported() && Notification.permission === "granted") {
        try {
          const notif = new Notification(`${ev.title} (${ev.symbol})`, {
            body: ev.message,
            silent: true, // 純靜音
            icon: "/favicon.ico",
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
