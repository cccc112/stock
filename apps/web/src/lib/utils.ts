export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number, currency: 'TWD' | 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'TWD' ? 0 : 2,
    maximumFractionDigits: currency === 'TWD' ? 0 : 2,
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

export function getChangeColorClass(change: number, market: 'TW' | 'US' = 'TW') {
  if (change === 0) return 'text-secondary';
  if (market === 'TW') {
    return change > 0 ? 'text-up-tw' : 'text-down-tw';
  } else {
    return change > 0 ? 'text-up-us' : 'text-down-us';
  }
}

export function getChangeColor(change: number, market: 'TW' | 'US' = 'TW') {
  if (change === 0) return '#8b8f9a'; // text-secondary
  if (market === 'TW') {
    return change > 0 ? '#ef4444' : '#22c55e'; // up-tw, down-tw
  } else {
    return change > 0 ? '#22c55e' : '#ef4444'; // up-us, down-us
  }
}
