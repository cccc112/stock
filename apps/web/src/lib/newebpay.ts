import crypto from "crypto";

export interface NewebPayConfig {
  MerchantID: string;
  HashKey: string;
  HashIV: string;
  isTestMode: boolean;
}

export interface NewebPayOrderParams {
  merchantOrderNo: string;
  amount: number;
  itemDesc: string;
  returnUrl: string;
  notifyUrl: string;
  clientBackUrl: string;
}

export function getNewebPayConfig(): NewebPayConfig | null {
  const merchantId = process.env.NEWEBPAY_MERCHANT_ID?.trim();
  const hashKey = process.env.NEWEBPAY_HASH_KEY?.trim();
  const hashIV = process.env.NEWEBPAY_HASH_IV?.trim();
  if (!merchantId || !hashKey || !hashIV) return null;

  return {
    MerchantID: merchantId,
    HashKey: hashKey,
    HashIV: hashIV,
    isTestMode: process.env.NEWEBPAY_TEST_MODE === "true",
  };
}

function aesEncrypt(rawQuery: string, hashKey: string, hashIV: string): string {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(hashKey, "utf8"),
    Buffer.from(hashIV, "utf8")
  );
  cipher.setAutoPadding(true);
  return cipher.update(rawQuery, "utf8", "hex") + cipher.final("hex");
}

function aesDecrypt(encryptedHex: string, hashKey: string, hashIV: string): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(hashKey, "utf8"),
    Buffer.from(hashIV, "utf8")
  );
  decipher.setAutoPadding(true);
  return decipher.update(encryptedHex, "hex", "utf8") + decipher.final("utf8");
}

export function generateTradeSha(tradeInfoHex: string, hashKey: string, hashIV: string): string {
  const plain = `HashKey=${hashKey}&${tradeInfoHex}&HashIV=${hashIV}`;
  return crypto.createHash("sha256").update(plain).digest("hex").toUpperCase();
}

export function buildNewebPayCardParams(
  order: NewebPayOrderParams,
  config: NewebPayConfig
) {
  const tradePayload = new URLSearchParams({
    MerchantID: config.MerchantID,
    RespondType: "JSON",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    Version: "2.0",
    MerchantOrderNo: order.merchantOrderNo,
    Amt: String(order.amount),
    ItemDesc: order.itemDesc,
    // 僅啟用線上刷卡與行動感應刷卡 (Credit / Apple Pay / Google Pay)，關閉超商/ATM/轉帳
    CREDIT: "1",
    APPLEPAY: "1",
    ANDROIDPAY: "1",
    VACC: "0",
    CVS: "0",
    BARCODE: "0",
    ReturnURL: order.returnUrl,
    NotifyURL: order.notifyUrl,
    ClientBackURL: order.clientBackUrl,
  }).toString();

  const tradeInfo = aesEncrypt(tradePayload, config.HashKey, config.HashIV);
  const tradeSha = generateTradeSha(tradeInfo, config.HashKey, config.HashIV);

  return {
    actionUrl: config.isTestMode
      ? "https://ccore.newebpay.com/MPG/mpg_gateway"
      : "https://core.newebpay.com/MPG/mpg_gateway",
    params: {
      MerchantID: config.MerchantID,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha,
      Version: "2.0",
    },
  };
}

export function verifyAndDecryptNewebPayCallback(
  tradeInfoHex: string,
  tradeShaReceived: string,
  config: NewebPayConfig
): Record<string, unknown> | null {
  if (!tradeInfoHex || !tradeShaReceived) return null;

  const expectedSha = generateTradeSha(tradeInfoHex, config.HashKey, config.HashIV);
  const expBuf = Buffer.from(expectedSha, "utf8");
  const recBuf = Buffer.from(String(tradeShaReceived).trim().toUpperCase(), "utf8");

  if (expBuf.length !== recBuf.length || !crypto.timingSafeEqual(expBuf, recBuf)) {
    return null;
  }

  const decrypted = aesDecrypt(tradeInfoHex, config.HashKey, config.HashIV);
  return JSON.parse(decrypted) as Record<string, unknown>;
}
