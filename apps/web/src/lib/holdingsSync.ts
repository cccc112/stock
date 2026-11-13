"use client";

import { getCurrentUserNamespace } from "@/hooks/useAuth";
import { apiPortfolio, apiSimulator } from "@/lib/api";

export interface SyncedHolding {
  symbol: string;
  name?: string;
  shares: number;
  avg_price?: number;
  current_price?: number;
  pnl?: number;
  pnl_pct?: number;
  market?: string;
  source: "real" | "simulator";
}

const KEY_REAL = "omnitick_synced_real_holdings_v1";
const KEY_SIM = "omnitick_synced_sim_holdings_v1";

function scopedKey(base: string): string {
  const ns = getCurrentUserNamespace();
  return ns === "default" ? base : `${base}_${ns}`;
}

function normalizeHolding(raw: Record<string, unknown>, source: "real" | "simulator"): SyncedHolding | null {
  const symbol = String(raw?.symbol || "").trim().toUpperCase();
  const shares = Number(raw?.shares ?? raw?.qty ?? 0);
  if (!symbol || shares <= 0) return null;

  return {
    symbol,
    name: raw?.name ? String(raw.name).trim() : symbol,
    shares,
    avg_price: Number(raw?.avg_price ?? raw?.avgCost ?? 0) || undefined,
    current_price: Number(raw?.current_price ?? raw?.currentPrice ?? 0) || undefined,
    pnl: raw?.pnl != null ? Number(raw.pnl) : undefined,
    pnl_pct: raw?.pnl_pct != null ? Number(raw.pnl_pct) : raw?.pnlPercent != null ? Number(raw.pnlPercent) : undefined,
    market: raw?.market ? String(raw.market) : undefined,
    source,
  };
}

export function saveSyncedRealHoldings(holdings: Record<string, unknown>[]): void {
  if (typeof window === "undefined" || !Array.isArray(holdings)) return;
  try {
    const clean = holdings
      .map((h) => normalizeHolding(h, "real"))
      .filter((x): x is SyncedHolding => Boolean(x));
    localStorage.setItem(scopedKey(KEY_REAL), JSON.stringify(clean));
  } catch {}
}

export function saveSyncedSimHoldings(portfolios: { holdings?: Record<string, unknown>[] }[]): void {
  if (typeof window === "undefined" || !Array.isArray(portfolios)) return;
  try {
    const all: SyncedHolding[] = [];
    for (const p of portfolios) {
      if (!Array.isArray(p?.holdings)) continue;
      for (const h of p.holdings) {
        const mapped = normalizeHolding(h, "simulator");
        if (mapped) all.push(mapped);
      }
    }
    localStorage.setItem(scopedKey(KEY_SIM), JSON.stringify(all));
  } catch {}
}

export function getSyncedHoldings(): SyncedHolding[] {
  if (typeof window === "undefined") return [];
  const merged = new Map<string, SyncedHolding>();

  const readList = (key: string) => {
    try {
      const raw = localStorage.getItem(scopedKey(key));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        const sym = String(item?.symbol || "").trim().toUpperCase();
        if (!sym || Number(item?.shares || 0) <= 0) continue;
        if (!merged.has(sym)) {
          merged.set(sym, item);
        }
      }
    } catch {}
  };

  // 真實庫存優先，若無再合併模擬庫存
  readList(KEY_REAL);
  readList(KEY_SIM);

  return Array.from(merged.values());
}

/**
 * 靜默從後端同步最新真實與模擬庫存至本機快取（附超時保護，不阻塞 UI）
 */
export async function refreshSyncedHoldingsFromApi(timeoutMs = 2000): Promise<SyncedHolding[]> {
  try {
    const syncTask = Promise.allSettled([
      apiPortfolio.getHoldings().then((res) => {
        if (Array.isArray(res?.data)) saveSyncedRealHoldings(res.data);
      }),
      apiSimulator.getPortfolios().then((res) => {
        if (Array.isArray(res?.data)) saveSyncedSimHoldings(res.data);
      }),
    ]);
    await Promise.race([
      syncTask,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {}
  return getSyncedHoldings();
}
