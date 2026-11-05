import { NextRequest, NextResponse } from "next/server";
import {
  createRadarAlertFlexCard,
  createPostMarketFlexCard,
  createWelcomeFlexCard,
  RadarSignalData,
} from "@/lib/line/flexCards";

export const dynamic = "force-dynamic";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

/**
 * 查詢 LINE 推播配額與服務狀態 (GET)
 */
export async function GET() {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json({
      configured: false,
      message: "尚未設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數",
    });
  }

  try {
    const quotaRes = await fetch("https://api.line.me/v2/bot/message/quota", {
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    const quotaData = quotaRes.ok ? await quotaRes.json() : null;

    const consumptionRes = await fetch("https://api.line.me/v2/bot/message/quota/consumption", {
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    const consumptionData = consumptionRes.ok ? await consumptionRes.json() : null;

    return NextResponse.json({
      configured: true,
      service: "OmniTick LINE Push & Broadcast Dispatcher",
      quota: quotaData,
      consumption: consumptionData,
    });
  } catch (err: any) {
    return NextResponse.json({
      configured: true,
      error: err.message,
    });
  }
}

/**
 * 主動發送 LINE 警報推播 (POST)
 *
 * 支援模式：
 * 1. broadcast：向所有已加好友的用戶群體推播
 * 2. push：向指定特定 LINE userId 推播
 * 3. multicast：向多個 LINE userIds 推播
 */
export async function POST(req: NextRequest) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json(
      {
        error: "LINE_CHANNEL_ACCESS_TOKEN 未配置，請於 Vercel 環境變數中設定後方可主動發送推播",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const mode = body.mode || "broadcast"; // "broadcast" | "push" | "multicast"
    const targetUserId = body.to || body.userId;

    let messages: any[] = [];

    // A. 若傳入雷達信號資料，自動封裝為精美 FlexCard
    if (body.type === "radar" && body.data) {
      const radarData: RadarSignalData = {
        symbol: body.data.symbol || "2330",
        name: body.data.name || "台積電",
        price: Number(body.data.price) || 0,
        change: Number(body.data.change) || 0,
        changePct: Number(body.data.changePct) || 0,
        volumeLots: body.data.volumeLots,
        triggerName: body.data.triggerName || "盤中量化訊號觸發",
        triggerDesc: body.data.triggerDesc || "股價強勢放量突破，主力資金淨流入",
        category: body.data.category || "BREAKOUT",
      };
      messages = [createRadarAlertFlexCard(radarData)];
    } else if (body.type === "text" || body.text) {
      // B. 純文字通知
      messages = [
        {
          type: "text",
          text: String(body.text || "").trim(),
        },
      ];
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
      // C. 原生 LINE Message 陣列
      messages = body.messages;
    } else {
      // 預設示範測試雷達卡片
      messages = [
        createRadarAlertFlexCard({
          symbol: "2330",
          name: "台積電",
          price: 2260,
          change: 10,
          changePct: 0.44,
          volumeLots: 38500,
          triggerName: "主力大單敲進 · 突破頸線",
          triggerDesc: "盤中 15 分 K 突破整理區間，大戶買賣比達 1.82，量能放大 160%",
          category: "BREAKOUT",
        }),
      ];
    }

    let endpoint = "https://api.line.me/v2/bot/message/broadcast";
    let payload: any = { messages };

    if (mode === "push") {
      if (!targetUserId || typeof targetUserId !== "string") {
        return NextResponse.json(
          { error: "push 模式必須提供 to (LINE userId)" },
          { status: 400 }
        );
      }
      endpoint = "https://api.line.me/v2/bot/message/push";
      payload = { to: targetUserId, messages };
    } else if (mode === "multicast") {
      if (!Array.isArray(targetUserId) || targetUserId.length === 0) {
        return NextResponse.json(
          { error: "multicast 模式必須提供 to (userId 字串陣列)" },
          { status: 400 }
        );
      }
      endpoint = "https://api.line.me/v2/bot/message/multicast";
      payload = { to: targetUserId, messages };
    }

    const lineRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      console.error("[LINE Push Failed]", lineRes.status, errText);
      return NextResponse.json(
        {
          success: false,
          status: lineRes.status,
          error: errText,
        },
        { status: lineRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      messagesCount: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("LINE push dispatch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
