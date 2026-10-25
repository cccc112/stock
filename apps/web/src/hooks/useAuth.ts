"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "google" | "guest";
  createdAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  loginWithGoogle: (email: string, name?: string, avatar?: string) => void;
  logout: () => void;
  getApiKey: () => string;
  setApiKey: (key: string) => void;
  isApiKeyConfigured: boolean;
}

const STORAGE_KEY_USER = "stock_app_current_user";
const STORAGE_KEY_LEGACY_BYOK = "byok_api_key";

export function useAuthManager() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKeyState] = useState<string>("");

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as UserProfile;
        setUser(parsed);
        const userKey = localStorage.getItem(`byok_api_key_${parsed.id}`) || localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) || "";
        setApiKeyState(userKey);
      } else {
        // 訪客預設 Key
        const guestKey = localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) || "";
        setApiKeyState(guestKey);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      const updated = [profile, ...list.filter((a) => a.email !== profile.email)].slice(0, 6);
      localStorage.setItem("stock_saved_google_accounts", JSON.stringify(updated));
    } catch {}
    setUser(profile);

    // 檢查該使用者先前有無儲存的 Key
    const existingKey = localStorage.getItem(`byok_api_key_${profile.id}`) || "";
    setApiKeyState(existingKey);
    if (existingKey) {
      localStorage.setItem(STORAGE_KEY_LEGACY_BYOK, existingKey);
    } else {
      localStorage.removeItem(STORAGE_KEY_LEGACY_BYOK);
    }

    // 廣播登入事件，使自選股與儀表板自動刷新為該使用者的獨立資料
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stock_auth_changed", { detail: profile }));
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
      return localStorage.getItem(`byok_api_key_${user.id}`) || localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) || "";
    }
    return localStorage.getItem(STORAGE_KEY_LEGACY_BYOK) || "";
  }, [user]);

  const setApiKey = useCallback((key: string) => {
    const cleanKey = key.trim();
    setApiKeyState(cleanKey);
    if (typeof window === "undefined") return;

    if (user?.id) {
      localStorage.setItem(`byok_api_key_${user.id}`, cleanKey);
    }
    // 同步寫入通用快取以供 axios interceptor 讀取
    localStorage.setItem(STORAGE_KEY_LEGACY_BYOK, cleanKey);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stock_api_key_updated", { detail: cleanKey }));
    }
  }, [user]);

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
