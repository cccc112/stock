import crypto from "crypto";

export interface ECPayPeriodicalConfig {
  MerchantID: string;
  HashKey: string;
  HashIV: string;
  isTestMode?: boolean;
}

export interface PeriodicalOrderParams {
  merchantTradeNo: string;
  merchantTradeDate: string; // YYYY/MM/DD HH:mm:ss
  totalAmount: number;       // 例如 399
  tradeDesc: string;         // 例如 "AI Stock Monitor Pro 月費訂閱"
  itemName: string;          // 例如 "Pro 盤中即時雷達月費方案"
  returnUrl: string;
  periodReturnUrl: string;
  clientBackUrl: string;
}

// 綠界官方測試環境（沙盒 Stage）預設參數
export const DEFAULT_ECPAY_CONFIG: ECPayPeriodicalConfig = {
  MerchantID: process.env.ECPAY_MERCHANT_ID || "3002607", // 測試商店代號
  HashKey: process.env.ECPAY_HASH_KEY || "pwFHCqoQZGmho4w6",
  HashIV: process.env.ECPAY_HASH_IV || "EkRm7iFT261dpevs",
  isTestMode: process.env.NODE_ENV !== "production" || !process.env.ECPAY_MERCHANT_ID,
};

/**
 * 綠界 CheckMacValue SHA-256 壓碼計算器
 * 規格：參數依 Key 由 A~Z 排序，前後串接 HashKey 與 HashIV，UrlEncode 後轉小寫，SHA-256 後轉大寫
 */
export function generateCheckMacValue(
  params: Record<string, any>,
  hashKey: string = DEFAULT_ECPAY_CONFIG.HashKey,
  hashIV: string = DEFAULT_ECPAY_CONFIG.HashIV
): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const rawQuery = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  const signString = `HashKey=${hashKey}&${rawQuery}&HashIV=${hashIV}`;

  // 綠界特製 .NET 規範之 UrlEncode 轉義替換
  const encoded = encodeURIComponent(signString)
    .replace(/%20/g, "+")
    .replace(/%2d/gi, "-")
    .replace(/%5f/gi, "_")
    .replace(/%2e/gi, ".")
    .replace(/%21/gi, "!")
    .replace(/%2a/gi, "*")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")")
    .toLowerCase();

  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

/**
 * 建立綠界定期定額信用卡扣款表單參數 (Periodical Payment)
 */
export function buildPeriodicalPaymentParams(
  order: PeriodicalOrderParams,
  config: ECPayPeriodicalConfig = DEFAULT_ECPAY_CONFIG
) {
  const params: Record<string, any> = {
    MerchantID: config.MerchantID,
    MerchantTradeNo: order.merchantTradeNo,
    MerchantTradeDate: order.merchantTradeDate,
    PaymentType: "aio",
    TotalAmount: String(order.totalAmount),
    TradeDesc: order.tradeDesc,
    ItemName: order.itemName,
    ReturnURL: order.returnUrl,
    PeriodReturnURL: order.periodReturnUrl,
    ClientBackURL: order.clientBackUrl,
    PeriodAmount: String(order.totalAmount), // 每期扣款金額
    PeriodType: "M",                        // M: 按月扣款
    Frequency: "1",                         // 頻率: 每 1 個月
    ExecTimes: "99",                        // 總期數: 99 期
    ChoosePayment: "Credit",
    EncryptType: 1,
  };

  const checkMacValue = generateCheckMacValue(params, config.HashKey, config.HashIV);
  params["CheckMacValue"] = checkMacValue;

  return {
    actionUrl: config.isTestMode
      ? "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
      : "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
    params,
  };
}

/**
 * 驗證綠界回傳之 Webhook 壓碼是否合法
 */
export function verifyECPayCallback(
  callbackData: Record<string, any>,
  hashKey: string = DEFAULT_ECPAY_CONFIG.HashKey,
  hashIV: string = DEFAULT_ECPAY_CONFIG.HashIV
): boolean {
  if (!callbackData?.CheckMacValue) return false;
  const calculated = generateCheckMacValue(callbackData, hashKey, hashIV);
  return calculated === callbackData.CheckMacValue;
}
