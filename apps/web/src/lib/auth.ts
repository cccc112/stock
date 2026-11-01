import { createRemoteJWKSet, jwtVerify } from "jose";

// Google 官方 OpenID Connect 公鑰端點（JWKS）
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export interface GoogleUserPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  aud?: string;
  iss?: string;
  exp?: number;
}

/**
 * 驗證 Google 原生 ID Token (JWT)
 * 透過 Google 公鑰集合 (JWKS) 進行非對稱簽章與過期驗證
 */
export async function verifyGoogleIdToken(token: string): Promise<GoogleUserPayload | null> {
  if (!token || typeof token !== "string") return null;

  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });

    if (!payload || !payload.sub || !payload.email) {
      return null;
    }

    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
      picture: payload.picture ? String(payload.picture) : undefined,
      email_verified: Boolean(payload.email_verified),
      aud: typeof payload.aud === "string" ? payload.aud : undefined,
      iss: typeof payload.iss === "string" ? payload.iss : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    // 簽章不符、過期或格式異常
    return null;
  }
}

/**
 * 從 Next.js Request 的 Authorization Header 提取 Bearer Token 並驗證
 */
export async function getAuthenticatedUser(req: Request): Promise<GoogleUserPayload | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return null;

  const idToken = match[1].trim();
  return verifyGoogleIdToken(idToken);
}
