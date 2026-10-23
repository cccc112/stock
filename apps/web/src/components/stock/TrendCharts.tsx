"use client";

/** 財報趨勢小圖（純 SVG，不引入額外套件） */

const W = 300, H = 130, PAD = { l: 8, r: 8, t: 22, b: 22 };

interface BarProps {
  title: string;
  labels: string[];
  values: (number | null)[];
  format: (v: number) => string;
  color?: string;
}

export function BarTrend({ title, labels, values, format, color = '#6366f1' }: BarProps) {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  const max = Math.max(0, ...nums), min = Math.min(0, ...nums);
  const span = max - min || 1;
  const plotH = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + ((max - v) / span) * plotH;
  const bw = (W - PAD.l - PAD.r) / values.length;
  return (
    <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
      <div className="text-xs text-secondary mb-1">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="rgba(148,163,184,0.3)" />
        {values.map((v, i) => {
          if (v == null) return null;
          const x = PAD.l + i * bw + bw * 0.15;
          const top = Math.min(y(v), y(0));
          const isLast = i === values.length - 1;
          return (
            <g key={i}>
              <rect x={x} y={top} width={bw * 0.7} height={Math.max(1, Math.abs(y(v) - y(0)))}
                fill={v < 0 ? '#ef4444' : color} opacity={isLast ? 1 : 0.6} rx={2} />
              <text x={x + bw * 0.35} y={v >= 0 ? top - 3 : top + Math.abs(y(v) - y(0)) + 10} fontSize={8} fill="#94a3b8" textAnchor="middle">
                {format(v)}
              </text>
              <text x={x + bw * 0.35} y={H - 8} fontSize={8} fill="#94a3b8" textAnchor="middle">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface LineProps {
  title: string;
  labels: string[];
  series: { name: string; color: string; values: (number | null)[] }[];
}

export function LineTrend({ title, labels, series }: LineProps) {
  const nums = series.flatMap(s => s.values).filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  const max = Math.max(...nums), min = Math.min(...nums);
  const span = max - min || 1;
  const plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + 8 + (i * (W - PAD.l - PAD.r - 16)) / Math.max(1, labels.length - 1);
  const y = (v: number) => PAD.t + ((max - v) / span) * plotH;
  return (
    <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-secondary">{title}</span>
        <span style={{ display: 'flex', gap: 8, fontSize: 10 }}>
          {series.map(s => <span key={s.name} style={{ color: s.color }}>● {s.name}</span>)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {series.map(s => {
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)] as const));
          const path = pts.filter(Boolean).map((p, i) => `${i === 0 ? 'M' : 'L'}${p![0]},${p![1]}`).join(' ');
          const lastIdx = s.values.length - 1;
          const last = s.values[lastIdx];
          return (
            <g key={s.name}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={1.8} />
              {pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={2} fill={s.color} />)}
              {last != null && <text x={x(lastIdx)} y={y(last) - 5} fontSize={8} fill={s.color} textAnchor="end">{last.toFixed(1)}%</text>}
            </g>
          );
        })}
        {labels.map((l, i) => <text key={i} x={x(i)} y={H - 8} fontSize={8} fill="#94a3b8" textAnchor="middle">{l}</text>)}
      </svg>
    </div>
  );
}
