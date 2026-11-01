import { NextResponse } from "next/server";
import { GoogleUserPayload } from "./auth";

interface RateLimitRecord {
  count: number;
  resetAt: number; // 毫秒時間戳
}

// 記憶體滑動窗口記錄表
const rateLimitStore = new Map<string, RateLimitRecord>();

// 預設頻率階梯 (60 秒內允許的最大請求數)
export const RATE_LIMIT_TIERS = {
  VISITOR: 30,       // 未登入訪客 (IP 限制)
  AUTHENTICATED: 120, // 已登入使用者 (Google ID Token)
  PRO: 600,          // Pro / 高頻交易者
} as const;

const WINDOW_MS = 60 * 1000; // 60 秒滑動窗口

// 每隔 3 分鐘自動清理過期條目，避免 Serverless/Node 記憶體洩漏
let lastCleanup = Date.now();
function cleanupStaleRecords(now: number) {
  if (now - lastCleanup < 180000) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * 取得請求來源 IP
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "127.0.0.1"
  );
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // 秒級 Unix timestamp
  retryAfter: number; // 秒數
  headers: Record<string, string>;
}

/**
 * 執行頻率限制檢查
 */
export function checkRateLimit(
  req: Request,
  user?: GoogleUserPayload | null,
  customLimit?: number
): RateLimitResult {
  const now = Date.now();
  cleanupStaleRecords(now);

  const ip = getClientIp(req);
  const isAuthenticated = Boolean(user?.sub);
  
  // 決定此請求的配額上限與 Key
  const limit = customLimit ?? (isAuthenticated ? RATE_LIMIT_TIERS.AUTHENTICATED : RATE_LIMIT_TIERS.VISITOR);
  const key = isAuthenticated ? `usr_${user!.sub}` : `ip_${ip}`;

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    // 建立新窗口
    const resetAt = now + WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    const resetSec = Math.ceil(resetAt / 1000);

    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(limit - 1),
      "X-RateLimit-Reset": String(resetSec),
    };

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetSec,
      retryAfter: 0,
      headers,
    };
  }

  // 現有窗口內累加
  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const resetSec = Math.ceil(existing.resetAt / 1000);
  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetSec),
  };

  if (existing.count > limit) {
    headers["Retry-After"] = String(retryAfterSec);
    return {
      success: false,
      limit,
      remaining: 0,
      reset: resetSec,
      retryAfter: retryAfterSec,
      headers,
    };
  }

  return {
    success: true,
    limit,
    remaining,
    reset: resetSec,
    retryAfter: 0,
    headers,
  };
}

/**
 * 產生標準 429 Too Many Requests 回應
 */
export function createRateLimitExceededResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "rate_limit_exceeded",
      message: `請求頻率超過上限（上限 ${result.limit} 次/分鐘），請等待 ${result.retryAfter} 秒後重試。登入帳號可獲取更高額度。`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: result.headers,
    }
  );
}
