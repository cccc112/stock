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
 * 注意：合法的 LINE Channel Access Token (包含短期與長期) 長度必定 >= 80 碼 (一般約 170~200 碼)。
 * 若長度小於 80 碼 (如 32 碼的 Channel Secret 或 10 碼的 Channel ID)，絕不可誤判為 Token！
 */
export function getChannelAccessToken(customToken?: string): LineTokenResult {
  // 1. 優先取用前端手動傳入的 Token (繞過 Vercel 部署直接生效)
  const cleanedCustom = cleanToken(customToken);
  if (cleanedCustom && cleanedCustom.length >= 80) {
    return { token: cleanedCustom, source: "custom_request" };
  }

  // 2. 常見標準命名清單 (長度必須 >= 80 才是真 Token)
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
    if (val && val.length >= 80) {
      return { token: val, source: `env:${k}` };
    }
  }

  // 3. 動態遍歷 process.env 容錯大小寫 (如 line_channel_access_token)
  for (const [key, rawVal] of Object.entries(process.env)) {
    const val = cleanToken(rawVal);
    const upperKey = key.toUpperCase();
    if (val && val.length >= 80) {
      if (
        (upperKey.includes("LINE") && upperKey.includes("TOKEN")) ||
        (upperKey.includes("CHANNEL") && upperKey.includes("ACCESS"))
      ) {
        return { token: val, source: `env_fuzzy:${key}` };
      }
    }
  }

  return { token: "", source: "none" };
}

// 記憶體快取自動換發的 Token (有效期限 30 天)
let autoTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * 使用 LINE 官方 OAuth client_credentials 端點，以 Channel ID + Channel Secret 自動換發 Access Token
 */
export async function fetchTokenFromOAuth(
  channelId: string,
  channelSecret: string
): Promise<{ token?: string; error?: string }> {
  const now = Date.now();
  if (autoTokenCache && autoTokenCache.expiresAt > now + 60000) {
    return { token: autoTokenCache.token };
  }

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", channelId.trim());
    params.append("client_secret", channelSecret.trim());

    const res = await fetch("https://api.line.me/v2/oauth/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json();
    if (res.ok && data.access_token) {
      const expiresInSec = Number(data.expires_in) || 2592000;
      autoTokenCache = {
        token: data.access_token,
        expiresAt: now + (expiresInSec - 300) * 1000,
      };
      return { token: data.access_token };
    }

    return {
      error:
        data.error_description ||
        data.message ||
        data.error ||
        "LINE OAuth 驗證失敗，請檢查 Channel ID 與 Channel Secret 是否正確",
    };
  } catch (err: any) {
    return { error: `連線至 LINE 換發伺服器失敗: ${err.message}` };
  }
}

/**
 * 尋找環境變數中的 Channel ID 與 Channel Secret
 * 支援多種命名規格、大小寫容錯、以及使用者將兩者貼在同一個變數中的全域正則解析
 */
export function findChannelCredentials(): { channelId?: string; channelSecret?: string } {
  // 1. 明確常見候選名單 (優先)
  const idCandidates = [
    process.env.LINE_CHANNEL_ID,
    process.env.CHANNEL_ID,
    process.env.LINE_CLIENT_ID,
    process.env.CLIENT_ID,
    process.env.LINE_ID,
    process.env.NEXT_PUBLIC_LINE_CHANNEL_ID,
  ];
  let channelId = idCandidates.find((c) => c && c.trim().length >= 8 && /^\d+$/.test(c.trim()))?.trim();

  const secretCandidates = [
    process.env.LINE_CHANNEL_SECRET,
    process.env.CHANNEL_SECRET,
    process.env.LINE_CLIENT_SECRET,
    process.env.CLIENT_SECRET,
    process.env.LINE_SECRET,
    process.env.NEXT_PUBLIC_LINE_CHANNEL_SECRET,
  ];
  let channelSecret = secretCandidates.find((c) => c && c.trim().length >= 25)?.trim();

  // 2. 深度遍歷所有 process.env (容錯 Linux/Vercel 大小寫差異、自訂鍵名、如 channel_id, line_secret 等)
  for (const [k, v] of Object.entries(process.env)) {
    if (!v || typeof v !== "string") continue;
    const clean = cleanToken(v);
    const upper = k.toUpperCase();

    // 匹配 Channel ID (通常是 10 碼純數字，8~14 碼)
    if (!channelId) {
      if (
        (upper.includes("ID") || upper.includes("CHANNEL") || upper.includes("LINE") || upper.includes("CLIENT")) &&
        /^\d{8,14}$/.test(clean)
      ) {
        channelId = clean;
      }
    }

    // 匹配 Channel Secret (LINE 官方規範固定為 32 碼十六進位英數字串)
    if (!channelSecret) {
      if (
        (upper.includes("SECRET") || upper.includes("CHANNEL") || upper.includes("LINE") || upper.includes("KEY")) &&
        /^[a-fA-F0-9]{32}$/.test(clean)
      ) {
        channelSecret = clean;
      }
    }

    // 3. 容錯使用者將整段資料貼在同一個變數中 (例如包含 Channel ID 與 Secret)
    if (!channelId || !channelSecret) {
      const idMatch = clean.match(/(?:^|[^\d])(20\d{8}|\d{8,12})(?:[^\d]|$)/);
      const secretMatch = clean.match(/(?:^|[^a-fA-F0-9])([a-fA-F0-9]{32})(?:[^a-fA-F0-9]|$)/);
      if (!channelId && idMatch) channelId = idMatch[1];
      if (!channelSecret && secretMatch) channelSecret = secretMatch[1];
    }
  }

  // 4. 超強防呆：遍歷所有 process.env，只要有任何變數值是 32 碼十六進位，它必定是 Channel Secret！
  // (例如使用者把變數名取為 LINE_TOKEN，但貼入的是 32 碼 Secret)
  if (!channelSecret) {
    for (const [, v] of Object.entries(process.env)) {
      if (typeof v === "string") {
        const clean = cleanToken(v);
        if (/^[a-fA-F0-9]{32}$/.test(clean)) {
          channelSecret = clean;
          break;
        }
      }
    }
  }

  // 5. 超強防呆：遍歷所有 process.env，只要有任何變數值是 10 碼純數字 (或 20 開頭的 10 碼 Channel ID)，它必定是 Channel ID！
  if (!channelId) {
    for (const [, v] of Object.entries(process.env)) {
      if (typeof v === "string") {
        const clean = cleanToken(v);
        if (/^\d{10}$/.test(clean) || /^20\d{8}$/.test(clean)) {
          channelId = clean;
          break;
        }
      }
    }
  }

  return { channelId, channelSecret };
}

/**
 * 完整解析 Token：
 * 1. 優先檢查是否直接提供 Access Token (長度需 >= 80)
 * 2. 若無，則使用傳入或環境變數的 Channel ID + Channel Secret 向 LINE 伺服器自動換發！
 */
export async function resolveChannelAccessToken(options?: {
  customToken?: string;
  channelId?: string;
  channelSecret?: string;
}): Promise<LineTokenResult> {
  // 1. 直傳 Access Token (長度需 >= 80 才是真 Token)
  const direct = getChannelAccessToken(options?.customToken);
  if (direct.token) return direct;

  // 2. 嘗試使用傳入或環境變數的 Channel ID + Secret 換發
  const envCreds = findChannelCredentials();
  const activeId = options?.channelId?.trim() || envCreds.channelId;
  const activeSecret = options?.channelSecret?.trim() || envCreds.channelSecret;

  if (activeId && activeSecret) {
    const oauthRes = await fetchTokenFromOAuth(activeId, activeSecret);
    if (oauthRes.token) {
      return {
        token: oauthRes.token,
        source: options?.channelId ? "custom_oauth" : `env_oauth(id:${activeId})`,
      };
    }
    return {
      token: "",
      source: "oauth_failed",
      diagnostic: `使用 Channel ID (${activeId}) 與 Channel Secret (${activeSecret.slice(0, 4)}...${activeSecret.slice(-4)}) 向 LINE 換發 Token 失敗: ${oauthRes.error}`,
    };
  }

  // 3. 明確告知缺少項目
  if (!activeId && activeSecret) {
    return {
      token: "",
      source: "missing_channel_id",
      diagnostic: `已在環境變數讀取到 32 碼 Channel Secret (${activeSecret.slice(0, 4)}...${activeSecret.slice(-4)})，但缺少 Channel ID (10 碼數字，例如 200xxxxxxx)！請在 Vercel 新增 LINE_CHANNEL_ID 或在彈窗填寫。`,
    };
  }

  if (activeId && !activeSecret) {
    return {
      token: "",
      source: "missing_channel_secret",
      diagnostic: `已在環境變數讀取到 Channel ID (${activeId})，但缺少 32 碼 Channel Secret！請在 Vercel 新增 LINE_CHANNEL_SECRET 或在彈窗填寫。`,
    };
  }

  return direct;
}

/**
 * 查詢 LINE 推播配額與金鑰配置狀態 (GET)
 */
export async function GET(req: NextRequest) {
  const customToken = req.nextUrl.searchParams.get("token") || undefined;
  const channelId = req.nextUrl.searchParams.get("channelId") || undefined;
  const channelSecret = req.nextUrl.searchParams.get("channelSecret") || undefined;
  const tokenRes = await resolveChannelAccessToken({ customToken, channelId, channelSecret });
  const token = tokenRes.token;

  const envCreds = findChannelCredentials();

  if (!token) {
    const relatedKeys = Object.keys(process.env).filter((k) => {
      const u = k.toUpperCase();
      return u.includes("LINE") || u.includes("CHANNEL");
    });

    return NextResponse.json({
      configured: false,
      message:
        tokenRes.diagnostic ||
        "伺服器環境變數尚未讀取到 LINE 金鑰。系統現已支援直接填入 Channel ID 與 Channel Secret 自動換發！若已在 Vercel 新增，請確認 Production 有勾選並 Redeploy。",
      detected: {
        hasChannelId: !!envCreds.channelId,
        channelIdMasked: envCreds.channelId ? `${envCreds.channelId.slice(0, 4)}****` : null,
        hasChannelSecret: !!envCreds.channelSecret,
        channelSecretMasked: envCreds.channelSecret
          ? `${envCreds.channelSecret.slice(0, 4)}...${envCreds.channelSecret.slice(-4)}`
          : null,
      },
      foundKeys: relatedKeys,
      checkedKeys: [
        "LINE_CHANNEL_ID + LINE_CHANNEL_SECRET (自動換發)",
        "LINE_CHANNEL_ACCESS_TOKEN",
        "LINE_ACCESS_TOKEN",
      ],
    });
  }

  const maskedToken =
    token.length > 12
      ? `${token.slice(0, 8)}...${token.slice(-4)} (長度 ${token.length} 碼)`
      : `${token.slice(0, 4)}...`;

  try {
    // 平行檢測配額、已用推播數、以及官方帳號真實資訊 (Bot Info)
    const [quotaRes, consumptionRes, botInfoRes] = await Promise.allSettled([
      fetch("https://api.line.me/v2/bot/message/quota", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("https://api.line.me/v2/bot/message/quota/consumption", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("https://api.line.me/v2/bot/info", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    const quotaData = quotaRes.status === "fulfilled" ? quotaRes.value : null;
    const consumptionData = consumptionRes.status === "fulfilled" ? consumptionRes.value : null;
    const botInfoData = botInfoRes.status === "fulfilled" ? botInfoRes.value : null;

    let addFriendUrl = "";
    if (botInfoData?.basicId) {
      const cleanBasic = botInfoData.basicId.startsWith("@")
        ? botInfoData.basicId
        : `@${botInfoData.basicId}`;
      addFriendUrl = `https://line.me/R/ti/p/${encodeURIComponent(cleanBasic)}`;
    } else if (botInfoData?.premiumId) {
      addFriendUrl = `https://line.me/R/ti/p/@${botInfoData.premiumId}`;
    }

    return NextResponse.json({
      configured: true,
      valid: true,
      tokenInfo: maskedToken,
      service: "OmniTick LINE Push & Broadcast Dispatcher",
      bot: botInfoData
        ? {
            displayName: botInfoData.displayName,
            basicId: botInfoData.basicId,
            pictureUrl: botInfoData.pictureUrl,
            addFriendUrl,
          }
        : null,
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
    const tokenRes = await resolveChannelAccessToken({
      customToken: body.token,
      channelId: body.channelId,
      channelSecret: body.channelSecret,
    });
    const token = tokenRes.token;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          code: "TOKEN_NOT_FOUND",
          error:
            tokenRes.diagnostic ||
            "尚未取得 LINE 存取權限。請確認已填入 Channel ID 與 Channel Secret，或直接在畫面中填入立即發送！",
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
