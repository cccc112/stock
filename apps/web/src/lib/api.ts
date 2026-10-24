import axios from 'axios';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('backend_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
    }
  }
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return BASE.replace(/\/+$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();
    const apiKey = localStorage.getItem('byok_api_key');
    if (apiKey && config.headers) {
      config.headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }
  return config;
});

export const apiStocks = {
  getQuote: (symbol: string) => api.get(`/stocks/${symbol}/quote`),
  getHistory: (symbol: string, period: string) => api.get(`/stocks/${symbol}/history`, { params: { period } }),
  getOrderbook: (symbol: string) => api.get(`/stocks/${symbol}/orderbook`),
  searchStocks: (query: string) => api.get(`/stocks/search`, { params: { q: query } }),
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

// AI 呼叫可能需要數十秒（多次呼叫 Gemini），逾時放寬到 3 分鐘
const AI_TIMEOUT = { timeout: 180000 };

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
  getTrending: () => api.get('/market/trending'),
  getPopularETFs: () => api.get('/market/etfs'),
  getCapitalFlow: () => api.get('/market/capital-flow'),
};

export const apiResearch = {
  getFinancials: (symbol: string) => api.get(`/research/${symbol}/financials`),
  getFinancialAdvice: (symbol: string) => api.post(`/research/${symbol}/financial-advice`, null, { timeout: 90000 }),
  getRecommendations: (params: { market?: string; style?: string; sector?: string; top?: number; universe?: string }) =>
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
  getTw: () => api.get('/institutions/tw'),
  getUs13F: () => api.get('/institutions/us/13f'),
};

export default api;
