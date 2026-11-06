import { NextRequest, NextResponse } from "next/server";
import {
  createRadarAlertFlexCard,
  RadarSignalData,
} from "@/lib/line/flexCards";

export const dynamic = "force-dynamic";

/**
 * 清理 Token 去除前後引號與 Bearer 前綴
 */
function cleanToken(t?: string | null): string {
  if (!t || typeof t !== "string") return "";
  let res = t.trim();
  res = res.replace(/^["']|["']$/g, "").trim();
  res = res.replace(/^Bearer\s+/i, "").trim();
  return res;
}

export interface LineTokenResult {
  token: string;
  source: string;
  diagnostic?: string;
}

/**
 * 取得 LINE Channel Access Token，支援自訂傳入、多種命名、大小寫模糊容錯與精準診斷
 */
export function getChannelAccessToken(customToken?: string): LineTokenResult {
  // 1. 優先取用前端手動傳入的 Token (繞過 Vercel 部署直接生效)
  const cleanedCustom = cleanToken(customToken);
  if (cleanedCustom && cleanedCustom.length > 10) {
    return { token: cleanedCustom, source: "custom_request" };
  }

  // 2. 常見標準命名清單
  const standardKeys = [
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_ACCESS_TOKEN",
    "CHANNEL_ACCESS_TOKEN",
    "LINE_BOT_CHANNEL_ACCESS_TOKEN",
    "LINE_CHANNEL_TOKEN",
    "LINE_TOKEN",
    "NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN",
    "NEXT_PUBLIC_LINE_ACCESS_TOKEN",
    "LINE_MESSAGING_TOKEN",
    "MESSAGING_API_TOKEN",
  ];

  for (const k of standardKeys) {
    const val = cleanToken(process.env[k]);
    if (val && val.length > 10) {
      return { token: val, source: `env:${k}` };
    }
  }

  // 3. 動態遍歷 process.env 容錯大小寫 (如 line_channel_access_token)
  for (const [key, rawVal] of Object.entries(process.env)) {
    const val = cleanToken(rawVal);
    const upperKey = key.toUpperCase();
    if (val && val.length > 10) {
      if (
        (upperKey.includes("LINE") && upperKey.includes("TOKEN")) ||
        (upperKey.includes("CHANNEL") && upperKey.includes("ACCESS"))
      ) {
        return { token: val, source: `env_fuzzy:${key}` };
      }
    }
  }

  // 4. 偵錯分析：抓出有被填寫但長度異常的相關變數
  const relatedEntries = Object.entries(process.env).filter(([k]) => {
    const u = k.toUpperCase();
    return u.includes("LINE") || u.includes("CHANNEL");
  });

  let diagnostic = "";
  if (relatedEntries.length > 0) {
    const details = relatedEntries
      .map(([k, v]) => `${k} (長度 ${cleanToken(v).length} 碼)`)
      .join(", ");
    
    // 檢查是否有長度 32 碼 (通常是 Channel Secret) 或 10 碼 (Channel ID)
    const hasSecretLike = relatedEntries.some(([, v]) => cleanToken(v).length === 32);
    const hasIdLike = relatedEntries.some(([, v]) => cleanToken(v).length >= 8 && cleanToken(v).length <= 12);
    
    if (hasSecretLike) {
      diagnostic = `在 Vercel 找到了 ${details}，但其長度為 32 碼，這疑似是「Channel Secret」，不是「Channel Access Token」！長期 Token 長度通常在 150 碼以上。`;
    } else if (hasIdLike) {
      diagnostic = `在 Vercel 找到了 ${details}，但長度只有約 10 碼，這疑似是 Channel ID 或 Basic ID，不是發送推播用的「Channel access token (long-lived)」！`;
    } else {
      diagnostic = `在 Vercel 找到了 ${details}，但長度不符合有效 Access Token 標準。`;
    }
  }

  return { token: "", source: "none", diagnostic };
}

/**
 * 查詢 LINE 推播配額與金鑰配置狀態 (GET)
 */
export async function GET(req: NextRequest) {
  const customToken = req.nextUrl.searchParams.get("token") || undefined;
  const tokenRes = getChannelAccessToken(customToken);
  const token = tokenRes.token;

  if (!token) {
    const relatedKeys = Object.keys(process.env).filter((k) => {
      const u = k.toUpperCase();
      return u.includes("LINE") || u.includes("CHANNEL");
    });

    return NextResponse.json({
      configured: false,
      message:
        tokenRes.diagnostic ||
        "伺服器環境變數尚未讀取到 LINE 金鑰。若已在 Vercel 後台新增，請確認 Production 環境有勾選，並至 Deployments 點選 Redeploy！",
      foundKeys: relatedKeys,
      checkedKeys: [
        "LINE_CHANNEL_ACCESS_TOKEN",
        "LINE_ACCESS_TOKEN",
        "CHANNEL_ACCESS_TOKEN",
      ],
    });
  }

  const maskedToken =
    token.length > 12
      ? `${token.slice(0, 8)}...${token.slice(-4)} (長度 ${token.length} 碼)`
      : `${token.slice(0, 4)}...`;

  try {
    // 檢測配額
    const quotaRes = await fetch("https://api.line.me/v2/bot/message/quota", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const quotaData = quotaRes.ok ? await quotaRes.json() : null;

    // 檢測本月已用推播數
    const consumptionRes = await fetch(
      "https://api.line.me/v2/bot/message/quota/consumption",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const consumptionData = consumptionRes.ok ? await consumptionRes.json() : null;

    if (!quotaRes.ok && quotaRes.status === 401) {
      return NextResponse.json({
        configured: true,
        valid: false,
        tokenInfo: maskedToken,
        error:
          "金鑰認證失敗 (401 Unauthorized)。請確認您複製的是 LINE Developers 裡面 Messaging API 頁籤最下方的「Channel access token (long-lived)」，而非 Channel Secret 或 Basic ID。",
      });
    }

    return NextResponse.json({
      configured: true,
      valid: true,
      tokenInfo: maskedToken,
      service: "OmniTick LINE Push & Broadcast Dispatcher",
      quota: quotaData,
      consumption: consumptionData,
    });
  } catch (err: any) {
    return NextResponse.json({
      configured: true,
      valid: false,
      tokenInfo: maskedToken,
      error: `連線至 LINE 伺服器失敗: ${err.message}`,
    });
  }
}

/**
 * 主動發送 LINE 警報推播 (POST)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tokenRes = getChannelAccessToken(body.token);
    const token = tokenRes.token;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          code: "TOKEN_NOT_FOUND",
          error:
            tokenRes.diagnostic ||
            "尚未讀取到 LINE_CHANNEL_ACCESS_TOKEN。若已在 Vercel 設定，請至 Vercel Deployments 點選 Redeploy 重新部署，或直接在畫面中填入 Token 立即發送！",
        },
        { status: 400 }
      );
    }

    const mode = body.mode || "broadcast"; // "broadcast" | "push" | "multicast"
    const targetUserId = body.to || body.userId;

    let messages: any[] = [];

    // A. 若傳入雷達信號資料，自動封裝為精美 FlexCard
    if (body.type === "radar" && body.data) {
      const radarData: RadarSignalData = {
        symbol: body.data.symbol || "2330",
        name: body.data.name || "台積電",
        price: Number(body.data.price) || 2260,
        change: Number(body.data.change) || 10,
        changePct: Number(body.data.changePct) || 0.44,
        volumeLots: body.data.volumeLots || 38500,
        triggerName: body.data.triggerName || "主力大單敲進 · 突破頸線",
        triggerDesc:
          body.data.triggerDesc || "盤中 15 分 K 突破整理區間，大戶買賣比達 1.82，量能放大 160%",
        category: body.data.category || "BREAKOUT",
      };
      messages = [createRadarAlertFlexCard(radarData)];
    } else if (body.type === "text" || body.text) {
      messages = [
        {
          type: "text",
          text: String(body.text || "").trim(),
        },
      ];
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
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
          { success: false, error: "push 模式必須提供 to (LINE userId)" },
          { status: 400 }
        );
      }
      endpoint = "https://api.line.me/v2/bot/message/push";
      payload = { to: targetUserId, messages };
    } else if (mode === "multicast") {
      if (!Array.isArray(targetUserId) || targetUserId.length === 0) {
        return NextResponse.json(
          { success: false, error: "multicast 模式必須提供 to (userId 字串陣列)" },
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {}

      console.error("[LINE Push Failed]", lineRes.status, errText);

      let helpfulMessage = parsedErr?.message || errText;
      if (lineRes.status === 401) {
        helpfulMessage =
          "LINE 金鑰認證失敗 (401 Unauthorized)。請確認複製的是 LINE Developers 裡面 Messaging API 頁籤底部的「Channel access token (long-lived)」，並確認無多餘引號或空格。";
      } else if (lineRes.status === 400) {
        helpfulMessage = `LINE 請求格式錯誤 (400): ${parsedErr?.message || errText}`;
      } else if (lineRes.status === 403) {
        helpfulMessage =
          "權限不足 (403 Forbidden)。該官方帳號可能未開啟 Messaging API 推播功能或權限不足。";
      }

      return NextResponse.json(
        {
          success: false,
          status: lineRes.status,
          error: helpfulMessage,
          raw: parsedErr || errText,
        },
        { status: 200 } // 回傳 200 讓前端能順利讀取詳細 JSON 診斷
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
    return NextResponse.json(
      { success: false, error: `伺服器執行錯誤: ${err.message}` },
      { status: 200 }
    );
  }
}
