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

    // 解析前端傳入的方案 (標準版 NT$ 99 / Pro 旗艦版 NT$ 299)
    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "standard" ? "standard" : "pro";
    const totalAmount = plan === "standard" ? 99 : 299;
    const itemName =
      plan === "standard"
        ? "OmniTick 標準版 每日籌碼精華月費方案"
        : "OmniTick Pro 旗艦版 盤中主力雷達月費方案";
    const tradeDesc = plan === "standard" ? "OmniTick Standard" : "OmniTick Pro";

    const orderParams = {
      merchantTradeNo: tradeNo,
      merchantTradeDate: tradeDate,
      totalAmount,
      tradeDesc,
      itemName,
      returnUrl: `${origin}/api/payment/ecpay-callback`,
      periodReturnUrl: `${origin}/api/payment/ecpay-callback`,
      clientBackUrl: `${origin}/alerts?subscribed=true&plan=${plan}`,
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
