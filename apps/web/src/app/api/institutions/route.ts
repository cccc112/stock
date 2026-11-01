import { NextRequest, NextResponse } from "next/server";

const FINMIND_URL = "https://api.finmindtrade.com/api/v4/data";

function getStartDate(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim().replace(/\.TW[O]?$/i, "");

  try {
    // 1. 個股三大法人買賣超 + 真實歷史收盤價
    if (symbol) {
      const startDate = getStartDate(35);
      const [instRes, priceRes, infoRes] = await Promise.allSettled([
        fetch(
          `${FINMIND_URL}?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`,
          { next: { revalidate: 300 } }
        ),
        fetch(
          `${FINMIND_URL}?dataset=TaiwanStockPrice&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`,
          { next: { revalidate: 180 } }
        ),
        fetch(
          `${FINMIND_URL}?dataset=TaiwanStockInfo&data_id=${encodeURIComponent(symbol)}`,
          { next: { revalidate: 86400 } }
        ),
      ]);

      const priceMap: Record<string, number> = {};
      let latestClose = 0;
      if (priceRes.status === "fulfilled" && priceRes.value.ok) {
        const pJson = await priceRes.value.json();
        for (const r of pJson?.data || []) {
          if (r.date && r.close) {
            priceMap[r.date] = Number(r.close);
            latestClose = Number(r.close);
          }
        }
      }

      let stockName = symbol;
      if (infoRes.status === "fulfilled" && infoRes.value.ok) {
        const iJson = await infoRes.value.json();
        const found = (iJson?.data || []).find((x: any) => x.stock_id === symbol);
        if (found?.stock_name) stockName = found.stock_name;
      }

      if (instRes.status === "fulfilled" && instRes.value.ok) {
        const instJson = await instRes.value.json();
        const rows = instJson?.data || [];
        const dailyMap: Record<
          string,
          { date: string; full_date: string; foreign: number; trust: number; dealer: number; close: number }
        > = {};

        for (const r of rows) {
          const d = String(r.date || "");
          if (!d) continue;
          if (!dailyMap[d]) {
            dailyMap[d] = {
              date: d.slice(5).replace("-", "/"),
              full_date: d,
              foreign: 0,
              trust: 0,
              dealer: 0,
              close: priceMap[d] || latestClose,
            };
          }
          const netShares = Math.round(((Number(r.buy) || 0) - (Number(r.sell) || 0)) / 1000);
          const k = String(r.name || "").toLowerCase();
          if (k.includes("foreign")) {
            dailyMap[d].foreign += netShares;
          } else if (k.includes("trust")) {
            dailyMap[d].trust += netShares;
          } else if (k.includes("dealer")) {
            dailyMap[d].dealer += netShares;
          }
        }

        const timeline = Object.keys(dailyMap)
          .sort()
          .map((k) => dailyMap[k])
          .slice(-15);

        if (timeline.length > 0) {
          if (latestClose > 0) {
            timeline[timeline.length - 1].close = latestClose;
          }
          const recent5 = timeline.slice(-5);
          const sum5F = recent5.reduce((s, x) => s + x.foreign, 0);
          const sum5T = recent5.reduce((s, x) => s + x.trust, 0);
          const sum5D = recent5.reduce((s, x) => s + x.dealer, 0);

          const getConsecutive = (key: "foreign" | "trust") => {
            let count = 0;
            let dir: "buy" | "sell" | null = null;
            for (let i = timeline.length - 1; i >= 0; i--) {
              const v = timeline[i][key];
              if (v === 0) continue;
              const cur = v > 0 ? "buy" : "sell";
              if (!dir) {
                dir = cur;
                count = 1;
              } else if (dir === cur) {
                count++;
              } else {
                break;
              }
            }
            return { days: count, action: dir === "buy" ? "買超" : dir === "sell" ? "賣超" : "持平" };
          };

          const latest = timeline[timeline.length - 1];
          return NextResponse.json({
            symbol,
            name: stockName,
            latest_close: latest.close,
            latest: {
              foreign: latest.foreign,
              trust: latest.trust,
              dealer: latest.dealer,
              total: latest.foreign + latest.trust + latest.dealer,
              date: latest.date,
            },
            stats_5d: {
              foreign: sum5F,
              trust: sum5T,
              dealer: sum5D,
              total: sum5F + sum5T + sum5D,
            },
            consecutive: {
              foreign: getConsecutive("foreign"),
              trust: getConsecutive("trust"),
            },
            history: timeline,
          });
        }
      }

      return NextResponse.json({ error: "No institutional data for symbol" }, { status: 404 });
    }

    // 2. 全市場大盤三大法人每日買賣超 (TaiwanStockTotalInstitutionalInvestors)
    const startDate = getStartDate(35);
    const res = await fetch(
      `${FINMIND_URL}?dataset=TaiwanStockTotalInstitutionalInvestors&start_date=${startDate}`,
      { next: { revalidate: 300 } }
    );

    if (res.ok) {
      const json = await res.json();
      const rows = json?.data || [];
      const dailyMap: Record<
        string,
        { date: string; full_date: string; foreign: number; trust: number; dealer: number }
      > = {};

      for (const r of rows) {
        const d = String(r.date || "");
        const name = String(r.name || "").toLowerCase();
        if (!d || name === "total") continue;

        if (!dailyMap[d]) {
          dailyMap[d] = {
            date: d.slice(5).replace("-", "/"),
            full_date: d,
            foreign: 0,
            trust: 0,
            dealer: 0,
          };
        }

        const netBillion = ((Number(r.buy) || 0) - (Number(r.sell) || 0)) / 100_000_000;
        if (name.includes("foreign")) {
          dailyMap[d].foreign = Number((dailyMap[d].foreign + netBillion).toFixed(2));
        } else if (name.includes("trust")) {
          dailyMap[d].trust = Number((dailyMap[d].trust + netBillion).toFixed(2));
        } else if (name.includes("dealer")) {
          dailyMap[d].dealer = Number((dailyMap[d].dealer + netBillion).toFixed(2));
        }
      }

      const result = Object.keys(dailyMap)
        .sort()
        .map((k) => dailyMap[k])
        .filter((v) => Math.abs(v.foreign) > 0.01 || Math.abs(v.trust) > 0.01 || Math.abs(v.dealer) > 0.01)
        .slice(-15);

      return NextResponse.json(result);
    }

    return NextResponse.json([], { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
