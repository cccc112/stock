import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/lib/morBilling";

export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error("[Polar Webhook] 缺少 POLAR_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const isValid = verifyPolarWebhookSignature(
      rawBody,
      {
        webhookId: req.headers.get("webhook-id"),
        webhookTimestamp: req.headers.get("webhook-timestamp"),
        webhookSignature: req.headers.get("webhook-signature"),
      },
      secret
    );

    if (!isValid) {
      console.error("[Polar Webhook] Standard Webhooks 簽章驗證失敗");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event?.type || "unknown";
    const metadata = event?.data?.metadata || {};
    const resourceId = event?.data?.id || "";
    const status = event?.data?.status || "";

    switch (eventType) {
      case "order.paid":
      case "subscription.active":
      case "subscription.created":
      case "checkout.updated": {
        console.log("[Polar Webhook] 付款/訂閱事件", {
          eventType,
          resourceId,
          status,
          plan: metadata.plan,
          bindCode: metadata.bind_code,
        });
        break;
      }
      case "subscription.canceled":
      case "subscription.revoked": {
        console.warn("[Polar Webhook] 訂閱終止/撤銷", {
          eventType,
          resourceId,
          status,
          bindCode: metadata.bind_code,
        });
        break;
      }
      default: {
        console.log(`[Polar Webhook] 收到未處理事件: ${eventType}`);
      }
    }

    return NextResponse.json({ received: true, eventType });
  } catch (error) {
    console.error("[Polar Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Polar Webhook Endpoint",
    timestamp: new Date().toISOString(),
  });
}
