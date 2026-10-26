"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWatchlist, WatchlistStock } from "@/hooks/useWatchlist";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { 
  X, 
  Search, 
  Plus, 
  LayoutGrid, 
  Table as TableIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  FolderPlus,
  ArrowUpRight,
  TrendingUp,
  Tag,
  Star
} from "lucide-react";

export default function WatchlistPanel() {
  const { items, removeItem, addStock, categories, addCategory, updateCategory } = useWatchlist();
  const router = useRouter();

  // 排版模式：表格 (table) | 卡片網格 (grid) | 緊湊條列 (compact)
  const [layout, setLayout] = useState<'table' | 'grid' | 'compact'>('table');
  
  // 分類選擇
  const [activeCategory, setActiveCategory] = useState("全部");
  const [newCatInput, setNewCatInput] = useState("");
  const [showNewCatModal, setShowNewCatModal] = useState(false);

  // 快速新增股票
  const [quickSymbol, setQuickSymbol] = useState("");
  const [quickCategory, setQuickCategory] = useState("核心權值");

  // 搜尋過濾
  const [searchQuery, setSearchQuery] = useState("");

  // 分頁狀態
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 依據分類與搜尋篩選股票
  const filteredItems = useMemo(() => {
    return items.filter((stock) => {
      const matchCat = activeCategory === "全部" || stock.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [items, activeCategory, searchQuery]);

  // 分頁計算
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // 快速新增處理
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSymbol.trim()) {
      addStock(quickSymbol.trim().toUpperCase(), quickCategory);
      setQuickSymbol("");
    }
  };

  // 新增分類
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim()) {
      addCategory(newCatInput.trim());
      setActiveCategory(newCatInput.trim());
      setNewCatInput("");
      setShowNewCatModal(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 頂部工具列：快速加入自選 + 搜尋 + 排版切換 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm">
        {/* 左側：快速加入自選股表單 */}
        <form onSubmit={handleQuickAdd} className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="輸入標的代碼..."
              value={quickSymbol}
              onChange={(e) => setQuickSymbol(e.target.value)}
              className="input-field text-xs py-1.5 px-3 pr-8 w-44 rounded-lg"
            />
            <Plus size={14} className="absolute right-2.5 top-2.5 text-secondary pointer-events-none" />
          </div>

          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="input-field text-xs py-1.5 px-2.5 w-28 rounded-lg cursor-pointer"
          >
            {categories.filter(c => c !== "全部").map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <Button size="sm" type="submit">
            <Plus size={13} className="mr-1" /> 加自選
          </Button>
        </form>

        {/* 右側：搜尋自選 + 排版切換 */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="搜尋清單內標的..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-1.5 px-3 pr-8 w-36 sm:w-44 rounded-lg"
            />
            <Search size={13} className="absolute right-2.5 top-2.5 text-secondary pointer-events-none" />
          </div>

          {/* 排版切換按鈕組 */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]">
            <button
              onClick={() => setLayout('table')}
              title="表格詳細排版"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                layout === 'table' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              <TableIcon size={14} />
            </button>
            <button
              onClick={() => setLayout('grid')}
              title="大卡片網格排版"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                layout === 'grid' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setLayout('compact')}
              title="緊湊精簡排版"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                layout === 'compact' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 分類標籤篩選列 (Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <span className="text-xs text-secondary font-medium mr-1 flex items-center gap-1 whitespace-nowrap">
          <Tag size={13} /> 分類：
        </span>
        {categories.map((cat) => {
          const count = cat === "全部" 
            ? items.length 
            : items.filter(i => i.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-[var(--accent)] text-white shadow-md shadow-accent/25"
                  : "bg-[var(--bg-secondary)] border border-[var(--border)] text-secondary hover:text-primary hover:border-accent"
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'}`}>
                {count}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setShowNewCatModal(true)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium text-accent border border-dashed border-accent/40 hover:bg-accent/10 transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
        >
          <FolderPlus size={13} /> + 新增分類
        </button>
      </div>

      {/* 新增分類彈窗 */}
      {showNewCatModal && (
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-accent/30 shadow-lg flex items-center justify-between gap-3 animate-scale-in">
          <form onSubmit={handleCreateCategory} className="flex items-center gap-2 flex-1">
            <input
              type="text"
              placeholder="自訂新分類名稱..."
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              className="input-field text-xs py-1.5 px-3 flex-1 rounded-lg"
              autoFocus
            />
            <Button size="sm" type="submit">建立分類</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowNewCatModal(false)}>取消</Button>
          </form>
        </div>
      )}

      {/* 主展示區：依排版模式渲染 */}
      {pagedItems.length === 0 ? (
        <Card className="text-center py-16 text-secondary text-xs">
          <Star size={32} className="mx-auto mb-2 text-secondary/40" />
          {items.length === 0 
            ? "尚未加入自選股，可於上方輸入代碼快速加自選" 
            : `在「${activeCategory}」分類中查無符合條件的自選標的`}
        </Card>
      ) : layout === 'table' ? (
        /* ------------------ 1. 表格詳細視圖 ------------------ */
        <Card className="overflow-hidden border border-[var(--border)]">
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 text-left">代號/名稱</th>
                  <th className="text-left">所屬分類</th>
                  <th className="text-right">成交價</th>
                  <th className="text-right">漲跌</th>
                  <th className="text-right">漲跌幅</th>
                  <th className="text-right">成交量</th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono">
                {pagedItems.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/stock/${stock.symbol}`)}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary group-hover:text-accent transition-colors">
                          {stock.symbol}
                        </span>
                        <span className="text-secondary font-sans">{stock.name}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 font-sans" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={stock.category || "預設"}
                        onChange={(e) => updateCategory(stock.symbol, e.target.value)}
                        className="bg-[var(--bg-tertiary)] border border-[var(--border)] text-[11px] rounded px-1.5 py-0.5 text-secondary hover:text-primary cursor-pointer outline-none"
                      >
                        {categories.filter(c => c !== "全部").map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>

                    <td className="text-right font-semibold text-primary font-mono">
                      ${formatNumber(stock.price, 2)}
                    </td>

                    <td className={`text-right font-mono ${getChangeColorClass(stock.change, stock.market)}`}>
                      {stock.change > 0 ? "+" : ""}
                      {Number(stock.change || 0).toFixed(2)}
                    </td>

                    <td className="text-right">
                      <Badge value={stock.change_pct} market={stock.market} size="sm" />
                    </td>

                    <td className="text-right font-mono text-secondary">
                      {formatVolume(stock.volume)}
                    </td>

                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeItem(stock.symbol)}
                        className="p-1 text-muted hover:text-danger rounded transition-colors"
                        title="移出自選"
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : layout === 'grid' ? (
        /* ------------------ 2. 卡片網格視圖 ------------------ */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {pagedItems.map((stock) => {
            const isUp = stock.change_pct > 0;
            return (
              <div
                key={stock.symbol}
                className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-3.5 flex flex-col justify-between hover-lift cursor-pointer group shadow-sm"
                onClick={() => router.push(`/stock/${stock.symbol}`)}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-base text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                        {stock.symbol}
                        <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                      </div>
                      <div className="text-xs text-secondary truncate max-w-[120px]">{stock.name}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(stock.symbol);
                      }}
                      className="text-muted hover:text-danger p-1 transition-colors"
                      title="移出自選"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="my-2.5">
                    <div className="text-2xl font-bold font-mono text-primary">
                      ${formatNumber(stock.price, 2)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-mono font-semibold ${getChangeColorClass(stock.change, stock.market)}`}>
                        {stock.change > 0 ? "+" : ""}{Number(stock.change || 0).toFixed(2)}
                      </span>
                      <Badge value={stock.change_pct} market={stock.market} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)]/50 flex justify-between items-center text-[11px] text-secondary">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] font-sans">
                    {stock.category || "預設"}
                  </span>
                  <span className="font-mono">{formatVolume(stock.volume)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ------------------ 3. 緊湊精簡條列視圖 ------------------ */
        <div className="space-y-1.5">
          {pagedItems.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => router.push(`/stock/${stock.symbol}`)}
              className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-accent transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-primary group-hover:text-accent font-mono w-16">
                  {stock.symbol}
                </span>
                <span className="text-xs text-secondary truncate max-w-[110px]">{stock.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary">
                  {stock.category || "預設"}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono font-semibold text-sm text-primary">
                    ${formatNumber(stock.price, 2)}
                  </div>
                </div>
                <div className="w-20 text-right">
                  <Badge value={stock.change_pct} market={stock.market} size="sm" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(stock.symbol);
                  }}
                  className="text-muted hover:text-danger p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部導航與分頁控制 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-secondary">
        <div className="flex items-center gap-2">
          <span>共 {filteredItems.length} 檔自選</span>
          <span>•</span>
          <span>每頁顯示</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs cursor-pointer outline-none"
          >
            <option value={5}>5 檔</option>
            <option value={10}>10 檔</option>
            <option value={20}>20 檔</option>
            <option value={50}>50 檔</option>
          </select>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded border border-[var(--border)] bg-[var(--bg-secondary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono font-medium text-primary">
              第 {currentPage} / {totalPages} 頁
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-[var(--border)] bg-[var(--bg-secondary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
