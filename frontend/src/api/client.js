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

export const runAIQuery = (query) =>
  api.post('/ai-query', { query }).then(r => r.data)

export default api
