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
    altText: `⚡【量化雷達警報】${data.name} (${data.symbol}) ${data.triggerName}`,
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
                text: "⚡ 盤中量化雷達觸發",
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
    altText: "📊 今日 15:30 盤後籌碼戰報：全市場投信與 ETF 聯手大買榜",
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
            text: "🐻 熊霸盤後籌碼戰報",
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
    altText: "🎉 歡迎加入 AI Stock Monitor！已為您開通 14 天 Pro 盤中即時雷達試用",
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
            text: "🐻 台灣黑熊「熊霸」報到！",
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
                text: "💡 快捷查詢秘訣：",
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
