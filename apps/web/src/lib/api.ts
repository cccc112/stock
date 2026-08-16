import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Ensure /api/v1 suffix - strip trailing slash then append
const baseURL = BASE.replace(/\/+$/, '').replace(/\/api\/v1$/, '') + '/api/v1';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('byok_api_key') : null;
  if (apiKey && config.headers) {
    config.headers['Authorization'] = `Bearer ${apiKey}`;
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
  addItem: (symbol: string) => api.post('/watchlist', { symbol }),
  removeItem: (symbol: string) => api.delete(`/watchlist/${symbol}`),
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
};

export const apiAlerts = {
  getAlerts: () => api.get('/alerts'),
  createAlert: (data: any) => api.post('/alerts', data),
  deleteAlert: (id: string) => api.delete(`/alerts/${id}`),
  toggleAlert: (id: string, active: boolean) => api.patch(`/alerts/${id}`, { active }),
};

export const apiAi = {
  getMarketSummary: () => api.get('/ai/market-summary'),
  analyzeStock: (symbol: string) => api.post(`/ai/analyze/${symbol}`, { symbol, period: '3mo' }),
  reviewTrades: (portfolioId: string) => api.post(`/ai/review/${portfolioId}`),
  getTradeSuggestions: () => api.get('/ai/trade-suggestions'),
};

export const apiSimulator = {
  getPortfolios: () => api.get('/simulator/portfolios'),
  createPortfolio: (data: any) => api.post('/simulator/portfolios', data),
  executeTrade: (data: any) => api.post('/simulator/trade', data),
  getPerformance: (id: string) => api.get(`/simulator/portfolios/${id}/performance`),
  requestReview: (id: string) => api.post(`/simulator/portfolios/${id}/review`),
};

export const apiMarket = {
  getTrending: () => api.get('/market/trending'),
  getPopularETFs: () => api.get('/market/etfs'),
};

export const apiInstitutions = {
  getTw: () => api.get('/institutions/tw'),
  getUs13F: () => api.get('/institutions/us/13f'),
};

export default api;
