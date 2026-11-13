import { NextRequest, NextResponse } from "next/server";
import { verifyLemonSqueezySignature } from "@/lib/morBilling";

export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error("[LemonSqueezy Webhook] 缺少 LEMONSQUEEZY_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const signature = req.headers.get("x-signature");
    if (!verifyLemonSqueezySignature(rawBody, signature, secret)) {
      console.error("[LemonSqueezy Webhook] X-Signature 驗證失敗");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventName: string = event?.meta?.event_name || "unknown";
    const customData = event?.meta?.custom_data || {};
    const resourceId = event?.data?.id || "";
    const status = event?.data?.attributes?.status || "";

    switch (eventName) {
      case "order_created":
      case "subscription_created":
      case "subscription_payment_success":
      case "subscription_updated": {
        console.log("[LemonSqueezy Webhook] 訂閱/付款事件完成", {
          eventName,
          resourceId,
          status,
          plan: customData.plan,
          bindCode: customData.bind_code,
        });
        break;
      }
      case "subscription_cancelled":
      case "subscription_expired":
      case "subscription_payment_failed": {
        console.warn("[LemonSqueezy Webhook] 訂閱取消或扣款失敗", {
          eventName,
          resourceId,
          status,
          bindCode: customData.bind_code,
        });
        break;
      }
      default: {
        console.log(`[LemonSqueezy Webhook] 收到未處理事件: ${eventName}`);
      }
    }

    return NextResponse.json({ received: true, eventName });
  } catch (error) {
    console.error("[LemonSqueezy Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Lemon Squeezy Webhook Endpoint",
    timestamp: new Date().toISOString(),
  });
}
