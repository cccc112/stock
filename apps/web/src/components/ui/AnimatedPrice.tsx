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
  const prevPriceRef = useRef<number>(price);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prevPriceRef.current !== price && Number.isFinite(price) && price > 0) {
      if (price > prevPriceRef.current) {
        setTickState("up");
      } else if (price < prevPriceRef.current) {
        setTickState("down");
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setTickState(null);
      }, 950);

      prevPriceRef.current = price;
    }
  }, [price]);

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono tabular-nums transition-all duration-200 ${
        tickState === "up"
          ? "tick-up font-black"
          : tickState === "down"
          ? "tick-down font-black"
          : ""
      } ${className}`}
    >
      {currencyPrefix && <span className="text-secondary font-medium mr-0.5">{currencyPrefix}</span>}
      <span>{formatNumber(price, decimals)}</span>
      {showIndicator && tickState && (
        <span
          className={`inline-flex items-center text-[10px] p-0.5 rounded animate-pulse ${
            tickState === "up" ? "text-up" : "text-down"
          }`}
        >
          {tickState === "up" ? <ArrowUp size={12} className="stroke-[3]" /> : <ArrowDown size={12} className="stroke-[3]" />}
        </span>
      )}
    </span>
  );
}
