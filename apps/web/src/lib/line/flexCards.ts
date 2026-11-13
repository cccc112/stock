/**
 * LINE Messaging API - Flex Message 互動式卡片生成器
 */

export interface RadarSignalData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volumeLots?: number;
  triggerName: string;
  triggerDesc: string;
  category: "BREAKOUT" | "INSTITUTIONAL" | "ETF_FLOW" | "VOLUME";
}

/**
 * 1. 盤中量化雷達即時警報卡片 (Intraday Real-time Radar Alert)
 */
export function createRadarAlertFlexCard(data: RadarSignalData) {
  const isUp = data.change >= 0;
  const badgeColor = isUp ? "#dc2626" : "#059669";
  const badgeBg = isUp ? "#fee2e2" : "#d1fae5";
  const changeSign = isUp ? "+" : "";

  return {
    type: "flex",
    altText: `【量化雷達警報】${data.name} (${data.symbol}) ${data.triggerName}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#090d16",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "盤中量化雷達觸發",
                color: "#f59e0b",
                weight: "bold",
                size: "xs",
              },
              {
                type: "text",
                text: "14天Pro試用",
                color: "#10b981",
                weight: "bold",
                size: "xxs",
                align: "end",
              },
            ],
          },
          {
            type: "text",
            text: `${data.name} (${data.symbol})`,
            weight: "bold",
            size: "xl",
            color: "#f8fafc",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#ffffff",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: `$${data.price.toFixed(2)}`,
                size: "xxl",
                weight: "bold",
                color: badgeColor,
                flex: 0,
              },
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: badgeBg,
                cornerRadius: "6px",
                paddingStart: "8px",
                paddingEnd: "8px",
                paddingTop: "2px",
                paddingBottom: "2px",
                margin: "md",
                flex: 0,
                contents: [
                  {
                    type: "text",
                    text: `${changeSign}${data.changePct.toFixed(2)}%`,
                    color: badgeColor,
                    weight: "bold",
                    size: "xs",
                  },
                ],
              },
            ],
          },
          {
            type: "separator",
            margin: "md",
            color: "#e2e8f0",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "觸發指標",
                    color: "#64748b",
                    size: "xs",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: data.triggerName,
                    color: "#0f172a",
                    weight: "bold",
                    size: "xs",
                    flex: 5,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "量化解讀",
                    color: "#64748b",
                    size: "xs",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: data.triggerDesc,
                    color: "#334155",
                    size: "xs",
                    flex: 5,
                    wrap: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        backgroundColor: "#f8fafc",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#2563eb",
            height: "sm",
            action: {
              type: "uri",
              label: "開啟即時戰情室查看",
              uri: `https://stock-green-ten.vercel.app/stock/${data.symbol}`,
            },
          },
        ],
      },
    },
  };
}

/**
 * 2. 每日 15:30 盤後三大法人與 ETF 聯手大買戰報
 */
export function createPostMarketFlexCard(topBuys: { symbol: string; name: string; shares: number; price: number; changePct: number }[]) {
  const rows = topBuys.slice(0, 5).map((item, idx) => ({
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: `${idx + 1}. ${item.name}`,
        weight: "bold",
        size: "xs",
        color: "#0f172a",
        flex: 3,
      },
      {
        type: "text",
        text: `+${item.shares.toLocaleString()} 張`,
        weight: "bold",
        size: "xs",
        color: "#dc2626",
        align: "end",
        flex: 2,
      },
    ],
  }));

  return {
    type: "flex",
    altText: "15:30 盤後籌碼戰報：全市場投信與 ETF 聯手大買榜",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#090d16",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "盤後法人籌碼精選",
            color: "#f59e0b",
            weight: "bold",
            size: "xs",
          },
          {
            type: "text",
            text: "全市場 ETF 聯手大買 TOP 5",
            weight: "bold",
            size: "lg",
            color: "#f8fafc",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "證交所官方盤後投信買賣超穿透結算",
            size: "xxs",
            color: "#64748b",
            margin: "none",
          },
          {
            type: "separator",
            margin: "sm",
            color: "#e2e8f0",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: rows,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#2563eb",
            height: "sm",
            action: {
              type: "uri",
              label: "查看完整資金流向與持股",
              uri: "https://stock-green-ten.vercel.app/capital-flow",
            },
          },
        ],
      },
    },
  };
}

/**
 * 3. 歡迎加好友與 14 天 Pro 全功能試用開通卡片
 */
export function createWelcomeFlexCard(bindingCode: string) {
  return {
    type: "flex",
    altText: "歡迎加入 AI Stock Monitor！已為您開通 14 天 Pro 盤中即時雷達試用",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#090d16",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "AI Stock Monitor 官方服務",
            color: "#f59e0b",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "已啟用 14 天 Pro 盤中雷達",
            weight: "bold",
            size: "xl",
            color: "#f8fafc",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "您已享有專屬盤中即時推播權限！當台股出現「主力爆量突破」、「外資投信聯手同買」或「ETF 盤後成分股大異動」時，LINE 將第一時間提醒您。",
            size: "xs",
            color: "#334155",
            wrap: true,
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            paddingAll: "12px",
            backgroundColor: "#f1f5f9",
            cornerRadius: "8px",
            contents: [
              {
                type: "text",
                text: "快捷查詢說明：",
                size: "xs",
                weight: "bold",
                color: "#0f172a",
              },
              {
                type: "text",
                text: "直接在此聊天室輸入股票代碼（如 2330、0050），即可秒查即時市價與技術狀態！",
                size: "xs",
                color: "#475569",
                wrap: true,
                margin: "xs",
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#059669",
            height: "sm",
            action: {
              type: "uri",
              label: "開啟自選股即時戰情室",
              uri: "https://stock-green-ten.vercel.app/watchlist",
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "uri",
              label: "設定自選股推播清單",
              uri: "https://stock-green-ten.vercel.app/alerts",
            },
          },
        ],
      },
    },
  };
}

export interface HotRankLineItem {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  volumeLots: number;
}

export interface HoldingLineItem {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  changePct: number;
  pnlPct?: number;
  source?: string;
}

export interface HeadlineLineItem {
  title: string;
  source: string;
  link: string;
}

export interface HotAndHoldingsDailyData {
  date: string;
  timeLabel: string;
  marketStatusLabel: string;
  hotTop10: HotRankLineItem[];
  hotNews: HeadlineLineItem[];
  holdings: HoldingLineItem[];
  holdingNews: HeadlineLineItem[];
}

/**
 * 4. 專屬「當日熱門 10 檔 + 庫存持股 & 新聞消息」雙卡精選日報 (Carousel)
 */
export function createHotAndHoldingsDailyFlex(data: HotAndHoldingsDailyData) {
  const safeText = (v: unknown, fallback = "—") => {
    const s = String(v ?? "").trim();
    return s.length > 0 ? s : fallback;
  };

  const hotRows = data.hotTop10.slice(0, 10).map((item) => {
    const isUp = item.changePct > 0;
    const isDown = item.changePct < 0;
    const pctColor = isUp ? "#dc2626" : isDown ? "#059669" : "#475569";
    const pctSign = isUp ? "+" : "";
    const volText =
      item.volumeLots >= 10000
        ? `${(item.volumeLots / 10000).toFixed(1)}萬張`
        : `${item.volumeLots.toLocaleString()}張`;

    return {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      alignItems: "center",
      paddingTop: "4px",
      paddingBottom: "4px",
      contents: [
        {
          type: "text",
          text: `${item.rank}.`,
          size: "xs",
          weight: "bold",
          color: item.rank <= 3 ? "#d97706" : "#64748b",
          flex: 1,
        },
        {
          type: "text",
          text: `${safeText(item.symbol)} ${safeText(item.name)}`.slice(0, 14),
          size: "xs",
          weight: "bold",
          color: "#0f172a",
          flex: 5,
          wrap: false,
        },
        {
          type: "text",
          text: `$${Number(item.price || 0).toFixed(item.price >= 100 ? 1 : 2)}`,
          size: "xs",
          color: "#0f172a",
          align: "end",
          flex: 2,
        },
        {
          type: "text",
          text: `${pctSign}${Number(item.changePct || 0).toFixed(2)}%`,
          size: "xs",
          weight: "bold",
          color: pctColor,
          align: "end",
          flex: 3,
        },
        {
          type: "text",
          text: volText,
          size: "xxs",
          color: "#64748b",
          align: "end",
          flex: 2,
        },
      ],
      action: {
        type: "uri",
        label: item.symbol,
        uri: `https://stock-green-ten.vercel.app/stock/${encodeURIComponent(item.symbol)}`,
      },
    };
  });

  const buildNewsSection = (title: string, news: HeadlineLineItem[]) => {
    const items =
      news.length > 0
        ? news.slice(0, 3).map((n) => ({
            type: "box",
            layout: "vertical",
            paddingTop: "6px",
            contents: [
              {
                type: "text",
                text: `• ${safeText(n.title).slice(0, 48)}`,
                size: "xs",
                color: "#1e293b",
                wrap: true,
                maxLines: 2,
              },
              {
                type: "text",
                text: safeText(n.source, "財經新聞"),
                size: "xxs",
                color: "#64748b",
                margin: "xs",
              },
            ],
            action: {
              type: "uri",
              label: "閱讀",
              uri:
                n.link && /^https?:\/\//i.test(n.link) && n.link.length <= 900
                  ? n.link
                  : "https://stock-green-ten.vercel.app/news",
            },
          }))
        : [
            {
              type: "text",
              text: "暫無最新重大相關新聞",
              size: "xs",
              color: "#64748b",
              margin: "sm",
            },
          ];

    return {
      type: "box",
      layout: "vertical",
      margin: "md",
      paddingAll: "10px",
      backgroundColor: "#f8fafc",
      cornerRadius: "8px",
      contents: [
        {
          type: "text",
          text: title,
          size: "xs",
          weight: "bold",
          color: "#0f172a",
        },
        ...items,
      ],
    };
  };

  const hotBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#090d16",
      paddingAll: "14px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          justifyContent: "space-between",
          contents: [
            {
              type: "text",
              text: "今日台股熱門 TOP 10",
              color: "#f59e0b",
              weight: "bold",
              size: "sm",
            },
            {
              type: "text",
              text: safeText(data.marketStatusLabel, "即時"),
              color: "#34d399",
              weight: "bold",
              size: "xs",
              align: "end",
            },
          ],
        },
        {
          type: "text",
          text: `${safeText(data.date)} · ${safeText(data.timeLabel)} 成交量焦點榜`,
          color: "#94a3b8",
          size: "xxs",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [
        ...(hotRows.length > 0
          ? hotRows
          : [{ type: "text", text: "目前無熱門排行榜資料", size: "xs", color: "#64748b" }]),
        buildNewsSection("🔥 熱門焦點最新新聞", data.hotNews),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "10px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0f172a",
          height: "sm",
          action: {
            type: "uri",
            label: "前往 OmniTick 熱門戰情室",
            uri: "https://stock-green-ten.vercel.app/dashboard",
          },
        },
      ],
    },
  };

  const holdingRows =
    data.holdings.length > 0
      ? data.holdings.slice(0, 8).map((h) => {
          const isUp = h.changePct > 0;
          const isDown = h.changePct < 0;
          const pctColor = isUp ? "#dc2626" : isDown ? "#059669" : "#475569";
          const sign = isUp ? "+" : "";
          const pnlText =
            typeof h.pnlPct === "number" && Number.isFinite(h.pnlPct)
              ? `損益 ${h.pnlPct >= 0 ? "+" : ""}${h.pnlPct.toFixed(1)}%`
              : `${h.shares.toLocaleString()} 股`;

          return {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            alignItems: "center",
            paddingTop: "5px",
            paddingBottom: "5px",
            contents: [
              {
                type: "text",
                text: `${safeText(h.symbol)} ${safeText(h.name)}`.slice(0, 14),
                size: "xs",
                weight: "bold",
                color: "#0f172a",
                flex: 5,
              },
              {
                type: "text",
                text:
                  h.price > 0
                    ? `$${Number(h.price).toFixed(h.price >= 100 ? 1 : 2)}`
                    : "—",
                size: "xs",
                color: "#0f172a",
                align: "end",
                flex: 2,
              },
              {
                type: "text",
                text: `${sign}${Number(h.changePct || 0).toFixed(2)}%`,
                size: "xs",
                weight: "bold",
                color: pctColor,
                align: "end",
                flex: 2,
              },
              {
                type: "text",
                text: pnlText,
                size: "xxs",
                color: "#64748b",
                align: "end",
                flex: 3,
              },
            ],
            action: {
              type: "uri",
              label: h.symbol,
              uri: `https://stock-green-ten.vercel.app/stock/${encodeURIComponent(h.symbol)}`,
            },
          };
        })
      : [
          {
            type: "text",
            text: "尚未偵測到您的真實/模擬庫存持股。前往「投資組合」新增持股後，LINE 主動通報將為您追蹤庫存損益與相關新聞！",
            size: "xs",
            color: "#64748b",
            wrap: true,
          },
        ];

  const holdingBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0f172a",
      paddingAll: "14px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          justifyContent: "space-between",
          contents: [
            {
              type: "text",
              text: "庫存持股即時消息",
              color: "#38bdf8",
              weight: "bold",
              size: "sm",
            },
            {
              type: "text",
              text: `${data.holdings.length} 檔持股`,
              color: "#f8fafc",
              weight: "bold",
              size: "xs",
              align: "end",
            },
          ],
        },
        {
          type: "text",
          text: `${safeText(data.date)} · 專屬部位追蹤與持股新聞快訊`,
          color: "#94a3b8",
          size: "xxs",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [
        ...holdingRows,
        ...(data.holdings.length > 0
          ? [buildNewsSection("📰 庫存相關重要新聞", data.holdingNews)]
          : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "10px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#059669",
          height: "sm",
          action: {
            type: "uri",
            label: "管理我的投資組合與庫存",
            uri: "https://stock-green-ten.vercel.app/portfolio",
          },
        },
      ],
    },
  };

  const top1 = data.hotTop10[0];
  const altPrefix = top1
    ? `當日熱門10檔領頭: ${top1.symbol} ${top1.name} $${top1.price} (${
        top1.changePct >= 0 ? "+" : ""
      }${top1.changePct}%)`
    : "今日台股熱門 TOP 10";

  return {
    type: "flex",
    altText: `【OmniTick】${altPrefix} ｜ 庫存 ${data.holdings.length} 檔消息快報`.slice(0, 390),
    contents: {
      type: "carousel",
      contents: [hotBubble, holdingBubble],
    },
  };
}
