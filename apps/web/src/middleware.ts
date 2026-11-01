import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, createRateLimitExceededResponse } from "@/lib/rateLimit";

export async function middleware(req: NextRequest) {
  // 只攔截 /api/* 路由，忽略靜態資源與頁面
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 1. 驗證 Google 原生 ID Token（若請求有攜帶 Authorization Bearer）
  const user = await getAuthenticatedUser(req);

  // 2. 記憶體滑動窗口頻率限制（訪客 30/min，登入 120/min）
  const rateLimitResult = checkRateLimit(req, user);

  if (!rateLimitResult.success) {
    return createRateLimitExceededResponse(rateLimitResult);
  }

  // 3. 通過頻率限制：建立轉發 Headers 並附帶 RateLimit 與身分宣告
  const requestHeaders = new Headers(req.headers);
  if (user?.sub) {
    requestHeaders.set("x-user-id", user.sub);
    requestHeaders.set("x-user-email", user.email);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 在回應頭注入 X-RateLimit 資訊供前端與監控觀察
  Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
