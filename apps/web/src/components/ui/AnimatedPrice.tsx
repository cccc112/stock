"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface AnimatedPriceProps {
  price: number;
  currencyPrefix?: string;
  decimals?: number;
  className?: string;
  showIndicator?: boolean;
}

export default function AnimatedPrice({
  price,
  currencyPrefix = "",
  decimals = 2,
  className = "",
  showIndicator = true,
}: AnimatedPriceProps) {
  const [tickState, setTickState] = useState<"up" | "down" | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number>(price);
  const prevPriceRef = useRef<number>(price);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(price) || price <= 0) {
      setDisplayPrice(price);
      return;
    }

    const startPrice = prevPriceRef.current;
    if (startPrice === price || startPrice <= 0) {
      setDisplayPrice(price);
      prevPriceRef.current = price;
      return;
    }

    if (price > startPrice) {
      setTickState("up");
    } else if (price < startPrice) {
      setTickState("down");
    }

    // 啟動 420ms easeOutQuart 數值滾動插值動畫
    const duration = 420;
    const startTime = performance.now();
    const diff = price - startPrice;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutQuart 曲線
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayPrice(startPrice + diff * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayPrice(price);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTickState(null);
    }, 950);

    prevPriceRef.current = price;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [price]);

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono tabular-nums transition-all duration-300 ${
        tickState === "up"
          ? "tick-up font-black"
          : tickState === "down"
          ? "tick-down font-black"
          : ""
      } ${className}`}
    >
      {currencyPrefix && (
        <span className="text-secondary font-medium mr-0.5">{currencyPrefix}</span>
      )}
      <span>{formatNumber(displayPrice, decimals)}</span>
      {showIndicator && tickState && (
        <span
          className={`inline-flex items-center text-[10px] p-0.5 rounded animate-bounce ${
            tickState === "up" ? "text-up" : "text-down"
          }`}
        >
          {tickState === "up" ? (
            <ArrowUp size={12} className="stroke-[3]" />
          ) : (
            <ArrowDown size={12} className="stroke-[3]" />
          )}
        </span>
      )}
    </span>
  );
}
