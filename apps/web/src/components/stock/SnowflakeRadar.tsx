"use client";

import React, { useState } from "react";
import { InfoTip } from "@/components/ui/TermTooltip";
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

export interface RadarItem {
  axis: string;
  key: string;
  score: number;
  grade?: string;
  metric?: string;
  reason?: string;
  pros?: string[];
  cons?: string[];
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandAllReasons, setExpandAllReasons] = useState(true);

  const axes: RadarItem[] =
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
  const maxR = size * 0.32;
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
    totalScore >= 80 ? "#10b981" : totalScore >= 60 ? "#0284c7" : totalScore >= 45 ? "#d97706" : "#e11d48";
  const fillColor =
    totalScore >= 80
      ? "rgba(16, 185, 129, 0.22)"
      : totalScore >= 60
      ? "rgba(2, 132, 199, 0.20)"
      : totalScore >= 45
      ? "rgba(217, 119, 6, 0.20)"
      : "rgba(225, 29, 72, 0.20)";

  const getScoreColor = (sc: number) =>
    sc >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : sc >= 60
      ? "text-sky-600 dark:text-sky-400"
      : sc >= 45
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  const getScoreBg = (sc: number) =>
    sc >= 80
      ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
      : sc >= 60
      ? "bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/30 text-sky-800 dark:text-sky-300"
      : sc >= 45
      ? "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-300"
      : "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-800 dark:text-rose-300";

  const getProgressBarColor = (sc: number) =>
    sc >= 80 ? "bg-emerald-500" : sc >= 60 ? "bg-sky-500" : sc >= 45 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="flex flex-col items-center justify-center select-none w-full">
      {/* 1. 五維幾何雪花圖 */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible cursor-pointer"
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
          const isSelected = selectedKey === item.key;

          return (
            <g
              key={item.key}
              onClick={() => setSelectedKey(isSelected ? null : item.key)}
              className="transition-transform hover:scale-105"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? "#ffffff" : strokeColor}
                stroke={isSelected ? strokeColor : "var(--color-bg-secondary)"}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text
                x={labelPt.x}
                y={labelPt.y - 5}
                textAnchor={textAnchor}
                fill={isSelected ? "var(--accent)" : "var(--text-secondary)"}
                className={`text-[11px] ${isSelected ? "font-bold" : "font-medium"}`}
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

      {/* 2. 五維度評分判定理由與扣分/加分詳細說明面板 */}
      {showMetrics && (
        <div className="w-full mt-3 pt-3 border-t border-[var(--border)] space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
              <span>五維度評分判定依據與理由說明</span>
              <HelpCircle size={13} className="text-secondary" />
            </span>
            <button
              type="button"
              className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
              onClick={() => {
                setExpandAllReasons(!expandAllReasons);
                setSelectedKey(null);
              }}
            >
              {expandAllReasons ? (
                <>
                  <span>收起理由</span>
                  <ChevronUp size={12} />
                </>
              ) : (
                <>
                  <span>展開全部理由</span>
                  <ChevronDown size={12} />
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {axes.map((item) => {
              const isTarget = selectedKey === item.key || (expandAllReasons && selectedKey === null);
              const sc = item.score || 50;
              const grade = item.grade || (sc >= 80 ? "極優" : sc >= 60 ? "良好" : sc >= 45 ? "中立" : "偏弱");

              return (
                <div
                  key={item.key}
                  className={`rounded-lg border p-2.5 transition-all ${
                    selectedKey === item.key
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-[var(--border)] bg-[var(--bg-primary)]/50 hover:bg-[var(--bg-primary)]"
                  }`}
                  onClick={() => setSelectedKey(selectedKey === item.key ? null : item.key)}
                >
                  {/* 維度標題、分數與進度條 */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-primary">{item.axis}</span>
                      <InfoTip term={item.key} />
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getScoreBg(sc)}`}>
                        {grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`font-mono font-bold text-xs ${getScoreColor(sc)}`}>
                        {sc} 分
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-secondary transition-transform ${isTarget ? "rotate-180" : ""}`}
                      />
                    </div>
                  </div>

                  {/* 分數條 */}
                  <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${getProgressBarColor(sc)}`}
                      style={{ width: `${Math.min(100, Math.max(8, sc))}%` }}
                    />
                  </div>

                  {/* 展開之判定理由與加扣分因數 */}
                  {isTarget && (
                    <div className="space-y-1.5 pt-1 border-t border-[var(--border)]/70 text-[11px] leading-relaxed animate-fadeIn">
                      {/* 核心判定理由 */}
                      {item.reason && (
                        <div className="p-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-primary">
                          <span className="font-semibold text-accent mr-1">💡 判定理由：</span>
                          {item.reason}
                        </div>
                      )}

                      {/* 加分優勢與扣分隱憂 */}
                      {(item.pros?.length || item.cons?.length) ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {item.pros?.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium"
                            >
                              <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                              <span>{p}</span>
                            </span>
                          ))}
                          {item.cons?.map((c, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 text-rose-800 dark:text-rose-300 font-medium"
                            >
                              <AlertTriangle size={11} className="text-rose-600 dark:text-rose-400" />
                              <span>{c}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* 真實數據依據 */}
                      {item.metric && (
                        <div className="text-[10px] text-secondary font-mono pt-0.5">
                          <span className="text-muted">真實數據：</span>
                          {item.metric}
                        </div>
                      )}
                    </div>
                  )}

                  {!isTarget && item.metric && (
                    <div className="text-[10px] text-secondary font-mono truncate" title={item.metric}>
                      {item.metric}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
