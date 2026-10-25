import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://akabubzxgpbiemcgpzuf.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWJ1Ynp4Z3BiaWVtY2dwenVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDU1NTYsImV4cCI6MjA5NTEyMTU1Nn0.s0d4WNOHhB9I34pl_vbXwtR98i5ikLFGghkJam7p648";

// 封裝瀏覽器端 Supabase Client，啟用持久化 session 與 URL 授權回調自動偵測
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * 像藝廊專案一樣，觸發真正的 Google OAuth 官方登入跳轉
 */
export async function signInWithGoogleOAuth(redirectTo?: string) {
  const targetRedirect =
    redirectTo || (typeof window !== "undefined" ? window.location.origin : "");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: targetRedirect,
      queryParams: {
        prompt: "select_account", // 強制跳出 Google 原廠帳號選擇器
        access_type: "offline",
      },
    },
  });

  if (error) {
    console.error("[Google OAuth Error]", error.message);
    throw error;
  }

  return data;
}

/**
 * 登出 Supabase Session
 */
export async function signOutSupabase() {
  await supabase.auth.signOut();
}
