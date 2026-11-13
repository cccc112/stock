import { NextRequest, NextResponse } from "next/server";
import { getNewebPayConfig, verifyAndDecryptNewebPayCallback } from "@/lib/newebpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const config = getNewebPayConfig();
    if (!config) {
      return NextResponse.json({ status: "unconfigured" }, { status: 400 });
    }

    const rawText = await req.text();
    if (rawText.length > 256 * 1024) {
      return new Response("Payload Too Large", { status: 413 });
    }

    const form = new URLSearchParams(rawText);
    const tradeInfo = form.get("TradeInfo") || "";
    const tradeSha = form.get("TradeSha") || "";

    const decrypted = verifyAndDecryptNewebPayCallback(tradeInfo, tradeSha, config);
    if (!decrypted) {
      console.error("[NewebPay Callback] TradeSha verification failed");
      return new Response("Invalid Signature", { status: 400 });
    }

    const status = String(decrypted.Status || "");
    const result = (decrypted.Result || {}) as Record<string, unknown>;
    const orderNo = String(result.MerchantOrderNo || "");
    const amt = Number(result.Amt || 0);

    if (status === "SUCCESS") {
      console.log(`[NewebPay Callback] Card payment succeeded: order=${orderNo}, amt=${amt}`);
    } else {
      console.warn(`[NewebPay Callback] Payment not completed: status=${status}, msg=${String(decrypted.Message || "")}`);
    }

    // 若為瀏覽器前端 ReturnURL 導回，協助跳回 alerts 訂閱完成頁
    const accept = req.headers.get("accept") || "";
    if (accept.includes("text/html")) {
      const origin = req.nextUrl.origin || "https://stock-green-ten.vercel.app";
      const plan = amt >= 200 ? "pro" : "standard";
      const target =
        status === "SUCCESS"
          ? `${origin}/alerts?subscribed=true&plan=${plan}&orderId=${encodeURIComponent(orderNo)}`
          : `${origin}/alerts?payment_error=${encodeURIComponent(String(decrypted.Message || "付款未完成"))}`;
      return NextResponse.redirect(target, 303);
    }

    return NextResponse.json({ status: "OK", orderNo });
  } catch (err) {
    console.error("[NewebPay Callback Error]", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
