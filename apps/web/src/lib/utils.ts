export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number, currency: 'TWD' | 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, 2)}%`;
}

export function formatVolume(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toString();
}

export function getChangeColorClass(change: number, _market: 'TW' | 'US' = 'TW') {
  if (change === 0) return 'text-secondary';
  return change > 0 ? 'text-up-tw' : 'text-down-tw';
}

export function getPriceColors() {
  const isGreenUp =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-color-scheme') === 'green-up';
  return {
    upColor: isGreenUp ? '#22c55e' : '#ef4444',
    downColor: isGreenUp ? '#ef4444' : '#22c55e',
    isGreenUp,
  };
}

export function getChangeColor(change: number, _market: 'TW' | 'US' = 'TW') {
  if (change === 0) return '#8b8f9a'; // text-secondary
  const { upColor, downColor } = getPriceColors();
  return change > 0 ? upColor : downColor;
}
