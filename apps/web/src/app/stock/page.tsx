"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiStocks } from "@/lib/api";

const popularStocks = [
  { symbol: '2330', name: '台積電', market: 'TW' },
  { symbol: '2454', name: '聯發科', market: 'TW' },
  { symbol: '2317', name: '鴻海', market: 'TW' },
  { symbol: 'AAPL', name: 'Apple', market: 'US' },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US' },
  { symbol: 'TSLA', name: 'Tesla', market: 'US' },
];

export default function StockIndexPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiStocks.searchStocks(searchQuery);
        setSuggestions(Array.isArray(res.data) ? res.data : []);
        setShowDropdown(true);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      let symbol = searchQuery.trim().toUpperCase();
      router.push(`/stock/${symbol}`);
    }
  };

  const handleSelect = (symbol: string) => {
    setSearchQuery(symbol);
    setShowDropdown(false);
    router.push(`/stock/${symbol}`);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto mt-10">
      <h1 className="text-3xl font-bold text-center mb-8">個股分析</h1>
      
      <form onSubmit={handleSearch} className="relative mb-12">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="text-secondary" />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder="輸入股票代號或名稱 (e.g. 2330, AAPL)" 
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full py-4 pl-12 pr-6 text-lg focus:outline-none focus:border-accent transition-colors shadow-lg"
        />
        {showDropdown && suggestions.length > 0 && (
          <div ref={dropdownRef} className="absolute z-10 w-full mt-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
            {suggestions.map((s: any) => (
              <div 
                key={s.symbol}
                className="px-4 py-3 hover:bg-[var(--bg-secondary)] cursor-pointer flex justify-between items-center border-b border-[var(--border)] last:border-0"
                onClick={() => handleSelect(s.symbol)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">{s.symbol}</span>
                  <span className="text-secondary">{s.name}</span>
                </div>
                <span className="text-xs bg-[var(--bg-primary)] px-2 py-1 rounded text-secondary">{s.market}</span>
              </div>
            ))}
          </div>
        )}
        <button type="submit" className="hidden">Search</button>
      </form>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">熱門標的</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {popularStocks.map(stock => (
            <Link key={stock.symbol} href={`/stock/${stock.symbol}`}>
              <Card className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-center py-6">
                <div className="text-2xl font-bold mb-1">{stock.symbol}</div>
                <div className="text-secondary">{stock.name}</div>
                <div className="text-xs text-muted mt-2">{stock.market === 'TW' ? '台股' : '美股'}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
