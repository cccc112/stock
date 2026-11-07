import { NextRequest, NextResponse } from "next/server";
import { buildPeriodicalPaymentParams } from "@/lib/ecpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") || req.nextUrl.origin || "https://stock-green-ten.vercel.app";

    // 格式化訂單時間 (YYYY/MM/DD HH:mm:ss)
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tradeDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    // 訂單編號不得超過 20 碼
    const tradeNo = `OT${Date.now().toString().slice(-14)}`;

    const orderParams = {
      merchantTradeNo: tradeNo,
      merchantTradeDate: tradeDate,
      totalAmount: 399,
      tradeDesc: "OmniTick Pro Subscription",
      itemName: "OmniTick Pro 盤中主力雷達月費方案",
      returnUrl: `${origin}/api/payment/ecpay-callback`,
      periodReturnUrl: `${origin}/api/payment/ecpay-callback`,
      clientBackUrl: `${origin}/alerts?subscribed=true`,
    };

    const { actionUrl, params } = buildPeriodicalPaymentParams(orderParams);

    return NextResponse.json({
      success: true,
      actionUrl,
      params,
    });
  } catch (error: any) {
    console.error("Payment subscribe error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "建立付款訂單失敗" },
      { status: 500 }
    );
  }
}
