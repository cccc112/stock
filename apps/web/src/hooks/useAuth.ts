"use client";

import { useState, useEffect, useCallback } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "google" | "guest";
  createdAt: number;
}

const STORAGE_KEY_USER = "stock_app_current_user";
const STORAGE_KEY_SAVED_ACCOUNTS = "stock_saved_google_accounts";
const STORAGE_KEY_LEGACY_BYOK = "byok_api_key";
const STORAGE_KEY_CUSTOM_CLIENT_ID = "stock_custom_google_client_id";

export function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

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
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
      const list: UserProfile[] = raw ? JSON.parse(raw) : [];
      // 過濾掉舊版的模擬帳號與重疊帳號
      const filtered = list.filter(
        (a) =>
          a.email !== profile.email &&
          a.email !== "trader.guest@gmail.com" &&
          !a.name?.includes("訪客交易者")
      );
      const updated = [profile, ...filtered].slice(0, 8);
      localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(updated));
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

  // 1. 初始化讀取本地已存真實 Session (不依賴 Supabase)
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as UserProfile;
        // 如果是舊的訪客模擬帳號，自動清理
        if (parsed.email === "trader.guest@gmail.com") {
          localStorage.removeItem(STORAGE_KEY_USER);
          setUser(null);
        } else {
          setUser(parsed);
          const userKey =
            localStorage.getItem(`byok_api_key_${parsed.id}`) ||
            localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) ||
            "";
          setApiKeyState(userKey);
        }
      } else {
        const guestKey = localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) || "";
        setApiKeyState(guestKey);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }

    // 清除舊 URL 中遺留的 Supabase hash token 或 code
    if (typeof window !== "undefined") {
      if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, "", cleanUrl);
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_LEGACY_BYOK);
    setUser(null);
    setApiKeyState("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stock_auth_changed", { detail: null }));
    }
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
