import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
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
};

export const apiQuant = {
  getAnalysis: (symbol: string) => api.get(`/quant/${symbol}/analysis`),
  getVAP: (symbol: string) => api.get(`/quant/${symbol}/vap`),
  scanStock: (symbol: string) => api.get(`/quant/${symbol}/scan`),
  scanAll: () => api.get('/quant/scan/all'),
};

export const apiAlerts = {
  getAlerts: () => api.get('/alerts'),
  createAlert: (data: any) => api.post('/alerts', data),
  deleteAlert: (id: string) => api.delete(`/alerts/${id}`),
  toggleAlert: (id: string, active: boolean) => api.patch(`/alerts/${id}`, { active }),
};

export const apiAi = {
  getMarketSummary: () => api.get('/ai/market-summary'),
  analyzeStock: (symbol: string) => api.post(`/ai/analyze/${symbol}`),
  reviewTrades: (portfolioId: string) => api.post(`/ai/review/${portfolioId}`),
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

export default api;
