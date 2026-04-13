from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import yfinance as yf
import anthropic
import os
import json
import time
import asyncio
import requests
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

load_dotenv()

app = FastAPI(title="Fiscal AI Clone")

# ── yfinance session with browser headers (avoids Yahoo rate-limits on cloud IPs) ──
_yf_session = requests.Session()
_yf_session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
})

def make_ticker(symbol: str) -> yf.Ticker:
    return yf.Ticker(symbol.upper(), session=_yf_session)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def safe(val, decimals=2):
    try:
        if val is None:
            return None
        f = float(val)
        if f != f:  # nan check
            return None
        return round(f, decimals)
    except Exception:
        return None


@app.get("/api/stock/{ticker}")
async def get_stock(ticker: str):
    try:
        stock = make_ticker(ticker)
        fi = stock.fast_info

        price = safe(fi.last_price)
        prev = safe(fi.previous_close)
        change = safe(price - prev) if price and prev else None
        change_pct = safe((change / prev) * 100) if change and prev else None

        # Try to get extra info (may fail with rate limit — gracefully degrade)
        info = {}
        try:
            info = stock.info or {}
        except Exception:
            pass

        return {
            "symbol": ticker.upper(),
            "name": info.get("longName") or info.get("shortName") or ticker.upper(),
            "price": price,
            "change": change,
            "changePercent": change_pct,
            "marketCap": safe(fi.market_cap, 0),
            "peRatio": safe(info.get("trailingPE")),
            "forwardPE": safe(info.get("forwardPE")),
            "eps": safe(info.get("trailingEps")),
            "revenue": safe(info.get("totalRevenue"), 0),
            "volume": safe(fi.three_month_average_volume, 0),
            "avgVolume": safe(fi.three_month_average_volume, 0),
            "high52": safe(fi.year_high),
            "low52": safe(fi.year_low),
            "dividendYield": safe(info.get("dividendYield")),
            "beta": safe(info.get("beta")),
            "description": info.get("longBusinessSummary"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "website": info.get("website"),
            "employees": info.get("fullTimeEmployees"),
            "country": info.get("country"),
            "currency": info.get("currency") or getattr(fi, "currency", "USD"),
            "exchange": info.get("exchange") or getattr(fi, "exchange", None),
            "priceToBook": safe(info.get("priceToBook")),
            "debtToEquity": safe(info.get("debtToEquity")),
            "returnOnEquity": safe(info.get("returnOnEquity")),
            "profitMargins": safe(info.get("profitMargins")),
            "grossMargins": safe(info.get("grossMargins")),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Stock not found: {str(e)}")


@app.get("/api/stock/{ticker}/chart")
async def get_chart(ticker: str, period: str = "1y", interval: str = "1d"):
    try:
        stock = make_ticker(ticker)
        hist = stock.history(period=period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail="No chart data found")

        data = []
        for date, row in hist.iterrows():
            data.append({
                "time": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        return {"ticker": ticker.upper(), "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stock/{ticker}/financials")
async def get_financials(ticker: str):
    try:
        stock = make_ticker(ticker)

        # Annual statements
        income   = stock.income_stmt
        balance  = stock.balance_sheet
        cashflow = stock.cashflow

        # Quarterly statements
        q_income   = stock.quarterly_income_stmt
        q_balance  = stock.quarterly_balance_sheet
        q_cashflow = stock.quarterly_cashflow

        def quarter_label(ts):
            m = ts.month
            q = (m - 1) // 3 + 1
            return f"Q{q} {ts.year}"

        def format_df(df):
            if df is None or df.empty:
                return {}
            result = {}
            for col in df.columns[:5]:
                label = col.strftime("%Y")
                result[label] = {}
                for idx in df.index:
                    try:
                        val = float(df.loc[idx, col])
                        if val == val:
                            result[label][str(idx)] = val
                    except Exception:
                        pass
            return result

        def build_series(df, keys, quarterly=False):
            if df is None or df.empty:
                return []
            n = 8 if quarterly else 5
            rows = []
            for col in reversed(df.columns[:n]):
                label = quarter_label(col) if quarterly else col.strftime("%Y")
                entry = {"year": label}
                for key in keys:
                    if key in df.index:
                        try:
                            val = float(df.loc[key, col])
                            entry[key] = val if val == val else None
                        except Exception:
                            entry[key] = None
                    else:
                        entry[key] = None
                rows.append(entry)
            return rows

        INCOME_KEYS   = ["Total Revenue", "Gross Profit", "Operating Income", "Net Income", "EBITDA", "Basic EPS"]
        CASHFLOW_KEYS = ["Free Cash Flow", "Operating Cash Flow", "Capital Expenditure"]
        BALANCE_KEYS  = ["Total Assets", "Total Liabilities Net Minority Interest", "Stockholders Equity", "Total Debt", "Cash And Cash Equivalents"]

        return {
            "income":   format_df(income),
            "balance":  format_df(balance),
            "cashflow": format_df(cashflow),
            "series": {
                "annual": {
                    "income":   build_series(income,   INCOME_KEYS),
                    "cashflow": build_series(cashflow, CASHFLOW_KEYS),
                    "balance":  build_series(balance,  BALANCE_KEYS),
                },
                "quarterly": {
                    "income":   build_series(q_income,   INCOME_KEYS,   quarterly=True),
                    "cashflow": build_series(q_cashflow, CASHFLOW_KEYS, quarterly=True),
                    "balance":  build_series(q_balance,  BALANCE_KEYS,  quarterly=True),
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Markets & Screener data ────────────────────────────────────────────────

_markets_cache = {"data": None, "ts": 0}
_screener_cache = {"data": None, "ts": 0}
CACHE_TTL = 300  # 5 minutes

INDICES = [
    {"name": "S&P 500",     "symbol": "^GSPC"},
    {"name": "NASDAQ",      "symbol": "^IXIC"},
    {"name": "DOW Jones",   "symbol": "^DJI"},
    {"name": "Russell 2000","symbol": "^RUT"},
    {"name": "VIX",         "symbol": "^VIX"},
]

SECTOR_ETFS = [
    {"name": "Technology",    "symbol": "XLK"},
    {"name": "Healthcare",    "symbol": "XLV"},
    {"name": "Financials",    "symbol": "XLF"},
    {"name": "Energy",        "symbol": "XLE"},
    {"name": "Consumer Disc.","symbol": "XLY"},
    {"name": "Industrials",   "symbol": "XLI"},
    {"name": "Utilities",     "symbol": "XLU"},
    {"name": "Real Estate",   "symbol": "XLRE"},
    {"name": "Materials",     "symbol": "XLB"},
]

SCREENER_STOCKS = [
    {"symbol": "AAPL",  "name": "Apple Inc.",            "sector": "Technology"},
    {"symbol": "MSFT",  "name": "Microsoft Corp.",        "sector": "Technology"},
    {"symbol": "NVDA",  "name": "NVIDIA Corp.",           "sector": "Technology"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.",          "sector": "Technology"},
    {"symbol": "META",  "name": "Meta Platforms",         "sector": "Technology"},
    {"symbol": "AVGO",  "name": "Broadcom Inc.",          "sector": "Technology"},
    {"symbol": "AMD",   "name": "Advanced Micro Devices", "sector": "Technology"},
    {"symbol": "ORCL",  "name": "Oracle Corp.",           "sector": "Technology"},
    {"symbol": "CRM",   "name": "Salesforce Inc.",        "sector": "Technology"},
    {"symbol": "NFLX",  "name": "Netflix Inc.",           "sector": "Technology"},
    {"symbol": "INTC",  "name": "Intel Corp.",            "sector": "Technology"},
    {"symbol": "PLTR",  "name": "Palantir Technologies",  "sector": "Technology"},
    {"symbol": "JPM",   "name": "JPMorgan Chase",         "sector": "Financials"},
    {"symbol": "BAC",   "name": "Bank of America",        "sector": "Financials"},
    {"symbol": "GS",    "name": "Goldman Sachs",          "sector": "Financials"},
    {"symbol": "V",     "name": "Visa Inc.",              "sector": "Financials"},
    {"symbol": "MA",    "name": "Mastercard Inc.",        "sector": "Financials"},
    {"symbol": "PYPL",  "name": "PayPal Holdings",        "sector": "Financials"},
    {"symbol": "COIN",  "name": "Coinbase Global",        "sector": "Financials"},
    {"symbol": "SOFI",  "name": "SoFi Technologies",      "sector": "Financials"},
    {"symbol": "AMZN",  "name": "Amazon.com Inc.",        "sector": "Consumer"},
    {"symbol": "TSLA",  "name": "Tesla Inc.",             "sector": "Consumer"},
    {"symbol": "COST",  "name": "Costco Wholesale",       "sector": "Consumer"},
    {"symbol": "WMT",   "name": "Walmart Inc.",           "sector": "Consumer"},
    {"symbol": "DIS",   "name": "Walt Disney Co.",        "sector": "Consumer"},
    {"symbol": "UBER",  "name": "Uber Technologies",      "sector": "Consumer"},
    {"symbol": "PG",    "name": "Procter & Gamble",       "sector": "Consumer"},
    {"symbol": "JNJ",   "name": "Johnson & Johnson",      "sector": "Healthcare"},
    {"symbol": "UNH",   "name": "UnitedHealth Group",     "sector": "Healthcare"},
    {"symbol": "PFE",   "name": "Pfizer Inc.",            "sector": "Healthcare"},
    {"symbol": "ABBV",  "name": "AbbVie Inc.",            "sector": "Healthcare"},
    {"symbol": "MRK",   "name": "Merck & Co.",            "sector": "Healthcare"},
    {"symbol": "XOM",   "name": "Exxon Mobil Corp.",      "sector": "Energy"},
    {"symbol": "CVX",   "name": "Chevron Corp.",          "sector": "Energy"},
    {"symbol": "HD",    "name": "Home Depot Inc.",        "sector": "Industrials"},
]


def _fetch_quote_sync(symbol):
    try:
        fi = make_ticker(symbol).fast_info
        price = safe(fi.last_price)
        prev  = safe(fi.previous_close)
        chg   = safe(((price - prev) / prev) * 100) if price and prev else None
        return {
            "price": price,
            "changePercent": chg,
            "marketCap": safe(fi.market_cap, 0),
            "volume": safe(fi.three_month_average_volume, 0),
        }
    except Exception:
        return {"price": None, "changePercent": None, "marketCap": None, "volume": None}


@app.get("/api/markets")
async def get_markets():
    global _markets_cache
    if _markets_cache["data"] and time.time() - _markets_cache["ts"] < CACHE_TTL:
        return _markets_cache["data"]

    all_items = INDICES + SECTOR_ETFS
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, _fetch_quote_sync, item["symbol"]) for item in all_items]
    live = await asyncio.gather(*tasks)

    n = len(INDICES)
    indices = [{**item, **live[i]} for i, item in enumerate(INDICES)]
    sectors = [{**item, **live[n + i]} for i, item in enumerate(SECTOR_ETFS)]

    data = {"indices": indices, "sectors": sectors}
    _markets_cache = {"data": data, "ts": time.time()}
    return data


@app.get("/api/screener")
async def get_screener():
    global _screener_cache
    if _screener_cache["data"] and time.time() - _screener_cache["ts"] < CACHE_TTL:
        return _screener_cache["data"]

    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, _fetch_quote_sync, s["symbol"]) for s in SCREENER_STOCKS]
    live = await asyncio.gather(*tasks)

    stocks = [{**s, **live[i]} for i, s in enumerate(SCREENER_STOCKS)]
    data = {"stocks": stocks}
    _screener_cache = {"data": data, "ts": time.time()}
    return data


@app.get("/api/stock/{ticker}/ownership")
async def get_ownership(ticker: str):
    try:
        stock = make_ticker(ticker)
        info = {}
        try:
            info = stock.info or {}
        except Exception:
            pass

        shares_short = info.get("sharesShort")
        shares_short_prior = info.get("sharesShortPriorMonth")

        short_change = None
        if shares_short and shares_short_prior and shares_short_prior > 0:
            short_change = safe(((shares_short - shares_short_prior) / shares_short_prior) * 100)

        short_interest = {
            "sharesShort": shares_short,
            "sharesShortPriorMonth": shares_short_prior,
            "shortPercentOfFloat": safe(info.get("shortPercentOfFloat"), 4),
            "shortRatio": safe(info.get("shortRatio")),
            "floatShares": info.get("floatShares"),
            "shortChange": short_change,
        }

        major_holders = []
        try:
            mh = stock.major_holders
            if mh is not None and not mh.empty:
                for _, row in mh.iterrows():
                    try:
                        major_holders.append({
                            "value": float(row.iloc[0]),
                            "label": str(row.iloc[1]),
                        })
                    except Exception:
                        pass
        except Exception:
            pass

        institutions = []
        try:
            ih = stock.institutional_holders
            if ih is not None and not ih.empty:
                for _, row in ih.head(15).iterrows():
                    try:
                        d = row.to_dict()
                        institutions.append({
                            "holder": str(d.get("Holder", "")),
                            "shares": int(d["Shares"]) if d.get("Shares") is not None else None,
                            "pctHeld": safe(d.get("% Out"), 4),
                            "value": safe(d.get("Value"), 0),
                        })
                    except Exception:
                        pass
        except Exception:
            pass

        return {
            "shortInterest": short_interest,
            "majorHolders": major_holders,
            "institutions": institutions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search")
async def search_stocks(q: str):
    tickers = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
        "AMD", "INTC", "JPM", "BAC", "GS", "WMT", "COST", "V", "MA",
        "JNJ", "PFE", "UNH", "XOM", "CVX", "DIS", "CRM", "ORCL", "PYPL",
        "UBER", "SPOT", "SNAP", "PLTR", "SOFI", "RBLX", "COIN",
    ]
    q_upper = q.upper()
    matches = [t for t in tickers if q_upper in t][:8]
    return {"results": matches}


class ChatMessage(BaseModel):
    message: str
    ticker: Optional[str] = None
    stock_context: Optional[dict] = None


@app.post("/api/chat")
async def chat(body: ChatMessage):
    system_prompt = (
        "You are an expert financial analyst AI assistant, like a Bloomberg terminal AI. "
        "You help investors analyze stocks, understand financial metrics, interpret market trends, "
        "and make informed investment decisions. Be concise, precise, and data-driven. "
        "Use bullet points and sections for clarity. If no stock is provided, answer general finance questions."
    )

    context = ""
    if body.ticker and body.stock_context:
        ctx = body.stock_context
        context = f"\n\nUser is currently viewing: {body.ticker} ({ctx.get('name', '')})\n"
        if ctx.get("price"):
            context += f"- Price: ${ctx['price']}\n"
        if ctx.get("changePercent") is not None:
            context += f"- Change: {ctx['changePercent']:+.2f}%\n"
        if ctx.get("marketCap"):
            mc = ctx["marketCap"]
            context += f"- Market Cap: ${mc/1e9:.2f}B\n"
        if ctx.get("peRatio"):
            context += f"- P/E Ratio: {ctx['peRatio']:.2f}\n"
        if ctx.get("sector"):
            context += f"- Sector: {ctx['sector']}\n"

    def generate():
        try:
            with client.messages.stream(
                model="claude-opus-4-6",
                max_tokens=1024,
                system=system_prompt + context,
                messages=[{"role": "user", "content": body.message}],
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ── Serve React frontend ────────────────────────────────────────────────────���
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        return {"detail": "Frontend not found"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
