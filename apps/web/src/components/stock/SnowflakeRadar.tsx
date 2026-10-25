"use client";

import React from "react";

export interface RadarItem {
  axis: string;
  key: string;
  score: number;
  metric?: string;
}

interface SnowflakeRadarProps {
  items: RadarItem[];
  totalScore?: number;
  size?: number;
  showMetrics?: boolean;
}

export default function SnowflakeRadar({
  items,
  totalScore = 60,
  size = 240,
  showMetrics = true,
}: SnowflakeRadarProps) {
  const axes =
    items.length === 5
      ? items
      : [
          { axis: "獲利能力", key: "profitability", score: 50 },
          { axis: "成長動能", key: "growth", score: 50 },
          { axis: "財務安全", key: "safety", score: 50 },
          { axis: "估值股息", key: "valuation", score: 50 },
          { axis: "技術籌碼", key: "momentum", score: 50 },
        ];

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.33;
  const levels = [20, 40, 60, 80, 100];

  const angleFor = (idx: number) => -Math.PI / 2 + (idx * 2 * Math.PI) / axes.length;

  const pointAt = (idx: number, val: number) => {
    const r = (Math.max(8, Math.min(100, val)) / 100) * maxR;
    const a = angleFor(idx);
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
    };
  };

  const polygonPoints = axes
    .map((item, idx) => {
      const pt = pointAt(idx, item.score || 0);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(" ");

  const strokeColor =
    totalScore >= 68 ? "#10b981" : totalScore >= 48 ? "#38bdf8" : "#f59e0b";
  const fillColor =
    totalScore >= 68
      ? "rgba(16, 185, 129, 0.24)"
      : totalScore >= 48
      ? "rgba(56, 189, 248, 0.22)"
      : "rgba(245, 158, 11, 0.22)";

  const hasMetrics = showMetrics && axes.some((a) => a.metric);

  return (
    <div className="flex flex-col items-center justify-center select-none w-full">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Concentric pentagons */}
        {levels.map((lv) => {
          const pts = axes
            .map((_, idx) => {
              const p = pointAt(idx, lv);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <polygon
              key={lv}
              points={pts}
              fill="none"
              stroke="rgba(148, 163, 184, 0.22)"
              strokeWidth={lv === 100 ? 1.2 : 0.8}
              strokeDasharray={lv === 60 ? "3 2" : undefined}
            />
          );
        })}

        {/* Axis spokes */}
        {axes.map((_, idx) => {
          const outer = pointAt(idx, 100);
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(148, 163, 184, 0.25)"
              strokeWidth={0.9}
            />
          );
        })}

        {/* Radar filled area */}
        <polygon
          points={polygonPoints}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />

        {/* Vertex dots & labels */}
        {axes.map((item, idx) => {
          const pt = pointAt(idx, item.score || 0);
          const labelPt = pointAt(idx, 134);
          const a = angleFor(idx);
          const cos = Math.cos(a);
          const textAnchor =
            Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
          return (
            <g key={item.key}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={4}
                fill={strokeColor}
                stroke="var(--color-bg-secondary)"
                strokeWidth={1.5}
              />
              <text
                x={labelPt.x}
                y={labelPt.y - 5}
                textAnchor={textAnchor}
                fill="var(--color-text-secondary)"
                className="text-[11px] font-medium"
              >
                {item.axis}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 9}
                textAnchor={textAnchor}
                fill={strokeColor}
                className="text-[11px] font-mono font-bold"
              >
                {item.score}/100
              </text>
            </g>
          );
        })}
      </svg>

      {hasMetrics && (
        <div className="w-full mt-2 pt-2.5 border-t border-[var(--border)] px-2.5 pb-1 space-y-1.5 text-[11px]">
          <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
            五維度真實財報與量化計算依據
          </div>
          {axes.map((item) => (
            <div key={item.key} className="flex flex-col gap-0.5 py-0.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">{item.axis}</span>
                <span className="font-mono font-bold text-accent">{item.score} 分</span>
              </div>
              {item.metric && (
                <div className="text-[10px] text-secondary font-mono truncate" title={item.metric}>
                  {item.metric}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
