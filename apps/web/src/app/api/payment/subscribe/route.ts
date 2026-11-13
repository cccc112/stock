import { NextRequest, NextResponse } from "next/server";
import { buildPeriodicalPaymentParams, DEFAULT_ECPAY_CONFIG } from "@/lib/ecpay";
import { getTaipeiClock } from "@/lib/marketHours";
import { buildNewebPayCardParams, getNewebPayConfig } from "@/lib/newebpay";

export const dynamic = "force-dynamic";

function resolveHostedCheckoutUrl(plan: "standard" | "pro"): string | undefined {
  if (plan === "pro") {
    return (
      process.env.CHECKOUT_PRO_URL?.trim() ||
      process.env.NEXT_PUBLIC_CHECKOUT_PRO_URL?.trim() ||
      undefined
    );
  }
  return (
    process.env.CHECKOUT_STANDARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CHECKOUT_STANDARD_URL?.trim() ||
    undefined
  );
}

function getActiveCardGatewayStatus() {
  const hasProLink = Boolean(resolveHostedCheckoutUrl("pro"));
  const hasStdLink = Boolean(resolveHostedCheckoutUrl("standard"));
  if (hasProLink || hasStdLink) {
    return {
      provider: "checkout_link" as const,
      mode: "production" as const,
      label: "外部託管線上刷卡收銀台（支援信用卡 / Apple Pay / Google Pay）",
    };
  }

  const newebCfg = getNewebPayConfig();
  if (newebCfg) {
    return {
      provider: "newebpay" as const,
      mode: newebCfg.isTestMode ? ("sandbox" as const) : ("production" as const),
      label: newebCfg.isTestMode
        ? "藍新金流 NewebPay（線上刷卡測試環境）"
        : "藍新金流 NewebPay 正式線上刷卡（信用卡 / Apple Pay / Google Pay）",
    };
  }

  const ecpaySandbox = Boolean(DEFAULT_ECPAY_CONFIG.isTestMode);
  return {
    provider: "ecpay" as const,
    mode: ecpaySandbox ? ("sandbox" as const) : ("production" as const),
    label: ecpaySandbox
      ? "綠界科技 ECPay（線上刷卡測試沙盒）"
      : "綠界科技 ECPay 正式信用卡定期定額",
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    ...getActiveCardGatewayStatus(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const origin =
      req.headers.get("origin") ||
      req.nextUrl.origin ||
      "https://stock-green-ten.vercel.app";

    const body = await req.json().catch(() => ({}));
    const plan: "standard" | "pro" = body?.plan === "standard" ? "standard" : "pro";
    const totalAmount = plan === "standard" ? 99 : 299;
    const itemName =
      plan === "standard"
        ? "OmniTick 標準版 每日籌碼精華月費方案"
        : "OmniTick Pro 旗艦版 盤中主力雷達月費方案";
    const tradeDesc = plan === "standard" ? "OmniTick Standard" : "OmniTick Pro";
    const tradeNo = `OT${Date.now().toString().slice(-14)}`;

    // 1. 優先：伺服器端或公開環境變數之託管刷卡結帳連結 (Portaly / Lemon Squeezy / PAYUNi Payment Link 等)
    const hostedUrl = resolveHostedCheckoutUrl(plan);
    if (hostedUrl) {
      return NextResponse.json({
        success: true,
        provider: "checkout_link",
        mode: "production",
        orderId: tradeNo,
        checkoutUrl: hostedUrl,
      });
    }

    // 2. 次優先：藍新金流 NewebPay 線上刷卡 MPG (Credit / Apple Pay / Google Pay)
    const newebCfg = getNewebPayConfig();
    if (newebCfg) {
      const { actionUrl, params } = buildNewebPayCardParams(
        {
          merchantOrderNo: tradeNo,
          amount: totalAmount,
          itemDesc: tradeDesc,
          returnUrl: `${origin}/api/payment/newebpay-callback`,
          notifyUrl: `${origin}/api/payment/newebpay-callback`,
          clientBackUrl: `${origin}/alerts`,
        },
        newebCfg
      );

      return NextResponse.json({
        success: true,
        provider: "newebpay",
        mode: newebCfg.isTestMode ? "sandbox" : "production",
        orderId: tradeNo,
        actionUrl,
        params,
      });
    }

    // 3. 保底：綠界 ECPay 信用卡定期定額（未設 ECPAY_MERCHANT_ID 時預設連線測試沙盒 3002607）
    const tw = getTaipeiClock();
    const tradeDate = `${tw.year}/${tw.month}/${tw.day} ${tw.formattedTime}`;

    const { actionUrl, params } = buildPeriodicalPaymentParams({
      merchantTradeNo: tradeNo,
      merchantTradeDate: tradeDate,
      totalAmount,
      tradeDesc,
      itemName,
      returnUrl: `${origin}/api/payment/ecpay-callback`,
      periodReturnUrl: `${origin}/api/payment/ecpay-callback`,
      clientBackUrl: `${origin}/alerts?subscribed=true&plan=${plan}&orderId=${tradeNo}`,
    });

    return NextResponse.json({
      success: true,
      provider: "ecpay",
      mode: DEFAULT_ECPAY_CONFIG.isTestMode ? "sandbox" : "production",
      orderId: tradeNo,
      actionUrl,
      params,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "建立線上刷卡訂單失敗";
    console.error("Payment subscribe error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
