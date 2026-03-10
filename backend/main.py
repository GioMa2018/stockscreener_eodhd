from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import json
import re
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Stock Screener API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EODHD_API_KEY = os.getenv("EODHD_API_KEY", "your_api_key")
EODHD_BASE_URL = "https://eodhd.com/api"

# -------------------------------------------------------------------
# Mock data fallback (used when EODHD API is unavailable)
# -------------------------------------------------------------------
MOCK_EOD_DATA = [
    {"date": "2024-01-02", "open": 185.0, "high": 188.4, "low": 184.1, "close": 187.1, "volume": 78234500},
    {"date": "2024-01-03", "open": 187.1, "high": 190.5, "low": 186.0, "close": 189.3, "volume": 81200000},
    {"date": "2024-01-04", "open": 189.3, "high": 192.0, "low": 187.8, "close": 186.2, "volume": 90340000},
    {"date": "2024-01-05", "open": 186.2, "high": 188.9, "low": 184.5, "close": 187.7, "volume": 73100000},
    {"date": "2024-01-08", "open": 187.7, "high": 194.0, "low": 187.0, "close": 192.5, "volume": 95600000},
    {"date": "2024-01-09", "open": 192.5, "high": 196.1, "low": 191.3, "close": 193.9, "volume": 88400000},
    {"date": "2024-01-10", "open": 193.9, "high": 197.8, "low": 192.8, "close": 196.2, "volume": 102300000},
    {"date": "2024-01-11", "open": 196.2, "high": 198.9, "low": 194.6, "close": 195.7, "volume": 79800000},
    {"date": "2024-01-12", "open": 195.7, "high": 199.3, "low": 194.9, "close": 198.4, "volume": 84700000},
    {"date": "2024-01-16", "open": 198.4, "high": 201.0, "low": 197.1, "close": 200.9, "volume": 91200000},
    {"date": "2024-01-17", "open": 200.9, "high": 202.5, "low": 198.5, "close": 199.2, "volume": 77600000},
    {"date": "2024-01-18", "open": 199.2, "high": 203.4, "low": 198.8, "close": 202.8, "volume": 88900000},
    {"date": "2024-01-19", "open": 202.8, "high": 206.0, "low": 201.5, "close": 205.1, "volume": 93100000},
    {"date": "2024-01-22", "open": 205.1, "high": 208.3, "low": 204.0, "close": 207.8, "volume": 98700000},
    {"date": "2024-01-23", "open": 207.8, "high": 210.0, "low": 206.2, "close": 209.4, "volume": 105000000},
    {"date": "2024-01-24", "open": 209.4, "high": 213.2, "low": 208.5, "close": 212.6, "volume": 112300000},
    {"date": "2024-01-25", "open": 212.6, "high": 215.0, "low": 211.0, "close": 213.9, "volume": 87500000},
    {"date": "2024-01-26", "open": 213.9, "high": 216.4, "low": 212.8, "close": 215.0, "volume": 92000000},
    {"date": "2024-01-29", "open": 215.0, "high": 217.7, "low": 213.5, "close": 216.2, "volume": 80300000},
    {"date": "2024-01-30", "open": 216.2, "high": 219.9, "low": 215.0, "close": 218.8, "volume": 96700000},
    {"date": "2024-01-31", "open": 218.8, "high": 221.5, "low": 217.3, "close": 220.1, "volume": 104500000},
    {"date": "2024-02-01", "open": 220.1, "high": 223.0, "low": 219.0, "close": 222.0, "volume": 89200000},
    {"date": "2024-02-02", "open": 222.0, "high": 185.8, "low": 182.1, "close": 185.8, "volume": 240000000},
    {"date": "2024-02-05", "open": 185.8, "high": 188.0, "low": 183.5, "close": 187.2, "volume": 98700000},
    {"date": "2024-02-06", "open": 187.2, "high": 190.5, "low": 186.2, "close": 189.3, "volume": 77400000},
    {"date": "2024-02-07", "open": 189.3, "high": 192.8, "low": 188.7, "close": 191.7, "volume": 85600000},
    {"date": "2024-02-08", "open": 191.7, "high": 194.5, "low": 190.8, "close": 193.9, "volume": 79800000},
    {"date": "2024-02-09", "open": 193.9, "high": 195.0, "low": 188.5, "close": 188.8, "volume": 91200000},
    {"date": "2024-02-12", "open": 188.8, "high": 192.3, "low": 188.2, "close": 190.5, "volume": 74500000},
    {"date": "2024-02-13", "open": 190.5, "high": 191.8, "low": 184.3, "close": 185.0, "volume": 103400000},
]

MOCK_SCREENER_DATA = {
    "total": 8,
    "data": [
        {"code": "AAPL",  "name": "Apple Inc",              "exchange": "NASDAQ", "sector": "Technology",
         "price": 189.84, "market_capitalization": 2950000000000, "pe_ratio": 31.2,
         "revenue_growth_qoq": 5.1,  "roe": 160.1, "de_ratio": 1.77},
        {"code": "MSFT",  "name": "Microsoft Corporation",  "exchange": "NASDAQ", "sector": "Technology",
         "price": 378.91, "market_capitalization": 2810000000000, "pe_ratio": 35.6,
         "revenue_growth_qoq": 16.0, "roe": 38.4,  "de_ratio": 0.71},
        {"code": "NVDA",  "name": "NVIDIA Corporation",     "exchange": "NASDAQ", "sector": "Technology",
         "price": 495.22, "market_capitalization": 1220000000000, "pe_ratio": 65.3,
         "revenue_growth_qoq": 122.0,"roe": 91.5,  "de_ratio": 0.44},
        {"code": "GOOGL", "name": "Alphabet Inc",           "exchange": "NASDAQ", "sector": "Technology",
         "price": 140.93, "market_capitalization": 1790000000000, "pe_ratio": 25.8,
         "revenue_growth_qoq": 11.0, "roe": 24.8,  "de_ratio": 0.07},
        {"code": "META",  "name": "Meta Platforms Inc",     "exchange": "NASDAQ", "sector": "Technology",
         "price": 485.58, "market_capitalization": 1240000000000, "pe_ratio": 27.1,
         "revenue_growth_qoq": 23.0, "roe": 31.8,  "de_ratio": 0.14},
        {"code": "AMZN",  "name": "Amazon.com Inc",         "exchange": "NASDAQ", "sector": "Consumer Cyclical",
         "price": 178.25, "market_capitalization": 1870000000000, "pe_ratio": 62.4,
         "revenue_growth_qoq": 13.0, "roe": 17.3,  "de_ratio": 0.73},
        {"code": "TSLA",  "name": "Tesla Inc",              "exchange": "NASDAQ", "sector": "Consumer Cyclical",
         "price": 248.48, "market_capitalization": 791000000000,  "pe_ratio": 71.4,
         "revenue_growth_qoq": 3.5,  "roe": 16.8,  "de_ratio": 0.17},
        {"code": "JPM",   "name": "JPMorgan Chase & Co",   "exchange": "NYSE",   "sector": "Financial Services",
         "price": 198.47, "market_capitalization": 574000000000,  "pe_ratio": 11.5,
         "revenue_growth_qoq": 4.8,  "roe": 16.2,  "de_ratio": 1.32},
    ],
}

MOCK_SEARCH_DATA = [
    {"Code": "AAPL", "Name": "Apple Inc", "Exchange": "NASDAQ", "Type": "Common Stock", "Country": "USA"},
    {"Code": "AAPL.LSE", "Name": "Apple Inc", "Exchange": "LSE", "Type": "ETF", "Country": "UK"},
]


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def normalize_symbol(symbol: str) -> str:
    return symbol.upper() if "." in symbol else f"{symbol.upper()}.US"


# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------
@app.get("/api/eod/{symbol}")
async def get_eod_data(symbol: str, period: str = "d", from_date: Optional[str] = None, to_date: Optional[str] = None):
    sym = normalize_symbol(symbol)
    url = f"{EODHD_BASE_URL}/eod/{sym}"
    params: dict = {"api_token": EODHD_API_KEY, "fmt": "json", "period": period}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    # Fallback mock
    return MOCK_EOD_DATA


@app.get("/api/fundamentals/{symbol}")
async def get_fundamentals(symbol: str):
    sym = normalize_symbol(symbol)
    url = f"{EODHD_BASE_URL}/fundamentals/{sym}"
    params = {"api_token": EODHD_API_KEY, "fmt": "json",
              "filter": "Highlights,Valuation,Technicals,SharesStats"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return {}


@app.get("/api/search")
async def search_stocks(q: str = Query(..., min_length=1)):
    url = f"{EODHD_BASE_URL}/search/{q}"
    params = {"api_token": EODHD_API_KEY, "fmt": "json", "limit": 10}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return [r for r in MOCK_SEARCH_DATA if q.upper() in r["Code"]]


@app.get("/api/screener")
async def screen_stocks(
    market_cap_min: Optional[float] = None,
    market_cap_max: Optional[float] = None,
    pe_min: Optional[float] = None,
    pe_max: Optional[float] = None,
    revenue_growth_min: Optional[float] = None,
    roe_min: Optional[float] = None,
    debt_equity_max: Optional[float] = None,
    limit: int = Query(default=50, le=100),
):
    filters = []
    if market_cap_min is not None:
        filters.append(["market_capitalization", ">", market_cap_min])
    if market_cap_max is not None:
        filters.append(["market_capitalization", "<", market_cap_max])
    if pe_min is not None:
        filters.append(["pe_ratio", ">", pe_min])
    if pe_max is not None:
        filters.append(["pe_ratio", "<", pe_max])
    if revenue_growth_min is not None:
        filters.append(["revenue_growth_qoq", ">", revenue_growth_min])
    if roe_min is not None:
        filters.append(["roe", ">", roe_min])
    if debt_equity_max is not None:
        filters.append(["de_ratio", "<", debt_equity_max])

    url = f"{EODHD_BASE_URL}/screener"
    params = {
        "api_token": EODHD_API_KEY,
        "filters": json.dumps(filters),
        "limit": limit,
        "offset": 0,
        "sort": "market_capitalization.desc",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict) and "data" in data:
                    return data
    except Exception:
        pass

    # Apply filters on mock data
    results = MOCK_SCREENER_DATA["data"]
    if market_cap_min is not None:
        results = [r for r in results if r["market_capitalization"] >= market_cap_min]
    if market_cap_max is not None:
        results = [r for r in results if r["market_capitalization"] <= market_cap_max]
    if pe_min is not None:
        results = [r for r in results if r.get("pe_ratio") and r["pe_ratio"] >= pe_min]
    if pe_max is not None:
        results = [r for r in results if r.get("pe_ratio") and r["pe_ratio"] <= pe_max]
    if revenue_growth_min is not None:
        results = [r for r in results if r.get("revenue_growth_qoq") and r["revenue_growth_qoq"] >= revenue_growth_min]
    if roe_min is not None:
        results = [r for r in results if r.get("roe") and r["roe"] >= roe_min]
    if debt_equity_max is not None:
        results = [r for r in results if r.get("de_ratio") is not None and r["de_ratio"] <= debt_equity_max]

    return {"total": len(results), "data": results[:limit]}


class AIQueryRequest(BaseModel):
    query: str


@app.post("/api/ai-query")
async def ai_query(request: AIQueryRequest):
    """Translate natural language into screener filter criteria."""
    q = request.query.lower()
    filters: dict = {}
    labels: list[str] = []

    # Market cap
    if any(x in q for x in ["mega cap", "mega-cap"]):
        filters["market_cap_min"] = 200_000_000_000
        labels.append("Mega cap (>$200B)")
    elif any(x in q for x in ["large cap", "large-cap"]):
        filters["market_cap_min"] = 10_000_000_000
        labels.append("Large cap (>$10B)")
    elif any(x in q for x in ["mid cap", "mid-cap"]):
        filters["market_cap_min"] = 2_000_000_000
        filters["market_cap_max"] = 10_000_000_000
        labels.append("Mid cap ($2B–$10B)")
    elif any(x in q for x in ["small cap", "small-cap"]):
        filters["market_cap_max"] = 2_000_000_000
        labels.append("Small cap (<$2B)")

    # Profitability
    if any(x in q for x in ["profitable", "profitability", "high roe", "strong returns"]):
        filters["roe_min"] = 15
        labels.append("ROE > 15%")

    # Growth
    if any(x in q for x in ["high growth", "fast growth", "rapid growth", "growing fast"]):
        filters["revenue_growth_min"] = 20
        labels.append("Revenue growth > 20%")
    elif "growth" in q:
        filters["revenue_growth_min"] = 10
        labels.append("Revenue growth > 10%")

    # Debt
    if any(x in q for x in ["no debt", "debt free", "debt-free"]):
        filters["debt_equity_max"] = 0.1
        labels.append("Debt/Equity < 0.1")
    elif any(x in q for x in ["low debt", "low-debt", "minimal debt", "conservative debt"]):
        filters["debt_equity_max"] = 0.5
        labels.append("Debt/Equity < 0.5")

    # Value / P/E
    if any(x in q for x in ["undervalued", "value stock", "cheap stock", "low pe", "low p/e"]):
        filters["pe_max"] = 20
        labels.append("P/E < 20")

    # Regex for explicit P/E values
    m = re.search(r"p/?e\s*(?:ratio\s*)?(?:below|under|less than|<)\s*(\d+)", q)
    if m:
        filters["pe_max"] = float(m.group(1))
        labels.append(f"P/E < {m.group(1)}")
    m = re.search(r"p/?e\s*(?:ratio\s*)?(?:above|over|greater than|>)\s*(\d+)", q)
    if m:
        filters["pe_min"] = float(m.group(1))
        labels.append(f"P/E > {m.group(1)}")

    description = "Filters applied: " + ", ".join(labels) if labels else "No specific filters detected. Showing all stocks."
    return {"filters": filters, "description": description, "labels": labels}


@app.get("/health")
async def health():
    return {"status": "ok"}
