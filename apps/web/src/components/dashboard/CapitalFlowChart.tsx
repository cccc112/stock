"use client";

import { useEffect, useState } from "react";
import { apiMarket } from "@/lib/api";
import Card from "@/components/ui/Card";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from "recharts";
import { Activity } from "lucide-react";

interface FlowData {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number; // in thousands
  net_flow: number; // in millions
  is_etf: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as FlowData;
    return (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3 rounded-md shadow-lg z-50">
        <div className="font-bold mb-1">{data.name} ({data.symbol})</div>
        <div className="text-sm">漲跌幅: {data.change_pct > 0 ? '+' : ''}{data.change_pct.toFixed(2)}%</div>
        <div className="text-sm">股價: {data.price.toFixed(2)}</div>
        <div className="text-sm">成交量: {data.volume.toLocaleString()} 張</div>
        <div className={`text-sm font-semibold mt-1 ${data.net_flow > 0 ? 'text-red-500' : 'text-green-500'}`}>
          法人淨流向: {data.net_flow > 0 ? '+' : ''}{data.net_flow.toLocaleString()} 百萬
        </div>
      </div>
    );
  }
  return null;
};

export default function CapitalFlowChart() {
  const [data, setData] = useState<FlowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlow = async () => {
      try {
        const response = await apiMarket.getCapitalFlow();
        const resData = response.data.data || response.data;
        if (Array.isArray(resData)) {
          setData(resData);
        }
      } catch (error) {
        console.error("Failed to fetch capital flow", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFlow();
  }, []);

  return (
    <Card 
      title="資金流向與 ETF 動態追蹤" 
      className="h-full"
      headerAction={<Activity size={18} className="text-primary" />}
    >
      <div className="h-[350px] w-full mt-4">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-secondary">
            暫無資金流向資料
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              
              <XAxis 
                type="number" 
                dataKey="change_pct" 
                name="漲跌幅" 
                unit="%" 
                tick={{ fill: 'var(--color-secondary)', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              
              <YAxis 
                type="number" 
                dataKey="net_flow" 
                name="資金流向" 
                unit="百萬" 
                tick={{ fill: 'var(--color-secondary)', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              
              {/* ZAxis determines bubble size */}
              <ZAxis type="number" dataKey="volume" range={[100, 1500]} name="成交量" />
              
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              <Scatter name="Stocks" data={data} animationDuration={1000}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.is_etf ? '#8b5cf6' : (entry.net_flow > 0 ? '#ef4444' : '#22c55e')} 
                    fillOpacity={0.7}
                    stroke={entry.is_etf ? '#7c3aed' : (entry.net_flow > 0 ? '#dc2626' : '#16a34a')}
                    strokeWidth={2}
                  />
                ))}
                <LabelList dataKey="name" position="top" fill="var(--color-secondary)" fontSize={10} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {!loading && data.length > 0 && (
        <div className="flex gap-4 justify-center mt-2 text-sm text-secondary">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 opacity-70"></span>
            <span>個股流入</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500 opacity-70"></span>
            <span>個股流出</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#8b5cf6] opacity-70"></span>
            <span>ETF標的</span>
          </div>
          <div className="flex items-center gap-1 ml-4 text-xs">
            <span>* 泡泡大小代表成交量</span>
          </div>
        </div>
      )}
    </Card>
  );
}
