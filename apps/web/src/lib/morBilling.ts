import crypto from "node:crypto";

export type CheckoutPlan = "standard" | "pro";

export interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  variantId?: string;
  webhookSecret?: string;
}

export interface PolarConfig {
  accessToken: string;
  productId?: string;
  webhookSecret?: string;
  apiBaseUrl: string;
  isSandbox: boolean;
}

export function getLemonSqueezyConfig(plan?: CheckoutPlan): LemonSqueezyConfig | null {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  const stdVariant = process.env.LEMONSQUEEZY_STANDARD_VARIANT_ID?.trim();
  const proVariant = process.env.LEMONSQUEEZY_PRO_VARIANT_ID?.trim();
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();

  if (!apiKey || !storeId) return null;

  if (plan) {
    const variantId = plan === "pro" ? proVariant : stdVariant;
    if (!variantId) return null;
    return { apiKey, storeId, variantId, webhookSecret };
  }

  if (!stdVariant && !proVariant) return null;
  return {
    apiKey,
    storeId,
    variantId: proVariant || stdVariant,
    webhookSecret,
  };
}

export function getPolarConfig(plan?: CheckoutPlan): PolarConfig | null {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  const stdProduct = process.env.POLAR_STANDARD_PRODUCT_ID?.trim();
  const proProduct = process.env.POLAR_PRO_PRODUCT_ID?.trim();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  const isSandbox = process.env.POLAR_SANDBOX === "true";

  if (!accessToken) return null;

  const apiBaseUrl = isSandbox ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";

  if (plan) {
    const productId = plan === "pro" ? proProduct : stdProduct;
    if (!productId) return null;
    return { accessToken, productId, webhookSecret, apiBaseUrl, isSandbox };
  }

  if (!stdProduct && !proProduct) return null;
  return {
    accessToken,
    productId: proProduct || stdProduct,
    webhookSecret,
    apiBaseUrl,
    isSandbox,
  };
}

export async function createLemonSqueezyCheckout(options: {
  plan: CheckoutPlan;
  origin: string;
  bindCode?: string;
  customerEmail?: string;
}): Promise<{ checkoutUrl: string }> {
  const cfg = getLemonSqueezyConfig(options.plan);
  if (!cfg || !cfg.variantId) {
    throw new Error("Lemon Squeezy 尚未設定對應方案之 Variant ID");
  }

  const customData: Record<string, string> = {
    plan: options.plan,
    source: "omnitick",
  };
  if (options.bindCode) {
    customData.bind_code = options.bindCode;
  }

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          product_options: {
            redirect_url: `${options.origin}/alerts?subscribed=true&plan=${options.plan}&provider=lemonsqueezy`,
          },
          checkout_options: {
            embed: false,
            media: true,
            logo: true,
            discount: true,
          },
          checkout_data: {
            ...(options.customerEmail ? { email: options.customerEmail } : {}),
            custom: customData,
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: String(cfg.storeId),
            },
          },
          variant: {
            data: {
              type: "variants",
              id: String(cfg.variantId),
            },
          },
        },
      },
    }),
  });

  const payload = await res.json().catch(() => null);
  const checkoutUrl = payload?.data?.attributes?.url;
  if (!res.ok || typeof checkoutUrl !== "string" || !checkoutUrl) {
    const errDetail =
      payload?.errors?.[0]?.detail ||
      payload?.message ||
      `HTTP ${res.status}`;
    throw new Error(`Lemon Squeezy Checkout 建立失敗: ${errDetail}`);
  }

  return { checkoutUrl };
}

export async function createPolarCheckout(options: {
  plan: CheckoutPlan;
  origin: string;
  bindCode?: string;
  customerEmail?: string;
}): Promise<{ checkoutUrl: string; checkoutId: string }> {
  const cfg = getPolarConfig(options.plan);
  if (!cfg || !cfg.productId) {
    throw new Error("Polar 尚未設定對應方案之 Product ID");
  }

  const metadata: Record<string, string> = {
    plan: options.plan,
    source: "omnitick",
  };
  if (options.bindCode) {
    metadata.bind_code = options.bindCode;
  }

  const res = await fetch(`${cfg.apiBaseUrl}/v1/checkouts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      products: [cfg.productId],
      success_url: `${options.origin}/alerts?subscribed=true&plan=${options.plan}&provider=polar&orderId={CHECKOUT_ID}`,
      ...(options.customerEmail ? { customer_email: options.customerEmail } : {}),
      metadata,
    }),
  });

  const payload = await res.json().catch(() => null);
  const checkoutUrl = payload?.url;
  if (!res.ok || typeof checkoutUrl !== "string" || !checkoutUrl) {
    const errDetail = payload?.detail || payload?.error || `HTTP ${res.status}`;
    throw new Error(`Polar Checkout 建立失敗: ${errDetail}`);
  }

  return {
    checkoutUrl,
    checkoutId: String(payload.id || ""),
  };
}

export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!rawBody || !signatureHeader || !webhookSecret) return false;

  const provided = signatureHeader.trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(provided)) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (providedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function verifyPolarWebhookSignature(
  rawBody: string,
  headers: {
    webhookId: string | null;
    webhookTimestamp: string | null;
    webhookSignature: string | null;
  },
  webhookSecret: string,
  nowMs = Date.now()
): boolean {
  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!rawBody || !webhookId || !webhookTimestamp || !webhookSignature || !webhookSecret) {
    return false;
  }

  const tsSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(tsSeconds)) return false;
  const nowSeconds = Math.floor(nowMs / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > 300) {
    return false;
  }

  // Standard Webhooks signs "<webhook-id>.<webhook-timestamp>.<raw-body>"
  const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const candidateKeys: Buffer[] = webhookSecret.startsWith("whsec_")
    ? [Buffer.from(webhookSecret.slice(6), "base64")]
    : [Buffer.from(webhookSecret, "utf8"), Buffer.from(webhookSecret, "base64")];

  const signatureEntries = webhookSignature.trim().split(/\s+/);

  for (const keyBuf of candidateKeys) {
    if (keyBuf.length === 0) continue;
    const expectedBase64 = crypto
      .createHmac("sha256", keyBuf)
      .update(signedPayload, "utf8")
      .digest("base64");
    const expectedBuf = Buffer.from(expectedBase64, "utf8");

    for (const entry of signatureEntries) {
      const commaIdx = entry.indexOf(",");
      if (commaIdx <= 0) continue;
      const version = entry.slice(0, commaIdx);
      const sig = entry.slice(commaIdx + 1);
      if (version !== "v1" || !sig) continue;

      const providedBuf = Buffer.from(sig, "utf8");
      if (
        providedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(providedBuf, expectedBuf)
      ) {
        return true;
      }
    }
  }

  return false;
}
