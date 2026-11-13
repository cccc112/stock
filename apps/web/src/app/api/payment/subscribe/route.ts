import { NextRequest, NextResponse } from "next/server";
import { buildPeriodicalPaymentParams, DEFAULT_ECPAY_CONFIG } from "@/lib/ecpay";
import { getTaipeiClock } from "@/lib/marketHours";
import { buildNewebPayCardParams, getNewebPayConfig } from "@/lib/newebpay";
import {
  type CheckoutPlan,
  createLemonSqueezyCheckout,
  createPolarCheckout,
  getLemonSqueezyConfig,
  getPolarConfig,
} from "@/lib/morBilling";

export const dynamic = "force-dynamic";

function resolveHostedCheckoutUrl(plan: CheckoutPlan): string | undefined {
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

  const lsCfg = getLemonSqueezyConfig();
  if (lsCfg) {
    return {
      provider: "lemonsqueezy" as const,
      mode: "production" as const,
      label: "Lemon Squeezy 全球 MoR 收銀台（信用卡 / Apple Pay / Google Pay）",
    };
  }

  const polarCfg = getPolarConfig();
  if (polarCfg) {
    return {
      provider: "polar" as const,
      mode: polarCfg.isSandbox ? ("sandbox" as const) : ("production" as const),
      label: polarCfg.isSandbox
        ? "Polar.sh 收銀台（Sandbox 測試環境）"
        : "Polar.sh 全球 MoR 收銀台（信用卡 / Apple Pay / Google Pay）",
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
      ? "尚未綁定正式個人收銀台（目前為 ECPay 沙盒實測流程）"
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
    const plan: CheckoutPlan = body?.plan === "standard" ? "standard" : "pro";
    const bindCode = typeof body?.bindCode === "string" ? body.bindCode.trim() : undefined;
    const customerEmail = typeof body?.email === "string" ? body.email.trim() : undefined;

    const totalAmount = plan === "standard" ? 99 : 299;
    const itemName =
      plan === "standard"
        ? "OmniTick 標準版 數據追蹤與看盤軟體月費訂閱"
        : "OmniTick Pro 旗艦版 進階圖表與籌碼儀表板月費訂閱";
    const tradeDesc = plan === "standard" ? "OmniTick Standard" : "OmniTick Pro";
    const tradeNo = `OT${Date.now().toString().slice(-14)}`;

    // 1. 優先：託管刷卡結帳連結 (Portaly 傳送門 / Lemon Squeezy Link / Polar Link 等，個人免統編即可收款)
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

    // 2. 次優先：Lemon Squeezy API Checkout (全球 MoR，台灣個人可透過銀行電匯 / PayPal 出金，支援信用卡 + Apple Pay + Google Pay)
    if (getLemonSqueezyConfig(plan)) {
      const { checkoutUrl } = await createLemonSqueezyCheckout({
        plan,
        origin,
        bindCode,
        customerEmail,
      });
      return NextResponse.json({
        success: true,
        provider: "lemonsqueezy",
        mode: "production",
        orderId: tradeNo,
        checkoutUrl,
      });
    }

    // 3. 第三優先：Polar.sh API Checkout (全球 MoR，透過 Stripe Connect Express 出金台灣，支援信用卡 + Apple Pay + Google Pay)
    const polarCfg = getPolarConfig(plan);
    if (polarCfg) {
      const { checkoutUrl, checkoutId } = await createPolarCheckout({
        plan,
        origin,
        bindCode,
        customerEmail,
      });
      return NextResponse.json({
        success: true,
        provider: "polar",
        mode: polarCfg.isSandbox ? "sandbox" : "production",
        orderId: checkoutId || tradeNo,
        checkoutUrl,
      });
    }

    // 4. 第四優先：藍新金流 NewebPay 線上刷卡 MPG (僅在已設定商店代號與金鑰時啟用)
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

    // 5. 保底演示：綠界 ECPay 測試沙盒 3002607（未接入正式金流前供測試刷卡流程用）
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
