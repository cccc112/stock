"use client";

import { useState, useEffect, useCallback } from "react";

export type ColorPreference = "red-up" | "green-up";

export const COLOR_PREFERENCE_STORAGE_KEY = "stock_color_preference";
export const COLOR_PREFERENCE_EVENT = "stock_color_preference_change";

export function getColorPreference(): ColorPreference {
  if (typeof window === "undefined") return "red-up";
  try {
    const saved = localStorage.getItem(COLOR_PREFERENCE_STORAGE_KEY);
    return saved === "green-up" ? "green-up" : "red-up";
  } catch {
    return "red-up";
  }
}

export function setColorPreference(mode: ColorPreference) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COLOR_PREFERENCE_STORAGE_KEY, mode);
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
    const current = getColorPreference();
    setPreferenceState(current);
    document.documentElement.setAttribute("data-color-scheme", current);

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ColorPreference>;
      if (customEvent.detail) {
        setPreferenceState(customEvent.detail);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === COLOR_PREFERENCE_STORAGE_KEY && e.newValue) {
        const next = e.newValue === "green-up" ? "green-up" : "red-up";
        setPreferenceState(next);
        document.documentElement.setAttribute("data-color-scheme", next);
      }
    };

    window.addEventListener(COLOR_PREFERENCE_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(COLOR_PREFERENCE_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
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
