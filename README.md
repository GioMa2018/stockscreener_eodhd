# StockScreen Pro

A TradingView-inspired stock screener built with React + FastAPI + EODHD APIs.

## Folder Structure

```
stock-screener/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # API key (already configured)
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js    # Axios API client
    │   ├── components/
    │   │   ├── AIQuery.jsx          # Natural language query bar
    │   │   ├── ResultsTable.jsx     # Screener results table
    │   │   ├── ScreenerFilters.jsx  # Left panel filters
    │   │   ├── SearchBar.jsx        # Symbol search with autocomplete
    │   │   └── StockChart.jsx       # Price chart (Recharts AreaChart)
    │   ├── App.jsx          # Root layout
    │   ├── index.css        # Tailwind + global styles
    │   └── main.jsx         # Entry point
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## Prerequisites

- Python 3.11+
- Node.js 18+

---

## Setup — Backend

```bash
cd stock-screener/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

The API will be available at http://localhost:8000

Interactive docs: http://localhost:8000/docs

---

## Setup — Frontend

```bash
cd stock-screener/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Environment

The EODHD API key is already configured in `backend/.env`.
To change it, edit `backend/.env`:

```
EODHD_API_KEY=your_key_here
```

---

## Example API Calls

### Get historical EOD data
```bash
curl "http://localhost:8000/api/eod/AAPL?from_date=2024-01-01"
```

### Search stocks
```bash
curl "http://localhost:8000/api/search?q=NVDA"
```

### Run screener
```bash
curl "http://localhost:8000/api/screener?market_cap_min=10000000000&pe_max=30&roe_min=15"
```

### AI natural language query
```bash
curl -X POST "http://localhost:8000/api/ai-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "Profitable tech companies with high growth and low debt"}'
```

---

## Features

| Feature | Description |
|---|---|
| Stock chart | Area chart with 1M / 3M / 6M / 1Y / 2Y views |
| Key stats bar | Mkt Cap, P/E, EPS, 52W High/Low, Dividend Yield |
| Screener filters | Market cap, P/E, Revenue Growth, ROE, Debt/Equity |
| Quick presets | Tech Growth, Value Picks, Mega Cap, Low Debt |
| AI Query | Natural language → filter criteria translation |
| Symbol search | Autocomplete powered by EODHD search API |
| Sortable table | Click any column header to sort results |
| Mock data fallback | Works offline / without a valid API key |

---

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts, Axios
- **Backend**: Python FastAPI, httpx, pydantic
- **Data**: EODHD Financial APIs

Built with EODHD Financial APIs — get your free API key and start building:
https://eodhd.com/?via=kmg&ref1=Meneses&utm_source=medium&utm_medium=post&utm_campaign=how-i-built-a-stock-screener-with-ai-using-vibe-coding-and-a-financial-data-api&utm_content=Meneses
