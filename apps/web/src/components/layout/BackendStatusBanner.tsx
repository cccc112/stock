"use client";

import { useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api";

/**
 * 背景靜默預熱後端服務（不彈出橫幅造成版面跳動 CLS，核心行情與籌碼皆由本地 Next.js API 即時供應）
 */
export default function BackendStatusBanner() {
  useEffect(() => {
    const url = getApiBaseUrl();
    const healthUrl = `${url.replace(/\/api\/v1$/, "")}/health`;
    const controller = new AbortController();
    fetch(healthUrl, { signal: controller.signal, cache: "no-store" }).catch(() => {
      // 靜默忽略：前端所有頁面皆具備本地即時 API 路由與完整真實數據快照
    });
    return () => controller.abort();
  }, []);

  return null;
}
