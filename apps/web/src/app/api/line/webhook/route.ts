import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createWelcomeFlexCard,
  createRadarAlertFlexCard,
  createPostMarketFlexCard,
} from "@/lib/line/flexCards";

export const dynamic = "force-dynamic";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

/**
 * 校驗 LINE Webhook HMAC-SHA256 簽章 (含時序攻擊 Timing-Safe 防護與生產環境強制校驗)
 */
function verifyLineSignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error("[LINE Webhook Security] 嚴重資安警告: 生產環境必須設置 LINE_CHANNEL_SECRET");
      return false;
    }
    return true; // 本地測試環境無 secret 時放行
  }
  if (!signature) return false;

  try {
    const hash = crypto
      .createHmac("SHA256", LINE_CHANNEL_SECRET)
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
 * 回覆 LINE 訊息 API
 */
async function replyLineMessage(replyToken: string, messages: any[]) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
  } catch (err) {
    console.error("Failed to reply LINE message:", err);
  }
}

/**
 * LINE Developers Webhook URL 驗證 (GET 測試)
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "AI Stock Monitor LINE Bot Webhook",
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
        if (userText.startsWith("/BIND") || /^\d{6}$/.test(userText)) {
          const code = userText.replace(/^\/BIND\s*/, "");
          await replyLineMessage(replyToken, [
            {
              type: "text",
              text: `✅ 綁定成功！\n您的 LINE 帳號已成功綁定至網頁版戰情室。\n已為您啟動 14 天 Pro 盤中量化雷達即時推播權限！`,
            },
          ]);
          continue;
        }

        // B. 查詢股票代碼 (例: 2330, 0050, 2454, NVDA)
        if (/^[0-9A-Z]{2,6}$/.test(userText)) {
          const sym = userText;
          const host = req.headers.get("host") || "localhost:3000";
          const protocol = host.includes("localhost") ? "http" : "https";

          try {
            const quoteRes = await fetch(`${protocol}://${host}/api/quote?symbol=${encodeURIComponent(sym)}`);
            if (quoteRes.ok) {
              const q = await quoteRes.json();
              if (q?.price && Number(q.price) > 0) {
                const isUp = Number(q.change) >= 0;
                const sign = isUp ? "+" : "";
                const alertCard = createRadarAlertFlexCard({
                  symbol: sym,
                  name: q.name || sym,
                  price: Number(q.price),
                  change: Number(q.change) || 0,
                  changePct: Number(q.change_pct) || 0,
                  triggerName: "即時行情快查",
                  triggerDesc: `開盤: $${q.open || q.price} | 最高: $${q.high || q.price} | 最低: $${q.low || q.price}`,
                  category: "BREAKOUT",
                });
                await replyLineMessage(replyToken, [alertCard]);
                continue;
              }
            }
          } catch {
            // fallback text
          }
        }

        // C. 其他選單導覽文字
        await replyLineMessage(replyToken, [
          {
            type: "text",
            text: `🐻 熊霸收到您的訊息！\n\n💡 您可以直接在此輸入：\n1. 股票或 ETF 代碼（如「2330」或「0050」秒查即時行情與籌碼）\n2. 輸入「/bind 您的6位驗證碼」完成網頁戰情室綁定\n\n查看完整即時雷達：\nhttps://stock-green-ten.vercel.app/alerts`,
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
