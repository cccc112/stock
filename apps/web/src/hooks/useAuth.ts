"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, signInWithGoogleOAuth, signOutSupabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "google" | "guest";
  createdAt: number;
}

const STORAGE_KEY_USER = "stock_app_current_user";
const STORAGE_KEY_LEGACY_BYOK = "byok_api_key";

export function useAuthManager() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKeyState] = useState<string>("");

  const loginWithGoogle = useCallback((email: string, name?: string, avatar?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const id = btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
    const profile: UserProfile = {
      id: `usr_${id}`,
      name: name || cleanEmail.split("@")[0],
      email: cleanEmail,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || cleanEmail)}`,
      provider: "google",
      createdAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
    try {
      const raw = localStorage.getItem("stock_saved_google_accounts");
      const list: UserProfile[] = raw ? JSON.parse(raw) : [];
      const updated = [profile, ...list.filter((a) => a.email !== profile.email)].slice(0, 8);
      localStorage.setItem("stock_saved_google_accounts", JSON.stringify(updated));
    } catch {}
    setUser(profile);

    // 檢查該使用者先前有無儲存的 Key
    const existingKey =
      localStorage.getItem(`byok_api_key_${profile.id}`) ||
      localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) ||
      "";
    setApiKeyState(existingKey);
    if (existingKey) {
      localStorage.setItem(STORAGE_KEY_LEGACY_BYOK, existingKey);
    } else {
      localStorage.removeItem(STORAGE_KEY_LEGACY_BYOK);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stock_auth_changed", { detail: profile }));
    }
  }, []);

  // 1. 初始化讀取本地已存 Session，並監聽 Supabase 官方 Google OAuth 回調
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as UserProfile;
        setUser(parsed);
        const userKey =
          localStorage.getItem(`byok_api_key_${parsed.id}`) ||
          localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) ||
          "";
        setApiKeyState(userKey);
      } else {
        const guestKey = localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) || "";
        setApiKeyState(guestKey);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }

    // 2. 監聽像藝廊專案一樣的 Supabase 官方 Google OAuth 認證回傳
    const syncSupabaseSession = (sessionUser: any) => {
      if (!sessionUser?.email) return;
      const email = sessionUser.email;
      const meta = sessionUser.user_metadata || {};
      const name = meta.full_name || meta.name || meta.user_name || email.split("@")[0];
      const avatar = meta.avatar_url || meta.picture || "";
      loginWithGoogle(email, name, avatar);

      // 清理瀏覽器網址列的 OAuth 回調 code 或 hash token
      if (typeof window !== "undefined") {
        if (window.location.hash || window.location.search.includes("code=")) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, "", cleanUrl);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSupabaseSession(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        syncSupabaseSession(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loginWithGoogle]);

  const logout = useCallback(async () => {
    try {
      await signOutSupabase();
    } catch {}
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_LEGACY_BYOK);
    setUser(null);
    setApiKeyState("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stock_auth_changed", { detail: null }));
    }
  }, []);

  const loginWithSupabaseGoogle = useCallback(async (redirectTo?: string) => {
    await signInWithGoogleOAuth(redirectTo);
  }, []);

  const getApiKey = useCallback(() => {
    if (typeof window === "undefined") return "";
    if (user?.id) {
      return (
        localStorage.getItem(`byok_api_key_${user.id}`) ||
        localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) ||
        ""
      );
    }
    return localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) || "";
  }, [user]);

  const setApiKey = useCallback(
    (key: string) => {
      const cleanKey = key.trim();
      setApiKeyState(cleanKey);
      if (typeof window === "undefined") return;

      if (user?.id) {
        localStorage.setItem(`byok_api_key_${user.id}`, cleanKey);
      }
      localStorage.setItem(STORAGE_KEY_LEGACY_BYOK, cleanKey);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("stock_api_key_updated", { detail: cleanKey })
        );
      }
    },
    [user]
  );

  return {
    user,
    isLoading,
    loginWithGoogle,
    loginWithSupabaseGoogle,
    logout,
    getApiKey,
    setApiKey,
    isApiKeyConfigured: !!apiKey.trim(),
  };
}

export function getCurrentUserNamespace(): string {
  if (typeof window === "undefined") return "default";
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      const u = JSON.parse(saved);
      if (u?.id) return u.id;
    }
  } catch {}
  return "default";
}
