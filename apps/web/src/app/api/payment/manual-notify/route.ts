import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan === "standard" ? "standard" : "pro";
    const last5Digits = String(body.last5Digits || "").trim();
    const bindCode = String(body.bindCode || "未提供").trim();
    const bankCode = String(body.bankCode || "").trim();

    if (!/^\d{5}$/.test(last5Digits)) {
      return NextResponse.json(
        { success: false, error: "請輸入正確的匯款帳號後 5 碼數字" },
        { status: 400 }
      );
    }

    const planName = plan === "standard" ? "OmniTick 標準版 (月費)" : "OmniTick Pro 旗艦版 (月費)";
    const amount = plan === "standard" ? 99 : 299;
    const orderId = `VIP${Date.now().toString().slice(-8)}`;
    const nowTw = new Date(Date.now() + 8 * 3600 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    let lineNotified = false;

    if (LINE_ACCESS_TOKEN) {
      const flexMessage = {
        type: "flex",
        altText: `💎 [VIP 轉帳開通通知] ${planName} (後五碼: ${last5Digits})`,
        contents: {
          type: "bubble",
          size: "mega",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#064E3B",
            paddingAll: "16px",
            contents: [
              {
                type: "text",
                text: "💎 熊霸 VIP 轉帳對帳與即時開通",
                color: "#34D399",
                size: "xs",
                weight: "bold",
              },
              {
                type: "text",
                text: planName,
                color: "#FFFFFF",
                size: "lg",
                weight: "bold",
                margin: "xs",
              },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#0F172A",
            paddingAll: "16px",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                contents: [
                  { type: "text", text: "訂單編號", color: "#94A3B8", size: "xs", flex: 2 },
                  { type: "text", text: orderId, color: "#F8FAFC", size: "xs", weight: "bold", flex: 4 },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  { type: "text", text: "實付金額", color: "#94A3B8", size: "xs", flex: 2 },
                  {
                    type: "text",
                    text: `NT$ ${amount}`,
                    color: "#FBBF24",
                    size: "sm",
                    weight: "bold",
                    flex: 4,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  { type: "text", text: "匯款後五碼", color: "#94A3B8", size: "xs", flex: 2 },
                  {
                    type: "text",
                    text: `${bankCode ? `(${bankCode}) ` : ""}${last5Digits}`,
                    color: "#34D399",
                    size: "sm",
                    weight: "bold",
                    flex: 4,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  { type: "text", text: "綁定代碼", color: "#94A3B8", size: "xs", flex: 2 },
                  { type: "text", text: bindCode, color: "#E2E8F0", size: "xs", flex: 4 },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  { type: "text", text: "開通時間", color: "#94A3B8", size: "xs", flex: 2 },
                  { type: "text", text: `${nowTw} (TW)`, color: "#CBD5E1", size: "xxs", flex: 4 },
                ],
              },
              {
                type: "separator",
                color: "#1E293B",
                margin: "md",
              },
              {
                type: "text",
                text: "✅ 系統已先行為您即時開通 VIP 權限！站長核對網銀入帳無誤後將持續維持您的訂閱資格。",
                color: "#94A3B8",
                size: "xxs",
                wrap: true,
                margin: "md",
              },
            ],
          },
        },
      };

      const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ messages: [flexMessage] }),
      });
      lineNotified = res.ok;
    }

    return NextResponse.json({
      success: true,
      orderId,
      plan,
      planName,
      amount,
      last5Digits,
      lineNotified,
      activatedAt: nowTw,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "對帳通報失敗" },
      { status: 500 }
    );
  }
}
