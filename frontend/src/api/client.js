import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

export const fetchEOD = (symbol, params = {}) =>
  api.get(`/eod/${symbol}`, { params }).then(r => r.data)

export const fetchFundamentals = (symbol) =>
  api.get(`/fundamentals/${symbol}`).then(r => r.data)

export const searchStocks = (q) =>
  api.get('/search', { params: { q } }).then(r => r.data)

export const runScreener = (filters = {}) =>
  api.get('/screener', { params: filters }).then(r => r.data)

export const runScreenerPage = (filters = {}, offset = 0) =>
  api.get('/screener', { params: { ...filters, offset, limit: 50 } }).then(r => r.data)

export const runAIQuery = (query) =>
  api.post('/ai-query', { query }).then(r => r.data)

export const checkHealth = () =>
  api.get('/health').then(r => r.data).catch(() => ({ data_source: 'mock' }))

export default api
