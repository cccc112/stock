import { cn } from "@/lib/utils";

interface VAPData {
  price_range_start: number;
  price_range_end: number;
  volume: number;
  is_peak: boolean;
}

interface VAPChartProps {
  data: VAPData[];
  currentPrice: number;
  className?: string;
}

export default function VAPChart({ data, currentPrice, className }: VAPChartProps) {
  if (!data || data.length === 0) return <div>No VAP data</div>;

  const maxVolume = Math.max(...data.map(d => d.volume));
  
  // Sort data by price ascending
  const sortedData = [...data].sort((a, b) => a.price_range_start - b.price_range_start);
  
  const minPrice = sortedData[0].price_range_start;
  const maxPrice = sortedData[sortedData.length - 1].price_range_end;
  
  // Calculate relative position of current price
  const pricePercent = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;
  const clampedPricePercent = Math.max(0, Math.min(100, pricePercent));

  return (
    <div className={cn("relative h-[300px] flex", className)}>
      {/* Y-axis (Price labels) */}
      <div className="w-16 flex flex-col justify-between text-xs text-secondary py-2 border-r border-[var(--border)] pr-2 text-right">
        <span>{maxPrice.toFixed(1)}</span>
        <span>{((maxPrice + minPrice) / 2).toFixed(1)}</span>
        <span>{minPrice.toFixed(1)}</span>
      </div>
      
      {/* Bars container */}
      <div className="flex-1 relative py-2">
        {/* Current price line */}
        <div 
          className="absolute left-0 right-0 h-px bg-accent z-10 flex items-center"
          style={{ bottom: `${clampedPricePercent}%` }}
        >
          <div className="absolute left-2 text-xs bg-accent text-white px-1 py-0.5 rounded shadow">
            {currentPrice.toFixed(1)}
          </div>
        </div>
        
        {/* VAP Bars */}
        <div className="absolute inset-y-2 left-0 right-0 flex flex-col justify-between">
          {sortedData.map((d, i) => {
            const widthPercent = (d.volume / maxVolume) * 100;
            const avgPrice = (d.price_range_start + d.price_range_end) / 2;
            return (
              <div key={i} className="flex-1 flex items-center group relative">
                <div 
                  className={cn(
                    "h-[80%] rounded-r transition-all duration-300",
                    d.is_peak ? "bg-[var(--accent)]/60" : "bg-[var(--bg-tertiary)] group-hover:bg-[var(--border-hover)]"
                  )}
                  style={{ width: `${widthPercent}%` }}
                />
                {/* Tooltip */}
                <div className="hidden group-hover:block absolute left-full ml-2 bg-secondary border border-border p-1 rounded text-xs z-20 whitespace-nowrap">
                  P: {avgPrice.toFixed(1)} | V: {(d.volume / 1000).toFixed(0)}k
                </div>
              </div>
            );
          }).reverse() /* Reverse because flex-col goes top to bottom, but we want high price at top */}
        </div>
      </div>
    </div>
  );
}
