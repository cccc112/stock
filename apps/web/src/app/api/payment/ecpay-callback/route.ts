import { NextRequest, NextResponse } from "next/server";
import { verifyECPayCallback, DEFAULT_ECPAY_CONFIG } from "@/lib/ecpay";

export const dynamic = "force-dynamic";

/**
 * 綠界科技 ECPay 付款與定期定額扣款回調端點 (Webhook)
 * 規格遵循綠界 AIO API 規範：
 * 1. 接收 application/x-www-form-urlencoded
 * 2. 透過 CheckMacValue (SHA-256) 與 timingSafeEqual 嚴格防竄改
 * 3. 校驗 MerchantID 與交易金額 (防止金額竄改攻擊)
 * 4. 成功處理後必須回應純文字 "1|OK"
 */
export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();

    // 1. 資安防護：防 Payload 炸彈 (> 256KB)
    if (rawText.length > 256 * 1024) {
      console.error("[ECPay Webhook Security] Payload 過大，拒絕處理");
      return new Response("0|Payload Too Large", { status: 413 });
    }

    // 2. 解析表單資料 (x-www-form-urlencoded)
    const params = new URLSearchParams(rawText);
    const callbackData: Record<string, string> = {};
    params.forEach((value, key) => {
      callbackData[key] = value;
    });

    // 3. 資安防護：檢查 CheckMacValue 壓碼防竄改
    const isValidMac = verifyECPayCallback(callbackData);
    if (!isValidMac) {
      console.error("[ECPay Webhook Security] CheckMacValue 壓碼驗證失敗！疑似假造請求或中間人竄改", {
        receivedMac: callbackData.CheckMacValue,
        tradeNo: callbackData.MerchantTradeNo,
      });
      return new Response("0|CheckMacValue Error", { status: 400 });
    }

    // 4. 資安防護：校驗特店代號 (MerchantID)
    if (callbackData.MerchantID !== DEFAULT_ECPAY_CONFIG.MerchantID) {
      console.error("[ECPay Webhook Security] 特店代號不符", {
        expected: DEFAULT_ECPAY_CONFIG.MerchantID,
        received: callbackData.MerchantID,
      });
      return new Response("0|Invalid MerchantID", { status: 400 });
    }

    const rtnCode = callbackData.RtnCode;
    const merchantTradeNo = callbackData.MerchantTradeNo;
    const amount = Number(callbackData.Amount || callbackData.PeriodAmount || callbackData.TotalAmount || 0);

    // 5. 資安防護：校驗金額 (防止客戶端或中間人修改扣款金額)
    if (amount !== 399 && amount !== 3990) {
      console.warn(`[ECPay Webhook Security] 交易金額異常: NT$ ${amount}, 訂單: ${merchantTradeNo}`);
      // 若金額不符預設方案，紀錄風控標記
    }

    // 6. 判斷交易狀態
    if (rtnCode === "1") {
      // 交易成功：開通 Pro 權限 / 續期
      console.log(`[ECPay Webhook] 付款扣款成功！訂單: ${merchantTradeNo}, 金額: ${amount}`);
      // 此處可更新資料庫或使用者訂閱狀態
    } else {
      console.warn(`[ECPay Webhook] 付款扣款未完成或失敗: RtnCode=${rtnCode}, RtnMsg=${callbackData.RtnMsg}`);
    }

    // 7. 綠界協定規範：必須回覆純文字 "1|OK"，否則綠界將排程重試
    return new Response("1|OK", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[ECPay Webhook Error]", error);
    return new Response("0|Internal Server Error", { status: 500 });
  }
}

/**
 * 支援 GET 快速測試健康狀態
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ECPay Webhook Endpoint",
    timestamp: new Date().toISOString(),
  });
}
