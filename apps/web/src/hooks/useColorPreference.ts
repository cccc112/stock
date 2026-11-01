"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentUserNamespace } from "@/hooks/useAuth";

export type ColorPreference = "red-up" | "green-up";

export const COLOR_PREFERENCE_EVENT = "stock_color_preference_change";

export function getColorPreferenceStorageKey(): string {
  if (typeof window === "undefined") return "stock_color_preference";
  const ns = getCurrentUserNamespace();
  return ns === "default" ? "stock_color_preference" : `stock_color_preference_${ns}`;
}

export function getColorPreference(): ColorPreference {
  if (typeof window === "undefined") return "red-up";
  try {
    const key = getColorPreferenceStorageKey();
    const saved = localStorage.getItem(key);
    return saved === "green-up" ? "green-up" : "red-up";
  } catch {
    return "red-up";
  }
}

export function setColorPreference(mode: ColorPreference) {
  if (typeof window === "undefined") return;
  try {
    const key = getColorPreferenceStorageKey();
    localStorage.setItem(key, mode);
    document.documentElement.setAttribute("data-color-scheme", mode);
    window.dispatchEvent(
      new CustomEvent<ColorPreference>(COLOR_PREFERENCE_EVENT, { detail: mode })
    );
  } catch (err) {
    console.error("Failed to save color preference:", err);
  }
}

export function useColorPreference() {
  const [preference, setPreferenceState] = useState<ColorPreference>("red-up");

  useEffect(() => {
    const syncCurrentPreference = () => {
      const current = getColorPreference();
      setPreferenceState(current);
      document.documentElement.setAttribute("data-color-scheme", current);
    };

    syncCurrentPreference();

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ColorPreference>;
      if (customEvent.detail) {
        setPreferenceState(customEvent.detail);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      const key = getColorPreferenceStorageKey();
      if (e.key === key && e.newValue) {
        const next = e.newValue === "green-up" ? "green-up" : "red-up";
        setPreferenceState(next);
        document.documentElement.setAttribute("data-color-scheme", next);
      }
    };

    const handleAuthChanged = () => {
      syncCurrentPreference();
    };

    window.addEventListener(COLOR_PREFERENCE_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("stock_auth_changed", handleAuthChanged);

    return () => {
      window.removeEventListener(COLOR_PREFERENCE_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("stock_auth_changed", handleAuthChanged);
    };
  }, []);

  const setPreference = useCallback((mode: ColorPreference) => {
    setPreferenceState(mode);
    setColorPreference(mode);
  }, []);

  const isRedUp = preference === "red-up";
  const upColor = isRedUp ? "#ef4444" : "#22c55e";
  const downColor = isRedUp ? "#22c55e" : "#ef4444";

  return {
    preference,
    setPreference,
    isRedUp,
    upColor,
    downColor,
  };
}
