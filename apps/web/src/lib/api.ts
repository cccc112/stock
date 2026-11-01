import axios from 'axios';

const RENDER_PROD_URL = "https://stock-backend-lz9p.onrender.com";

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('backend_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
    }
    // 線上環境一律預設直連站長官方 Render 雲端後端，免除使用者任何填寫負擔
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return RENDER_PROD_URL + "/api/v1";
    }
  }
  const BASE = process.env.NEXT_PUBLIC_API_URL || RENDER_PROD_URL;
  return BASE.replace(/\/+$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();
    const googleIdToken = localStorage.getItem('stock_google_id_token');
    const apiKey = localStorage.getItem('byok_api_key');
    if (config.headers) {
      if (googleIdToken) {
        config.headers['Authorization'] = `Bearer ${googleIdToken}`;
      } else if (apiKey) {
        config.headers['Authorization'] = `Bearer ${apiKey}`;
      }
      if (apiKey) {
        config.headers['X-Gemini-Key'] = apiKey;
      }
    }
  }
  return config;
});

// 後端在免費方案閒置後會休眠，喚醒需 30～60 秒。期間的讀取請求自動重試，而不是直接顯示「-」。
// 以 window 事件通知狀態橫幅：api:waking（正在等後端醒來）、api:ok（有請求成功）。
export const BACKEND_WAKING_EVENT = 'api:waking';
export const BACKEND_OK_EVENT = 'api:ok';
const RETRY_DELAYS_MS = [3000, 6000, 10000, 15000, 20000]; // 累計約 54 秒，涵蓋喚醒期

function emit(name: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
}

api.interceptors.response.use(
  (response) => {
    emit(BACKEND_OK_EVENT);
    return response;
  },
  async (error) => {
    const config = error?.config as (typeof error.config & { __retryCount?: number }) | undefined;
    const status: number | undefined = error?.response?.status;
    const isWakeupFailure = !error?.response || status === 502 || status === 503 || status === 504;
    // 只重試 GET：讀取可安全重送；下單、新增等寫入請求不自動重送，避免重複寫入
    if (!config || (config.method || 'get').toLowerCase() !== 'get' || !isWakeupFailure) {
      return Promise.reject(error);
    }
    config.__retryCount = (config.__retryCount || 0) + 1;
    if (config.__retryCount > RETRY_DELAYS_MS.length) return Promise.reject(error);
    emit(BACKEND_WAKING_EVENT);
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[config.__retryCount! - 1]));
    return api.request(config);
  }
);

export const apiStocks = {
  getQuote: async (symbol: string) => {
    try {
      const res = await axios.get('/api/quote', { params: { symbol }, timeout: 8000 });
      if (res?.data && Number(res.data.price) > 0) return res;
    } catch {
      // fallback to backend
    }
    return api.get(`/stocks/${encodeURIComponent(symbol)}/quote`);
  },
  getHistory: async (symbol: string, period: string) => {
    try {
      const res = await axios.get('/api/quote', { params: { symbol, period }, timeout: 8000 });
      if (Array.isArray(res?.data) && res.data.length > 0) return res;
    } catch {
      // fallback to backend
    }
    return api.get(`/stocks/${encodeURIComponent(symbol)}/history`, { params: { period } });
  },
  getOrderbook: (symbol: string) => api.get(`/stocks/${encodeURIComponent(symbol)}/orderbook`),
  searchStocks: async (query: string) => {
    try {
      const res = await axios.get('/api/market-rankings', { params: { q: query }, timeout: 5000 });
      if (Array.isArray(res?.data) && res.data.length > 0) return res;
    } catch {
      // fallback
    }
    return api.get(`/stocks/search`, { params: { q: query } });
  },
  getNews: (symbol: string = '2330') => api.get(`/stocks/${encodeURIComponent(symbol)}/news`),
};

export const apiWatchlist = {
  getWatchlist: () => api.get('/watchlist'),
  addItem: (symbol: string, market: 'TW' | 'US' = 'TW') => api.post('/watchlist/items', { symbol, market }),
  removeItem: (symbol: string) => api.delete(`/watchlist/items/${symbol}`),
  getQuotes: () => api.get('/watchlist/quotes'),
};

export const apiPortfolio = {
  getHoldings: () => api.get('/portfolio/holdings'),
  addTransaction: (data: any) => api.post('/portfolio/transactions', data),
  getTransactions: () => api.get('/portfolio/transactions'),
  getSummary: () => api.get('/portfolio/summary'),
  deleteHolding: (symbol: string) => api.delete(`/portfolio/holdings/${symbol}`),
};

export const apiQuant = {
  getAnalysis: (symbol: string) => api.get(`/quant/${symbol}/analysis`),
  getVAP: (symbol: string) => api.get(`/quant/${symbol}/vap`),
  scanStock: (symbol: string) => api.get(`/quant/${symbol}/scan`),
  scanAll: () => api.get('/quant/scan/all'),
  screenStocks: (data: { strategies: string, symbols: string[], params: any }) => api.post('/quant/screen', data),
  getStrategyList: () => api.get('/quant/strategies/list'),
  runBacktest: (data: any) => api.post('/quant/backtest', data),
};

export const apiAlerts = {
  getAlerts: () => api.get('/alerts'),
  createAlert: (data: any) => api.post('/alerts', data),
  deleteAlert: (id: string) => api.delete(`/alerts/${id}`),
  toggleAlert: (id: string, active: boolean) => api.patch(`/alerts/${id}`, { active }),
};

// AI 呼叫逾時控制在 20 秒內，避免卡在反向代理 504 Gateway Timeout
const AI_TIMEOUT = { timeout: 20000 };

export const apiAi = {
  getMarketSummary: () => api.get('/ai/market-summary', AI_TIMEOUT),
  analyzeStock: (symbol: string) => api.post(`/ai/analyze/${symbol}`, { symbol, period: '3mo' }, AI_TIMEOUT),
  reviewTrades: (portfolioId: string) => api.post(`/ai/review/${portfolioId}`, null, AI_TIMEOUT),
  getTradeSuggestions: () => api.get('/ai/trade-suggestions', AI_TIMEOUT),
  runCommittee: (symbol: string) => api.post(`/ai/committee/${symbol}`, null, AI_TIMEOUT),
  chartAnalysis: (symbol: string) => api.post(`/ai/chart-analysis/${symbol}`, null, AI_TIMEOUT),
};

export const apiSimulator = {
  getPortfolios: () => api.get('/simulator/portfolios'),
  createPortfolio: (data: any) => api.post('/simulator/portfolios', data),
  executeTrade: (data: any) => api.post('/simulator/trade', data),
  getPerformance: (id: string) => api.get(`/simulator/${id}/performance`),
  requestReview: (id: string) => api.post(`/simulator/${id}/review`, null, { timeout: 90000 }),
};

export const apiMarket = {
  getTrending: async () => {
    try {
      const res = await axios.get('/api/market-rankings', { params: { limit: 8, sort_by: 'volume' }, timeout: 8000 });
      const twse = Array.isArray(res?.data?.twse) ? res.data.twse : [];
      const tpex = Array.isArray(res?.data?.tpex) ? res.data.tpex : [];
      const combined = [...twse.slice(0, 6), ...tpex.slice(0, 4)].sort((a, b) => (b.volume || 0) - (a.volume || 0));
      if (combined.length > 0) return { ...res, data: combined.slice(0, 8) };
    } catch {
      // fallback
    }
    return api.get('/market/trending');
  },
  getRankings: async (limit: number = 10, sort_by: string = 'volume') => {
    try {
      const res = await axios.get('/api/market-rankings', { params: { limit, sort_by }, timeout: 8000 });
      if (res?.data && (res.data.twse?.length || res.data.tpex?.length)) return res;
    } catch {
      // fallback
    }
    return api.get('/market/rankings', { params: { limit, sort_by } });
  },
  getPopularETFs: () => api.get('/market/etfs'),
  getCapitalFlow: async () => {
    try {
      const res = await axios.get('/api/market-rankings', { params: { type: 'capital-flow' }, timeout: 6000 });
      if (Array.isArray(res?.data) && res.data.length > 0) return res;
    } catch {
      // fallback
    }
    return api.get('/market/capital-flow');
  },
  getMultiAssets: () => api.get('/market/multi-assets'),
  getEtfNav: async (symbol?: string) => {
    try {
      const res = await axios.get('/api/etf-nav', { params: symbol ? { symbol } : {}, timeout: 8000 });
      if (res?.data) return res;
    } catch {
      // fallback
    }
    return api.get('/market/etf-nav', { params: symbol ? { symbol } : {} });
  },
};

export const apiResearch = {
  getEtfInfo: (symbol: string) => api.get(`/research/${encodeURIComponent(symbol)}/etf-info`),
  getFinancials: (symbol: string) => api.get(`/research/${encodeURIComponent(symbol)}/financials`),
  getDeepReport: (symbol: string) => api.get(`/research/${encodeURIComponent(symbol)}/deep-report`, { timeout: 60000 }),
  getFinancialAdvice: (symbol: string) => api.post(`/research/${encodeURIComponent(symbol)}/financial-advice`, null, { timeout: 90000 }),
  getRecommendations: (params: { market?: string; style?: string; sector?: string; top?: number; universe?: string; refresh?: boolean; _t?: number }) =>
    api.get('/research/recommend', { params, timeout: 120000 }),
  explainRecommendations: (params: { market?: string; style?: string; sector?: string; universe?: string }) =>
    api.post('/research/recommend/explain', null, { params, timeout: 120000 }),
  getIndustries: () => api.get('/research/industries', { timeout: 120000 }),
  getIndustry: (name: string) => api.get(`/research/industries/${encodeURIComponent(name)}`, { timeout: 60000 }),
  getIndustryReport: (name: string) => api.post(`/research/industries/${encodeURIComponent(name)}/report`, null, { timeout: 120000 }),
  getDataHealth: () => api.get('/research/health'),
};

export function apiErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string } }; message?: string };
  return err?.response?.data?.detail || err?.message || '未知錯誤';
}

export const apiInstitutions = {
  getTw: () => axios.get('/api/institutions', { timeout: 6000 }),
  getStockTw: (symbol: string) => axios.get('/api/institutions', { params: { symbol }, timeout: 6000 }),
  getRanksTw: () => axios.get('/api/institutions', { params: { type: 'ranks' }, timeout: 6000 }),
  getUs13F: () => axios.get('/api/institutions', { params: { type: '13f' }, timeout: 6000 }),
};

export default api;
