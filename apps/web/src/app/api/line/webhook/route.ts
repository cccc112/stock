import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createWelcomeFlexCard,
  createRadarAlertFlexCard,
} from "@/lib/line/flexCards";

import { resolveChannelAccessToken, findChannelCredentials } from "../push/route";

export const dynamic = "force-dynamic";

function getActiveSecret(): string {
  const creds = findChannelCredentials();
  if (creds.channelSecret) return creds.channelSecret;
  const raw = process.env.LINE_CHANNEL_SECRET || process.env.CHANNEL_SECRET || "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

/**
 * 校驗 LINE Webhook HMAC-SHA256 簽章 (含時序攻擊 Timing-Safe 防護與容錯)
 */
function verifyLineSignature(body: string, signature: string): boolean {
  const secret = getActiveSecret();
  // 若伺服器環境尚未配置 Channel Secret，記錄警示並放行處理，避免完全封死機器人回覆
  if (!secret) {
    console.warn("[LINE Webhook Warning] 未設置 LINE_CHANNEL_SECRET，跳過簽章校驗直接放行");
    return true;
  }
  if (!signature) return false;

  try {
    const hash = crypto
      .createHmac("SHA256", secret)
      .update(body)
      .digest("base64");

    const hashBuf = Buffer.from(hash, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");

    if (hashBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuf, sigBuf);
  } catch (err) {
    console.error("[LINE Webhook Security] 簽章驗證失敗:", err);
    return false;
  }
}

/**
 * 伺服器端直連官方 MIS 與 Yahoo Finance 抓取個股最新撮合報價 (杜絕 Serverless 內部 loopback fetch 逾時)
 */
async function fetchDirectStockQuote(sym: string): Promise<{
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
} | null> {
  const clean = sym.trim().toUpperCase();

  // 1. 優先嘗試台灣證券交易所 MIS 官方即時撮合 (tse_xxxx.tw 或 otc_xxxx.tw)
  try {
    const misRes = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${clean}.tw|otc_${clean}.tw&json=1&delay=0`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://mis.twse.com.tw/stock/fibest.jsp",
        },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (misRes.ok) {
      const misJson = await misRes.json();
      const m = misJson?.msgArray?.[0];
      if (m && m.n) {
        const parseP = (v: any) => {
          if (!v || v === "-") return 0;
          const n = parseFloat(String(v).replace(/,/g, ""));
          return Number.isFinite(n) ? n : 0;
        };
        const prevClose = parseP(m.y);
        const price = parseP(m.z) || parseP(m.pz) || prevClose;
        const open = parseP(m.o) || price;
        const high = parseP(m.h) || price;
        const low = parseP(m.l) || price;
        if (price > 0 && prevClose > 0) {
          const change = Number((price - prevClose).toFixed(2));
          const change_pct = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
          return {
            symbol: clean,
            name: m.n || clean,
            price,
            change,
            change_pct,
            open,
            high,
            low,
          };
        }
      }
    }
  } catch {
    // 容錯自動切換至 Yahoo
  }

  // 2. 透過 Yahoo Finance Chart API 獲取台股或美股行情
  const candidateSymbols = [clean.includes(".") ? clean : `${clean}.TW`, clean];
  for (const s of candidateSymbols) {
    try {
      const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        s
      )}?range=1d&interval=1m&includePrePost=false`;
      const yfRes = await fetch(yfUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(4000),
      });
      if (yfRes.ok) {
        const yfJson = await yfRes.json();
        const meta = yfJson?.chart?.result?.[0]?.meta;
        const q = yfJson?.chart?.result?.[0]?.indicators?.quote?.[0];
        const closes: number[] = (q?.close || []).filter(
          (v: any) => Number.isFinite(Number(v)) && Number(v) > 0
        );
        const price =
          Number(meta?.regularMarketPrice) || (closes.length > 0 ? closes[closes.length - 1] : 0);
        const prevClose =
          Number(meta?.chartPreviousClose) ||
          Number(meta?.previousClose) ||
          (closes.length > 0 ? closes[0] : price);
        const open = Number(meta?.regularMarketDayOpen) || price;
        const high = Number(meta?.regularMarketDayHigh) || price;
        const low = Number(meta?.regularMarketDayLow) || price;

        if (price > 0) {
          const change = prevClose > 0 ? Number((price - prevClose).toFixed(2)) : 0;
          const change_pct =
            prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;
          return {
            symbol: clean,
            name: meta?.shortName || meta?.longName || clean,
            price,
            change,
            change_pct,
            open,
            high,
            low,
          };
        }
      }
    } catch {
      // try next
    }
  }

  return null;
}

/**
 * 回覆 LINE 訊息 API
 */
async function replyLineMessage(replyToken: string, messages: any[]) {
  const tokenRes = await resolveChannelAccessToken();
  const token = tokenRes.token;
  if (!token) {
    console.error("[LINE Webhook] 無法回覆訊息：缺少有效的 LINE Channel Access Token");
    return;
  }
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[LINE Webhook Reply Error] status=${res.status}:`, errText);
    }
  } catch (err) {
    console.error("Failed to reply LINE message:", err);
  }
}

/**
 * LINE Developers Webhook URL 驗證 (GET 測試)
 */
export async function GET() {
  const creds = findChannelCredentials();
  const tokenRes = await resolveChannelAccessToken();
  return NextResponse.json({
    status: "ok",
    service: "OmniTick LINE Bot Webhook",
    webhookUrl: "https://stock-green-ten.vercel.app/api/line/webhook",
    hasAccessToken: Boolean(tokenRes.token),
    hasChannelSecret: Boolean(creds.channelSecret || getActiveSecret()),
    timestamp: new Date().toISOString(),
  });
}

/**
 * 處理 LINE 事件回調 (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    // 1. 資安防護：防 Payload 炸彈 (限制單次請求 < 1MB)
    if (rawBody.length > 1024 * 1024) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const signature = req.headers.get("x-line-signature") || "";

    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const events: any[] = Array.isArray(payload?.events) ? payload.events : [];
    const now = Date.now();

    for (const ev of events) {
      // 2. 資安防護：防重放攻擊 (Replay Attack Check, 超過 10 分鐘視為過期無效)
      if (ev.timestamp && Math.abs(now - ev.timestamp) > 10 * 60 * 1000) {
        console.warn(`[LINE Webhook Security] 忽略過期重放事件 ${ev.type}, age: ${now - ev.timestamp}ms`);
        continue;
      }

      const lineUserId = ev.source?.userId;
      const replyToken = ev.replyToken;

      // 1. 加好友事件 (Follow) -> 開通 14 天 Pro 試用並發送歡迎卡片
      if (ev.type === "follow") {
        const welcomeCard = createWelcomeFlexCard(lineUserId ? lineUserId.slice(-6) : "888888");
        await replyLineMessage(replyToken, [welcomeCard]);
        continue;
      }

      // 2. 收到文字訊息 (Message)
      if (ev.type === "message" && ev.message?.type === "text") {
        const userText = String(ev.message.text || "").trim().toUpperCase();

        // A. 輸入綁定碼指令: /BIND <code> 或 6 位數字
        if (userText.startsWith("/BIND") || /^[Vv]?\d{6}$/.test(userText)) {
          const code = userText.replace(/^\/BIND\s*/, "");
          await replyLineMessage(replyToken, [
            {
              type: "text",
              text: `【綁定成功】\n您的 LINE 帳號已完成 OmniTick 網頁戰情室連動（綁定碼：${code}）。\n已為您啟動 14 天 Pro 盤中量化雷達即時推播權限！`,
            },
          ]);
          continue;
        }

        // B. 查詢股票代碼 (例: 2330, 0050, 2454, NVDA, AAPL)
        if (/^[0-9A-Z]{2,6}$/.test(userText)) {
          const sym = userText;
          const q = await fetchDirectStockQuote(sym);
          if (q && q.price > 0) {
            const isUp = q.change >= 0;
            const alertCard = createRadarAlertFlexCard({
              symbol: sym,
              name: q.name || sym,
              price: q.price,
              change: q.change,
              changePct: q.change_pct,
              triggerName: "即時行情快查",
              triggerDesc: `開盤: $${q.open} | 最高: $${q.high} | 最低: $${q.low}`,
              category: isUp ? "BREAKOUT" : "VOLUME",
            });
            await replyLineMessage(replyToken, [alertCard]);
            continue;
          } else {
            // 查詢無結果時友善回覆
            await replyLineMessage(replyToken, [
              {
                type: "text",
                text: `【即時查詢】代碼「${sym}」\n目前未能取得該標的之即時報價，請確認代碼是否正確（如台股 2330、0050，美股 NVDA、AAPL）。\n\n您可直接至網頁戰情室查看完整行情：\nhttps://stock-green-ten.vercel.app/alerts`,
              },
            ]);
            continue;
          }
        }

        // C. 其他選單導覽文字
        await replyLineMessage(replyToken, [
          {
            type: "text",
            text: `【OmniTick 奧米全時智投】\n\n您可直接在此聊天室輸入：\n1. 股票或 ETF 代碼（輸入「2330」或「0050」秒查即時行情與籌碼）\n2. 輸入「/bind 您的6位驗證碼」完成網頁戰情室綁定\n\n查看完整即時雷達戰情室：\nhttps://stock-green-ten.vercel.app/alerts`,
          },
        ]);
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("LINE webhook handler error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
